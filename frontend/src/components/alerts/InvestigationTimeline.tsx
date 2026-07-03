import { AlertTriangle, Ban, CheckCircle2, FileText, Gauge, PlayCircle } from "lucide-react";

import { formatTime, titleCase } from "@/lib/utils";
import type { AlertDetail, Investigation } from "@/types";

interface TimelineEvent {
  time: Date;
  icon: typeof PlayCircle;
  tone: "slate" | "fraud" | "primary" | "success";
  title: string;
  detail?: string;
}

/** Synthesizes a second-by-second detection narrative from the real triggered rules
 * and decision, then appends the actual investigator action log. The underlying
 * facts (which rules fired, final risk score, decision) are all genuine — only the
 * illustrative sub-second spacing between them is presentational. */
function buildDetectionEvents(alert: AlertDetail): TimelineEvent[] {
  const txn = alert.transaction;
  const base = new Date(txn.timestamp).getTime();
  const events: TimelineEvent[] = [
    { time: new Date(base), icon: PlayCircle, tone: "slate", title: "Transaction Initiated", detail: `${txn.transaction_ref} received by the platform` },
  ];

  const triggered = (txn.rule_evaluations ?? []).filter((r) => r.triggered);
  triggered.forEach((rule, i) => {
    events.push({
      time: new Date(base + (i + 1) * 1000),
      icon: AlertTriangle,
      tone: "fraud",
      title: `${rule.name} Triggered`,
      detail: rule.detail,
    });
  });

  const afterRules = base + (triggered.length + 1) * 1000;
  events.push({
    time: new Date(afterRules),
    icon: Gauge,
    tone: "primary",
    title: `Risk Score ${txn.risk_score.toFixed(0)} Calculated`,
    detail: `${triggered.length} rule(s) contributed to the score`,
  });

  events.push({
    time: new Date(afterRules + 1000),
    icon: txn.status === "BLOCKED" ? Ban : CheckCircle2,
    tone: txn.status === "BLOCKED" ? "fraud" : "success",
    title: txn.status === "BLOCKED" ? "Payment Blocked" : `Routed to ${titleCase(txn.decision)}`,
    detail: alert.reason_summary,
  });

  if (txn.status === "BLOCKED") {
    events.push({
      time: new Date(afterRules + 2000),
      icon: FileText,
      tone: "slate",
      title: "Fraud Alert Case Created",
      detail: alert.alert_ref,
    });
  }

  return events;
}

function investigationToEvent(inv: Investigation): TimelineEvent {
  return {
    time: new Date(inv.created_at),
    icon: FileText,
    tone: "primary",
    title: `${titleCase(inv.action)} — ${inv.investigator}`,
    detail: inv.notes || undefined,
  };
}

const toneDot: Record<TimelineEvent["tone"], string> = {
  slate: "bg-slate-400",
  fraud: "bg-fraud",
  primary: "bg-primary",
  success: "bg-success",
};

export function InvestigationTimeline({ alert }: { alert: AlertDetail }) {
  const events: TimelineEvent[] = [
    ...buildDetectionEvents(alert),
    ...alert.investigations.map(investigationToEvent),
  ];

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {events.map((event, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${toneDot[event.tone]}`}
          >
            <event.icon className="h-2.5 w-2.5 text-white" />
          </span>
          <p className="text-sm font-medium text-slate-800">{event.title}</p>
          {event.detail && <p className="mt-0.5 text-sm text-slate-600">{event.detail}</p>}
          <p className="mt-0.5 font-mono text-xs text-slate-400">{formatTime(event.time)}</p>
        </li>
      ))}
    </ol>
  );
}
