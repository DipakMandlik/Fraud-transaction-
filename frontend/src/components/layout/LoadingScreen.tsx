import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/Logo";

const DEFAULT_STEPS = [
  "Authenticating…",
  "Initializing Fraud Engine…",
  "Connecting Rule Engine…",
  "Connecting Analytics…",
  "Loading platform modules…",
];

export function LoadingScreen({ steps = DEFAULT_STEPS, intervalMs = 450 }: { steps?: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);

  const progress = ((index + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <Logo size="lg" className="mb-6 animate-fade-in rounded-xl shadow-elevated" />
      <div className="mb-4 h-1 w-48 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary transition-[width] duration-500 ease-premium"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p key={index} className="animate-fade-in text-sm font-medium text-slate-500">
        {steps[index]}
      </p>
    </div>
  );
}
