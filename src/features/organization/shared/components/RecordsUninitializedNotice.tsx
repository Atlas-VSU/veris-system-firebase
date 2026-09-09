"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordsUninitializedNoticeProps {
  /** Illustrative icon for the empty state — e.g. ShieldAlert, ReceiptText. */
  icon: LucideIcon;
  title: string;
  /** The main explanation. Kept as a node so callers can emphasise inline. */
  description: React.ReactNode;
  /** Secondary line, rendered smaller and dimmer. Optional. */
  hint?: React.ReactNode;
  actionLabel: string;
  actionIcon?: LucideIcon;
  onAction: () => void;
  /** Disables the call to action — e.g. while the term is still loading. */
  disabled?: boolean;
}

export function RecordsUninitializedNotice({
  icon: Icon,
  title,
  description,
  hint,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  disabled = false,
}: RecordsUninitializedNoticeProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Icon className="h-10 w-10 animate-pulse" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {hint && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground opacity-80">
          {hint}
        </p>
      )}

      <Button
        variant="outline"
        className="mt-6 gap-1.5 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
        onClick={onAction}
        disabled={disabled}
      >
        {ActionIcon && <ActionIcon className="h-4 w-4" />}
        {actionLabel}
      </Button>
    </div>
  );
}
