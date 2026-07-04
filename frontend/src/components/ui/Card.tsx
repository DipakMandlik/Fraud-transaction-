import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a soft lift + border tint on hover — use for clickable or "live" cards. */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 ease-premium",
        interactive && "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-5 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[13px] font-semibold tracking-tight text-slate-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 pt-4", className)} {...props} />;
}
