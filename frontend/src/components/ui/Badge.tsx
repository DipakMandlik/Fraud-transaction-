import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Tone = "slate" | "blue" | "green" | "orange" | "red" | "purple";

const toneClasses: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-primary-50 text-primary-700",
  green: "bg-success-light text-green-800",
  orange: "bg-warning-light text-orange-800",
  red: "bg-fraud-light text-red-800",
  purple: "bg-purple-100 text-purple-800",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ className, tone = "slate", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", toneDotClasses[tone])} />}
      {children}
    </span>
  );
}

const toneDotClasses: Record<Tone, string> = {
  slate: "bg-slate-500",
  blue: "bg-primary",
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-fraud",
  purple: "bg-purple-500",
};

export function statusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
      return "green";
    case "BLOCKED":
      return "red";
    case "OTP_PENDING":
      return "orange";
    case "REVIEW":
      return "blue";
    default:
      return "slate";
  }
}

export function severityTone(severity: string): Tone {
  switch (severity) {
    case "CRITICAL":
      return "red";
    case "HIGH":
      return "orange";
    case "MEDIUM":
      return "blue";
    default:
      return "slate";
  }
}

export function riskTone(score: number): Tone {
  if (score >= 81) return "red";
  if (score >= 61) return "orange";
  if (score >= 31) return "blue";
  return "green";
}

export function alertStatusTone(status: string): Tone {
  switch (status) {
    case "OPEN":
      return "red";
    case "INVESTIGATING":
      return "orange";
    case "FALSE_POSITIVE":
      return "slate";
    case "CLOSED":
      return "green";
    default:
      return "slate";
  }
}
