import Image from "next/image";

interface PaymentBrandHeaderProps {
  /** Short label shown below the brand name, e.g. "Student Verification" */
  stepLabel?: string;
}

/**
 * Consistent USSC Connect brand banner that appears at the top of every
 * public student payment step. Mirrors the visual identity used in the
 * admin / organization dashboards.
 */
export function PaymentBrandHeader({ stepLabel }: PaymentBrandHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 select-none">
      {/* Logo + name row */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1B5E20]/10 p-1.5 text-[#1B5E20]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none tracking-wide bg-linear-to-r from-[#1B5E20] via-[#0D3B12] to-[#0A2E0F] bg-clip-text text-transparent">
            VERIS
          </span>
          <span className="mt-1 inline-flex w-fit items-center rounded bg-[#1B5E20]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#1B5E20]">
            Payment Portal
          </span>
        </div>
      </div>

      {/* Optional step label */}
      {stepLabel && (
        <p className="text-sm text-muted-foreground">{stepLabel}</p>
      )}
    </div>
  );
}
