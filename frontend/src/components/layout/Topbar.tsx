import { LogOut, Menu } from "lucide-react";

import { LiveClock } from "@/components/layout/LiveClock";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="relative z-[1] flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <LiveClock />
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <NotificationBell />
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-semibold text-primary-700 ring-2 ring-white transition-transform hover:scale-105">
            {user?.full_name?.charAt(0) ?? "A"}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-slate-800">{user?.full_name ?? "Investigator"}</p>
            <p className="text-[11px] text-slate-400">{user?.role ?? "ANALYST"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
