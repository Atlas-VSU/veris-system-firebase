import { Button } from "@/components/ui/button";
import { Event } from "../../events/types";
import { UserPlus, Upload, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendeesHeaderProps {
  event: Event;
  onExport: () => void;
  onGenerateFines?: () => void;
  isExporting?: boolean;
  isGenerating?: boolean;
}

export function AttendeesHeader({
  event,
  onExport,
  isExporting = false,
  onGenerateFines,
  isGenerating = false,
}: AttendeesHeaderProps) {

  const { selected } = useTermPeriod()
  
  return (
    <div className="bg-[#FEFEFA] border border-border/50 rounded-3xl p-6 shadow-soft transition-all duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-soft">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">
              Manage Attendees
            </h2>
            <p className="text-sm text-muted-foreground">
              View, track, and export attendance records
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className={event.finesGenerated ? "flex flex-col sm:flex-col gap-2" : "flex flex-col sm:flex-row gap-2"}>
          {(event.status === "ongoing" || event.status === "completed") && !event.finesGenerated && (
            <Button
              asChild
              className="justify-center gap-1.5"
            >
              <Link href={`/org-events/${event.id}/log-attendance`}>
                <UserPlus className="h-4 w-4 mr-2" />
                {event.status === "completed"
                  ? "Log Special Attendance"
                  : "Log Attendance"}
              </Link>
            </Button>
          )}

          {event.status === "completed" && !event.finesGenerated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="outline"
                      onClick={onGenerateFines}
                      disabled={isGenerating || !selected?.isActive}
                    >
                      <Zap className="size-4 mr-1 text-primary" />
                      Generate Fines
                    </Button>
                  </span>
                </TooltipTrigger>
                {!selected?.isActive && (
                  <TooltipContent>
                    <p>Fine generation is disabled for inactive academic terms</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          <Button
            variant="outline"
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                Exporting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2 text-primary" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
