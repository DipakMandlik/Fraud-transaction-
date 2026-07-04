import { useNavigate } from "react-router-dom";

import { Badge, alertStatusTone, severityTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo, titleCase } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export function LatestAlertsList() {
  const { alerts } = useNotifications();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-fraud" />
          Latest Fraud Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No alerts yet" description="Fraud alerts will appear here in real time." />
        ) : (
          <div className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto">
            {alerts.slice(0, 12).map((alert) => (
              <button
                key={alert.id}
                onClick={() => navigate(`/alerts/${alert.id}`)}
                className="flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition-all duration-150 hover:translate-x-0.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{alert.customer_name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{alert.reason_summary}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(alert.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                  <Badge tone={alertStatusTone(alert.status)}>{titleCase(alert.status)}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
