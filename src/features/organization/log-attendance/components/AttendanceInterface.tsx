import { useState, useEffect } from "react";
import { AttendanceForm } from "./AttendanceForm";
import { RecentAttendance } from "./RecentAttendance";
import { AttendanceTypeModal } from "./AttendanceTypeModal";
import { Event } from "../../events/types";
import { BulkAttendanceDialog } from "./BulkAttendanceDialog";

interface AttendanceInterfaceProps {
  event: Event;
  onLogAttendance: (
    studentId: string,
    type: "time-in" | "time-out"
  ) => Promise<void>;
  onFlash?: (status: "success" | "error") => void;
  onAttendanceChanged?: () => void;
}

export function AttendanceInterface({
  event,
  onLogAttendance,
  onFlash,
  onAttendanceChanged,
}: AttendanceInterfaceProps) {
  const hasTimeIn = !!event.timeInStart && !!event.timeInEnd;
  const hasTimeOut = !!event.timeOutStart && !!event.timeOutEnd;

  const defaultTab = hasTimeIn ? "time-in" : "time-out";
  const [activeTab, setActiveTab] = useState<"time-in" | "time-out">(defaultTab);

  const [showTypeModal, setShowTypeModal] = useState(hasTimeIn && hasTimeOut);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refreshAttendance = () => {
    setRefreshVersion((version) => version + 1);
    onAttendanceChanged?.();
  };

  useEffect(() => {
    if (
      (!hasTimeIn && activeTab === "time-in") ||
      (!hasTimeOut && activeTab === "time-out")
    ) {
      setActiveTab(hasTimeIn ? "time-in" : "time-out");
    }
  }, [hasTimeIn, hasTimeOut, activeTab]);

  const handleSubmit = async (studentId: string) => {
    await onLogAttendance(studentId, activeTab);
    refreshAttendance();
  };

  return (
    <div className="space-y-4">
      {/* Type Selection Modal */}
      <AttendanceTypeModal
        open={showTypeModal}
        onOpenChange={setShowTypeModal}
        onSelect={setActiveTab}
        event={event}
      />

      {event.status === "completed" && !event.finesGenerated && !showTypeModal &&
        (activeTab === "time-in" ? hasTimeIn : hasTimeOut) && (
          <BulkAttendanceDialog key={`${event.id}-${activeTab}`} event={event} mode={activeTab} onComplete={refreshAttendance} />
        )}

      {/* Attendance Form */}
      <div className="bg-[#FEFEFA] border border-border/50 rounded-3xl p-4 sm:p-6 shadow-soft">
        <AttendanceForm
          event={event}
          type={activeTab}
          onSubmit={handleSubmit}
          hasTimeIn={hasTimeIn}
          hasTimeOut={hasTimeOut}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFlash={onFlash}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-[#FEFEFA] border border-border/50 rounded-3xl p-4 sm:p-6 shadow-soft">
        <RecentAttendance key={refreshVersion} eventId={event.id.toString()} type={activeTab} newAttendanceLogged={refreshVersion > 0} />
      </div>
    </div>
  );
}