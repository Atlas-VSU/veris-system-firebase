import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 ease-out active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:bg-primary/95 hover:scale-105 hover:shadow-md",
        destructive:
          "bg-destructive hover:scale-105 text-white shadow-soft hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 dark:hover:bg-destructive/80",
        outline:
          "border-2 border-secondary bg-transparent text-secondary hover:bg-secondary/10 hover:scale-105",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/95 hover:scale-105 hover:shadow-md",
        success:
          "bg-green-600 hover:scale-105 text-white shadow-soft hover:bg-green-700 hover:shadow-md focus-visible:ring-green-600/20 dark:focus-visible:ring-green-600/40 dark:bg-green-700 dark:hover:bg-green-600",
        ghost:
          "text-primary bg-transparent hover:bg-primary/10 hover:scale-105 hover:shadow-xs",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 dark:hover:text-primary/70",
        icon: "p-0 rounded-full border-transparent hover:scale-110 hover:text-accent-foreground focus-visible:ring-accent/50 data-[state=open]:bg-accent",
      },
      size: {
        default: "h-12 px-8 has-[>svg]:px-6",
        sm: "h-10 gap-1.5 px-6 has-[>svg]:px-5 text-xs",
        lg: "h-14 px-10 has-[>svg]:px-8 text-base",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
