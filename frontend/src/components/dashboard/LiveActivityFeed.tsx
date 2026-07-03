import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { formatCurrency, timeAgo, titleCase } from "@/lib/utils";
import type { Transaction } from "@/types";
import { Radio } from "lucide-react";

const MAX_FEED = 12;

export function LiveActivityFeed({ initial }: { initial: Transaction[] }) {
  const { onTransaction } = useNotifications();
  const [feed, setFeed] = useState<Transaction[]>(initial);
  const navigate = useNavigate();

  useEffect(() => {
    setFeed(initial);
  }, [initial]);

  useEffect(() => {
    const unsubscribe = onTransaction((txn) => {
      setFeed((prev) => [txn as Transaction, ...prev].slice(0, MAX_FEED));
    });
    return unsubscribe;
  }, [onTransaction]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-success animate-pulse" />
          Live Transaction Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {feed.length === 0 ? (
          <EmptyState icon={Radio} title="Waiting for transactions..." />
        ) : (
          <div className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto">
            {feed.map((txn) => (
              <button
                key={txn.id}
                onClick={() => navigate(`/transactions/${txn.id}`)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
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
                  <Badge tone={statusTone(txn.status)}>{titleCase(txn.status)}</Badge>
                  <Badge tone={riskTone(txn.risk_score)}>{txn.risk_score.toFixed(0)}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
