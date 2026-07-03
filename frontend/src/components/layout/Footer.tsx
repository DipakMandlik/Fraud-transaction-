import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-col items-center gap-1 border-t border-slate-100 bg-white px-6 py-3 text-center",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] text-slate-400">Powered by</span>
        <Logo size="sm" className="h-4" />
        <span className="text-[11px] font-semibold text-slate-500">PiByThree Enterprise AI Solutions</span>
      </div>
      <p className="text-[10px] text-slate-300">
        &copy; {new Date().getFullYear()} PiByThree Technologies Pvt. Ltd. All Rights Reserved.
      </p>
    </footer>
  );
}
