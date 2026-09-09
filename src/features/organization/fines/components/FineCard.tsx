"use client";

import {
  AlertTriangle,
  Banknote,
  ChevronRight,
  CircleDollarSign,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentFines } from "@/features/organization/fines/types";
import { getVariantFineType } from "@/features/organization/fines/utils/getVariantFineType";

interface FineCardProps {
  fine: StudentFines;
  onOpenBreakdown: (fine: StudentFines) => void;
}

/**
 * One student's fine summary in card view.
 *
 * Renders two layouts and lets CSS pick: a compact stacked one below `md`, and
 * the fuller labelled one at `md` and above. They are separate trees rather
 * than one responsive tree because the two arrange the same figures
 * differently enough that a single set of breakpoint classes was harder to
 * follow than two explicit layouts.
 */
export function FineCard({ fine, onOpenBreakdown }: FineCardProps) {
  const cfg = getVariantFineType(fine.status);

  return (
    <>
      {/* Mobile Layout (< md) */}
      <Card
        className="md:hidden group hover:shadow-md active:shadow-sm transition-all duration-200 border-border bg-card overflow-hidden cursor-pointer"
        onClick={() => onOpenBreakdown(fine)}
      >
        <CardContent className="p-0">
          <div className="w-full p-3 flex items-center gap-3 text-left active:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-foreground w-[200px] truncate">
                  {fine.userName}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={cfg} className="capitalize text-xs px-1.5 py-0.5">
                  {fine.status}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{fine.studentId}</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </div>

          <div className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-foreground">₱{fine.accumulatedAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-green-600">₱{fine.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-semibold text-foreground">₱{fine.balance < 0 ? "0" : fine.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs pt-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {fine.fineItemsCount.toLocaleString()} fine{fine.fineItemsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Layout (>= md) */}
      <Card
        className="hidden md:flex group border-border bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex-col overflow-hidden"
        onClick={() => onOpenBreakdown(fine)}
      >
        <CardHeader className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge
                  variant={cfg}
                  className="capitalize text-xs px-2.5 py-1"
                >
                  {fine.status}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground leading-tight max-w-[200px] truncate">
                {fine.userName}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <span>{fine.studentId}</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>

        <div className="border-t border-border mx-5" />

        <CardContent className="px-5 py-4 flex-1 flex flex-col gap-4">
          <FineCardMetric
            icon={FileText}
            label="# Fines"
            value={fine.fineItemsCount.toLocaleString()}
          />
          <FineCardMetric
            icon={CircleDollarSign}
            label="Total Amount"
            value={`₱${fine.accumulatedAmount.toLocaleString()}`}
          />
          <FineCardMetric
            icon={Banknote}
            label="Amount Paid"
            value={`₱${fine.paidAmount.toLocaleString()}`}
            valueClassName="text-green-600"
          />
          <FineCardMetric
            icon={AlertTriangle}
            label="Balance"
            // Intentionally unclamped, matching the previous markup: the desktop
            // card shows a negative balance (an overpayment) as-is, while the
            // table and mobile card floor it at zero.
            value={`₱${fine.balance.toLocaleString()}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

/** One icon + label + value row in the desktop card body. */
function FineCardMetric({
  icon: Icon,
  label,
  value,
  valueClassName = "text-foreground",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-semibold ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}
