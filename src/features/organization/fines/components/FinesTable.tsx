"use client";

import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentFines } from "@/features/organization/fines/types";
import { getVariantFineType } from "@/features/organization/fines/utils/getVariantFineType";

interface FinesTableProps {
  paginated: StudentFines[];
  onOpenBreakdown: (fine: StudentFines) => void;
}

/** Table view of the student fine roster. */
export function FinesTable({ paginated, onOpenBreakdown }: FinesTableProps) {
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>Student</TableHead>
            <TableHead className="text-center"># Fines</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="text-right hidden md:table-cell">
              Amount Paid
            </TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((fine) => {
            const cfg = getVariantFineType(fine.status);
            return (
              <TableRow
                key={fine.id}
                className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onOpenBreakdown(fine)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                      {fine.userName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {fine.studentId}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm font-medium">
                  {fine.fineItemsCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-foreground whitespace-nowrap">
                  ₱{fine.accumulatedAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={cfg}
                    className="capitalize text-xs whitespace-nowrap"
                  >
                    {fine.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-green-600 hidden md:table-cell whitespace-nowrap">
                  ₱{fine.paidAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-foreground whitespace-nowrap">
                  ₱{fine.balance < 0 ? "0" : fine.balance.toLocaleString()}
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
