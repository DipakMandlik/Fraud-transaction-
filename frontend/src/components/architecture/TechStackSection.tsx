import { useState } from "react";

import { TECH_STACK } from "@/data/architecture";
import { cn } from "@/lib/utils";

const CATEGORY_TONE: Record<string, string> = {
  Frontend: "bg-primary-50 text-primary-700",
  Backend: "bg-success-light text-green-700",
  Data: "bg-warning-light text-orange-700",
};

export function TechStackSection() {
  const [openName, setOpenName] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {TECH_STACK.map((tech) => {
        const isOpen = openName === tech.name;
        return (
          <button
            key={tech.name}
            onClick={() => setOpenName(isOpen ? null : tech.name)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover",
              isOpen ? "border-primary bg-primary-50/40" : "border-slate-200 bg-white"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800">{tech.name}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", CATEGORY_TONE[tech.category])}>
                {tech.category}
              </span>
            </div>
            {isOpen && <p className="animate-fade-in text-[11px] leading-relaxed text-slate-500">{tech.purpose}</p>}
          </button>
        );
      })}
    </div>
  );
}
