import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border placeholder:text-muted-foreground bg-white/50 focus:bg-white flex field-sizing-content min-h-16 w-full rounded-2xl border px-4 py-3 text-sm shadow-xs transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
