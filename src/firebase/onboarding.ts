import { assignExistingFeesToStudent } from "./fees";
import { assignExistingFinesToStudent } from "./fines/create/fines";
import { buildClearanceId } from "./clearance";
import { ClearanceStatus } from "@/features/organization/clearance/types";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase.config";
import { getActiveTerm } from "./term";

export const onboardNewStudent = async (
  userId: string,
  studentData: { firstName: string; lastName: string; studentId: string; programId?: string; facultyId?: string },
  allOrgs: any[],
  userData: any
) => {
  const activeTerm = await getActiveTerm();
  if (!activeTerm) return;

  for (const org of allOrgs) {
    const matches = org.subscribed && (
      (org.accessLevel === 1 && org.programId && org.programId === studentData.programId) ||
      (org.accessLevel === 2 && org.facultyId && org.facultyId === studentData.facultyId) ||
      (org.accessLevel === 3) // University-wide orgs always match
    );

    if (!matches) continue;

    const clearanceId = buildClearanceId(userId, org.id, org.accessLevel, activeTerm);
    const clearanceRef = doc(db, 'clearanceStatus', clearanceId);
    const now = Timestamp.now();
    const defaultDueDate = Timestamp.fromDate(new Date('2026-12-30')); // Default or use what's in clearance.ts

    const clearanceData: ClearanceStatus = {
      id: clearanceId,
      orgId: org.id,
      userId: userId,
      userName: `${studentData.firstName} ${studentData.lastName}`,
      studentId: studentData.studentId || "N/A",
      academicYear: activeTerm.AY,
      semester: activeTerm.semester,
      status: 'cleared',
      visibility: 'public',
      blockingItems: {},
      clearanceDate: null,
      lastCalculatedAt: now,
      startDate: now,
      dueDate: defaultDueDate,
      createdAt: now,
      updatedAt: now,
      isArchived: false
    };

    await setDoc(clearanceRef, clearanceData);

    const orgContext = { uid: org.id, accessLevel: org.accessLevel };

    await assignExistingFeesToStudent(userId, studentData, orgContext, userData);
    await assignExistingFinesToStudent(userId, studentData, orgContext, userData);
  }
};
