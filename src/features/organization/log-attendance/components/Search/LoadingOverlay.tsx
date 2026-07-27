import { Loader2Icon } from "lucide-react";
import { createPortal } from "react-dom";

export function LoadingOverlay() {
  return createPortal(
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#FEFEFA] border border-border/40 rounded-3xl p-6 shadow-soft">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12 flex items-center justify-center">
            <Loader2Icon className="h-12 w-12 text-primary animate-spin" />
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
          </div>
          <p className="mt-4 font-bold text-foreground">
            Processing...
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
