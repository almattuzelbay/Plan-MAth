/** Hand-made SVG illustrations (no external images, so no licensing or loading issues). */

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
