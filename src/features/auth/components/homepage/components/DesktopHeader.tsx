"use client";

import Link from "next/link";

export function DesktopHeader() {
  return (
    <div className="w-full flex justify-center absolute top-4 z-40 px-4 pointer-events-none">
      <header className="w-full max-w-7xl h-16 px-6 md:px-8 flex items-center justify-between bg-[#FEFEFA]/70 backdrop-blur-md border border-[#DED8CF]/50 rounded-full shadow-soft pointer-events-auto">
        <div className="flex items-center gap-3 group">
          <div className="flex items-center justify-center p-1 bg-primary/10 rounded-full h-10 w-10 transition-all duration-300 group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
            </svg>
          </div>
          <span className="text-md font-bold tracking-wider text-foreground font-serif">
            VERIS
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Administrative Portal
          </span>
        </nav>
      </header>
    </div>
  );
}