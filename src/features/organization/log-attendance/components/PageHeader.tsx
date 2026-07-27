import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ArrowLeftIcon, ClockIcon, StarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { formatTimeRange } from "../utils";
import { Event } from "../../events/types";
import { formatDate } from "@/utils/useGeneralUtils";

interface PageHeaderProps {
  event: Event;
}

function StatusBadge({ status }: { status: Event["status"] }) {
  switch (status) {
    case "ongoing":
      return (
        <Badge className="bg-primary/20 text-primary border border-primary/30 font-semibold text-xs px-2.5 py-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse inline-block" />
          Ongoing
        </Badge>
      )
    case "upcoming":
      return (
        <Badge className="bg-secondary/20 text-secondary border border-secondary/30 font-semibold text-xs px-2.5 py-1">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Upcoming
        </Badge>
      )
    case "completed":
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border/40 font-semibold text-xs px-2.5 py-1">
          Completed
        </Badge>
      )
    case "archived":
      return (
        <Badge variant="outline" className="text-muted-foreground border-border/20 font-semibold text-xs px-2.5 py-1">
          Archived
        </Badge>
      )
  }
}

export function PageHeader({ event }: PageHeaderProps) {
  return (
    <div className="bg-[#FEFEFA] border border-border/50 rounded-3xl p-6 shadow-soft mb-6 transition-all duration-300">
      {/* Top row: back button + title */}
      <div className="flex items-start gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          asChild
          className="h-10 w-10 rounded-full shadow-soft transition-all duration-200 hover:scale-105"
        >
          <Link href={`/org-events`}>
            <ArrowLeftIcon className="h-4 w-4 text-primary" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-serif text-2xl font-extrabold text-foreground tracking-tight">
              {event.status === "completed" ? "Log Special Attendance" : "Log Attendance"}
            </h1>
            {event.status === "ongoing" && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.status === "completed"
              ? "Record special attendance for this completed event"
              : "Record student attendance for this event"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-6 border-b border-border/40" />

      {/* Event info */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          {/* Name + badges */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-2xl font-bold text-foreground break-words leading-tight">
                {event.name}
              </h2>
              <div className="w-12 h-1 rounded-full bg-primary mt-2" />
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              <StatusBadge status={event.status} />
              {event.majorEvent && (
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-xs font-semibold shadow-soft flex items-center gap-1 bg-[#FEFEFA] text-[#C18C5D] border-[#C18C5D]/30"
                >
                  <StarIcon className="h-3 w-3 fill-[#C18C5D]" />
                  Major
                </Badge>
              )}
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Date */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/60 border border-border/40">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Event Date
                </p>
                <p className="text-sm font-bold text-foreground truncate">
                  {formatDate(event.date)}
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/60 border border-border/40">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                <ClockIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Schedule
                </p>
                {event.timeInStart && event.timeInEnd ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                      In: {formatTimeRange(event.timeInStart, event.timeInEnd)}
                    </p>
                    {event.timeOutStart && event.timeOutEnd && (
                      <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Out: {formatTimeRange(event.timeOutStart, event.timeOutEnd)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">
                    No time schedule set
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/60 border border-border/40">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                  <MapPinIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {event.location}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}