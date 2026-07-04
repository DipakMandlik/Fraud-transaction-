import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-600 hover:shadow-elevated",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  outline: "border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-fraud text-white shadow-sm hover:bg-red-700 hover:shadow-elevated",
  success: "bg-success text-white shadow-sm hover:bg-green-700 hover:shadow-elevated",
  warning: "bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-elevated",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
        "transition-all duration-150 ease-out active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
