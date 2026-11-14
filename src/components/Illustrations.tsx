/** Hand-made SVG illustrations (no external images, so no licensing or loading issues). */

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 340" role="img" aria-label="A benefits document turning into a clear cost comparison" className="hero-art">
      <defs>
        <linearGradient id="g-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1efff" />
        </linearGradient>
        <linearGradient id="g-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5df6" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#312e81" floodOpacity="0.16" />
        </filter>
      </defs>

      <circle cx="250" cy="170" r="150" fill="#ece9ff" />
      <circle cx="355" cy="60" r="22" fill="#c7f9e5" />
      <circle cx="70" cy="285" r="14" fill="#ffe4c7" />

      {/* Benefits document */}
      <g filter="url(#shadow)" transform="rotate(-6 120 160)">
        <rect x="45" y="60" width="150" height="195" rx="14" fill="url(#g-card)" />
        <rect x="65" y="82" width="80" height="10" rx="5" fill="#c4bdfb" />
        {[110, 128, 146, 164, 182, 200, 218].map((y, i) => (
          <g key={y}>
            <rect x="65" y={y} width={i % 2 ? 70 : 92} height="7" rx="3.5" fill="#e3e0f7" />
            <rect x="150" y={y} width="26" height="7" rx="3.5" fill={i === 2 || i === 5 ? "#8b7ff8" : "#e3e0f7"} />
          </g>
        ))}
        <text x="65" y="245" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#6d5df6">
          BENEFITS GUIDE
        </text>
      </g>

      {/* Arrow */}
      <path d="M200 175 C 225 160, 238 160, 258 172" stroke="#6d5df6" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 7" />
      <path d="M252 164 l9 9 -12 4" stroke="#6d5df6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Result card */}
      <g filter="url(#shadow)">
        <rect x="235" y="95" width="160" height="175" rx="16" fill="#fff" />
        <text x="253" y="122" fontFamily="Inter, sans-serif" fontSize="10" fill="#6b7280">Yearly cost</text>
        {[
          { y: 138, w: 118, c: "#c7d2fe", label: "PPO" },
          { y: 166, w: 92, c: "#c7d2fe", label: "HMO" },
          { y: 194, w: 58, c: "url(#g-brand)", label: "HSA" },
        ].map((b) => (
          <g key={b.label}>
            <rect x="253" y={b.y} width={b.w} height="18" rx="6" fill={b.c} />
            <text x={253 + b.w + 6} y={b.y + 13} fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#374151">
              {b.label}
            </text>
          </g>
        ))}
        <rect x="253" y="228" width="124" height="26" rx="13" fill="#d1fae5" />
        <text x="266" y="245" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="800" fill="#047857">
          −$1,280 / year
        </text>
      </g>

      {/* Coins */}
      <g transform="translate(330 270)">
        <ellipse cx="0" cy="12" rx="26" ry="8" fill="#f59e0b" />
        <rect x="-26" y="0" width="52" height="12" fill="#f59e0b" />
        <ellipse cx="0" cy="0" rx="26" ry="8" fill="#fbbf24" />
        <text x="-4" y="4" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="800" fill="#92400e">$</text>
      </g>
      <g transform="translate(50 40)">
        <circle r="18" fill="#10b981" />
        <path d="M-7 0 l5 5 9 -10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const SKIN = ["#f2c9a0", "#c68e65", "#8d5a3b"];

/** Friendly abstract avatar for household members. */
export function Avatar({ role, index = 0 }: { role: "you" | "spouse" | "child"; index?: number }) {
  const skin = SKIN[index % SKIN.length];
  const small = role === "child";
  const bg = role === "you" ? "#ede9fe" : role === "spouse" ? "#dcfce7" : "#fef3c7";
  const shirt = role === "you" ? "#6d5df6" : role === "spouse" ? "#10b981" : "#f59e0b";
  return (
    <svg viewBox="0 0 64 64" className="avatar" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <path d={small ? "M16 64 C 18 46, 46 46, 48 64 Z" : "M10 64 C 12 42, 52 42, 54 64 Z"} fill={shirt} />
      <circle cx="32" cy={small ? 32 : 27} r={small ? 10 : 12} fill={skin} />
      <path
        d={small ? "M22 30 C 22 20, 42 20, 42 30 C 38 25, 26 25, 22 30 Z" : "M20 26 C 19 13, 45 13, 44 26 C 40 19, 24 19, 20 26 Z"}
        fill="#3f2d20"
      />
    </svg>
  );
}

export function EmptyPlansArt() {
  return (
    <svg viewBox="0 0 120 90" className="empty-art" aria-hidden="true">
      <rect x="20" y="10" width="60" height="74" rx="8" fill="#ede9fe" />
      <rect x="30" y="24" width="34" height="6" rx="3" fill="#c4b5fd" />
      <rect x="30" y="38" width="40" height="5" rx="2.5" fill="#ddd6fe" />
      <rect x="30" y="50" width="28" height="5" rx="2.5" fill="#ddd6fe" />
      <circle cx="84" cy="64" r="18" fill="#6d5df6" />
      <path d="M84 56 v16 M76 64 h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
