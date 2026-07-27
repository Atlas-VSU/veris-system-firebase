import Link from "next/link";
import { Lock, ArrowLeft, Mail } from "lucide-react";

export default function SubscriptionRequiredPage() {
  return (
    <div className="flex-1 flex min-h-screen w-full items-center justify-center bg-[#FDFCF8] px-6 py-12 relative overflow-hidden organic-theme">
      {/* Ambient layers */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/images/noise.png')] mix-blend-overlay z-10" />

      {/* Floating ambient blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-20">
        <div className="bg-[#FEFEFA]/90 backdrop-blur-md border border-border/50 rounded-3xl p-8 sm:p-10 shadow-soft">
          {/* Icon */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary shadow-soft">
            <Lock className="h-6 w-6" />
          </div>

          {/* Copy */}
          <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground mb-3">
            This feature needs Plus
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground mb-5">
            Your organization is currently on the{" "}
            <span className="font-bold text-foreground">Basic</span> plan.
            Fines, fees, and payments are part of{" "}
            <span className="font-bold text-foreground">Plus</span> — upgrade
            to unlock financial management for your organization.
          </p>

          {/* What's included */}
          <ul className="space-y-3 rounded-2xl bg-white/60 border border-border/40 p-5 text-sm mb-6">
            <li className="flex items-center gap-3 text-muted-foreground font-semibold">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Membership fees & custom fine types
            </li>
            <li className="flex items-center gap-3 text-muted-foreground font-semibold">
              <span className="h-2 w-2 rounded-full bg-primary" />
              GCash payment verification
            </li>
            <li className="flex items-center gap-3 text-muted-foreground font-semibold">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Officer-side clearance management
            </li>
          </ul>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a
              href="mailto:[EMAIL_ADDRESS]?subject=Upgrade%20to%20Plus"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              Contact us to upgrade
            </a>
            <Link
              href="/org-dashboard"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/50 bg-[#FEFEFA] px-4 py-2.5 text-xs font-bold text-muted-foreground shadow-soft transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer hover:bg-muted/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}