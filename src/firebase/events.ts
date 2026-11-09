/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
  getDoc,
  orderBy,
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer,
  increment,
  collectionGroup,
  deleteField,
  arrayRemove,
  arrayUnion,
  documentId,
} from "firebase/firestore";
import { db } from "./firebase.config";
import { EventFormData } from "@/lib/validators";
import { Event } from "@/features/organization/events/types";
import {
  determineEventStatus,
  getEventsNeedingStatusUpdate,
  isFineGenerationInProgress,
} from "@/utils/eventStatusUtils";
import { getCurrentUserData } from "./users";
import { Member } from "@/features/organization/members/types";
import { cacheService, CACHE_DURATIONS } from "@/services/cacheService";
import { getOrgById } from "./organization";
import { getActiveTerm } from "./term";
import { FineItem, ProofOfPayment, StudentFines } from "@/features/organization/fines/types";
import { ClearanceStatus } from "@/features/organization/clearance/types";
import { FineStatus } from "@/constants/status";
import {
  deriveClearanceStatusFromBlockingItems,
  determineFineStatus,
  isActiveFineItem,
} from "@/features/organization/fines/utils/fineComputations";

const eventsCollection = collection(db, "events");

// Helper to manage errors
const handleFirestoreError = (error: any, context: string) => {
  console.error(`Error ${context}:`, error);

  // If it's already an Error object with a message, preserve it
  if (error instanceof Error) {
    throw error;
  }

  // Otherwise, create a generic error
  throw new Error(`Failed to ${context}`);
};

// Helper to transform event data
const transformEventData = (doc: any): Event => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    date: data.date?.toDate ? data.date.toDate() : data.date,
  } as Event;
};

