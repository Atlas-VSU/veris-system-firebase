import { FineItem, StudentFines } from "@/features/organization/fines/types";
import { Member, MemberData } from "@/features/organization/members/types";
import { db } from "@/firebase/firebase.config";
import { getCurrentUserData } from "@/firebase/users";
import {
  collection,
  query,
  where,
  getDocs,
  getDocsFromServer,
  CollectionReference,
  DocumentData,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  getDoc,
  doc,
  onSnapshot,
  or,
  and,
  documentId,
} from "firebase/firestore";
import { cacheService, CACHE_KEYS, CACHE_DURATIONS } from "@/services/cacheService";
import { getActiveTerm } from "@/firebase/term";
import { Term } from "@/constants/types";

const finesCollection: CollectionReference<DocumentData> = collection(
  db,
  "fines"
);

// Centralized error handler
const handleFirestoreError = (error: any, context: string) => {
  console.error(`Error ${context}:`, error);
  // Re-throwing allows the calling UI to handle the failed state.
  throw new Error(`Failed to ${context}.`);
};

const hashStudentIds = (
  orgId: string,
  term: { AY: string; semester: string },
  studentIds: string[]
): string => {
  const input = `${orgId}:${term.AY}:${term.semester}:${studentIds.join(",")}`;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${orgId}:${term.AY}:${term.semester}:${studentIds.length}:${(h >>> 0).toString(36)}`;
};

export const getFinesByStudentsFromServer = async (
  students: MemberData[],
  orgIdOverride?: string,
  termOverride?: { AY: string; semester: string }
): Promise<StudentFines[]> => {
  const studentIds = Array.from(
    new Set(students.map((s) => s.member?.studentId).filter(Boolean))
  ).sort();

  if (studentIds.length === 0) return [];

  const term = termOverride || (await getActiveTerm());
  const orgId =
    orgIdOverride || ((await getCurrentUserData()) as unknown as Member)?.orgId;

  if (!term || !orgId) return [];

  try {
    // Chunk into groups of 15 because the query combines studentId IN (15) with semester OR (2) => 30 disjunctions max.
    const CHUNK_SIZE = 15;
    const PARALLEL_LIMIT = 20;

    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      chunks.push(studentIds.slice(i, i + CHUNK_SIZE));
    }

    const fineDocs: StudentFines[] = [];
    for (let i = 0; i < chunks.length; i += PARALLEL_LIMIT) {
      const group = chunks.slice(i, i + PARALLEL_LIMIT);
      const snapshots = await Promise.all(
        group.map((chunk) =>
          getDocsFromServer(
            query(
              finesCollection,
              and(
                where("studentId", "in", chunk),
                where("metadata.isArchived", "==", false),
                where("academicYear", "==", term.AY),
                where("orgId", "==", orgId),
                or(
                  where("semester", "==", term.semester),
                  where("semester", "==", `${term.semester} Semester`)
                )
              )
            )
          )
        )
      );

      snapshots
        .flatMap((snapshot) => snapshot.docs)
        .forEach((docSnap) => {
          fineDocs.push({ id: docSnap.id, ...docSnap.data() } as StudentFines);
        });
    }

    return fineDocs;
  } catch (error) {
    handleFirestoreError(error, `fetching fine documents from server for student IDs`);
    return [];
  }
};

export const getFinesByStudents = async (students: MemberData[]) => {
  const studentIds = Array.from(
    new Set(students.map(s => s.member?.studentId).filter(Boolean))
  ).sort();

  if (studentIds.length === 0) return [];

  const term = await getActiveTerm();
  const currUser = await getCurrentUserData() as unknown as Member;
  if (!term || !currUser?.orgId) return [];

  const cacheKey = CACHE_KEYS.finesBatch(
    hashStudentIds(currUser.orgId, term, studentIds)
  );

  return cacheService.getOrFetch(
    cacheKey,
    async () => getFinesByStudentsFromServer(students, currUser.orgId, term),
    CACHE_DURATIONS.FINES
  );
};

export const getFineByStudentId = async (studentId: string, selectedTerm?: Term) => {
    const term = selectedTerm || await getActiveTerm();
    return cacheService.getOrFetch(
        CACHE_KEYS.fineByStudent(studentId),
        async () => {
            const fineQuery = query(
                finesCollection,
              and(
                  where("studentId", "==", studentId),
                  where("metadata.isArchived", "==", false),
                  where("academicYear", "==", term!.AY),
                or(
                  where("semester", "==", term!.semester),
                  where("semester", "==", `${term!.semester} Semester`)
                  )
                )
            );
            const querySnapshot = await getDocs(fineQuery);
            if (!querySnapshot.empty) {
                const fineDoc = querySnapshot.docs[0];
                return { id: fineDoc.id, ...fineDoc.data() } as StudentFines;
            }
            return null;
        },
        CACHE_DURATIONS.FINES
    );
}

export const getFineById = async (fineId: string) => {
  return cacheService.getOrFetch(
    CACHE_KEYS.fineDoc(fineId),
    async () => {
      const fineDoc = await getDoc(doc(db, "fines", fineId));
      if (!fineDoc.exists()) {
        console.warn(`No fine document found for fine ID: ${fineId}`);
        return null;
      }
      return { id: fineDoc.id, ...fineDoc.data() } as StudentFines;
    },
    CACHE_DURATIONS.FINES
  );
}

export const countFinesOfStudents = async (status: string, selectedTerm?: { AY: string; semester: string } | null) => { 
  const currUser = await getCurrentUserData() as unknown as Member;
  const term = selectedTerm || await getActiveTerm();
  return cacheService.getOrFetch(
    `fines:count:${currUser.id}:${status}:${term?.AY}-${term?.semester}`,
    async () => {
      const coll = collection(db, "fines");
      let q = null;
      if (status === "all") {
        q = query(
          coll,
          and(
            where("metadata.isArchived", "==", false),
            where("orgId", "==", currUser.orgId),
            where("academicYear", "==", term!.AY),
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
          )
        );
      } else {
        q = query(coll,
          and(
            where("metadata.isArchived", "==", false),
            where("orgId", "==", currUser.orgId),
            where("status", "==", status),
            where("academicYear", "==", term!.AY),
            or(
              where("semester", "==", term!.semester),
              where("semester", "==", `${term!.semester} Semester`)
            )
          )  
        );
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    CACHE_DURATIONS.FINES
  );
}


export const countUnsettleFinesOfStudents = async (selectedTerm?: { AY: string; semester: string } | null) => { 
  const currUser = await getCurrentUserData() as unknown as Member;
  const term = selectedTerm || await getActiveTerm();
  return cacheService.getOrFetch(
    `fines:countUnsettled:${currUser.id}:${term?.AY}-${term?.semester}`,
    async () => {
      const coll = collection(db, "fines");
      let q = query(coll,
        and(
          where("metadata.isArchived", "==", false),
          where("orgId", "==", currUser.orgId),
          where("status", "==", "unpaid"),
          where("accumulatedAmount", ">", 0),
          where("academicYear", "==", term!.AY),
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
        )
      );
      let snapshot = await getCountFromServer(q);
      let total = snapshot.data().count;

      q = query(coll,
        and(
          where("metadata.isArchived", "==", false),
          where("orgId", "==", currUser.orgId),
          where("status", "==", "partial"),
          where("academicYear", "==", term!.AY),
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
        )
      );
      snapshot = await getCountFromServer(q);
      total += snapshot.data().count;

      q = query(coll,
        and(
          where("metadata.isArchived", "==", false),
          where("orgId", "==", currUser.orgId),
          where("status", "==", "pending"),
          where("academicYear", "==", term!.AY),
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
        )
      );
      snapshot = await getCountFromServer(q);
      total += snapshot.data().count;
      return total;
    },
    CACHE_DURATIONS.COUNTS
  );
}

export const countStudentsWithFines = async (selectedTerm?: { AY: string; semester: string } | null) => { 
  const currUser = await getCurrentUserData() as unknown as Member;
  const term = selectedTerm || await getActiveTerm();
  return cacheService.getOrFetch(
    `fines:countWithFines:${currUser.id}:${term?.AY}-${term?.semester}`,
    async () => {
      const coll = collection(db, "fines");
      const q = query(coll,
        and(
          where("metadata.isArchived", "==", false),
          where("orgId", "==", currUser.orgId),
          where("accumulatedAmount", ">", 0),
          where("academicYear", "==", term!.AY),
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
        )
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    CACHE_DURATIONS.COUNTS
  );
}

export const getFineItemsByFineId = async (fineId: string) => {
  return cacheService.getOrFetch(
    CACHE_KEYS.fineItems(fineId),
    async () => {
      const fineDoc = await getDocs(query(collection(db, "fines", fineId, "fineItems"), where("isArchived", "==", false)));
      return fineDoc.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FineItem[];
    },
    CACHE_DURATIONS.FINES
  );
}



/**
 * Fetches fine documents with server-side pagination and searching.
 */
export const fetchFinesPaginated = async (
  orgId: string,
  pageSize: number = 9,
  lastVisibleDoc: any = null,
  searchTerm: string = "",
  statusFilter: string = "all",
  selectedTerm?: { AY: string; semester: string } | null
) => {
  const term = selectedTerm || await getActiveTerm();
  let constraints1: any[] = [
    where("orgId", "==", orgId),
    where("metadata.isArchived", "==", false),
    where("accumulatedAmount", ">", 0),
    where("academicYear", "==", term!.AY),
  ];

  let constraints2: any[] = [];

  if (statusFilter !== "all") {
    constraints1.push(where("status", "==", statusFilter));
  }

  // Normalize search term
  const isIdSearch = /\d/.test(searchTerm);
  const normalizedSearch = isIdSearch 
    ? searchTerm.trim() 
    : searchTerm.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  if (normalizedSearch) {
    const searchField = isIdSearch ? "studentId" : "userName";
    constraints1.push(where(searchField, ">=", normalizedSearch));
    constraints1.push(where(searchField, "<=", normalizedSearch + "\uf8ff"));
    constraints2.push(orderBy(searchField));
  } else {
    constraints2.push(orderBy("metadata.updatedAt", "desc"));
  }

  // Apply pagination
  constraints2.push(limit(pageSize));
  if (lastVisibleDoc) {
    constraints2.push(startAfter(lastVisibleDoc));
  }

  const q = query(finesCollection,
    and(
      ...constraints1,
      or(
        where("semester", "==", term!.semester),
        where("semester", "==", `${term!.semester} Semester`)
      )
    ),
    ...constraints2
  );
  const snapshot = await getDocs(q);

  const docs = snapshot.docs.map((doc) => {
    const data = { id: doc.id, ...doc.data() } as StudentFines;
    // Granular caching: Cache each document individually
    cacheService.set(CACHE_KEYS.fineDoc(doc.id), data, CACHE_DURATIONS.FINES);
    return data;
  });

  return {
    docs,
    lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
    allSnapshots: snapshot.docs,
  };
};

/**
 * Gets the total count of fine documents for an organization with optional search.
 */
export const getFinesCount = async (orgId: string, statusFilter: string = "all", searchTerm: string = "", selectedTerm?: { AY: string; semester: string } | null) => {
  const term = selectedTerm || await getActiveTerm();
  return cacheService.getOrFetch(
    CACHE_KEYS.clearanceCount(orgId, statusFilter, searchTerm).replace('clearance:count', `fines:count:${term?.AY}-${term?.semester}`),
    async () => {
      const constraints: any[] = [
        where("orgId", "==", orgId),
        where("metadata.isArchived", "==", false),
        where("accumulatedAmount", ">", 0),
        where("academicYear", "==", term!.AY),
      ];

      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }

      const isIdSearch = /\d/.test(searchTerm);
      const normalizedSearch = isIdSearch 
        ? searchTerm.trim() 
        : searchTerm.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

      if (normalizedSearch) {
        const searchField = isIdSearch ? "studentId" : "userName";
        constraints.push(where(searchField, ">=", normalizedSearch));
        constraints.push(where(searchField, "<=", normalizedSearch + "\uf8ff"));
      }

      const q = query(finesCollection,
        and(
          ...constraints,
          or(
            where("semester", "==", term!.semester),
            where("semester", "==", `${term!.semester} Semester`)
          )
        )
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    CACHE_DURATIONS.COUNTS
  );
};

export const subscribeFines = (
  orgId: string,
  onUpdate: (fines: StudentFines[]) => void,
  onError?: (error: Error) => void
) => {
  // Deprecated for the main roster due to performance with labels like 9,000 students
  console.warn("subscribeFines is deprecated for large datasets. Use fetchFinesPaginated instead.");
  const constraints = [
    where("metadata.isArchived", "==", false),
    where("orgId", "==", orgId),
    where("accumulatedAmount", ">", 0),
    orderBy("metadata.updatedAt", "desc"),
    limit(100), // Safety limit
  ];

  return onSnapshot(
    query(finesCollection, ...constraints),
    (snapshot) => {
      const fines = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as StudentFines[];
      onUpdate(fines);
    },
    (error) => onError?.(error)
  );
};

 
export const getFineItemsByIds = async (fineId: string, fineItemIds: string[]) => {
  if (!fineId || !fineItemIds.length) return [];
  const sortedIds = Array.from(new Set(fineItemIds)).sort();
  const hash = sortedIds.join(",");
  return cacheService.getOrFetch(
    `fines:items:subset:${fineId}:${hash}`,
    async () => {
      try {
        const colRef = collection(db, "fines", fineId, "fineItems");
        const chunks: string[][] = [];
        for (let i = 0; i < sortedIds.length; i += 30) {
          chunks.push(sortedIds.slice(i, i + 30));
        }
        const snapshots = await Promise.all(
          chunks.map((chunk) =>
            getDocs(query(colRef, where(documentId(), "in", chunk)))
          )
        );
        return snapshots
          .flatMap((snap) => snap.docs)
          .map((d) => ({ id: d.id, ...d.data() })) as FineItem[];
      } catch (error) {
        handleFirestoreError(error, "Fetching all fine items for a student");
        return [];
      }
    },
    CACHE_DURATIONS.FINES
  );
};

export const checkFineSeededForTerm = async (orgId: string, term: { AY: string; semester: string }) => {
  const doneSeeding = await getDocs(query(collection(db, "fines",),
  where("orgId", "==", orgId),
  where("metadata.isArchived", "==", false),
  where("academicYear", "==", term!.AY),
  where("semester", "==", term!.semester),
  limit(1)));
  
  if(doneSeeding.empty){
    return false;
  }
  return true;
 }

export const countFines = async () => {
  const finesCollection = collection(db, "fines");
  const snapshot = await getCountFromServer(finesCollection);
  return snapshot.data().count;
}
