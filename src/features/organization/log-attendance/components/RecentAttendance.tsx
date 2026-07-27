import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LoaderIcon,
  EyeIcon,
  EyeOffIcon,
  ClockIcon,
  CheckCircleIcon,
  RefreshCcw,
  UsersIcon,
  Grid3X3,
  List,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "../utils";
import Link from "next/link";
import { getRecentAttendance } from "@/firebase";
import { AttendanceRecord, EventAttendance } from "../types";
import { toast } from "sonner";
import { record } from "zod";
import { getRemarkStyles } from "../../attendees/utils/remarkStyle";

interface RecentAttendanceProps {
  eventId: string;
  type: "time-in" | "time-out";
  organizationId?: string;
  // New prop to trigger a refresh when new attendance is logged
  newAttendanceLogged?: boolean;
}

// Global cache to persist data between component remounts
const attendanceCache = new Map<
  string,
  {
    records: EventAttendance[];
    timestamp: number;
  }
>();

const REFRESH_COOLDOWN = 3000;

export function RecentAttendance({
  eventId,
  type,
  organizationId = "",
  newAttendanceLogged = false,
}: RecentAttendanceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<EventAttendance[]>([]);
  const [showNames, setShowNames] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [refreshDisabled, setRefreshDisabled] = useState(false);

  // Track the last refresh timestamp
  const lastRefreshRef = useRef<number>(0);
  // Create a cache key based on event ID and type
  const cacheKey = `${eventId}-${type}`;
  const isInitialLoadRef = useRef(true);

  const loadAttendance = useCallback(
    async (forceRefresh = false) => {
      // Check if we should rate limit this refresh
      const now = Date.now();
      if (
        !forceRefresh &&
        !isInitialLoadRef.current &&
        now - lastRefreshRef.current < REFRESH_COOLDOWN
      ) {
        toast.info("Please wait before refreshing again");
        return;
      }

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }

      // Use cache if available and not forcing refresh
      if (!forceRefresh && attendanceCache.has(cacheKey)) {
        const cachedData = attendanceCache.get(cacheKey)!;
        setRecords(cachedData.records);
        return;
      }

      // Set loading state and disable refresh button
      setIsLoading(true);
      setRefreshDisabled(true);

      try {
        // Update the last refresh timestamp
        lastRefreshRef.current = now;
        // Fetch fresh data from Firestore
        const recentRecords = (await getRecentAttendance(
          eventId,
          type,
        )) as unknown as EventAttendance[];

        // Update the UI
        setRecords(recentRecords);
        // Store in cache
        attendanceCache.set(cacheKey, {
          records: recentRecords,
          timestamp: now,
        });
      } catch (error) {
        console.error("Failed to load recent attendance:", error);
        toast.error("Failed to load recent attendance");
        setRecords([]);
      } finally {
        setIsLoading(false);
        setTimeout(() => setRefreshDisabled(false), REFRESH_COOLDOWN);
      }
    },
    [eventId, type, cacheKey],
  );

  // Handle initial load and prop changes
  useEffect(() => {
    // Check if we have cached data
    if (attendanceCache.has(cacheKey)) {
      // Always use cache if it exists, regardless of age
      const cachedData = attendanceCache.get(cacheKey)!;
      setRecords(cachedData.records);
      // Just update the UI to show cache age
      return;
    }
    // Only load from Firestore if no cache exists at all
    loadAttendance(false);
  }, [cacheKey, loadAttendance]);

  // Refresh when a new attendance is logged
  useEffect(() => {
    if (newAttendanceLogged) {
      loadAttendance(true);
    }
  }, [newAttendanceLogged, loadAttendance]);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "Not recorded";
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Determine the attendees page URL
  const attendeesUrl = organizationId
    ? `/organization/${organizationId}/events/${eventId}/attendees`
    : `/org-events/${eventId}/attendees`;

  const handleRefreshClick = () => loadAttendance(true);

  // Calculate cache status
  const cachedData = attendanceCache.get(cacheKey);
  const cacheAge = cachedData
    ? Math.floor((Date.now() - cachedData.timestamp) / 1000)
    : 0;
  const hasCache = !!cachedData;

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-soft">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">
              Recent {type === "time-in" ? "Time-Ins" : "Time-Outs"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Students who have recently{" "}
              {type === "time-in" ? "timed in" : "timed out"} for this event
            </p>
            {hasCache && (
              <p className="text-xs mt-0.5 text-muted-foreground font-semibold">
                Data cached {cacheAge} seconds ago
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
          <div className="inline-flex items-center rounded-full border border-border/40 bg-white/60 p-1 w-full sm:w-auto">
            {/* List/Grid toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className={cn(
                "hidden sm:flex flex-1 h-9 rounded-full text-xs font-semibold transition-colors px-4",
                viewMode !== "grid"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {viewMode === "grid" ? (
                <>
                  <List className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                  <span className="sm:inline">List</span>
                </>
              ) : (
                <>
                  <Grid3X3 className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                  <span className="sm:inline">Grid</span>
                </>
              )}
            </Button>

            <div className="hidden sm:block h-6 border-l border-border/30 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefreshClick}
              disabled={refreshDisabled || isLoading}
              className="flex-1 h-9 rounded-full text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors px-4"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 mr-1.5 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="sm:inline">Refresh</span>
            </Button>

            <div className="h-6 border-l border-border/30 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNames(!showNames)}
              className="flex-1 h-9 rounded-full text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors px-4"
            >
              {showNames ? (
                <>
                  <EyeOffIcon className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                  <span className="sm:inline">Hide</span>
                </>
              ) : (
                <>
                  <EyeIcon className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                  <span className="sm:inline">Show</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border/40" />

      {isLoading ? (
        <div className="flex justify-center items-center py-12 rounded-2xl border border-border/40 bg-white/60">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-border/40 bg-white/60">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/10 text-primary">
            <UsersIcon className="w-8 h-8" />
          </div>
          <h4 className="font-serif text-lg font-bold text-foreground mb-2">
            No {type === "time-in" ? "time-ins" : "time-outs"} recorded yet
          </h4>
          <p className="text-sm text-muted-foreground">
            Attendance records will appear here once students start checking{" "}
            {type === "time-in" ? "in" : "out"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col flex-1">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 flex-1">
                {records.map((record) => {
                  const remarkStyles = getRemarkStyles(record.remark!);
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "h-28 sm:h-32 rounded-2xl p-3 sm:p-4 border transition-all duration-300 shadow-xs hover:shadow-md flex flex-col relative",
                        record.remark
                          ? `${remarkStyles.border} ${remarkStyles.bg}`
                          : "bg-white/60 border-border/40 hover:bg-white hover:border-primary/30"
                      )}
                    >
                      {record.remark && (
                        <div className="absolute top-2 right-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border shadow-sm">
                            <AvatarFallback className="font-semibold text-primary-foreground bg-primary text-sm">
                              {showNames
                                ? getInitials(
                                    record.student.firstName +
                                      " " +
                                      record.student.lastName,
                                  )
                                : "ST"}
                            </AvatarFallback>
                          </Avatar>
                          {record.remark && (
                            <div className="absolute -top-1 -right-1 h-3 sm:h-4 sm:w-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                              <AlertTriangle className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans font-bold text-foreground truncate text-sm sm:text-base">
                            {showNames
                              ? record.student.firstName +
                                " " +
                                record.student.lastName
                              : "Student"}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground font-semibold truncate">
                            ID: {record.student.studentId}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="flex items-center font-semibold text-xs bg-primary/10 text-primary border-primary/25"
                        >
                          <CheckCircleIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                          Success
                        </Badge>
                      </div>

                      <div className="flex justify-between items-end mt-auto">
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground font-semibold">
                          <ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 text-primary" />
                          <span>
                            {formatTime(
                              type === "time-in"
                                ? record.timeIn
                                : record.timeOut,
                            )}
                          </span>
                        </div>
                        {record.remark && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium flex items-center gap-1 ${remarkStyles.bg} ${remarkStyles.text} ${remarkStyles.border}`}
                          >
                            {remarkStyles.icon}
                            <span>{record.remark}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {records.map((record) => {
                  const remarkStyles = getRemarkStyles(record.remark!);
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "rounded-2xl p-4 border transition-all duration-300 shadow-xs hover:shadow-md relative",
                        record.remark
                          ? `${remarkStyles.border} ${remarkStyles.bg}`
                          : "bg-white/60 border-border/40 hover:bg-white hover:border-primary/30"
                      )}
                    >
                      {record.remark && (
                        <div className="absolute top-4 right-4">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <Avatar className="h-9 w-9 border-2 border-border shadow-sm">
                              <AvatarFallback className="font-semibold text-primary-foreground bg-primary text-sm">
                                {showNames
                                  ? getInitials(
                                      record.student.firstName +
                                        " " +
                                        record.student.lastName,
                                    )
                                  : "ST"}
                              </AvatarFallback>
                            </Avatar>
                            {record.remark && (
                              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                                <AlertTriangle className="h-1.5 w-1.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-sans font-bold text-foreground truncate">
                                {showNames
                                  ? record.student.firstName +
                                    " " +
                                    record.student.lastName
                                  : "Student"}
                              </p>
                              <p className="text-sm text-muted-foreground font-semibold">
                                ID: {record.student.studentId}
                              </p>
                              {record.remark && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium flex items-center gap-1 ${remarkStyles.bg} ${remarkStyles.text} ${remarkStyles.border}`}
                                >
                                  {remarkStyles.icon}
                                  <span>{record.remark}</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center text-sm text-muted-foreground font-semibold">
                            <ClockIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
                            <span>
                              {formatTime(
                                type === "time-in"
                                  ? record.timeIn
                                  : record.timeOut,
                              )}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="flex items-center font-bold bg-primary/10 text-primary border-primary/25"
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View All Attendees Button */}
          {!isLoading && (
            <div className="flex justify-center pt-4">
              <Button
                asChild
                variant="outline"
                className="cursor-pointer hover:scale-105"
              >
                <Link href={attendeesUrl}>
                  <UsersIcon className="h-4 w-4 mr-2 text-primary" />
                  View All Attendees
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
