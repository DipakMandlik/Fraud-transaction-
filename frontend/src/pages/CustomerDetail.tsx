import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Laptop, Landmark, ShieldAlert, Smartphone, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { customersApi } from "@/lib/api";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";

const RISK_TONE: Record<string, "green" | "blue" | "red"> = { LOW: "green", MEDIUM: "blue", HIGH: "red" };

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();

  const customerQuery = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customersApi.get(customerId),
  });

  const txnQuery = useQuery({
    queryKey: ["customer-transactions", customerId],
    queryFn: () => customersApi.transactions(customerId, { page: 1, page_size: 25 }),
    enabled: !!customerId,
  });

  if (customerQuery.isLoading || !customerQuery.data) {
    return (
      <AppLayout title="Customer Profile">
        <Skeleton className="h-96 rounded-2xl" />
      </AppLayout>
    );
  }

  const customer = customerQuery.data;

  return (
    <AppLayout title={customer.full_name} subtitle={`${customer.customer_code} · ${customer.city}, ${customer.state}`}>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 shadow-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-xl font-bold text-primary-700 ring-4 ring-white">
          {customer.full_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-slate-900">{customer.full_name}</p>
          <p className="text-sm text-slate-500">
            {customer.customer_code} &middot; {customer.city}, {customer.state}
          </p>
        </div>
        <Badge tone={RISK_TONE[customer.risk_segment]} className="ml-auto shrink-0">
          {customer.risk_segment} RISK
        </Badge>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Risk Segment" value={customer.risk_segment} tone={RISK_TONE[customer.risk_segment]} />
        <StatCard label="Total Transactions" value={String(customer.total_transactions)} />
        <StatCard label="Fraud Incidents" value={String(customer.fraud_incidents)} tone={customer.fraud_incidents > 0 ? "red" : "green"} />
        <StatCard label="Highest Risk Score" value={customer.highest_risk_score.toFixed(0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileRow label="Email" value={customer.email} />
            <ProfileRow label="Phone" value={customer.phone} />
            <ProfileRow label="Occupation" value={customer.occupation} />
            <ProfileRow label="Annual Income" value={formatCurrency(customer.annual_income)} />
            <ProfileRow label="Avg. Transaction" value={formatCurrency(customer.avg_transaction_amount)} />
            <ProfileRow label="KYC Level" value={customer.kyc_level} />
            <ProfileRow label="Account Since" value={customer.account_open_date} />
            <ProfileRow label="Status" value={customer.status} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="transactions">
            <TabsList>
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              <TabsTrigger value="devices">Known Devices</TabsTrigger>
              <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <Card>
                {(txnQuery.data?.items.length ?? 0) === 0 ? (
                  <EmptyState icon={ShieldAlert} title="No transactions yet" />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Time</TH>
                        <TH>Amount</TH>
                        <TH>Channel</TH>
                        <TH>Status</TH>
                        <TH>Risk</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {txnQuery.data?.items.map((t) => (
                        <TR key={t.id} className="cursor-pointer" onClick={() => navigate(`/transactions/${t.id}`)}>
                          <TD className="text-xs text-slate-500">{formatDateTime(t.timestamp)}</TD>
                          <TD className="font-semibold">{formatCurrency(t.amount, t.currency)}</TD>
                          <TD>{titleCase(t.transaction_type)}</TD>
                          <TD>
                            <Badge tone={statusTone(t.status)}>{titleCase(t.status)}</Badge>
                          </TD>
                          <TD>
                            <Badge tone={riskTone(t.risk_score)}>{t.risk_score.toFixed(0)}</Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="devices">
              <Card>
                {customer.devices.length === 0 ? (
                  <EmptyState icon={Smartphone} title="No devices registered" />
                ) : (
                  <div className="divide-y divide-slate-50">
                    {customer.devices.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Laptop className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.device_uid}</p>
                            <p className="text-xs text-slate-400">{d.os} &middot; {titleCase(d.device_type)}</p>
                          </div>
                        </div>
                        <Badge tone={d.is_trusted ? "green" : "orange"}>{d.is_trusted ? "Trusted" : "Unverified"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="beneficiaries">
              <Card>
                {customer.beneficiaries.length === 0 ? (
                  <EmptyState icon={Users} title="No beneficiaries added" />
                ) : (
                  <div className="divide-y divide-slate-50">
                    {customer.beneficiaries.map((b) => (
                      <div key={b.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{b.beneficiary_name}</p>
                          <p className="text-xs text-slate-400">
                            {b.bank_name} &middot; {titleCase(b.relationship_type)} &middot; {b.transfer_count} transfers
                          </p>
                        </div>
                        <Badge tone={b.is_frequent ? "green" : "slate"}>{b.is_frequent ? "Frequent" : "Occasional"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="accounts">
              <Card>
                {customer.accounts.length === 0 ? (
                  <EmptyState icon={Landmark} title="No accounts found" />
                ) : (
                  <div className="divide-y divide-slate-50">
                    {customer.accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Wallet className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{a.account_number}</p>
                            <p className="text-xs text-slate-400">{a.bank_name} &middot; {titleCase(a.account_type)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(a.balance)}</p>
                          <p className="text-xs text-slate-400">Limit {formatCurrency(a.daily_limit)}/day</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "green" | "blue" | "red" }) {
  return (
    <Card interactive className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2">
        {tone ? <Badge tone={tone} className="text-base font-bold">{value}</Badge> : <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>}
      </div>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
