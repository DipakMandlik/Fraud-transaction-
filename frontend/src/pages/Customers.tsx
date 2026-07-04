import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { customersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const RISK_TONE: Record<string, "green" | "blue" | "red"> = { LOW: "green", MEDIUM: "blue", HIGH: "red" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const [riskSegment, setRiskSegment] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["customers", { search, riskSegment, page }],
    queryFn: () => customersApi.list({ page, page_size: 20, search: search || undefined, risk_segment: riskSegment || undefined }),
  });

  return (
    <AppLayout title="Customer 360" subtitle="Behavioural profiles, risk history and known devices">
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, customer ID, phone or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={riskSegment}
            onChange={(e) => {
              setRiskSegment(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Risk Segments</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
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
          <EmptyState icon={Users} title="No Customer Matches" description="Try a different name, ID, phone or email." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH>Code</TH>
                  <TH>City</TH>
                  <TH>Occupation</TH>
                  <TH>Avg. Transaction</TH>
                  <TH>Risk Segment</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {query.data?.items.map((c) => (
                  <TR key={c.id} className="cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                    <TD className="font-medium text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-[11px] font-semibold text-primary-700">
                          {c.full_name.charAt(0)}
                        </span>
                        {c.full_name}
                      </div>
                    </TD>
                    <TD className="text-slate-500">{c.customer_code}</TD>
                    <TD>{c.city}</TD>
                    <TD>{c.occupation}</TD>
                    <TD>{formatCurrency(c.avg_transaction_amount)}</TD>
                    <TD>
                      <Badge tone={RISK_TONE[c.risk_segment] ?? "slate"}>{c.risk_segment}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={c.status === "ACTIVE" ? "green" : "slate"}>{c.status}</Badge>
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
