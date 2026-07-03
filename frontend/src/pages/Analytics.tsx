import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { analyticsApi } from "@/lib/api";
import { titleCase } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

const COLORS = ["#2563EB", "#0EA5E9", "#16A34A", "#EA580C", "#DC2626", "#7C3AED", "#DB2777"];

export default function Analytics() {
  const query = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsApi.get(24),
    refetchInterval: 15000,
  });

  if (query.isLoading || !query.data) {
    return (
      <AppLayout title="Analytics & Reporting">
        <Skeleton className="h-96 rounded-2xl" />
      </AppLayout>
    );
  }

  const data = query.data;

  return (
    <AppLayout title="Analytics & Reporting" subtitle="Last 24 hours of platform activity">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RateCard label="Approval Rate" value={data.approval_rate} tone="green" />
        <RateCard label="Blocked Rate" value={data.blocked_rate} tone="red" />
        <RateCard label="False Positive Rate" value={data.false_positive_rate} tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Hourly Fraud Volume">
          {data.hourly_fraud.length === 0 ? (
            <EmptyState icon={BarChart3} title="No fraud recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.hourly_fraud}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" name="Fraud Count" stroke="#DC2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Risk Score Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.risk_distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" name="Transactions" radius={[6, 6, 0, 0]}>
                {data.risk_distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Channel Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.channel_distribution.map((d) => ({ ...d, label: titleCase(d.label) }))}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.channel_distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fraud Reasons Breakdown">
          {data.fraud_reasons.length === 0 ? (
            <EmptyState icon={BarChart3} title="No fraud reasons recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.fraud_reasons} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF2F7" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" name="Occurrences" fill="#DC2626" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Country Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.country_distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" name="Transactions" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Top Risk Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.top_risk_customers.length === 0 ? (
              <EmptyState icon={BarChart3} title="No risk data yet" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Customer</TH>
                    <TH>Max Risk</TH>
                    <TH>Fraud Incidents</TH>
                    <TH>Transactions</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.top_risk_customers.map((c) => (
                    <TR key={c.customer_id}>
                      <TD className="font-medium text-slate-800">{c.customer_name}</TD>
                      <TD className="font-semibold text-fraud">{c.max_risk_score.toFixed(0)}</TD>
                      <TD>{c.fraud_incidents}</TD>
                      <TD>{c.total_transactions}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RateCard({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "orange" }) {
  const toneClasses = {
    green: "text-green-700 bg-success-light",
    red: "text-red-700 bg-fraud-light",
    orange: "text-orange-700 bg-warning-light",
  }[tone];

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-2 inline-flex rounded-lg px-3 py-1.5 text-2xl font-bold ${toneClasses}`}>{value}%</div>
    </Card>
  );
}
