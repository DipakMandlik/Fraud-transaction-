import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, MessageSquare, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, alertStatusTone, riskTone, severityTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { alertsApi } from "@/lib/api";
import { cn, formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import type { AlertDetail as AlertDetailType } from "@/types";

type ActionKind = "investigate" | "approve" | "block" | "mark-safe" | "note" | null;

const ACTION_CONFIG: Record<Exclude<ActionKind, null>, { title: string; description: string; confirmLabel: string; variant: "primary" | "success" | "danger" | "secondary" }> = {
  investigate: {
    title: "Start Investigation",
    description: "Move this alert into active investigation and leave a note.",
    confirmLabel: "Start Investigating",
    variant: "primary",
  },
  approve: {
    title: "Approve Transaction",
    description: "Override the block and approve this transaction as legitimate.",
    confirmLabel: "Approve Transaction",
    variant: "success",
  },
  block: {
    title: "Block Transaction",
    description: "Confirm this transaction as fraudulent and block it permanently.",
    confirmLabel: "Block Transaction",
    variant: "danger",
  },
  "mark-safe": {
    title: "Mark as False Positive",
    description: "Confirm this alert was a false positive and close the case.",
    confirmLabel: "Mark Safe",
    variant: "secondary",
  },
  note: {
    title: "Add Investigation Note",
    description: "Log a note on this case without changing its status.",
    confirmLabel: "Add Note",
    variant: "primary",
  },
};

export default function AlertDetail() {
  const { id } = useParams();
  const alertId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeAction, setActiveAction] = useState<ActionKind>(null);
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["alert", alertId],
    queryFn: () => alertsApi.get(alertId),
    enabled: !!alertId,
  });

  const investigator = user?.full_name ?? "Investigator";

  const assignMutation = useMutation({
    mutationFn: () => alertsApi.assign(alertId, investigator),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert", alertId] }),
  });

  const actionMutation = useMutation({
    mutationFn: (kind: Exclude<ActionKind, null>) => {
      switch (kind) {
        case "investigate":
          return alertsApi.investigate(alertId, investigator, notes);
        case "approve":
          return alertsApi.approve(alertId, investigator, notes);
        case "block":
          return alertsApi.block(alertId, investigator, notes);
        case "mark-safe":
          return alertsApi.markSafe(alertId, investigator, notes);
        case "note":
          return alertsApi.addNote(alertId, investigator, notes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert", alertId] });
      setActiveAction(null);
      setNotes("");
    },
  });

  if (query.isLoading || !query.data) {
    return (
      <AppLayout title="Alert Detail">
        <Skeleton className="h-96 rounded-2xl" />
      </AppLayout>
    );
  }

  const alert: AlertDetailType = query.data;
  const isClosed = alert.status === "CLOSED" || alert.status === "FALSE_POSITIVE";

  return (
    <AppLayout title={alert.alert_ref} subtitle={`Fraud alert for ${alert.customer_name}`}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Case Overview</CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={severityTone(alert.severity)}>{alert.severity} Severity</Badge>
                  <Badge tone={riskTone(alert.risk_score)}>Risk {alert.risk_score.toFixed(0)}</Badge>
                  <Badge tone={alertStatusTone(alert.status)}>{titleCase(alert.status)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {alert.reason_summary}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Why this was flagged</p>
              <ul className="space-y-2">
                {alert.explanation.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fraud" />
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Amount" value={formatCurrency(alert.transaction.amount, alert.transaction.currency)} />
                <Field label="Channel" value={titleCase(alert.transaction.transaction_type)} />
                <Field label="Location" value={`${alert.transaction.city}, ${alert.transaction.country}`} />
                <Field label="Device" value={alert.transaction.device_id ?? "Unregistered"} />
                <Field label="IP Address" value={alert.transaction.ip_address} />
                <Field label="Timestamp" value={formatDateTime(alert.transaction.timestamp)} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate(`/transactions/${alert.transaction_id}`)}
              >
                View Full Transaction
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Investigation Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {alert.investigations.length === 0 ? (
                <p className="text-sm text-slate-400">No investigation activity yet.</p>
              ) : (
                <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                  {alert.investigations.map((inv) => (
                    <li key={inv.id} className="relative">
                      <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                      <p className="text-sm font-medium text-slate-800">
                        {titleCase(inv.action)} <span className="font-normal text-slate-400">by {inv.investigator}</span>
                      </p>
                      {inv.notes && <p className="mt-0.5 text-sm text-slate-600">{inv.notes}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(inv.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Assigned to: <span className="font-medium text-slate-700">{alert.assigned_investigator ?? "Unassigned"}</span>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={assignMutation.isPending || isClosed}
                onClick={() => assignMutation.mutate()}
              >
                <UserPlus className="h-4 w-4" /> Assign to Me
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                disabled={isClosed}
                onClick={() => setActiveAction("investigate")}
              >
                <MessageSquare className="h-4 w-4" /> Investigate
              </Button>
              <Button
                variant="success"
                className="w-full justify-start"
                disabled={isClosed}
                onClick={() => setActiveAction("approve")}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve Transaction
              </Button>
              <Button
                variant="danger"
                className="w-full justify-start"
                disabled={isClosed}
                onClick={() => setActiveAction("block")}
              >
                <Ban className="h-4 w-4" /> Block Transaction
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isClosed}
                onClick={() => setActiveAction("mark-safe")}
              >
                <ShieldCheck className="h-4 w-4" /> Mark as False Positive
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveAction("note")}>
                <MessageSquare className="h-4 w-4" /> Add Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={activeAction !== null}
        onOpenChange={(open) => !open && setActiveAction(null)}
        title={activeAction ? ACTION_CONFIG[activeAction].title : ""}
        description={activeAction ? ACTION_CONFIG[activeAction].description : ""}
      >
        <textarea
          className={cn(
            "min-h-[100px] w-full rounded-lg border border-slate-300 p-3 text-sm",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
          placeholder="Add investigation notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActiveAction(null)}>
            Cancel
          </Button>
          <Button
            variant={activeAction ? ACTION_CONFIG[activeAction].variant : "primary"}
            disabled={actionMutation.isPending}
            onClick={() => activeAction && actionMutation.mutate(activeAction)}
          >
            {activeAction ? ACTION_CONFIG[activeAction].confirmLabel : "Confirm"}
          </Button>
        </div>
      </Dialog>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