export interface PaginatedEvents {
  events: Event[];
  totalCount: number;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Get paginated events with server-side filtering, sorting, and caching
 */
export const getPaginatedEvents = async (
  status?: "ongoing" | "upcoming" | "completed" | "archived" | "all",
  sortField: string = "date",
  sortDirection: "asc" | "desc" = "desc",
  pageSize: number = 5,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  searchQuery?: string,
  skip: number = 0,
  filterDate?: Date,
  selectedTerm?: { AY: string; semester: string } | null
): Promise<PaginatedEvents> => {
  try {
    const term = selectedTerm || (await getActiveTerm());
    // Create a cache key based on the query parameters
    const datePart = filterDate
      ? filterDate.toISOString().split("T")[0]
      : "no-date";

    const cacheKey = `events:paginated:${status}:${sortField}-${sortDirection}:${pageSize}:${skip}:${datePart}:${term?.AY}-${term?.semester}`;

    return await cacheService.getOrFetch<PaginatedEvents>(
      cacheKey,
      async () => {
        // Get the current user's level access
        const currentUser = (await getCurrentUserData()) as unknown as Member;
        const org = await getOrgById(currentUser.orgId!);
        if (!currentUser || !org || !term) {
          return {
            events: [],
            totalCount: 0,
            lastDoc: null,
            hasMore: false,
          };
        }
        const levelAccess = currentUser.accessLevel;
        // Base query - filter by non-deleted events
        let baseQuery = query(
          eventsCollection,
          where("isDeleted", "==", false),
          where("orgId", "==", currentUser.orgId),
          where("academicYear", "==", term!.AY),
          where("semester", "==", term!.semester)
        );

        // Apply filters based on levelAccess
        if (levelAccess === 1 && org?.programId) {
          baseQuery = query(
            baseQuery,
            where("accessLevelEvent", "==", 1),
            where("programId", "==", org.programId)
          );
        } else if (levelAccess === 2 && org?.facultyId) {
          baseQuery = query(
            baseQuery,
            where("accessLevelEvent", "==", 2),
            where("facultyId", "==", org.facultyId)
          );
        } else if (levelAccess === 3) {
          baseQuery = query(baseQuery, where("accessLevelEvent", "==", 3));
        }

        // Add status filter if provided and not "all"
        if (status && status !== "all") {
          baseQuery = query(baseQuery, where("status", "==", status));
        }

        // Add date filter if provided
        if (filterDate) {
          const startDate = new Date(filterDate);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(filterDate);
          endDate.setHours(23, 59, 59, 999);
          baseQuery = query(
            baseQuery,
            where("date", ">=", Timestamp.fromDate(startDate)),
            where("date", "<=", Timestamp.fromDate(endDate))
          );
        }

        // Add sorting
        const sortFieldPath =
          sortField === "name" || sortField === "attendees"
            ? sortField
            : "date";
        const sortedQuery = query(
          baseQuery,
          orderBy(sortFieldPath, sortDirection)
        );

        const countCacheKey = `events:count:${status}:${levelAccess}-${org.facultyId || org.programId || "all"}:${datePart}`;

        const totalCount = await cacheService.getOrFetch<number>(
          countCacheKey,
          async () => {
            const countSnapshot = await getCountFromServer(sortedQuery);
            return countSnapshot.data().count;
          },
          CACHE_DURATIONS.EVENTS * 2
        );

        if (totalCount === 0) {
          return {
            events: [],
            totalCount: 0,
            lastDoc: null,
            hasMore: false,
          };
        }

        const snapshot = await getDocs(sortedQuery);
        const allEvents = snapshot.docs.map(transformEventData);

        const events = allEvents.slice(skip, skip + pageSize);

        const eventsToUpdate = getEventsNeedingStatusUpdate(events);
        if (eventsToUpdate.length > 0) {
          await updateEventStatuses(eventsToUpdate);

          if (status && status !== "all") {
            cacheService.invalidateByPrefix(`events:paginated:${status}`);
            cacheService.invalidate(countCacheKey);

            return getPaginatedEvents(
              status,
              sortField,
              sortDirection,
              pageSize,
              startAfterDoc,
              searchQuery,
              skip,
              filterDate,
              selectedTerm
            );
          } else {
            events.forEach((ev) => {
              const updated = eventsToUpdate.find((u) => u.id === ev.id);
              if (updated) {
                ev.status = determineEventStatus(ev.date);
              }
            });
          }
        }

        return {
          events,
          totalCount,
          lastDoc: null,
          hasMore: skip + pageSize < totalCount,
        };
      },
      CACHE_DURATIONS.EVENTS
    );
  } catch (error) {
    handleFirestoreError(error, "fetch paginated events");
    return {
      events: [],
      totalCount: 0,
      lastDoc: null,
      hasMore: false,
    };
  }
};

export const addEvent = async (eventData: EventFormData) => {
  try {
    const currentUser = (await getCurrentUserData()) as unknown as Member;
    const org = await getOrgById(currentUser.orgId!);
    const term = await getActiveTerm();
    if (!currentUser || !org) return [];

    const levelAccess = currentUser.accessLevel;

    if (levelAccess === 1 && (!org || !org.programId)) {
      console.error("User is Level 1 but has no programId.");
      return [];
    }

    if (levelAccess === 2 && (!org || !org.facultyId)) {
      console.error("User is Level 2 but has no facultyId.");
      return [];
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const eventDate = new Date(eventData.date);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < currentDate) {
      throw new Error("Cannot create an event with a date in the past");
    }

    if (eventData.timeInStart && eventData.timeInEnd) {
      if (eventData.timeInStart >= eventData.timeInEnd) {
        throw new Error("Time In Start must be earlier than Time In End");
      }
    }

    if (eventData.timeOutStart && eventData.timeOutEnd) {
      if (eventData.timeOutStart >= eventData.timeOutEnd) {
        throw new Error("Time Out Start must be earlier than Time Out End");
      }
    }

    if (eventData.timeInEnd && eventData.timeOutStart) {
      if (eventData.timeInEnd > eventData.timeOutStart) {
        throw new Error(
          "Time In period must complete before Time Out period begins"
        );
      }
    }

    let dynamicFields = {};

    if (levelAccess === 1 && org?.programId) {
      dynamicFields = { programId: org.programId };
    } else if (levelAccess === 2 && org?.facultyId) {
      dynamicFields = { facultyId: org.facultyId };
    }

    const status = determineEventStatus(eventData.date);
    const docRef = await addDoc(eventsCollection, {
      ...eventData,
      note: eventData.note || "",
      timeInStart: eventData.timeInStart || null,
      timeInEnd: eventData.timeInEnd || null,
      timeOutStart: eventData.timeOutStart || null,
      timeOutEnd: eventData.timeOutEnd || null,
      createdAt: Timestamp.now(),
      date: Timestamp.fromDate(eventData.date),
      attendees: 0,
      status,
      isDeleted: false,
      finesGenerated: false,
      fineGenerationStatus: "idle",
      accessLevelEvent: levelAccess,
      manuallyCompleted: false,
      orgId: currentUser.orgId,
      academicYear: term!.AY,
      semester: term!.semester,
      ...dynamicFields,
    });

    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, "add event");
  }
};

