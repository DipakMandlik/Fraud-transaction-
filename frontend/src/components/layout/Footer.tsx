import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-100 bg-white px-6 py-3 text-center",
        className
      )}
    >
      <span className="text-[11px] text-slate-400">Powered by</span>
      <Logo size="sm" className="h-4" />
      <span className="text-[11px] font-semibold text-slate-500">PiBy3</span>
      <span className="text-slate-200">&middot;</span>
      <span className="text-[11px] text-slate-400">Enterprise AI Solutions</span>
      <span className="text-slate-200">&middot;</span>
      <span className="text-[11px] text-slate-400">&copy; {new Date().getFullYear()} All rights reserved.</span>
    </footer>
  );
}
