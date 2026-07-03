import { useQuery } from "@tanstack/react-query";
import { Download, ListTree, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { transactionsApi, type TransactionFilters } from "@/lib/api";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";

const STATUS_OPTIONS = ["APPROVED", "REVIEW", "OTP_PENDING", "BLOCKED"];
const TYPE_OPTIONS = ["UPI", "ATM", "DEBIT_CARD", "CREDIT_CARD", "NEFT", "RTGS", "IMPS"];

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, page_size: 20 });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => transactionsApi.list(filters),
    refetchInterval: 8000,
  });

  function updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <AppLayout title="Transaction Explorer" subtitle="Search, filter and investigate every transaction">
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="relative flex-1 min-w-[220px]"
            onSubmit={(e) => {
              e.preventDefault();
              updateFilter("search", search || undefined);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by customer, txn ref, merchant, IP..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <Select
            value={filters.status ?? ""}
            onChange={(e) => updateFilter("status", e.target.value || undefined)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>

          <Select
            value={filters.transaction_type ?? ""}
            onChange={(e) => updateFilter("transaction_type", e.target.value || undefined)}
          >
            <option value="">All Channels</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>

          <Select
            value={filters.is_fraud === undefined ? "" : String(filters.is_fraud)}
            onChange={(e) => updateFilter("is_fraud", e.target.value === "" ? undefined : e.target.value === "true")}
          >
            <option value="">Fraud + Legit</option>
            <option value="true">Fraud Only</option>
            <option value="false">Legitimate Only</option>
          </Select>

          <Button variant="outline" onClick={() => transactionsApi.exportCsv(filters)}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
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
          <EmptyState icon={ListTree} title="No transactions found" description="Try adjusting your filters." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Customer</TH>
                  <TH>Amount</TH>
                  <TH>Channel</TH>
                  <TH>Location</TH>
                  <TH>Status</TH>
                  <TH>Risk</TH>
                  <TH>Fraud</TH>
                </TR>
              </THead>
              <TBody>
                {query.data?.items.map((txn) => (
                  <TR key={txn.id} className="cursor-pointer" onClick={() => navigate(`/transactions/${txn.id}`)}>
                    <TD className="text-xs text-slate-500">{formatDateTime(txn.timestamp)}</TD>
                    <TD className="font-medium text-slate-800">{txn.customer_name}</TD>
                    <TD className="font-semibold">{formatCurrency(txn.amount, txn.currency)}</TD>
                    <TD>{titleCase(txn.transaction_type)}</TD>
                    <TD>{txn.city}</TD>
                    <TD>
                      <Badge tone={statusTone(txn.status)}>{titleCase(txn.status)}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={riskTone(txn.risk_score)}>{txn.risk_score.toFixed(0)}</Badge>
                    </TD>
                    <TD>{txn.is_fraud ? <Badge tone="red">Fraud</Badge> : <Badge tone="slate">Clean</Badge>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={filters.page ?? 1}
              pageSize={filters.page_size ?? 20}
              total={query.data?.total ?? 0}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </Card>
    </AppLayout>
  );
}
