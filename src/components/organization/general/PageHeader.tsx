import { type ReactNode } from "react"
import { cn } from "@/lib/utils"


interface PageHeaderProps {
  title: string
  context?: string
  description?: string
  action?: ReactNode
  className?: string
  variant?: "default" | "portal" | "admin"
}

export function PageHeader({ title, context, description, action, className, variant = "default" }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        action && "sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h1
          className={cn(
            "text-3xl font-extrabold font-serif tracking-tight text-foreground",
            (variant === "portal" || variant === "admin") && "text-primary"
          )}
        >
          {title}
        </h1>
        {context && (
          <p className={cn(
            "text-xs font-bold uppercase tracking-wider",
            (variant === "portal" || variant === "admin") ? "text-secondary"
              : "text-muted-foreground",
          )}>{context}</p>
        )}
        {description && (
          <p className={cn(
            "text-sm mt-0.5",
            (variant === "portal" || variant === "admin") ? "text-muted-foreground"
              : "text-muted-foreground",
          )}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  )
}