export const updateEvent = async (
  eventId: string,
  eventData: EventFormData
) => {
  try {
    if (eventData.timeInStart && eventData.timeInEnd) {
      if (eventData.timeInStart >= eventData.timeInEnd) {
        throw new Error("Time In Start must be earlier than Time In End");
      }
    }

    if (eventData.timeOutStart && eventData.timeOutEnd) {
      if (eventData.timeOutStart >= eventData.timeOutEnd) {
        throw new Error("Time Out Start must be earlier than Time Out End");
      }
    }
    if (eventData.timeInEnd && eventData.timeOutStart) {
      if (eventData.timeInEnd > eventData.timeOutStart) {
        throw new Error(
          "Time In period must complete before Time Out period begins"
        );
      }
    }

    const currentEvent = await getEventById(eventId);
    if (!currentEvent) {
      throw new Error(
        "Event not found or you don't have permission to update it"
      );
    }

    const eventDoc = doc(db, "events", eventId);

    const status =
      currentEvent?.status === "archived"
        ? "archived"
        : determineEventStatus(eventData.date);

    await updateDoc(eventDoc, {
      ...eventData,
      note: eventData.note || "",
      timeInStart: eventData.timeInStart || null,
      timeInEnd: eventData.timeInEnd || null,
      timeOutStart: eventData.timeOutStart || null,
      timeOutEnd: eventData.timeOutEnd || null,
      date: Timestamp.fromDate(eventData.date),
      status,
    });

    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
  } catch (error) {
    handleFirestoreError(error, `update event with ID ${eventId}`);
  }
};

export const disableFineGeneration = async (eventId: string) => {
  try {
    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, {
      finesGenerated: true,
      fineGenerationStatus: "completed",
      fineGenerationLockId: null,
    });
    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
  } catch (error) {
    handleFirestoreError(
      error,
      `disable fine generation for event with ID ${eventId}`
    );
  }
};

export const incrementEventAttendees = async (eventId: string) => {
  try {
    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, {
      attendees: increment(1),
    });

    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
  } catch (error) {
    handleFirestoreError(
      error,
      `increment attendees for event with ID ${eventId}`
    );
  }
};

export const updateEventStatuses = async (
  events: Event[]
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    let updatesApplied = false;

    events.forEach((event) => {
      if (event.status === "archived") return;
      if (event.manuallyCompleted) return;

      const eventId =
        typeof event.id === "number" ? String(event.id) : event.id;
      const eventDoc = doc(db, "events", eventId);

      const newStatus = determineEventStatus(new Date(event.date));

      if (event.status !== newStatus) {
        batch.update(eventDoc, { status: newStatus });
        updatesApplied = true;
      }
    });

    if (updatesApplied) {
      await batch.commit();

      cacheService.invalidateByPrefix("events:");
      cacheService.invalidateByPrefix("ui:events:view:");
    }

    return updatesApplied;
  } catch (error) {
    console.error("Error updating event statuses:", error);
    return false;
  }
};

/**
 * Get all events with caching, optionally filtered by status
 */
export const getEvents = async (
  status?: "ongoing" | "upcoming" | "completed",
  selectedTerm?: { AY: string; semester: string } | null
): Promise<Event[]> => {
  try {
    const term = selectedTerm || (await getActiveTerm());
    const cacheKey = `events:all:${status || "all"}:${term?.AY}-${term?.semester}`;

    return await cacheService.getOrFetch<Event[]>(
      cacheKey,
      async () => {
        const currentUser = (await getCurrentUserData()) as unknown as Member;
        const org = await getOrgById(currentUser.orgId!);
        if (!currentUser || !org || !term) return [];

        const levelAccess = currentUser.accessLevel;

        let q = query(
          eventsCollection,
          where("isDeleted", "==", false),
          where("orgId", "==", currentUser.orgId),
          where("academicYear", "==", term!.AY),
          where("semester", "==", term!.semester)
        );

        if (levelAccess === 1 && org.programId) {
          q = query(q, where("accessLevelEvent", "==", 1));
        } else if (levelAccess === 2 && org.facultyId) {
          q = query(q, where("accessLevelEvent", "==", 2));
        } else if (levelAccess === 3) {
          q = query(q, where("accessLevelEvent", "==", 3));
        }

        if (status) {
          q = query(q, where("status", "==", status));
        }
        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map(transformEventData);

        const eventsToUpdate = getEventsNeedingStatusUpdate(events);
        if (eventsToUpdate.length > 0) {
          const updatesApplied = await updateEventStatuses(eventsToUpdate);

          if (status && updatesApplied) {
            cacheService.invalidate(cacheKey);
            return getEvents(status, selectedTerm);
          }
        }

        return events;
      },
      CACHE_DURATIONS.EVENTS
    );
  } catch (error) {
    handleFirestoreError(error, "fetch events");
    return [];
  }
};

