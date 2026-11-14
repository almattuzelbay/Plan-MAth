import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { simpleCost } from "../lib/calc";
import { usd } from "../lib/format";
import type { CoverageTier, Plan } from "../lib/types";

const COLORS = ["#6d5df6", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];
const W = 640;
const H = 260;
const PAD = { l: 56, r: 16, t: 16, b: 34 };

interface Props {
  plans: Plan[];
  coverage: CoverageTier;
  /** Total allowed charges of the expected scenario — the chart starts here. */
  expectedSpend: number;
}

/**
 * Interactive chart of the simple model: net yearly cost of each plan as allowed charges grow.
 * Starts at the expected scenario; moving the slider switches to a clearly labelled what-if.
 */
export function WhatIfChart({ plans, coverage, expectedSpend }: Props) {
  const start = Math.round(expectedSpend);
  const [spend, setSpend] = useState(start);
  const maxSpend = Math.max(40000, Math.ceil((start * 1.5) / 5000) * 5000);
  const whatIf = spend !== start;

  const steps = 100;
  const series = useMemo(
    () => plans.map((p) => Array.from({ length: steps + 1 }, (_, i) => simpleCost(p, coverage, (i / steps) * maxSpend).net)),
    [plans, coverage, maxSpend],
  );
  const yMax = Math.max(...series.flat(), 1) * 1.08;
  const x = (s: number) => PAD.l + (s / maxSpend) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (Math.max(0, v) / yMax) * (H - PAD.t - PAD.b);

  const at = plans.map((p, i) => ({ p, i, c: simpleCost(p, coverage, spend) })).sort((a, b) => a.c.net - b.c.net);
  const lowestNet = at[0]?.c.net ?? 0;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((maxSpend * f) / 1000) * 1000);

  return (
    <div className="whatif">
      <div className="whatif-mode">
        <span className={`mode ${whatIf ? "mode-whatif" : ""}`}>{whatIf ? "What-if scenario" : "Expected scenario"}</span>
        <span className="muted small">Expected scenario: {usd(start)} of allowed charges</span>
        {whatIf && (
          <button className="link small" onClick={() => setSpend(start)}>
            <RotateCcw size={13} /> Reset to expected scenario
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Net yearly cost of each plan by total allowed charges">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(yMax * f)} y2={y(yMax * f)} stroke="#eef0f5" />
            <text x={PAD.l - 8} y={y(yMax * f) + 4} textAnchor="end" className="axis">{usd(yMax * f)}</text>
          </g>
        ))}
        {ticks.map((s) => (
          <text key={s} x={x(s)} y={H - 12} textAnchor="middle" className="axis">{usd(s)}</text>
        ))}
        {series.map((pts, i) => (
          <polyline
            key={plans[i].id}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="3"
            strokeLinejoin="round"
            points={pts.map((v, k) => `${x((k / steps) * maxSpend)},${y(v)}`).join(" ")}
          />
        ))}
        <line x1={x(start)} x2={x(start)} y1={PAD.t} y2={H - PAD.b} stroke="#10b981" strokeDasharray="2 4" />
        <line x1={x(spend)} x2={x(spend)} y1={PAD.t} y2={H - PAD.b} stroke="#111827" strokeDasharray="4 4" />
        {at.map(({ p, i, c }) => (
          <circle key={p.id} cx={x(spend)} cy={y(c.net)} r="5" fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <label className="slider-label">
        Total allowed charges for covered in-network care: <b>{usd(spend)}</b>
        <input type="range" min={0} max={maxSpend} step={10} value={spend} onChange={(e) => setSpend(Number(e.target.value))} />
      </label>
      <div className="legend">
        {at.map(({ p, i, c }) => {
          const tie = Math.abs(c.net - lowestNet) < 0.5;
          return (
            <span key={p.id} className={tie ? "legend-best" : ""}>
              <i style={{ background: COLORS[i % COLORS.length] }} /> {p.name}: <b>{usd(c.net)}</b>
              {c.employerHsa > 0 && <small className="muted"> ({usd(c.beforeHsa)} before {usd(c.employerHsa)} employer HSA)</small>}
            </span>
          );
        })}
        {at.length > 1 && Math.abs(at[1].c.net - lowestNet) < 0.5 && <span className="tie-note">Tie at this amount</span>}
      </div>
      <p className="fineprint">
        Simple model: all care goes through the deductible and coinsurance (copays ignored), full-year premiums for your
        coverage level, employer HSA money subtracted to show net estimated annual cost. Annual estimate under these
        assumptions. Where the lines cross, a different plan becomes cheaper.
      </p>
    </div>
  );
}
