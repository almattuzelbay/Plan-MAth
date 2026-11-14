/**
 * Themed illustrations for the landing page — hand-made SVG, so they always load and carry no licensing risk.
 * Palette: violet brand, mint for health/savings, warm accents.
 */
import { useEffect, useState } from "react";

const V = "#5b4cf0";
const V2 = "#8b7ff8";
const VL = "#ece9ff";
const M = "#10b981";
const ML = "#d1fae5";
const A = "#f59e0b";
const AL = "#fef3c7";
const SKIN = ["#f2c9a0", "#c68e65", "#8d5a3b", "#e0ac7e"];
const HAIR = "#3f2d20";

/** Brand mark: a medical cross inside a shield, with a dollar sign. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cf8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <path d="M20 2 L35 8 V19 C35 29 28 35 20 38 C12 35 5 29 5 19 V8 Z" fill="url(#lm)" />
      <rect x="16.5" y="10" width="7" height="20" rx="2" fill="#fff" />
      <rect x="10" y="16.5" width="20" height="7" rx="2" fill="#fff" />
      <circle cx="29" cy="30" r="7" fill={M} stroke="#fff" strokeWidth="2" />
      <text x="29" y="33.5" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif" fill="#fff" textAnchor="middle">$</text>
    </svg>
  );
}

function Person({ x, y, s = 1, skin = 0, shirt = V, hair = true, long = false }: { x: number; y: number; s?: number; skin?: number; shirt?: string; hair?: boolean; long?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 70 C-24 34, 24 34, 26 70 Z" fill={shirt} />
      <rect x="-6" y="18" width="12" height="12" fill={SKIN[skin]} />
      <circle cx="0" cy="8" r="16" fill={SKIN[skin]} />
      {hair && (long
        ? <path d="M-17 10 C-19 -14, 19 -14, 17 10 L17 26 C12 20, 14 4, 0 0 C-14 4, -12 20, -17 26 Z" fill={HAIR} />
        : <path d="M-16 6 C-17 -12, 17 -12, 16 6 C12 -2, -12 -2, -16 6 Z" fill={HAIR} />)}
      <circle cx="-5" cy="9" r="1.6" fill="#1f2937" />
      <circle cx="5" cy="9" r="1.6" fill="#1f2937" />
      <path d="M-4 15 Q0 18 4 15" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Hero: a family next to a benefits document that turns into a clear yearly-cost chart. */
