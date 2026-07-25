import Link from "next/link";
import { Lock, ArrowLeft, Mail } from "lucide-react";

export default function SubscriptionRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-background p-8 shadow-sm">
          {/* Icon */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Copy */}
          <h1 className="text-xl font-semibold tracking-tight">
            This feature needs Plus
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your organization is currently on the{" "}
            <span className="font-medium text-foreground">Basic</span> plan.
            Fines, fees, and payments are part of{" "}
            <span className="font-medium text-foreground">Plus</span> — upgrade
            to unlock financial management for your organization.
          </p>

          {/* What's included */}
          <ul className="mt-5 space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Membership fees & custom fine types
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              GCash payment verification
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Officer-side clearance management
            </li>
          </ul>

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <a
              href="mailto:[EMAIL_ADDRESS]?subject=Upgrade%20to%20Plus"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              Contact us to upgrade
            </a>
            <Link
              href="/org-dashboard"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
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