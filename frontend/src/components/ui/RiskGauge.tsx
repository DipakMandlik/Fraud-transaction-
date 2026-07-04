import { useEffect, useState } from "react";

import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  score: number | null;
  calculating?: boolean;
  size?: number;
  className?: string;
}

function colorForScore(score: number): string {
  if (score >= 81) return "#DC2626";
  if (score >= 61) return "#EA580C";
  if (score >= 31) return "#2563EB";
  return "#16A34A";
}

function labelForScore(score: number): string {
  if (score >= 81) return "BLOCK";
  if (score >= 61) return "OTP VERIFICATION";
  if (score >= 31) return "REVIEW";
  return "APPROVE";
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.75; // 270-degree speedometer arc

export function RiskGauge({ score, calculating = false, size = 200, className }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const animated = useCountUp(calculating ? 0 : score ?? 0, 1100);

  useEffect(() => {
    setDisplayScore(calculating ? 0 : animated);
  }, [animated, calculating]);

  const clamped = Math.max(0, Math.min(100, displayScore));
  const color = colorForScore(clamped);
  const arcLength = CIRCUMFERENCE * ARC_FRACTION;
  const filled = (clamped / 100) * arcLength;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 180 180" width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx="90" cy="90" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={14}
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`} strokeLinecap="round"
        />
        <circle
          cx="90" cy="90" r={RADIUS} fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`} strokeLinecap="round"
          style={{ transition: "stroke 0.3s ease, stroke-dasharray 0.3s ease", filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {calculating ? (
          <>
            <span className="text-sm font-semibold text-slate-400 animate-pulse">Calculating…</span>
            <span className="mt-1 text-4xl font-black tabular-nums text-slate-300">--</span>
          </>
        ) : (
          <>
            <span className="text-5xl font-black tabular-nums" style={{ color }}>
              {Math.round(clamped)}
            </span>
            <span className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color }}>
              {labelForScore(clamped)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
