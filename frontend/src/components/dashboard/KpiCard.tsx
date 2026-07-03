import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "fraud" | "slate";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-light text-green-700",
  warning: "bg-warning-light text-orange-700",
  fraud: "bg-fraud-light text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}

export function KpiCard({ label, value, icon: Icon, tone = "primary", hint }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
