import { db } from "@/firebase/firebase.config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { cacheService, CACHE_KEYS } from "@/services/cacheService";
import { getCurrentUserData } from "@/firebase/users";
import { Member } from "@/features/organization/members/types";
import { FineItem, StudentFines } from "@/features/organization/fines/types";
import { recalculateFines } from "./recalculate";
import { buildClearanceId } from "@/firebase/clearance";
import { getActiveTerm } from "@/firebase/term";
import {
  deriveClearanceStatusFromBlockingItems,
  isActiveFineItem,
} from "@/features/organization/fines/utils/fineComputations";

const invalidateFineCaches = (fineId: string) => {
  cacheService.invalidate(CACHE_KEYS.fineDoc(fineId));
  cacheService.invalidate(CACHE_KEYS.fineItems(fineId));
  cacheService.invalidateByPrefix("fines:");
  cacheService.invalidateByPrefix("clearance:");
};

export const markFineItemsAsPaid = async (fineId: string, fineItemId?: string) => {
  try {
    if (fineItemId) {
      const fineItemsRef = doc(db, "fines", fineId, "fineItems", fineItemId);
      await updateDoc(fineItemsRef, {
        isPaid: true,
        isPending: false,
      });
    } else {
      const fineItemsRef = collection(db, "fines", fineId, "fineItems");
      const q = query(fineItemsRef, where("isPaid", "==", false));
      const querySnapshot = await getDocs(q);

      const activeUnpaidDocs = querySnapshot.docs.filter((itemDoc) =>
        isActiveFineItem(itemDoc.data() as Record<string, unknown>)
      );

      if (activeUnpaidDocs.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      activeUnpaidDocs.forEach((itemDoc) => {
        batch.update(itemDoc.ref, {
          isPaid: true,
          isPending: false,
        });
      });

      await batch.commit();
    }

    invalidateFineCaches(fineId);
  } catch (error) {
    console.error("Error marking fine items as paid:", error);
    throw error;
  }
};

export const markFineItemsAsNotPending = async (fineId: string, fineItemIds: string[]) => {
  try {
    const batch = writeBatch(db);
    for (const item of fineItemIds) {
      batch.update(doc(db, "fines", fineId, "fineItems", item), {
        isPaid: false,
        isPending: false,
      });
    }

    await batch.commit();
    invalidateFineCaches(fineId);
  } catch (error) {
    console.error("Error marking fine items as not pending:", error);
    throw error;
  }
};

export const markFineItemAsWaived = async (
  fineId: string,
  fineItem: FineItem,
  waiveReason?: string,
  term?: any
) => {
  try {
    const fineItemsRef = doc(db, "fines", fineId, "fineItems", fineItem.id);
    const waivedReason = waiveReason ? waiveReason : "";
    const currUser = (await getCurrentUserData()) as unknown as Member;
    const wasUnpaid = !fineItem.isPaid && !fineItem.isWaived;
    const now = Timestamp.now();

    await updateDoc(fineItemsRef, {
      isPaid: true,
      isWaived: true,
      isPending: false,
      waivedAt: now,
      waivedReason,
      waivedBy: `${currUser.firstName} ${currUser.lastName}`.trim(),
      "metadata.updatedAt": now,
    });

    // Recalculate parent fine totals and status
    await recalculateFines(fineId, null, null, true, fineItem.amount);

    const fineRef = doc(db, "fines", fineId);
    const fineSnap = await getDoc(fineRef);
    if (fineSnap.exists()) {
      const fineData = fineSnap.data() as StudentFines;
      const activeTerm = term || (await getActiveTerm());

      // Decrement unpaid fines on organization stats when waiving an unpaid item
      if (activeTerm && currUser.orgId && wasUnpaid && fineItem.amount > 0) {
        const statsRef = doc(
          db,
          "stats",
          `${activeTerm.AY}-${activeTerm.semester}-${currUser.orgId}`
        );
        await updateDoc(statsRef, {
          totalUnpaidFines: increment(-fineItem.amount),
          updatedAt: now,
        }).catch((err) => {
          console.warn("Could not decrement stats on waive:", err);
        });
      }

      if (activeTerm && fineData.userId && currUser.orgId) {
        const id = buildClearanceId(
          fineData.userId,
          currUser.orgId,
          Number(currUser.accessLevel ?? 0),
          activeTerm
        );
        const clearanceRef = doc(db, "clearanceStatus", id);
        const clearanceSnap = await getDoc(clearanceRef);

        if (clearanceSnap.exists()) {
          const clearanceData = clearanceSnap.data();
          const existingBlocking = { ...(clearanceData.blockingItems ?? {}) };
          if (existingBlocking[fineItem.id]) {
            existingBlocking[fineItem.id] = {
              ...existingBlocking[fineItem.id],
              balance: 0,
              status: "paid",
              pendingReview: false,
            };
          }
          const nextClearanceStatus = deriveClearanceStatusFromBlockingItems(existingBlocking);

          await updateDoc(clearanceRef, {
            [`blockingItems.${fineItem.id}.balance`]: 0,
            [`blockingItems.${fineItem.id}.status`]: "paid",
            [`blockingItems.${fineItem.id}.pendingReview`]: false,
            status: nextClearanceStatus,
            clearanceDate: nextClearanceStatus === "cleared" ? now : null,
            updatedAt: now,
          });
        }
      }
    }

    invalidateFineCaches(fineId);
  } catch (error) {
    console.error("Error waiving fine item:", error);
    throw new Error("Failed to waive fine item. Please try again.");
  }
};
