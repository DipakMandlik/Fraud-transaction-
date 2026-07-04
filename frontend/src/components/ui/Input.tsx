import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400",
        "transition-shadow duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700",
        "transition-shadow duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
