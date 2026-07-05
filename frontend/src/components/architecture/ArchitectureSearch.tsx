import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { COMPONENTS } from "@/data/architecture";
import { Input } from "@/components/ui/Input";

export function ArchitectureSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return COMPONENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.sourceFiles.some((f) => f.toLowerCase().includes(q)) ||
        c.apiEndpoints.some((e) => e.path.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [query]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Search components, files, endpoints..."
        className="pl-9 pr-8"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {query && (
        <button
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1.5 w-full origin-top animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-popover">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <c.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-800">{c.name}</span>
                  <span className="block truncate text-[11px] text-slate-400">{c.tagline}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
