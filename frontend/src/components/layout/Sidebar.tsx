import {
  LayoutDashboard,
  ListTree,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-slate-900">Sentinel</p>
          <p className="mt-0.5 text-[11px] leading-none text-slate-400">Fraud Detection Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors",
                "hover:bg-slate-50 hover:text-slate-900",
                isActive && "bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
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
