import { useMemo } from "react";

/** Dark "secure network" backdrop for the login screen: a deep navy gradient,
 * an animated constellation of glowing nodes + links (evoking a monitored
 * transaction network), a faint city skyline, and soft glow blobs. Pure SVG +
 * SMIL, so it is fully self-contained (works offline / on GitHub Pages). */
export function AuthBackground() {
  // Deterministic pseudo-random node layout (stable across renders, no deps).
  const { nodes, links } = useMemo(() => {
    const rand = (i: number, s: number) => {
      const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      x: rand(i, 1) * 100,
      y: rand(i, 2) * 60,
      r: 0.25 + rand(i, 3) * 0.5,
    }));
    const links: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.hypot(dx, dy) < 18) {
          links.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y });
        }
      }
    }
    return { nodes, links };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#081226]">
      {/* base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#12275a_0%,#0b1c40_45%,#060f24_100%)]" />

      {/* glow blobs */}
      <div className="absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

      {/* constellation network */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </radialGradient>
        </defs>

        {links.map((l, i) => (
          <line
            key={`l${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#3b82f6"
            strokeWidth={0.08}
            strokeOpacity={0.25}
          >
            <animate attributeName="stroke-opacity" values="0.08;0.3;0.08" dur={`${4 + (i % 5)}s`} repeatCount="indefinite" />
          </line>
        ))}

        {nodes.map((n, i) => (
          <g key={`n${i}`}>
            <circle cx={n.x} cy={n.y} r={n.r * 3} fill="url(#node-glow)" opacity={0.5} />
            <circle cx={n.x} cy={n.y} r={n.r} fill="#bae6fd">
              <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2.5 + (i % 4)}s`} begin={`${(i % 6) * 0.4}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* faint skyline */}
      <svg
        className="absolute bottom-0 left-0 h-40 w-full opacity-30"
        viewBox="0 0 400 100"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path
          d="M0,100 L0,60 L18,60 L18,42 L34,42 L34,66 L52,66 L52,30 L60,24 L68,30 L68,58 L86,58 L86,48 L104,48 L104,70 L120,70 L120,38 L138,38 L138,62 L156,62 L156,50 L176,50 L176,68 L196,68 L196,34 L206,28 L216,34 L216,64 L236,64 L236,46 L256,46 L256,72 L276,72 L276,40 L296,40 L296,60 L316,60 L316,52 L336,52 L336,70 L356,70 L356,44 L376,44 L376,64 L400,64 L400,100 Z"
          fill="#0a1836"
        />
      </svg>

      {/* subtle top-to-bottom darkening for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060f24]/60" />
    </div>
  );
}