export const getEventsByStatus = async (
  status: string,
  selectedTerm?: { AY: string; semester: string } | null
) => {
  try {
    const term = selectedTerm || (await getActiveTerm());
    const cacheKey = `events:status:${status}:${term?.AY}-${term?.semester}`;

    return await cacheService.getOrFetch<Event[]>(
      cacheKey,
      async () => {
        const currentUser = (await getCurrentUserData()) as unknown as Member;
        const org = await getOrgById(currentUser.orgId!);
        if (!currentUser || !org || !term) return [];

        const levelAccess = currentUser.accessLevel;

        const eventsRef = collection(db, "events");
        let q = query(
          eventsRef,
          where("status", "==", status),
          where("isDeleted", "==", false),
          where("orgId", "==", currentUser.orgId),
          where("academicYear", "==", term!.AY),
          where("semester", "==", term!.semester)
        );

        if (levelAccess === 1 && org.programId) {
          q = query(q, where("programId", "==", org.programId ?? ""));
        } else if (levelAccess === 2 && org.facultyId) {
          q = query(q, where("facultyId", "==", org.facultyId ?? ""));
        }
        const querySnapshot = await getDocs(q);

        const events: Event[] = [];
        querySnapshot.forEach((doc) => {
          events.push(transformEventData(doc));
        });

        return events;
      },
      CACHE_DURATIONS.EVENTS
    );
  } catch (error) {
    console.error("Error fetching events by status:", error);
    return [];
  }
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const cacheKey = `event:${eventId}`;

    return await cacheService.getOrFetch<Event | null>(
      cacheKey,
      async () => {
        const eventDoc = doc(db, "events", eventId);
        const docSnap = await getDoc(eventDoc);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.isDeleted === false) {
            return transformEventData({ id: docSnap.id, data: () => data });
          }
        }
        return null;
      },
      CACHE_DURATIONS.EVENTS
    );
  } catch (error) {
    handleFirestoreError(error, `get event with ID ${eventId}`);
    return null;
  }
};

export const archiveEvent = async (eventId: string) => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) {
      throw new Error(
        "Event not found or you don't have permission to archive it"
      );
    }

    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, { status: "archived" });

    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
  } catch (error) {
    handleFirestoreError(error, `archive event with ID ${eventId}`);
  }
};

