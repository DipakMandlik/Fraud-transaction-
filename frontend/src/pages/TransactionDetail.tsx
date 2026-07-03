import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Smartphone, Wallet } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { transactionsApi } from "@/lib/api";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionsApi.get(Number(id)),
  });

  return (
    <AppLayout title="Transaction Detail" subtitle={query.data?.transaction_ref}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {query.isLoading || !query.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(query.data.status)}>{titleCase(query.data.status)}</Badge>
                  <Badge tone={riskTone(query.data.risk_score)}>Risk {query.data.risk_score.toFixed(0)}</Badge>
                  {query.data.is_fraud && <Badge tone="red">Confirmed Fraud Pattern</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Field label="Amount" value={formatCurrency(query.data.amount, query.data.currency)} />
                  <Field label="Channel" value={titleCase(query.data.transaction_type)} />
                  <Field label="Decision" value={titleCase(query.data.decision)} />
                  <Field label="Customer" value={query.data.customer_name} />
                  <Field label="Account" value={query.data.account_number} />
                  <Field label="Timestamp" value={formatDateTime(query.data.timestamp)} />
                  {query.data.merchant_name && <Field label="Merchant" value={query.data.merchant_name} />}
                  {query.data.beneficiary_name && <Field label="Beneficiary" value={query.data.beneficiary_name} />}
                  <Field label="Location" value={`${query.data.city}, ${query.data.country}`} />
                  <Field label="Device" value={query.data.device_id ?? "Unknown"} />
                  <Field label="IP Address" value={query.data.ip_address} />
                  <Field label="Reference" value={query.data.transaction_ref} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fraud Detection Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{query.data.reason}</p>
                {query.data.triggered_rules.length === 0 ? (
                  <p className="text-sm text-slate-400">No rules triggered for this transaction.</p>
                ) : (
                  <ul className="space-y-2">
                    {query.data.triggered_rules.map((rule) => (
                      <li key={rule} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-fraud" />
                        {titleCase(rule)}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>{query.data.city}, {query.data.country}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {query.data.latitude.toFixed(3)}, {query.data.longitude.toFixed(3)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Device &amp; Network
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>Device: {query.data.device_id ?? "Unregistered"}</p>
                <p className="mt-1">IP: {query.data.ip_address}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> Account
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>Account: {query.data.account_number}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/customers/${query.data!.customer_id}`)}
                >
                  View Customer Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
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