export function HeroScene() {
  return (
    <svg viewBox="0 0 480 400" className="scene hero-scene" role="img" aria-label="A family comparing health plans: a benefits guide turns into a clear chart of yearly costs">
      <defs>
        <linearGradient id="hs-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efeaff" />
          <stop offset="1" stopColor="#e3fbf1" />
        </linearGradient>
        <filter id="hs-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#312e81" floodOpacity="0.15" />
        </filter>
      </defs>
      <path d="M60 60 C140 -10, 360 0, 430 90 C500 180, 450 330, 330 370 C210 410, 60 360, 30 260 C5 180, 10 110, 60 60 Z" fill="url(#hs-bg)" />
      {/* floating badges */}
      <g filter="url(#hs-sh)">
        <rect x="300" y="30" width="150" height="44" rx="22" fill="#fff" />
        <circle cx="324" cy="52" r="12" fill={ML} />
        <path d="M318 52 l4 4 8 -9" stroke={M} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="342" y="57" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif" fill="#0f172a">No sign-up</text>
      </g>
      {/* benefits document */}
      <g filter="url(#hs-sh)" transform="rotate(-7 130 170)">
        <rect x="55" y="80" width="150" height="190" rx="14" fill="#fff" />
        <rect x="75" y="100" width="70" height="10" rx="5" fill={V2} />
        {[124, 142, 160, 178, 196, 214, 232].map((y, i) => (
          <g key={y}>
            <rect x="75" y={y} width={i % 2 ? 62 : 82} height="7" rx="3.5" fill="#e6e3f8" />
            <rect x="165" y={y} width="22" height="7" rx="3.5" fill={i === 1 || i === 4 ? V2 : "#e6e3f8"} />
          </g>
        ))}
        <text x="75" y="258" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif" fill={V}>BENEFITS GUIDE 2027</text>
      </g>
      {/* result card */}
      <g filter="url(#hs-sh)">
        <rect x="250" y="100" width="190" height="160" rx="18" fill="#fff" />
        <text x="270" y="128" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">Net yearly cost</text>
        {[
          { y: 142, w: 126, c: "#cfd4fb", t: "PPO $6,420" },
          { y: 170, w: 100, c: "#cfd4fb", t: "HMO $5,980" },
          { y: 198, w: 70, c: V, t: "HSA $4,890" },
        ].map((b) => (
          <g key={b.t}>
            <rect x="270" y={b.y} width={b.w} height="20" rx="7" fill={b.c} />
            <text x={270 + b.w + 8} y={b.y + 14} fontSize="10" fontWeight="700" fill="#334155" fontFamily="Inter, sans-serif">{b.t.split(" ")[0]}</text>
          </g>
        ))}
        <rect x="270" y="228" width="150" height="22" rx="11" fill={ML} />
        <text x="345" y="243" fontSize="11" fontWeight="800" fill="#047857" textAnchor="middle" fontFamily="Inter, sans-serif">−$1,530 a year</text>
      </g>
      {/* arrow */}
      <path d="M210 175 C 228 160, 238 160, 248 168" stroke={V} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 7" />
      {/* family */}
      <g transform="translate(0 6)">
        <Person x={170} y={300} s={0.95} skin={1} shirt={M} long />
        <Person x={230} y={292} s={1.05} skin={0} shirt={V} />
        <Person x={285} y={322} s={0.7} skin={3} shirt={A} />
      </g>
      {/* heart + coin */}
      <g transform="translate(400 310)">
        <circle r="26" fill={AL} />
        <path d="M0 10 C-18 -2, -14 -18, -4 -14 C0 -12, 0 -9, 0 -9 C0 -9, 0 -12, 4 -14 C14 -18, 18 -2, 0 10 Z" fill="#ef4444" />
      </g>
      <g transform="translate(70 320)">
        <ellipse cx="0" cy="10" rx="22" ry="7" fill="#d97706" />
        <rect x="-22" y="0" width="44" height="10" fill="#d97706" />
        <ellipse cx="0" cy="0" rx="22" ry="7" fill="#fbbf24" />
        <text x="0" y="4" fontSize="9" fontWeight="800" fill="#92400e" textAnchor="middle" fontFamily="Inter, sans-serif">$</text>
      </g>
    </svg>
  );
}

