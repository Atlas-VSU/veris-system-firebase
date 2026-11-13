import { FineStatus } from "@/constants/status";
import { db } from "@/firebase/firebase.config";
import {
  doc,
  updateDoc,
  Timestamp,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { cacheService, CACHE_KEYS } from "@/services/cacheService";
import { getCurrentUserData } from "@/firebase/users";
import { Member } from "@/features/organization/members/types";
import { isActiveFineItem } from "@/features/organization/fines/utils/fineComputations";

// Centralized error handler
const handleFirestoreError = (error: any, context: string) => {
  console.error(`Error ${context}:`, error);
  // Re-throwing allows the calling UI to handle the failed state.
  throw new Error(`Failed to ${context}.`);
};

export const recalculateFines = async (
  fineId: string,
  addedAmount?: number | null,
  payment?: number | null,
  waived?: boolean | null,
  waivedAmount?: number | null
) => {
  try {
    const fineRef = doc(db, "fines", fineId);
    const fineDoc = await getDoc(fineRef);
    if (!fineDoc.exists()) {
      console.error(`Fine with ID ${fineId} not found.`);
      return { success: false };
    }

    const fineData = fineDoc.data();
    if (!fineData) return { success: false };

    let newStatus = fineData.status;
    let newBalance = Number(fineData.balance ?? 0);
    let newWaivedAmount = fineData.waivedAmount || null;
    let newWaivedAt = fineData.waivedAt || null;
    let newWaivedBy = fineData.waivedBy || null;

    let newAccumulatedAmount = Number(fineData.accumulatedAmount ?? 0);
    if (addedAmount != null) {
      newAccumulatedAmount += addedAmount;
      newStatus = FineStatus.UNPAID;
      newBalance += addedAmount;
      if (newBalance > 0 && Number(fineData.paidAmount ?? 0) > 0) {
        newStatus = FineStatus.PARTIAL;
      }
    }

    let newPaidAmount = Number(fineData.paidAmount ?? 0);
    if (payment != null) {
      newPaidAmount += payment;
      newBalance = Math.max(0, newAccumulatedAmount - newPaidAmount - Number(newWaivedAmount ?? 0));
      if (newBalance <= 0) {
        newStatus = FineStatus.PAID;
      } else if (payment > 0 && newAccumulatedAmount > 0) {
        newStatus = FineStatus.PARTIAL;
      }
    }

    if (waived && waivedAmount != null) {
      newBalance = Math.max(0, newBalance - waivedAmount);
      if (newBalance <= 0) {
        newStatus = newPaidAmount > 0 ? FineStatus.PAID : FineStatus.WAIVED;
      } else {
        newStatus = FineStatus.PARTIAL;
      }
      newWaivedAmount = (newWaivedAmount || 0) + waivedAmount;
      newWaivedAt = Timestamp.now();
      const currUser = (await getCurrentUserData()) as unknown as Member;
      newWaivedBy = `${currUser.firstName} ${currUser.lastName}`.trim();
    }

    const fineItemsRef = collection(db, "fines", fineId, "fineItems");
    const q = query(fineItemsRef, where("isPending", "==", true));
    const fineItemsSnapShot = await getDocs(q);

    const hasActivePendingItem = fineItemsSnapShot.docs.some((itemDoc) =>
      isActiveFineItem(itemDoc.data() as Record<string, unknown>)
    );

    if (hasActivePendingItem) {
      newStatus = FineStatus.PENDING;
    }

    await updateDoc(fineRef, {
      accumulatedAmount: newAccumulatedAmount,
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
      waivedAmount: newWaivedAmount,
      waivedAt: newWaivedAt,
      waivedBy: newWaivedBy,
      "metadata.updatedAt": Timestamp.now(),
    });

    cacheService.invalidate(CACHE_KEYS.fineDoc(fineId));
    cacheService.invalidate(CACHE_KEYS.fineItems(fineId));

    return {
      success: true,
      balance: newBalance,
      status: newStatus,
    };
  } catch (error) {
    handleFirestoreError(error, `recalculating fine with ID ${fineId}`);
    return { success: false };
  }
};
