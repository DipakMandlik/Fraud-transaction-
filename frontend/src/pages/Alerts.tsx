import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, alertStatusTone, severityTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { alertsApi } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/utils";

const STATUS_OPTIONS = ["OPEN", "INVESTIGATING", "FALSE_POSITIVE", "CLOSED"];
const SEVERITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function Alerts() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["alerts", { status, severity, page }],
    queryFn: () => alertsApi.list({ page, page_size: 20, status: status || undefined, severity: severity || undefined }),
    refetchInterval: 6000,
  });

  return (
    <AppLayout title="Fraud Alert Center" subtitle="Investigation queue for flagged transactions">
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Severities</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (query.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={ShieldAlert} title="No Active Alerts" description="All clear right now." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Severity</TH>
                  <TH>Customer</TH>
                  <TH>Reason</TH>
                  <TH>Risk</TH>
                  <TH>Investigator</TH>
                  <TH>Time</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {query.data?.items.map((alert) => (
                  <TR key={alert.id} className="cursor-pointer" onClick={() => navigate(`/alerts/${alert.id}`)}>
                    <TD>
                      <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                    </TD>
                    <TD className="font-medium text-slate-800">{alert.customer_name}</TD>
                    <TD className="max-w-sm truncate text-slate-500">{alert.reason_summary}</TD>
                    <TD className="font-semibold">{alert.risk_score.toFixed(0)}</TD>
                    <TD>{alert.assigned_investigator ?? <span className="text-slate-400">Unassigned</span>}</TD>
                    <TD className="text-xs text-slate-500">{formatDateTime(alert.created_at)}</TD>
                    <TD>
                      <Badge tone={alertStatusTone(alert.status)}>{titleCase(alert.status)}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={20} total={query.data?.total ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>
    </AppLayout>
  );
}