export const deleteEvent = async (eventId: string) => {
  try {
    const eventDocRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventDocRef);
    if (!eventSnap.exists()) {
      throw new Error(
        "Event not found or you don't have permission to delete it"
      );
    }

    const currentEvent = transformEventData({
      id: eventSnap.id,
      data: () => eventSnap.data(),
    });

    if (isFineGenerationInProgress(currentEvent)) {
      throw new Error(
        "Cannot delete event while fine generation is in progress. Please wait for it to finish."
      );
    }

    // Check for any active fineItems for this event (handles both completed and interrupted runs)
    const subCollectionGroupRef = collectionGroup(db, "fineItems");
    const q = query(subCollectionGroupRef, where("eventId", "==", eventId));
    const querySnapshot = await getDocs(q);
    const activeItemDocs = querySnapshot.docs.filter((d) =>
      isActiveFineItem(d.data() as Record<string, unknown>)
    );

    if (activeItemDocs.length > 0) {
      const now = Timestamp.now();
      let batch = writeBatch(db);
      let operationCount = 0;
      const batchPromises: Promise<void>[] = [];

      const flushBatch = () => {
        if (operationCount > 0) {
          batchPromises.push(batch.commit());
          batch = writeBatch(db);
          operationCount = 0;
        }
      };

      interface ParentDelta {
        itemCountDeduct: number;
        accumulatedDeduct: number;
        balanceDeduct: number;
        waivedDeduct: number;
        itemIds: string[];
        userId?: string;
      }

      const parentDeltas = new Map<string, ParentDelta>();
      let totalFinesDeduct = 0;
      let totalUnpaidDeduct = 0;
      let totalCollectedDeduct = 0;

      // 1. Archive all active fineItems and aggregate deltas per parent fine & org stats
      for (const itemDoc of activeItemDocs) {
        const data = itemDoc.data() as FineItem;
        const parentId = itemDoc.ref.parent.parent?.id || data.parentFineId || "";
        const amount = Number(data.amount ?? 0);
        const isPaid = Boolean(data.isPaid);
        const isWaived = Boolean(data.isWaived);

        batch.update(itemDoc.ref, {
          isArchived: true,
          "metadata.isArchived": true,
          "metadata.updatedAt": now,
        });
        operationCount++;
        if (operationCount === 450) flushBatch();

        if (!parentId) continue;

        const existing = parentDeltas.get(parentId) ?? {
          itemCountDeduct: 0,
          accumulatedDeduct: 0,
          balanceDeduct: 0,
          waivedDeduct: 0,
          itemIds: [],
          userId: data.userId,
        };

        existing.itemCountDeduct += 1;
        existing.itemIds.push(itemDoc.id);
        if (!existing.userId && data.userId) {
          existing.userId = data.userId;
        }

        if (isWaived) {
          existing.accumulatedDeduct += amount;
          existing.waivedDeduct += amount;
          totalFinesDeduct += amount;
        } else if (isPaid) {
          totalCollectedDeduct += amount;
          totalFinesDeduct += amount;
        } else {
          existing.accumulatedDeduct += amount;
          existing.balanceDeduct += amount;
          totalUnpaidDeduct += amount;
          totalFinesDeduct += amount;
        }

        parentDeltas.set(parentId, existing);
      }

      flushBatch();
      await Promise.all(batchPromises);
      batchPromises.length = 0;

      // 2. Fetch affected parent fine docs in chunks of 30 and update their totals & status atomically
      const parentIds = Array.from(parentDeltas.keys());
      const parentDocsMap = new Map<string, StudentFines>();
      for (let i = 0; i < parentIds.length; i += 30) {
        const chunk = parentIds.slice(i, i + 30);
        const snap = await getDocs(
          query(collection(db, "fines"), where(documentId(), "in", chunk))
        );
        snap.docs.forEach((d) =>
          parentDocsMap.set(d.id, { id: d.id, ...d.data() } as StudentFines)
        );
      }

      const affectedUserIds = new Set<string>();
      const allRemovedItemIds = new Set<string>();

      for (const [parentId, delta] of parentDeltas.entries()) {
        delta.itemIds.forEach((id) => allRemovedItemIds.add(id));
        const parentData = parentDocsMap.get(parentId);
        const userId = delta.userId || parentData?.userId;
        if (userId) affectedUserIds.add(userId);

        if (!parentData) continue;

        const nextCount = Math.max(
          0,
          Number(parentData.fineItemsCount ?? 0) - delta.itemCountDeduct
        );
        const nextAccumulated = Math.max(
          0,
          Number(parentData.accumulatedAmount ?? 0) - delta.accumulatedDeduct
        );
        const paidAmt = Number(parentData.paidAmount ?? 0);
        const nextWaived = Math.max(
          0,
          Number(parentData.waivedAmount ?? 0) - delta.waivedDeduct
        );
        const nextBalance = Math.max(
          0,
          nextAccumulated - paidAmt - nextWaived
        );
        const nextStatus = determineFineStatus({
          activeItemCount: nextCount,
          balance: nextBalance,
          paidAmount: paidAmt,
          waivedAmount: nextWaived,
          hasPending: parentData.status === FineStatus.PENDING && nextBalance > 0,
        });

        batch.update(doc(db, "fines", parentId), {
          fineItemsCount: nextCount,
          accumulatedAmount: nextAccumulated,
          balance: nextBalance,
          waivedAmount: nextWaived > 0 ? nextWaived : null,
          status: nextStatus,
          "metadata.updatedAt": now,
        });
        operationCount++;
        if (operationCount === 450) flushBatch();
      }

      flushBatch();
      await Promise.all(batchPromises);
      batchPromises.length = 0;

      // 3. Apply a single aggregated update to the organization's stats document
      if (
        currentEvent.academicYear &&
        currentEvent.semester &&
        currentEvent.orgId &&
        (totalFinesDeduct > 0 || totalUnpaidDeduct > 0 || totalCollectedDeduct > 0)
      ) {
        const statsRef = doc(
          db,
          "stats",
          `${currentEvent.academicYear}-${currentEvent.semester}-${currentEvent.orgId}`
        );
        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists()) {
          const sData = statsSnap.data();
          await updateDoc(statsRef, {
            totalFines: Math.max(0, Number(sData.totalFines ?? 0) - totalFinesDeduct),
            totalUnpaidFines: Math.max(
              0,
              Number(sData.totalUnpaidFines ?? 0) - totalUnpaidDeduct
            ),
            totalCollectedFines: Math.max(
              0,
              Number(sData.totalCollectedFines ?? 0) - totalCollectedDeduct
            ),
            updatedAt: now,
          });
        }
      }

      // 4. Batch-fetch clearanceStatus & proofOfPayments in chunks of 30 userIds
      const userIdList = Array.from(affectedUserIds);
      const clearanceDocs: ClearanceStatus[] = [];
      const proofDocs: ProofOfPayment[] = [];

      for (let i = 0; i < userIdList.length; i += 30) {
        const chunk = userIdList.slice(i, i + 30);
        const [cSnap, pSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "clearanceStatus"),
              where("orgId", "==", currentEvent.orgId),
              where("academicYear", "==", currentEvent.academicYear),
              where("userId", "in", chunk)
            )
          ),
          getDocs(
            query(
              collection(db, "proofOfPayments"),
              where("orgId", "==", currentEvent.orgId),
              where("academicYear", "==", currentEvent.academicYear),
              where("semester", "==", currentEvent.semester),
              where("userId", "in", chunk)
            )
          ),
        ]);

        cSnap.docs.forEach((d) =>
          clearanceDocs.push({ id: d.id, ...d.data() } as ClearanceStatus)
        );
        pSnap.docs.forEach((d) =>
          proofDocs.push({ id: d.id, ...d.data() } as ProofOfPayment)
        );
      }

      // Remove deleted event's fineItems from clearance blockingItems and recompute clearance status
      for (const clearance of clearanceDocs) {
        const currentBlocking = { ...(clearance.blockingItems ?? {}) } as Record<
          string,
          any
        >;
        const matchedIds = Object.keys(currentBlocking).filter((key) =>
          allRemovedItemIds.has(key)
        );
        if (matchedIds.length === 0) continue;

        const updatePayload: Record<string, any> = { updatedAt: now };
        for (const id of matchedIds) {
          delete currentBlocking[id];
          updatePayload[`blockingItems.${id}`] = deleteField();
        }
        const nextClearanceStatus =
          deriveClearanceStatusFromBlockingItems(currentBlocking);
        updatePayload.status = nextClearanceStatus;
        updatePayload.clearanceDate =
          nextClearanceStatus === "cleared" ? now : null;

        batch.update(doc(db, "clearanceStatus", clearance.id), updatePayload);
        operationCount++;
        if (operationCount === 450) flushBatch();
      }

      // Move removed fineItems to metadata.refundables on any matching proofOfPayments
      for (const proof of proofDocs) {
        const items = proof.metadata?.items ?? [];
        const matchingItems = items.filter((i) => allRemovedItemIds.has(i.refId));
        if (matchingItems.length === 0) continue;

        const paymentRef = doc(db, "proofOfPayments", proof.id!);
        const archiveProof = items.length === matchingItems.length;
        batch.update(paymentRef, {
          "metadata.items": arrayRemove(...matchingItems),
          "metadata.refundables": arrayUnion(...matchingItems),
          ...(archiveProof ? { isArchived: true } : {}),
        });
        operationCount++;
        if (operationCount === 450) flushBatch();
      }

      flushBatch();
      await Promise.all(batchPromises);
    }

    // 5. Mark the event as soft-deleted only AFTER all fine/clearance/stats cleanups succeed
    await updateDoc(eventDocRef, { isDeleted: true });

    // Invalidate specific event cache and all paginated events, fines, and clearances
    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
    cacheService.invalidateByPrefix("fines:");
    cacheService.invalidateByPrefix("clearance:");
  } catch (error) {
    handleFirestoreError(error, `delete event with ID ${eventId}`);
  }
};

export const completeEvent = async (eventId: string) => {
  try {
    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, { status: "completed", manuallyCompleted: true });

    cacheService.invalidate(`event:${eventId}`);
    cacheService.invalidateByPrefix("events:");
    cacheService.invalidateByPrefix("ui:events:view:");
  } catch (error) {
    console.error(`Error updating status for event ${eventId}:`, error);
  }
};

// Convenience methods with caching
export const getOngoingEvents = async (): Promise<Event[]> => {
  return (await getEvents("ongoing")) as Event[];
};

export const getUpcomingEvents = async (): Promise<Event[]> => {
  return (await getEvents("upcoming")) as Event[];
};

interface ProgramData {
  name: string;
  shortName: string;
  acronym: string;
  facultyId: string;
}
