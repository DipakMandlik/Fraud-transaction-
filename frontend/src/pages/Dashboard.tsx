import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  Ban,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { ChannelDistributionChart } from "@/components/dashboard/ChannelDistributionChart";
import { FraudTrendChart } from "@/components/dashboard/FraudTrendChart";
import { GeoHeatMap } from "@/components/dashboard/GeoHeatMap";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LatestAlertsList } from "@/components/dashboard/LatestAlertsList";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { dashboardApi, transactionsApi } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function Dashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    refetchInterval: 5000,
  });

  const recentTxnQuery = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () => transactionsApi.list({ page: 1, page_size: 12 }),
    refetchOnMount: "always",
  });

  const kpis = dashboardQuery.data?.kpis;

  return (
    <AppLayout
      title="Fraud Operations Command Center"
      subtitle="Real-Time Transaction Monitoring, AI Risk Scoring & Fraud Investigation"
    >
      <WelcomeBanner />
      {dashboardQuery.isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Transactions Today"
              value={formatNumber(kpis?.transactions_today ?? 0)}
              icon={Activity}
              tone="primary"
              hint={`${kpis?.transactions_per_minute ?? 0} / min`}
            />
            <KpiCard
              label="Fraud Detected"
              value={formatNumber(kpis?.fraud_detected ?? 0)}
              icon={ShieldAlert}
              tone="fraud"
              hint={`${kpis?.fraud_percentage ?? 0}% of volume`}
            />
            <KpiCard
              label="Blocked Transactions"
              value={formatNumber(kpis?.blocked ?? 0)}
              icon={Ban}
              tone="warning"
              hint={`${formatCurrency(kpis?.fraud_prevented_amount ?? 0)} prevented`}
            />
            <KpiCard
              label="Pending Investigation"
              value={formatNumber(kpis?.pending_investigation ?? 0)}
              icon={AlertOctagon}
              tone="slate"
              hint="Open + In Progress"
            />
            <KpiCard
              label="High Risk Accounts"
              value={formatNumber(kpis?.high_risk_accounts ?? 0)}
              icon={Users}
              tone="warning"
              hint="Last 24 hours"
            />
            <KpiCard
              label="Average Risk Score"
              value={(kpis?.average_risk_score ?? 0).toFixed(1)}
              icon={Gauge}
              tone="primary"
              hint="0 - 100 scale"
            />
            <KpiCard
              label="Fraud Prevention Rate"
              value={`${kpis?.fraud_percentage ? (100 - kpis.fraud_percentage).toFixed(1) : "100.0"}%`}
              icon={ShieldCheck}
              tone="success"
              hint="Clean transaction rate"
            />
            <KpiCard
              label="Live Throughput"
              value={`${kpis?.transactions_per_minute ?? 0}/min`}
              icon={TrendingUp}
              tone="primary"
              hint="5-minute rolling average"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <FraudTrendChart data={dashboardQuery.data?.trend ?? []} />
            </div>
            <ChannelDistributionChart data={dashboardQuery.data?.channel_distribution ?? []} />
          </div>

          <GeoHeatMap data={dashboardQuery.data?.geo_points ?? []} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LiveActivityFeed initial={recentTxnQuery.data?.items ?? []} />
            <LatestAlertsList />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
