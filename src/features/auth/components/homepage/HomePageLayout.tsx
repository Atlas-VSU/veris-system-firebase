"use client";

import { DesktopHeader } from "./components/DesktopHeader";
import { MobileHeader } from "./components/MobileHeader";
import { TemporaryLogin } from "./components/TemporaryLogin";

import { useState } from "react";

export function HomePageLayout() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="organic-theme flex min-h-svh flex-col relative text-foreground bg-background font-nunito overflow-hidden">
      {/* Global Grain/Noise Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Amorphous Blobs for atmospheric depth */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none"
        style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-secondary/10 rounded-full blur-3xl animate-float-delayed pointer-events-none"
        style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
      />

      <div className="w-full flex-1 flex flex-col">
        {/* Desktop layout */}
        <div className="hidden lg:block relative min-h-screen bg-transparent w-full">
          <DesktopHeader />
          <div className="relative min-h-screen flex z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
            {/* Left Side - Hero text */}
            <div className="flex-1 flex items-center pr-8 w-1/2">
              <div className="w-full pt-16">
                <h1 className="mb-6 text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground font-serif leading-[1.15] animate-fade-in-up">
                  <span className="block whitespace-nowrap">Real-Time Tracking.</span>
                  <span className="block text-primary whitespace-nowrap">
                    Effortless Monitoring.
                  </span>
                  <span className="block text-secondary whitespace-nowrap">
                    Total Control.
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-300 max-w-xl">
                  Streamline your organization's semestral clearance process.
                  Monitor student eligibility, track organizational fees and fines,
                  and verify payment settlements in real-time.
                </p>
              </div>
            </div>

            {/* Right Side - Login Image + Card */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center w-1/2">
              <div className="relative w-full max-w-lg mx-auto h-[80vh] flex items-center justify-center">
                {/* Background Image / Logo (optimized & rotated slightly) */}
                {/* <div
                  className="absolute inset-0 z-0 animate-fade-in-up rotate-[-1.5deg] scale-95 opacity-80 transition-transform duration-700 hover:scale-100"
                  style={{
                    backgroundImage: `url('/images/searchfortruth-transparent.png')`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                /> */}

                {/* Temporary Login Admin Card overlay */}
                <div className="relative z-10 w-full">
                  <TemporaryLogin />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden flex flex-col min-h-svh bg-transparent w-full">
          <MobileHeader />

          {/* Top Hero text section */}
          <div className="relative overflow-hidden pt-28 pb-10 px-6 sm:px-10 max-w-xl mx-auto flex flex-col items-center">
            <h1 className="mb-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-serif leading-[1.15] animate-fade-in-up text-center">
              Real-Time Tracking.
              <span className="block text-primary">
                Effortless Monitoring.
              </span>
              <span className="block text-secondary">
                Total Control.
              </span>
            </h1>
            <p className="text-md leading-relaxed text-muted-foreground animate-fade-in-up delay-300 text-center">
              Streamline your organization's semestral clearance process.
              Monitor student eligibility, track organizational fees and fines,
              and verify payment settlements in real-time.
            </p>
          </div>

          {/* Bottom Card section */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center px-4 pb-16">
            <div className="relative z-10 w-full max-w-md">
              {/* Subtle background image behind card for mobile */}
              <div
                className="absolute inset-0 -top-10 bottom-10 z-0 opacity-15 rotate-[1deg] scale-105 pointer-events-none"
                style={{
                  backgroundImage: `url('/images/searchfortruth-transparent.png')`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div className="relative z-10">
                <TemporaryLogin />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
