import { Skeleton } from "@/components/ui/skeleton";

export function AttendanceListSkeleton() {
  return (
    <div className="bg-[#FEFEFA] border border-border/50 rounded-3xl shadow-soft">
      {/* Header Skeleton */}
      <div className="p-6 border-b border-border/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>

       {/* Legend Skeleton */}
        <div className="mt-4 p-3 rounded-2xl bg-white/60 border border-border/40">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
      </div>

      {/* List Skeleton */}
      <div className="p-6">
        <div className="space-y-3">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/60 border border-border/40"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Student Info Skeleton */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Time Records Skeleton */}
                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                    <Skeleton className="h-8 w-32 rounded-full" />
                    <Skeleton className="h-8 w-32 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
