import React from "react";

// Approximate outline of Bangladesh in a 400 x 520 box (north at top, Bay of Bengal at bottom).
export const BD_OUTLINE =
  "M96,18 L128,12 L146,30 L140,52 L160,66 L178,60 L196,74 L230,70 L262,78 L300,72 L334,82 L356,98 L350,122 L322,130 L300,126 L282,140 L292,162 L318,170 L332,196 L322,222 L304,236 L300,262 L312,290 L328,316 L340,350 L352,384 L366,420 L374,460 L366,500 L352,506 L344,476 L330,446 L318,412 L304,392 L290,404 L282,388 L268,396 L258,420 L244,432 L232,416 L218,430 L204,420 L190,438 L174,428 L160,442 L146,432 L130,446 L118,430 L110,404 L94,382 L84,352 L92,326 L80,300 L66,280 L74,252 L58,230 L44,204 L56,180 L72,170 L68,146 L50,128 L56,104 L78,94 L84,70 L74,48 Z";

const HUBS = [
  { x: 196, y: 258, label: "Dhaka", c: "#E11D48" },
  { x: 318, y: 372, label: "Chattogram", c: "#D97706" },
  { x: 300, y: 152, label: "Sylhet", c: "#059669" },
  { x: 108, y: 120, label: "Rangpur", c: "#0284C7" },
  { x: 118, y: 228, label: "Rajshahi", c: "#0284C7" },
  { x: 150, y: 366, label: "Khulna", c: "#0284C7" },
  { x: 214, y: 388, label: "Barishal", c: "#0284C7" },
];

const LINKS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [2, 1],
  [4, 3],
  [5, 6],
  [6, 1],
];

function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.18 - 10;
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
}

/** Full-bleed, soft shadowed Bangladesh map with animated telecom routes. Decorative only. */
export const BangladeshMapBackdrop: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-[#FAF5EC] via-[#F4EEE4] to-[#EDE5D7]" />
    <div className="absolute -top-32 -left-24 w-[60vw] h-[60vw] rounded-full bg-rose-200/30 blur-3xl" />
    <div className="absolute -bottom-32 -right-24 w-[55vw] h-[55vw] rounded-full bg-amber-200/30 blur-3xl" />
    <svg
      viewBox="-40 -10 480 540"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <filter id="bdShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#7c2d12" floodOpacity="0.22" />
        </filter>
        <filter id="bdGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <linearGradient id="bdFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f5e6dc" stopOpacity="0.7" />
        </linearGradient>
        <pattern id="bdDots" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill="#be123c" fillOpacity="0.16" />
        </pattern>
        <clipPath id="bdClip">
          <path d={BD_OUTLINE} />
        </clipPath>
      </defs>

      <g opacity="0.55">
        <path d={BD_OUTLINE} fill="url(#bdFill)" filter="url(#bdShadow)" />
        <rect x="0" y="0" width="400" height="520" fill="url(#bdDots)" clipPath="url(#bdClip)" />
        <path
          d={BD_OUTLINE}
          fill="none"
          stroke="#be123c"
          strokeOpacity="0.28"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* rivers */}
        <path
          d="M140,52 Q170,160 196,258 Q220,330 232,416"
          fill="none"
          stroke="#38bdf8"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
        <path
          d="M282,140 Q240,200 196,258"
          fill="none"
          stroke="#38bdf8"
          strokeOpacity="0.28"
          strokeWidth="1.6"
        />
      </g>

      <g opacity="0.7">
        {LINKS.map(([a, b], i) => (
          <path
            key={i}
            d={arc(HUBS[a], HUBS[b])}
            fill="none"
            stroke={HUBS[b].c}
            strokeOpacity="0.45"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="40"
              to="0"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
        {HUBS.map((h, i) => (
          <g key={h.label}>
            <circle cx={h.x} cy={h.y} r="4" fill={h.c} fillOpacity="0.6" filter="url(#bdGlow)" />
            <circle cx={h.x} cy={h.y} r="2.4" fill={h.c} fillOpacity="0.8" />
            <circle cx={h.x} cy={h.y} r="6" fill="none" stroke={h.c} strokeOpacity="0.5">
              <animate
                attributeName="r"
                values="4;18;4"
                dur={`${4 + i * 0.4}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.5;0;0.5"
                dur={`${4 + i * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
            <text
              x={h.x + 7}
              y={h.y - 6}
              fontSize="8"
              fill="#57534e"
              fillOpacity="0.3"
              fontFamily="monospace"
            >
              {h.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(250,245,236,0.75)_100%)]" />
  </div>
);
