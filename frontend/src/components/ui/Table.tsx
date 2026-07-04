import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="max-h-[65vh] w-full overflow-auto rounded-xl border border-slate-200">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-slate-100 [&>tr:nth-child(even)]:bg-slate-50/40", className)}
      {...props}
    />
  );
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-primary-50/50 hover:shadow-[inset_2px_0_0_0_theme(colors.primary.DEFAULT)]",
        className
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500",
        className
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("whitespace-nowrap px-4 py-3.5 text-slate-700", className)} {...props} />;
}
