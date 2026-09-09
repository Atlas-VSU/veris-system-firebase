"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STUDENT_PORTAL_URL = "https://veris-student-portal.fc-ssc.online/";

export function StudentPortalButton() {
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <div className="mt-8 flex w-full justify-center animate-fade-in-up delay-500 lg:justify-start">
      <Button
        asChild
        size="lg"
        className="group h-12 w-full min-w-[240px] gap-3 rounded-xl px-8 text-sm font-bold sm:w-auto sm:text-base"
        aria-busy={isNavigating}
      >
        <a
          href={STUDENT_PORTAL_URL}
          onClick={() => setIsNavigating(true)}
          // Same-tab navigation, matching the rest of the landing page.
          rel="noopener"
        >
          {isNavigating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting to Portal...</span>
            </>
          ) : (
            <>
              <span>Go to Student Portal</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </a>
      </Button>
    </div>
  );
}
