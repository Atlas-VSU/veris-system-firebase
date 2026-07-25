import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClockIcon, TimerIcon } from "lucide-react";
import { Event } from "../../events/types";

interface AttendanceTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "time-in" | "time-out") => void;
  event: Event;
}

export function AttendanceTypeModal({
  open,
  onOpenChange,
  onSelect,
  event,
}: AttendanceTypeModalProps) {
  const hasTimeIn = !!event.timeInStart && !!event.timeInEnd;
  const hasTimeOut = !!event.timeOutStart && !!event.timeOutEnd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold text-center text-foreground">
            Select Attendance Type
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            What would you like to record for{" "}
            <span className="font-bold text-foreground">
              {event.name}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {hasTimeIn && (
            <button
              onClick={() => {
                onSelect("time-in");
                onOpenChange(false);
              }}
              className="group flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl border transition-all duration-300 shadow-xs hover:shadow-md hover:scale-[1.02] bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-soft">
                <ClockIcon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-sans font-bold text-base text-foreground">
                  Check-In
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Attendance begins!
                </div>
              </div>
            </button>
          )}

          {hasTimeOut && (
            <button
              onClick={() => {
                onSelect("time-out");
                onOpenChange(false);
              }}
              className="group flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl border border-secondary/20 bg-secondary/10 hover:bg-secondary/20 hover:border-secondary/40 transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground shadow-soft">
                <TimerIcon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-sans font-bold text-base text-foreground">
                  Check-Out
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Marks departure...
                </div>
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}