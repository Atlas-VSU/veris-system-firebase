"use client";

import { AlertTriangle, Banknote, CircleDollarSign, Users } from "lucide-react";
import { StatCard } from "@/components/organization/general/StatCard";
import { StatCardsCarousel } from "@/components/organization/general/StatCardsCarousel";

interface FinesStatsProps {
  totalStudentsWithFines: number;
  totalUnpaidFines: number;
  totalCollectedFines: number;
  totalUnsettled: number;
}

/** The four headline figures above the fine roster. Presentational only. */
export function FinesStats({
  totalStudentsWithFines,
  totalUnpaidFines,
  totalCollectedFines,
  totalUnsettled,
}: FinesStatsProps) {
  return (
    <StatCardsCarousel className="grid-cols-4">
      <StatCard
        title="Students w/ Fines"
        value={totalStudentsWithFines.toLocaleString()}
        description="Have at least one fine"
        icon={Users}
        variant="info"
      />
      <StatCard
        title="Outstanding Balance"
        value={`₱${totalUnpaidFines.toLocaleString()}`}
        description="Total unpaid amount"
        icon={AlertTriangle}
        variant="danger"
      />
      <StatCard
        title="Total Collected"
        value={`₱${totalCollectedFines.toLocaleString()}`}
        description="Total approved payments"
        icon={Banknote}
        variant="success"
      />
      <StatCard
        title="Unsettled"
        value={totalUnsettled.toLocaleString()}
        description="Students with outstanding fines"
        icon={CircleDollarSign}
        variant="warning"
      />
    </StatCardsCarousel>
  );
}
