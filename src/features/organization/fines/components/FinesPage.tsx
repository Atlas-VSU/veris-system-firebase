"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { DataPagination } from "@/components/organization/general/DataPagination";
import { PageHeader } from "@/components/organization/general/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/organization/skeleton/TableSkeleton";
import { CardGridSkeleton } from "@/components/organization/skeleton/CardGridSkeleton";

import { FineType, StudentFines } from "@/features/organization/fines/types";
import { useFines } from "@/features/organization/fines/hooks/useFines";
import { useFineTypes } from "@/features/organization/fines/hooks/useFineTypes";
import { FinesFilters } from "@/features/organization/fines/components/FinesFilters";
import { FinesStats } from "@/features/organization/fines/components/FinesStats";
import { FinesTable } from "@/features/organization/fines/components/FinesTable";
import { FineCard } from "@/features/organization/fines/components/FineCard";
import { FinesEmptyState } from "@/features/organization/fines/components/FinesEmptyState";
import { FinesUninitializedState } from "@/features/organization/fines/components/FinesUninitializedState";
import { BulkGenerationDialog } from "@/features/organization/fines/components/BulkGenerationDialog";
import { FineBreakdownDialog } from "@/features/organization/fines/components/FineBreakdownDialog";
import { FineTypeDialog } from "@/features/organization/fines/components/FineTypeDialog";

const ITEMS_PER_PAGE = 9;

/**
 * Fines management screen.
 *
 * Orchestration only: it owns the dialog/view state and decides WHICH view the
 * roster card shows. Rendering each of those views lives in its own component
 * — `FinesStats`, `FinesTable`, `FineCard`, and the two empty states — matching
 * how the clearance feature is laid out.
 */
export function FinesPage() {
  const [selectedFine, setSelectedFine] = useState<StudentFines | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedFineType, setSelectedFineType] = useState<FineType | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    paginatedFines,
    doneSeeding,
    filteredCount,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    search,
    setSearch,
    filterStatus,
    handleStatusFilterChange,
    totalStudentsWithFines,
    totalUnsettled,
    totalUnpaidFines,
    totalCollectedFines,
    hardRefresh,
    setPaginatedFines,
    setTotalCount,
    refreshFineItems,
    AY,
    sem,
  } = useFines({ itemsPerPage: ITEMS_PER_PAGE });

  const {
    fineTypes,
    isFormSubmitting,
    fetchFineTypes,
    handleAddFineSubmission,
    handleUpdateFineType,
    handleDeleteFineType,
  } = useFineTypes();

  useEffect(() => {
    fetchFineTypes();
  }, []);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  const handleSearchCommit = () => {
    setSearch(searchTerm);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    setSearch("");
    setCurrentPage(1);
  };

  const openBreakdown = (fine: StudentFines) => {
    setSelectedFine(fine);
    setIsBreakdownOpen(true);
  };

  const handleAddFineType = () => {
    setSelectedFineType(null);
    setIsFormOpen(true);
  };

  const handleSuccess = async () => {
    const newFines = paginatedFines.filter(
      (f) => f.studentId !== selectedFine?.studentId,
    );
    setPaginatedFines(newFines);
    refreshFineItems();
    setTotalCount((prev) => prev - 1);
  };

  const hasActiveFilters = Boolean(search) || filterStatus !== "all";

  /**
   * The roster card's body, in priority order: still loading, never seeded,
   * seeded but empty, then the chosen view. Extracted so the precedence is
   * readable in one place rather than as a chain of nested ternaries.
   */
  const renderRoster = () => {
    if (isLoading) {
      return viewMode === "table" ? (
        <TableSkeleton columns={7} rows={9} />
      ) : (
        <CardGridSkeleton count={9} />
      );
    }

    if (!doneSeeding) {
      return (
        <FinesUninitializedState
          onInitializeClick={() => setIsBulkGenerateOpen(true)}
        />
      );
    }

    if (paginatedFines.length === 0) {
      return (
        <FinesEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleSearchClear}
        />
      );
    }

    if (viewMode === "table") {
      return (
        <FinesTable paginated={paginatedFines} onOpenBreakdown={openBreakdown} />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedFines.map((fine) => (
          <FineCard key={fine.id} fine={fine} onOpenBreakdown={openBreakdown} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-5 lg:pb-0">
      <PageHeader
        variant="admin"
        title="Fines Management"
        context={`${sem} Semester · A.Y. ${AY}`}
        description="Track and manage student fines with real-time payment status"
        action={
          <div className="hidden lg:flex">
            {/* PLEASE DON'T REMOVE THIS YET */}
            {/* NOTE: THIS IS THE BUTTON TO TRIGGER BULK GENERATION OF STUDENT FINE RECORDS FOR ALL STUDENTS OR MEMBERS THAT ARE ALREADY ADDED IN THE DATABASE */}
            {/* USING THIS MEANS A BRUTEFORCE SINCE STUDENT FINE RECORDS SHOULD BE MADE TOGETHER WITH THE CLEARANCE AS SOON AS A STUDENT WAS ADDED TO THE SYSTEM */}
            {/* <Button size="sm" onClick={() => setIsBulkGenerateOpen(true)}>
              Seed Fines to All Users
            </Button> */}

            <Button size="sm" onClick={handleAddFineType} className="gap-1.5">
              <Eye className="h-4 w-4" />
              View Fine Types
            </Button>
          </div>
        }
      />

      <Button size="sm" onClick={handleAddFineType} className="lg:hidden w-full">
        <Eye className="h-4 w-4" />
        View Fine Types
      </Button>

      <FinesStats
        totalStudentsWithFines={totalStudentsWithFines}
        totalUnpaidFines={totalUnpaidFines}
        totalCollectedFines={totalCollectedFines}
        totalUnsettled={totalUnsettled}
      />

      <FinesFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchCommit={handleSearchCommit}
        onSearchClear={handleSearchClear}
        statusFilter={filterStatus}
        onStatusChange={(v) => {
          handleStatusFilterChange(v);
          setCurrentPage(1);
        }}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onRefresh={hardRefresh}
        disabled={isLoading}
      />

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Student Fine Records
              </CardTitle>
              <CardDescription>
                {filteredCount} student{filteredCount !== 1 ? "s" : ""} with
                active fines
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {renderRoster()}

          {paginatedFines.length > 0 && (
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCount}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <FineTypeDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        fineTypes={fineTypes}
        onAddFineType={handleAddFineSubmission}
        onUpdateFineType={handleUpdateFineType}
        onDeleteFineType={handleDeleteFineType}
        isProcessing={isFormSubmitting}
        fetchFineTypes={fetchFineTypes}
      />

      <BulkGenerationDialog
        open={isBulkGenerateOpen}
        onOpenChange={setIsBulkGenerateOpen}
        onSuccess={hardRefresh}
      />

      <FineBreakdownDialog
        open={isBreakdownOpen}
        onOpenChange={setIsBreakdownOpen}
        fines={selectedFine}
        onSuccess={() => handleSuccess()}
      />
    </div>
  );
}
