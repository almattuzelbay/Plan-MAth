import { useMemo, useState } from "react";
import { costCurve } from "../lib/calc";
import { usd } from "../lib/format";
import type { CoverageTier, Plan } from "../lib/types";

const COLORS = ["#6d5df6", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];
const MAX_SPEND = 40000;
const W = 640;
const H = 260;
const PAD = { l: 56, r: 16, t: 16, b: 34 };

/** Interactive chart: total yearly cost of each plan as care spending grows (simple deductible model). */
export function WhatIfChart({ plans, coverage }: { plans: Plan[]; coverage: CoverageTier }) {
  const [spend, setSpend] = useState(5000);
  const steps = 80;
  const series = useMemo(
    () => plans.map((p) => Array.from({ length: steps + 1 }, (_, i) => costCurve(p, coverage, (i / steps) * MAX_SPEND))),
    [plans, coverage],
  );
  const yMax = Math.max(...series.flat(), 1) * 1.08;
  const x = (s: number) => PAD.l + (s / MAX_SPEND) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (Math.max(0, v) / yMax) * (H - PAD.t - PAD.b);

  const atSpend = plans
    .map((p, i) => ({ p, i, v: costCurve(p, coverage, spend) }))
    .sort((a, b) => a.v - b.v);

  return (
    <div className="whatif">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Yearly cost of each plan by amount of medical care">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(yMax * f)} y2={y(yMax * f)} stroke="#eef0f5" />
            <text x={PAD.l - 8} y={y(yMax * f) + 4} textAnchor="end" className="axis">{usd(yMax * f)}</text>
          </g>
        ))}
        {[0, 10000, 20000, 30000, 40000].map((s) => (
          <text key={s} x={x(s)} y={H - 12} textAnchor="middle" className="axis">{usd(s)}</text>
        ))}
        {series.map((pts, i) => (
          <polyline
            key={plans[i].id}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="3"
            strokeLinejoin="round"
            points={pts.map((v, k) => `${x((k / steps) * MAX_SPEND)},${y(v)}`).join(" ")}
          />
        ))}
        <line x1={x(spend)} x2={x(spend)} y1={PAD.t} y2={H - PAD.b} stroke="#111827" strokeDasharray="4 4" />
        {atSpend.map(({ p, i, v }) => (
          <circle key={p.id} cx={x(spend)} cy={y(v)} r="5" fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <label className="slider-label">
        Medical care used this year (total billed to insurance): <b>{usd(spend)}</b>
        <input type="range" min={0} max={MAX_SPEND} step={250} value={spend} onChange={(e) => setSpend(Number(e.target.value))} />
      </label>
      <div className="legend">
        {atSpend.map(({ p, i, v }, rank) => (
          <span key={p.id} className={rank === 0 ? "legend-best" : ""}>
            <i style={{ background: COLORS[i % COLORS.length] }} /> {p.name}: <b>{usd(v)}</b>
          </span>
        ))}
      </div>
      <p className="fineprint">
        Simplified view: all care goes through the deductible and coinsurance (copays ignored), premiums for your coverage
        level, minus employer HSA money. The lines crossing shows where a different plan becomes cheaper.
      </p>
    </div>
  );
}
