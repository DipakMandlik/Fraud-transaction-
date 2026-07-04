import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { cn, formatCurrency, timeAgo, titleCase } from "@/lib/utils";
import type { Transaction } from "@/types";
import { Radio } from "lucide-react";

const MAX_FEED = 14;
const PROCESSING_WINDOW_MS = 900;

interface FeedItem extends Transaction {
  arrivedAt: number;
}

export function LiveActivityFeed({ initial }: { initial: Transaction[] }) {
  const { onTransaction } = useNotifications();
  const [feed, setFeed] = useState<FeedItem[]>(() => initial.map((t) => ({ ...t, arrivedAt: 0 })));
  const [, forceTick] = useState(0);
  const navigate = useNavigate();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setFeed(initial.map((t) => ({ ...t, arrivedAt: 0 })));
  }, [initial]);

  useEffect(() => {
    const unsubscribe = onTransaction((txn) => {
      const arrivedAt = Date.now();
      setFeed((prev) => [{ ...(txn as Transaction), arrivedAt }, ...prev].slice(0, MAX_FEED));
      const timer = setTimeout(() => forceTick((n) => n + 1), PROCESSING_WINDOW_MS + 50);
      timersRef.current.push(timer);
    });
    return () => {
      unsubscribe();
      timersRef.current.forEach(clearTimeout);
    };
  }, [onTransaction]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-success animate-pulse" />
          Mission Control Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {feed.length === 0 ? (
          <EmptyState icon={Radio} title="Waiting for transactions..." />
        ) : (
          <div className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto font-mono">
            {feed.map((txn) => {
              const isProcessing = txn.arrivedAt > 0 && Date.now() - txn.arrivedAt < PROCESSING_WINDOW_MS;
              return (
                <button
                  key={txn.id}
                  onClick={() => navigate(`/transactions/${txn.id}`)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-l-[3px] px-5 py-3 text-left font-sans transition-all duration-150 hover:translate-x-0.5 hover:bg-slate-50",
                    txn.arrivedAt > 0 && "animate-slide-in",
                    isProcessing
                      ? "border-l-primary bg-primary-50/40"
                      : cn(
                          txn.status === "BLOCKED" && "border-l-fraud",
                          txn.status === "APPROVED" && "border-l-success",
                          (txn.status === "REVIEW" || txn.status === "OTP_PENDING") && "border-l-warning"
                        )
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{txn.customer_name}</p>
                    <p className="text-xs text-slate-400">
                      {titleCase(txn.transaction_type)} &middot; {txn.city} &middot; {timeAgo(txn.timestamp)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                      {formatCurrency(txn.amount, txn.currency)}
                    </span>
                    {isProcessing ? (
                      <Badge tone="blue" className="animate-pulse">
                        Processing…
                      </Badge>
                    ) : (
                      <>
                        <Badge tone={statusTone(txn.status)}>{titleCase(txn.status)}</Badge>
                        <Badge tone={riskTone(txn.risk_score)}>{txn.risk_score.toFixed(0)}</Badge>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
