import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

export function CustomerNotification({ transaction }: { transaction: Transaction }) {
  return (
    <div className="mx-auto w-full max-w-sm animate-slide-in rounded-2xl border border-slate-200 bg-white p-4 shadow-elevated">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-white">
          <ShieldAlert className="h-3 w-3" />
        </span>
        Bank Security Alert &middot; now &middot; preview
      </div>
      <p className="text-sm leading-relaxed text-slate-700">
        A transaction of <span className="font-bold text-slate-900">{formatCurrency(transaction.amount, transaction.currency)}</span>{" "}
        to {transaction.beneficiary_name ?? transaction.merchant_name ?? "an unrecognized recipient"} has been{" "}
        <span className="font-bold text-fraud">stopped</span> because unusual activity was detected on your account.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1">
          This was me — Verify
        </Button>
        <Button size="sm" variant="danger" className="flex-1">
          Report Fraud
        </Button>
      </div>
    </div>
  );
}
