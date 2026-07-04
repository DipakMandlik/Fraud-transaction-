import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50 ring-1 ring-inset ring-slate-200/70">
        <Icon className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
