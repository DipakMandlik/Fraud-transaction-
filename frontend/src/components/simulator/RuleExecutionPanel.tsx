import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RuleEvaluation } from "@/types";

interface RuleExecutionPanelProps {
  rules: RuleEvaluation[];
  revealedCount: number;
}

export function RuleExecutionPanel({ rules, revealedCount }: RuleExecutionPanelProps) {
  return (
    <div className="space-y-1.5">
      {rules.map((rule, i) => {
        const revealed = i < revealedCount;
        if (!revealed) {
          return <div key={rule.code} className="h-9" />;
        }
        return (
          <div
            key={rule.code}
            className={cn(
              "flex animate-fade-in items-center justify-between gap-3 rounded-lg border px-3 py-2",
              rule.triggered ? "border-red-100 bg-fraud-light/60" : "border-slate-100 bg-slate-50"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {rule.triggered ? (
                <XCircle className="h-4 w-4 shrink-0 text-fraud" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              )}
              <div className="min-w-0">
                <p className={cn("truncate text-sm font-medium", rule.triggered ? "text-red-800" : "text-slate-700")}>
                  {rule.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">{rule.detail}</p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                rule.triggered ? "bg-fraud text-white" : "bg-success text-white"
              )}
            >
              {rule.triggered ? `FAIL +${rule.weight}` : "PASS"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
