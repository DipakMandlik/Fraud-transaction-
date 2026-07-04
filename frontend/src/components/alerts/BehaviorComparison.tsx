import { ArrowRight } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import type { AlertDetail, CustomerDetail } from "@/types";

interface ComparisonRow {
  label: string;
  normal: string;
  current: string;
  isAnomaly: boolean;
}

function buildRows(customer: CustomerDetail, alert: AlertDetail): ComparisonRow[] {
  const txn = alert.transaction;
  const rows: ComparisonRow[] = [];

  rows.push({
    label: "Location",
    normal: `${customer.city}, ${customer.state}`,
    current: `${txn.city}, ${txn.country}`,
    isAnomaly: txn.city !== customer.city,
  });

  const ratio = customer.avg_transaction_amount > 0 ? txn.amount / customer.avg_transaction_amount : 0;
  rows.push({
    label: "Transaction Amount",
    normal: formatCurrency(customer.avg_transaction_amount),
    current: `${formatCurrency(txn.amount)}${ratio >= 2 ? ` (${ratio.toFixed(1)}x)` : ""}`,
    isAnomaly: ratio >= 5,
  });

  const knownDevice = customer.devices.some((d) => d.device_uid === txn.device_id);
  rows.push({
    label: "Device",
    normal: "Recognized device on file",
    current: txn.device_id ? (knownDevice ? "Recognized device" : "Unrecognized device") : "Unregistered device",
    isAnomaly: !knownDevice,
  });

  const beneficiaryTrigger = (txn.rule_evaluations ?? []).find((r) => r.code === "NEW_BENEFICIARY" && r.triggered);
  if (txn.beneficiary_name) {
    rows.push({
      label: "Beneficiary",
      normal: "Existing, previously paid beneficiary",
      current: txn.beneficiary_name + (beneficiaryTrigger ? " (never paid before)" : ""),
      isAnomaly: Boolean(beneficiaryTrigger),
    });
  }

  const merchantTrigger = (txn.rule_evaluations ?? []).find((r) => r.code === "BLACKLISTED_MERCHANT" && r.triggered);
  if (txn.merchant_name) {
    rows.push({
      label: "Merchant",
      normal: "Reputable / previously used merchant",
      current: txn.merchant_name,
      isAnomaly: Boolean(merchantTrigger),
    });
  }

  const oddHourTrigger = (txn.rule_evaluations ?? []).find((r) => r.code === "ODD_HOUR_ACTIVITY" && r.triggered);
  rows.push({
    label: "Time of Activity",
    normal: "Within typical active hours",
    current: new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(txn.timestamp)),
    isAnomaly: Boolean(oddHourTrigger),
  });

  return rows;
}

export function BehaviorComparison({ customer, alert }: { customer: CustomerDetail; alert: AlertDetail }) {
  const rows = buildRows(customer, alert);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[1fr_1.2fr_auto_1.2fr] items-center gap-2 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Attribute</span>
        <span>Normal Behaviour</span>
        <span />
        <span>Current Transaction</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "grid animate-rise grid-cols-[1fr_1.2fr_auto_1.2fr] items-center gap-2 px-4 py-2.5 text-sm transition-colors",
              row.isAnomaly && "bg-fraud-light/30"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="font-medium text-slate-500">{row.label}</span>
            <span className="text-slate-600">{row.normal}</span>
            <ArrowRight className={cn("h-3.5 w-3.5", row.isAnomaly ? "text-fraud" : "text-slate-300")} />
            <span className={cn("font-semibold", row.isAnomaly ? "text-fraud" : "text-slate-700")}>{row.current}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
