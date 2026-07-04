import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-3">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold tabular-nums text-slate-700">{start}</span>&ndash;
        <span className="font-semibold tabular-nums text-slate-700">{end}</span> of{" "}
        <span className="font-semibold tabular-nums text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium tabular-nums text-slate-500">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
