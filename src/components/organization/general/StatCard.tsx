import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// variant types for different stat card contexts
export type StatCardVariant = 
  | "default"
  | "success"    // cleared, approved, verified, paid
  | "warning"    // pending, awaiting
  | "danger"     // declined, rejected, not cleared
  | "info"       // total, members, unpaid
  | "neutral"    // general stats

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  className?: string
  isLoading?: boolean
  variant?: StatCardVariant
}

// pastel/gradient color schemes that complement the green theme
const variantStyles = {
  default: {
    card: "bg-gradient-to-br from-[#FEFEFA] to-[#FDFCF8] border-[#DED8CF]/40",
    cardHover: "hover:border-primary/40 hover:shadow-soft",
    iconBg: "bg-primary/10",
    iconBgHover: "group-hover:bg-primary/20",
    iconColor: "text-primary",
    accent: "before:from-primary/5 before:to-secondary/5",
  },
  success: {
    card: "bg-gradient-to-br from-emerald-50/30 via-[#FEFEFA] to-green-50/10 border-emerald-200/40",
    cardHover: "hover:border-emerald-400/50 hover:shadow-soft",
    iconBg: "bg-emerald-100/50",
    iconBgHover: "group-hover:bg-emerald-200/60",
    iconColor: "text-emerald-700",
    accent: "before:from-emerald-100/10 before:to-green-100/10",
  },
  warning: {
    card: "bg-gradient-to-br from-[#C18C5D]/10 via-[#FEFEFA] to-[#C18C5D]/5 border-[#C18C5D]/30",
    cardHover: "hover:border-[#C18C5D]/50 hover:shadow-soft",
    iconBg: "bg-[#C18C5D]/20",
    iconBgHover: "group-hover:bg-[#C18C5D]/35",
    iconColor: "text-[#C18C5D]",
    accent: "before:from-[#C18C5D]/10 before:to-[#C18C5D]/5",
  },
  danger: {
    card: "bg-gradient-to-br from-[#A85448]/10 via-[#FEFEFA] to-[#A85448]/5 border-[#A85448]/30",
    cardHover: "hover:border-[#A85448]/50 hover:shadow-soft",
    iconBg: "bg-[#A85448]/20",
    iconBgHover: "group-hover:bg-[#A85448]/35",
    iconColor: "text-[#A85448]",
    accent: "before:from-[#A85448]/10 before:to-[#A85448]/5",
  },
  info: {
    card: "bg-gradient-to-br from-[#E6DCCD]/20 via-[#FEFEFA] to-[#E6DCCD]/5 border-[#E6DCCD]/30",
    cardHover: "hover:border-[#E6DCCD]/50 hover:shadow-soft",
    iconBg: "bg-[#E6DCCD]/30",
    iconBgHover: "group-hover:bg-[#E6DCCD]/45",
    iconColor: "text-[#4A4A40]",
    accent: "before:from-[#E6DCCD]/10 before:to-[#E6DCCD]/5",
  },
  neutral: {
    card: "bg-gradient-to-br from-[#F0EBE5]/30 via-[#FEFEFA] to-[#FDFCF8] border-[#DED8CF]/40",
    cardHover: "hover:border-[#DED8CF]/80 hover:shadow-soft",
    iconBg: "bg-[#F0EBE5]/40",
    iconBgHover: "group-hover:bg-[#F0EBE5]/60",
    iconColor: "text-[#78786C]",
    accent: "before:from-[#F0EBE5]/10 before:to-[#FDFCF8]/10",
  },
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  className, 
  isLoading,
  variant = "default" 
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <Card className={cn(
      "group relative overflow-hidden shadow-sm",
      styles.card,
      "transition-all duration-500 ease-out",
      "hover:shadow-lg hover:-translate-y-0.5",
      styles.cardHover,
      "animate-fade-in-up",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 before:transition-opacity before:duration-500",
      styles.accent,
      "hover:before:opacity-100",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300">
          {title}
        </CardTitle>
        <div className={cn(
          "relative rounded-xl p-2.5 transition-all duration-500",
          styles.iconBg,
          styles.iconBgHover,
          "group-hover:scale-110 group-hover:rotate-3",
          "shadow-sm"
        )}>
          <Icon className={cn(
            "size-4 transition-all duration-500 group-hover:scale-110",
            styles.iconColor
          )} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 relative z-10">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
          </>
        ) : (
          <>
            <div className={cn(
              "text-4xl font-extrabold tracking-tight font-serif text-foreground",
              "transition-all duration-300 group-hover:scale-105"
            )}>
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground/90 leading-relaxed transition-colors duration-300 group-hover:text-muted-foreground">
                {description}
              </p>
            )}
          </>
        )}
        {trend && !isLoading && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold mt-3 pt-3",
            "border-t border-border/40 group-hover:border-border/60 transition-all duration-300",
            trend.positive 
              ? "text-emerald-600" 
              : "text-rose-600"
          )}>
            <span className={cn(
              "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full",
              "transition-all duration-300",
              trend.positive 
                ? "bg-emerald-100/60 group-hover:bg-emerald-100" 
                : "bg-rose-100/60 group-hover:bg-rose-100"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}