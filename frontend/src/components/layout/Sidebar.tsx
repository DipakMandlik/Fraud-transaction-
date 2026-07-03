import {
  LayoutDashboard,
  ListTree,
  Radar,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white",
          "transition-transform duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-16 items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <Logo size="sm" className="shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-slate-900">Fraud Detection Platform</p>
            <p className="mt-0.5 truncate text-[11px] leading-none text-slate-400">Powered by PiByThree</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600",
                  "transition-all duration-[250ms] ease-out",
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
    </>
  );
}
