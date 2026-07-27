"use client";

import Link from "next/link";

export function MobileHeader() {
  return (
    <div className="w-full flex justify-center absolute top-4 z-40 px-4 pointer-events-none">
      <header className="w-full h-14 px-4 flex items-center justify-between bg-[#FEFEFA]/70 backdrop-blur-md border border-[#DED8CF]/50 rounded-full shadow-soft pointer-events-auto">
        <div className="flex items-center gap-2 group">
          <div className="flex items-center justify-center p-1 bg-primary/10 rounded-full h-9 w-9 transition-all duration-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4.5 w-4.5 text-primary"
            >
              <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-wider text-foreground font-serif">
            VERIS
          </span>
        </div>
        <nav className="flex items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Clearance
          </span>
        </nav>
      </header>
    </div>
  );
}