/** Small scenes for the four "How it works" steps. */
export function StepScene({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <svg viewBox="0 0 160 110" className="scene step-scene" aria-hidden="true">
      <rect width="160" height="110" rx="16" fill={step === 2 ? ML : step === 3 ? AL : VL} />
      {step === 1 && (
        <g>
          <rect x="45" y="18" width="56" height="72" rx="8" fill="#fff" />
          {[32, 44, 56, 68].map((y) => <rect key={y} x="54" y={y} width="38" height="5" rx="2.5" fill="#ddd6fe" />)}
          <circle cx="106" cy="76" r="16" fill={V} />
          <path d="M106 84 V68 M99 75 l7 -7 7 7" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {step === 2 && (
        <g>
          <Person x={58} y={36} s={0.6} skin={0} shirt={V} />
          <Person x={92} y={40} s={0.55} skin={2} shirt={M} long />
          <Person x={118} y={56} s={0.4} skin={3} shirt={A} />
        </g>
      )}
      {step === 3 && (
        <g>
          <rect x="52" y="14" width="56" height="82" rx="10" fill="#1f2937" />
          <rect x="60" y="22" width="40" height="18" rx="4" fill={ML} />
          <text x="96" y="35" fontSize="10" fontWeight="800" fill="#047857" textAnchor="end" fontFamily="Inter, sans-serif">4,890</text>
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={60 + c * 14} y={48 + r * 14} width="10" height="10" rx="3" fill={r === 2 && c === 2 ? A : "#4b5563"} />
          )))}
        </g>
      )}
      {step === 4 && (
        <g>
          <rect x="30" y="20" width="100" height="72" rx="10" fill="#fff" />
          <polyline points="40,80 60,70 80,66 100,50 120,44" fill="none" stroke={V} strokeWidth="3" strokeLinecap="round" />
          <polyline points="40,62 60,60 80,58 100,58 120,56" fill="none" stroke={M} strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="60" r="5" fill={A} stroke="#fff" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

/** Scenes for the "Who it's for" life-event cards. */
export function LifeScene({ kind }: { kind: "openEnrollment" | "newJob" | "turning26" | "baby" }) {
  return (
    <svg viewBox="0 0 240 150" className="scene life-scene" aria-hidden="true">
      <rect width="240" height="150" fill={kind === "baby" ? "#fff1f2" : kind === "turning26" ? AL : kind === "newJob" ? ML : VL} />
      {kind === "openEnrollment" && (
        <g>
          <rect x="70" y="28" width="100" height="94" rx="12" fill="#fff" />
          <rect x="70" y="28" width="100" height="24" rx="12" fill={V} />
          <rect x="70" y="40" width="100" height="12" fill={V} />
          <text x="120" y="45" fontSize="11" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Inter, sans-serif">NOVEMBER</text>
          {[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}${c}`} x={80 + c * 17} y={62 + r * 17} width="12" height="12" rx="3" fill={r === 1 && c === 2 ? M : "#ede9fe"} />
          )))}
          <path d="M113 82 l3 3 6 -7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === "newJob" && (
        <g>
          <Person x={95} y={50} s={1} skin={1} shirt={V} />
          <g transform="translate(140 80)">
            <rect x="0" y="10" width="54" height="40" rx="6" fill="#92400e" />
            <rect x="18" y="0" width="18" height="12" rx="3" fill="none" stroke="#92400e" strokeWidth="4" />
            <rect x="0" y="26" width="54" height="4" fill="#78350f" />
          </g>
        </g>
      )}
      {kind === "turning26" && (
        <g>
          <rect x="70" y="80" width="100" height="44" rx="8" fill="#f9a8d4" />
          <rect x="70" y="80" width="100" height="12" rx="6" fill="#fff" />
          {[95, 120, 145].map((x) => (
            <g key={x}>
              <rect x={x - 3} y="56" width="6" height="26" rx="2" fill={V2} />
              <path d={`M${x} 44 C${x + 6} 52, ${x + 3} 56, ${x} 56 C${x - 3} 56, ${x - 6} 52, ${x} 44 Z`} fill={A} />
            </g>
          ))}
          <text x="120" y="116" fontSize="20" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Inter, sans-serif">26</text>
        </g>
      )}
      {kind === "baby" && (
        <g>
          <circle cx="120" cy="66" r="34" fill="#fecdd3" />
          <circle cx="120" cy="70" r="22" fill={SKIN[0]} />
          <path d="M104 60 C106 46, 134 46, 136 60 C128 54, 112 54, 104 60 Z" fill={HAIR} />
          <circle cx="113" cy="70" r="2" fill="#1f2937" />
          <circle cx="127" cy="70" r="2" fill="#1f2937" />
          <path d="M115 78 Q120 82 125 78" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="88" y="104" width="64" height="26" rx="13" fill="#fb7185" />
        </g>
      )}
    </svg>
  );
}

/**
 * Optional photo slot: shows /images/<name> if the file exists in `public/images`, otherwise the illustration.
 * Drop free-license photos (Unsplash / Pexels) into public/images to switch from illustration to photo.
 */
export function Photo({ name, alt, fallback }: { name: string; alt: string; fallback: JSX.Element }) {
  const [ready, setReady] = useState(false);
  const src = `/images/${name}`;
  useEffect(() => {
    // Preload: switch to the photo only once it has really loaded as an image.
    const img = new Image();
    img.onload = () => setReady(img.naturalWidth > 0);
    img.src = src;
  }, [src]);
  return ready ? <img className="photo" src={src} alt={alt} /> : fallback;
}
