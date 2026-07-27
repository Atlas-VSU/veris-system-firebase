"use client";

import { Mail, RefreshCw } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex-1 flex min-h-screen w-full items-center justify-center bg-[#FDFCF8] px-6 sm:px-12 lg:px-20 py-12 relative overflow-hidden organic-theme">
      {/* Ambient noise layer */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/images/noise.png')] mix-blend-overlay z-10" />

      {/* Floating ambient blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-secondary/5 blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />

      {/* Page Header branding */}
      <div className="absolute top-8 left-8 sm:left-12 flex items-center gap-2.5 z-20 select-none">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
          >
            <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-wider text-foreground">VERIS</span>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto w-full relative z-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center justify-between w-full">

          {/* Left Side: V Logo Visual Area */}
          <div className="w-full lg:w-[45%] flex justify-center items-center animate-fade-in-left">
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-square flex items-center justify-center">
              {/* Decorative background elements */}
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-gentle-rotate pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-dashed border-secondary/20 pointer-events-none" />

              {/* Ambient glow behind logo */}
              <div className="absolute w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none animate-pulse duration-[5000ms]" />

              {/* Glassmorphic card for V logo */}
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-white/80 backdrop-blur-md border border-border/60 shadow-soft flex flex-col items-center justify-center animate-float relative">
                {/* Status dot on the card */}
                <div className="absolute -top-3 -right-3 bg-secondary/15 text-secondary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-secondary/20 shadow-sm animate-pulse">
                  Active
                </div>

                <div className="text-primary flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-sm text-primary"
                  >
                    <defs>
                      <linearGradient id="vLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-primary, #5D7052)" />
                        <stop offset="100%" stopColor="var(--color-secondary, #C18C5D)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M4 4l8 16 8-16M8 4l4 8 4-8"
                      stroke="url(#vLogoGrad)"
                    />
                  </svg>
                </div>

                <div className="mt-2 text-center select-none">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">VERIS System</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Text & Actions Area */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center text-center lg:text-left animate-fade-in-right">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide w-fit mb-6 mx-auto lg:mx-0 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Maintenance Mode
            </div>

            {/* Headline block */}
            <div className="font-serif text-6xl sm:text-7xl lg:text-8xl font-black text-foreground/90 tracking-tight mb-2 leading-none">
              Oops.
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-bold text-primary leading-tight mb-4 tracking-tight">
              Under Maintenance
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium mb-6 max-w-lg mx-auto lg:mx-0">
              We're currently making essential improvements to the system.
              Everything will be back up and running shortly. Thank you for your patience!
            </p>

            <p className="text-xs sm:text-sm text-muted-foreground/80 font-medium mb-8">
              For urgent concerns, contact USSC Baybay through{" "}
              <a
                className="underline text-primary hover:text-secondary transition-colors font-bold"
              >
                veris-dev@vsu.edu.ph
              </a>
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer hover:bg-primary/95"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
