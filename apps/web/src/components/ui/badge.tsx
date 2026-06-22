import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", {
  variants: { variant: {
    default: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
    muted: "border-border bg-muted text-muted-foreground",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  } }, defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variants>) {
  return <span className={cn(variants({ variant }), className)} {...props} />;
}
