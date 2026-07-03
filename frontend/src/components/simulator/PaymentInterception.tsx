import { Ban, Check, Lock, ShieldAlert } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

interface PaymentInterceptionProps {
  transaction: Transaction;
  revealStep: number; // 0 = shield only, 1..4 reveal the checklist lines below
}

const CHECKLIST = [
  "Core Banking Transaction Cancelled",
  "Customer Debit Prevented",
  "Reference ID Logged",
  "Settlement Cancelled",
];

export function PaymentInterception({ transaction, revealStep }: PaymentInterceptionProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-fraud bg-fraud-light/40 p-8 text-center">
      <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fraud opacity-30" />
        <span className="absolute inline-flex h-20 w-20 animate-pulse-ring rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-fraud text-white shadow-elevated">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <Lock className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white p-1 text-fraud shadow" />
      </div>

      <h2 className="text-2xl font-black tracking-tight text-fraud">PAYMENT INTERCEPTED</h2>
      <p className="mt-1 text-sm font-medium text-red-700">Settlement Prevented Before Core Banking</p>

      <div className="mt-4 rounded-xl bg-white px-6 py-3 shadow-card">
        <p className="text-xs uppercase tracking-wide text-slate-400">Amount Protected</p>
        <p className="text-3xl font-black text-fraud">{formatCurrency(transaction.amount, transaction.currency)}</p>
      </div>

      <div className="mt-6 w-full max-w-sm space-y-2 text-left">
        {CHECKLIST.map((item, i) => (
          <div
            key={item}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-opacity duration-300",
              i < revealStep ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fraud text-white">
              {i === 1 ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </span>
            <span className="font-medium text-slate-700">{item}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 font-mono text-xs text-slate-400">Reference: {transaction.transaction_ref}</p>
    </div>
  );
}
