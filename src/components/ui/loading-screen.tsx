import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LoadingScreenProps {
  message?: string;
  className?: string;
  showDelayMessage?: boolean;
}

export function LoadingScreen({
  message = "Loading...",
  className,
  showDelayMessage = true,
}: LoadingScreenProps) {
  const [showDelayed, setShowDelayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDelayed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center bg-[#FDFCF8] z-[100] organic-theme",
        className,
      )}
    >
      {/* Ambient noise overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/images/noise.png')] mix-blend-overlay" />

      {/* Floating ambient blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      <div className="bg-[#FEFEFA]/90 backdrop-blur-md p-10 rounded-3xl shadow-soft flex flex-col items-center max-w-md mx-4 border border-border/50 relative z-10">
        <div className="w-24 h-24 relative mb-6 animate-pulse">
          {/* Logo */}
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16"
            >
              <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-serif font-black text-foreground tracking-widest mb-2">VERIS</h3>
        <p className="text-base font-semibold text-center text-primary mb-2">{message}</p>
        {showDelayMessage && showDelayed && (
          <p className="text-xs text-muted-foreground text-center mt-2 animate-fade-in font-medium">
            This is taking longer than expected. Please wait a moment...
          </p>
        )}
      </div>
    </div>
  );
}
