import type { Transaction } from "@/types";

export function RiskBreakdown({ transaction }: { transaction: Transaction }) {
  const triggered = (transaction.rule_evaluations ?? []).filter((r) => r.triggered).sort((a, b) => b.weight - a.weight);

  if (triggered.length === 0) {
    return <p className="text-sm text-slate-400">No rules contributed to this score.</p>;
  }

  const maxWeight = Math.max(...triggered.map((r) => r.weight));

  return (
    <div className="space-y-2.5">
      {triggered.map((rule) => (
        <div key={rule.code}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{rule.name}</span>
            <span className="font-mono font-semibold text-fraud">+{rule.weight.toFixed(0)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-fraud transition-all"
              style={{ width: `${(rule.weight / maxWeight) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-800">
        <span>Total Risk Score</span>
        <span className="text-fraud">{transaction.risk_score.toFixed(0)} / 100</span>
      </div>
    </div>
  );
}
