"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinesEmptyStateProps {
  /** True when a search or status filter is narrowing the list. */
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Shown when the roster is initialized but has nothing to list.
 *
 * Distinct from `FinesUninitializedState`, which means the term was never
 * seeded — the two look similar but call for opposite actions, so keeping them
 * as separate components stops the wrong one being reached for.
 */
export function FinesEmptyState({
  hasActiveFilters,
  onClearFilters,
}: FinesEmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No fines found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {hasActiveFilters
          ? "No students match your current filters. Try adjusting your search or filter criteria."
          : "No students currently have fines. Fines will appear here when issued."}
      </p>
      {hasActiveFilters && (
        <Button variant="outline" className="mt-4" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
