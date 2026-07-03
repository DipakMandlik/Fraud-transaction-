import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden flex-col items-end leading-tight sm:flex" aria-label="Current time">
      <span className="font-mono text-sm font-semibold text-slate-700">
        {new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(now)}
      </span>
      <span className="text-[11px] text-slate-400">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(now)}</span>
    </div>
  );
}
