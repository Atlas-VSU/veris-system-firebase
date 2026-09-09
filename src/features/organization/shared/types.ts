/**
 * Shared vocabulary for "initialize this term's records" flows.
 *
 * Fines and clearance both seed a per-student document set at the start of a
 * term, and both report the same four phases while doing it. The two features
 * had grown their own copies of this shape; one type keeps their dialogs,
 * progress bars and hooks from drifting apart.
 */

export type SeedPhase = "preflight" | "writing" | "done" | "error";

export interface SeedProgress {
  phase: SeedPhase;
  message: string;
  /** Records written so far. Seeders with no batch reporting leave this at 0. */
  committed: number;
  /** Records expected in total. 0 when the seeder cannot know it up front. */
  totalUsers: number;
  batchNum?: number;
  totalBatches?: number;
}

/** Passed to a seeder so it can report progress as it writes. */
export type OnSeedProgress = (update: SeedProgress) => void;

/**
 * What a seeder may resolve with. Returning `success: false` is treated exactly
 * like throwing, so a seeder that reports partial failure by return value
 * (`createBulkFines`) and one that throws (`seedClearanceDocuments`) both land
 * in the error phase without their callers special-casing either.
 */
export interface SeedOutcome {
  success: boolean;
  message?: string;
}

/**
 * A seeding operation. `report` is optional to call — a seeder with no
 * batch-level visibility can simply do its work and resolve.
 */
export type SeedRunner = (
  report: OnSeedProgress
) => Promise<SeedOutcome | void>;
