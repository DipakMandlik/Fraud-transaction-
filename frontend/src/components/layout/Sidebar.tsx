import {
  LayoutDashboard,
  ListTree,
  Radar,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/simulator", label: "Transaction Simulator", icon: Radar },
  { to: "/transactions", label: "Transactions", icon: ListTree },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/alerts", label: "Fraud Alert Center", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: SlidersHorizontal },
  { to: "/rules", label: "Rule Engine", icon: ShieldCheck },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <Logo size="sm" className="rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-slate-900">Fraud Intelligence</p>
          <p className="mt-0.5 truncate text-[11px] leading-none text-slate-400">Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600",
                "transition-all duration-150 ease-out",
                "hover:bg-slate-50 hover:text-slate-900",
                isActive
                  ? "bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50 hover:text-primary-700"
                  : "hover:translate-x-0.5"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity duration-150",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary-700" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <p className="text-xs font-medium text-slate-600">Live monitoring active</p>
        </div>
      </div>
    </aside>
  );
}
