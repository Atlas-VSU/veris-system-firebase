import { db } from "@/firebase/firebase.config";
import { Member } from "@/features/organization/members/types";
import { getCurrentUserCount, getCurrentUserData } from "@/firebase/users";
import {
  doc,
  DocumentReference,
  DocumentSnapshot,
  getDocFromServer,
  runTransaction,
  Transaction,
} from "firebase/firestore";
import { createStats, StatsData } from "../create/addStats";
import { getStats } from "../read/getStats";

export interface FineStatsDelta {
  totalFinesDelta?: number;
  totalUnpaidDelta?: number;
  totalCollectedDelta?: number;
}

const resolveSeedMeta = async (customId: string, orgIdOverride?: string) => {
  const statsRef = doc(db, "stats", customId);
  let snapshotExists = false;
  try {
    const snap = await getDocFromServer(statsRef);
    snapshotExists = snap.exists();
  } catch {
    // Offline/transient fallback handled inside runTransaction
  }

  let resolvedOrgId = orgIdOverride || "";
  let totalStudents = 0;
  if (!snapshotExists) {
    const currUser = (await getCurrentUserData()) as unknown as Member | null;
    if (!resolvedOrgId) {
      resolvedOrgId = currUser?.orgId || "";
    }
    totalStudents = (await getCurrentUserCount()) || 0;
  }

  return { statsRef, resolvedOrgId, totalStudents };
};

export const ensureFineStatsDoc = async (customId: string, orgIdOverride?: string): Promise<void> => {
  const { statsRef, resolvedOrgId, totalStudents } = await resolveSeedMeta(customId, orgIdOverride);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(statsRef);
    if (snap.exists()) return;
    const initialStats: StatsData = {
      id: customId,
      orgId: resolvedOrgId,
      totalStudents,
      totalFines: 0,
      totalFees: 0,
      totalCollectedFines: 0,
      totalCollectedFees: 0,
      totalUnpaidFines: 0,
      totalUnpaidFees: 0,
    };
    transaction.set(statsRef, initialStats);
  });
};

export const applyFineStatsDeltaInTx = (
  transaction: Transaction,
  statsRef: DocumentReference,
  statsSnap: DocumentSnapshot,
  seed: { customId: string; orgId: string; totalStudents: number },
  delta: FineStatsDelta
) => {
  const totalFinesDelta = Number(delta.totalFinesDelta ?? 0);
  const totalUnpaidDelta = Number(delta.totalUnpaidDelta ?? 0);
  const totalCollectedDelta = Number(delta.totalCollectedDelta ?? 0);

  if (totalFinesDelta === 0 && totalUnpaidDelta === 0 && totalCollectedDelta === 0) {
    return;
  }

  if (statsSnap.exists()) {
    const existing = statsSnap.data() as StatsData;
    transaction.update(statsRef, {
      totalFines: Math.max(0, Number(existing.totalFines ?? 0) + totalFinesDelta),
      totalUnpaidFines: Math.max(0, Number(existing.totalUnpaidFines ?? 0) + totalUnpaidDelta),
      totalCollectedFines: Math.max(0, Number(existing.totalCollectedFines ?? 0) + totalCollectedDelta),
    });
  } else {
    const initialStats: StatsData = {
      id: seed.customId,
      orgId: seed.orgId,
      totalStudents: seed.totalStudents,
      totalFines: Math.max(0, totalFinesDelta),
      totalFees: 0,
      totalCollectedFines: Math.max(0, totalCollectedDelta),
      totalCollectedFees: 0,
      totalUnpaidFines: Math.max(0, totalUnpaidDelta),
      totalUnpaidFees: 0,
    };
    transaction.set(statsRef, initialStats);
  }
};

export const updateFineStats = async (customId: string, toAdd?: number, toDeduct?: number, toWaive?: number) => {
    try {
        let statsData = null;
        statsData = await getStats(customId) as StatsData;
        if (statsData) {
            if (toAdd) {
                statsData.totalUnpaidFines += toAdd;
                statsData.totalFines += toAdd;
            }
            if (toDeduct) {
                statsData.totalUnpaidFines -= toDeduct;
                statsData.totalCollectedFines += toDeduct;
            }
            //Since waiving means no collection, we only deduct from total fines and total unpaid fines.
            if (toWaive) {
                statsData.totalUnpaidFines = Math.max(0, statsData.totalUnpaidFines - toWaive);
                statsData.totalFines = Math.max(0, statsData.totalFines - toWaive);
            }
        } else {
            const currUser = await getCurrentUserData() as unknown as Member;
            statsData = {
                id: customId,
                orgId: currUser?.orgId,
                totalStudents: 0,
                totalFines: toAdd ? toAdd : 0,
                totalFees: 0,
                totalCollectedFines: toDeduct ? toDeduct : 0,
                totalCollectedFees: 0,
                totalUnpaidFines: toAdd ? toAdd : 0,
                totalUnpaidFees: 0,
            } as StatsData;
        }
        await createStats(customId, statsData);
    } catch (error) {
        console.error("Error updating fine stats: ", error);
    }
};


export const updateFeeStats = async (customId: string, toAdd?: number, toDeduct?: number) => {
    try {
        let statsData = null;
        statsData = await getStats(customId) as StatsData;
        if (statsData) {
            if (toAdd) {
                statsData.totalUnpaidFees += toAdd;
                statsData.totalFees += toAdd;
            }
            if (toDeduct) {
                statsData.totalUnpaidFees -= toDeduct;
                statsData.totalCollectedFees += toDeduct;
            }
        } else {
            const currUser = await getCurrentUserData() as unknown as Member;
            statsData = {
                id: customId,
                orgId: currUser?.orgId,
                totalStudents: 0,
                totalFines: 0,
                totalFees: toAdd ? toAdd : 0,
                totalCollectedFines: 0,
                totalCollectedFees: toDeduct ? toDeduct : 0,
                totalUnpaidFines: 0,
                totalUnpaidFees: toAdd ? toAdd : 0,
            } as StatsData;
        }
        await createStats(customId, statsData);
    } catch (error) {
        console.error("Error updating fine stats: ", error);
    }
};


export const updateStudentStats = async (customId: string, toAdd?: number, toDeduct?: number) => {
    try {
        let statsData = null;
        statsData = await getStats(customId) as StatsData;
        if (statsData) {
            if (toAdd) {
                statsData.totalStudents += toAdd;
            }
            if (toDeduct) {
                statsData.totalUnpaidFees -= toDeduct;
            }
        } else {
            const currUser = await getCurrentUserData() as unknown as Member;
            statsData = {
                id: customId,
                orgId: currUser?.orgId,
                totalStudents: toAdd ? toAdd : toDeduct ? toDeduct : 0,
                totalFines: 0,
                totalFees: 0,
                totalCollectedFines: 0,
                totalCollectedFees: 0,
                totalUnpaidFines: 0,
                totalUnpaidFees: 0,
            } as StatsData;
        }
        await createStats(customId, statsData);
    } catch (error) {
        console.error("Error updating fine stats: ", error);
    }
};
