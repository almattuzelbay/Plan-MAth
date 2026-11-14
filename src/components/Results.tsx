import { useState } from "react";
import { usd } from "../lib/format";
import type { Recommendation, ScenarioKey } from "../lib/types";

interface Props {
  rec: Recommendation;
  shareLink: string;
  onEdit: () => void;
  onRestart: () => void;
  onUpgrade: () => void;
}

const SCENARIOS: { key: ScenarioKey; label: string; desc: string }[] = [
  { key: "good", label: "Healthy year", desc: "checkups and your regular prescriptions" },
  { key: "expected", label: "Your expected year", desc: "based on your answers" },
  { key: "bad", label: "Bad year", desc: "an unexpected hospital stay" },
];

export function Results({ rec, shareLink, onEdit, onRestart, onUpgrade }: Props) {
  const [scenario, setScenario] = useState<ScenarioKey>("expected");
  const [copied, setCopied] = useState(false);
  const { best, results, savingsVsWorst, riskWarning } = rec;
  const max = Math.max(...results.map((r) => r.scenarios[scenario].total), 1);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", shareLink);
    }
  }

  return (
    <section className="card">
      <p className="step">Step 3 of 3 · Your result</p>
      <div className="verdict">
        <p className="muted">Best plan for your expected year</p>
        <h2 className="big">{best.plan.name}</h2>
        {savingsVsWorst > 0 ? (
          <p className="save">
            Saves you <strong>{usd(savingsVsWorst)}</strong> a year vs. the most expensive option
          </p>
        ) : (
          <p className="save">All your options cost about the same — pick by doctors and comfort.</p>
        )}
      </div>

      {riskWarning && <p className="warn">⚠️ {riskWarning}</p>}

      <div className="tabs" role="tablist">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={scenario === s.key}
            className={`tab ${scenario === s.key ? "tab-on" : ""}`}
            onClick={() => setScenario(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted small">
        {SCENARIOS.find((s) => s.key === scenario)?.label}: {SCENARIOS.find((s) => s.key === scenario)?.desc}.
        Total yearly cost = premiums + what you pay for care − employer HSA money − tax savings.
      </p>

      <div className="bars">
        {results.map((r) => {
          const s = r.scenarios[scenario];
          const isBest = r.plan.id === best.plan.id;
          return (
            <div key={r.plan.id} className="bar-row">
              <div className="bar-label">
                {r.plan.name} {isBest && <span className="badge">best</span>}
              </div>
              <div className="bar-track">
                <div
                  className={`bar ${isBest ? "bar-best" : ""}`}
                  style={{ width: `${Math.max(4, (Math.max(s.total, 0) / max) * 100)}%` }}
                />
              </div>
              <div className="bar-value">{usd(s.total)}</div>
            </div>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="breakdown">
          <thead>
            <tr>
              <th>{SCENARIOS.find((s) => s.key === scenario)?.label}</th>
              {results.map((r) => (
                <th key={r.plan.id}>{r.plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Premiums (from paychecks)</td>
              {results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].premiums)}</td>)}
            </tr>
            <tr>
              <td>You pay for care</td>
              {results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].outOfPocket)}</td>)}
            </tr>
            <tr>
              <td>Employer HSA money</td>
              {results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].employerHsa)}</td>)}
            </tr>
            <tr>
              <td>Tax savings (HSA/FSA)</td>
              {results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].taxSavings)}</td>)}
            </tr>
            <tr className="total">
              <td>Total</td>
              {results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].total)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid2">
        <div className="mini">
          <h3>💰 Put this in your {best.suggestedAccount.kind}</h3>
          <p className="big-num">{usd(best.suggestedAccount.amount)} / year</p>
          <p className="muted small">
            {best.suggestedAccount.kind === "HSA"
              ? "HSA money never expires and is tax-free for medical costs. Your employer's contribution is already counted."
              : "FSA money is use-it-or-lose-it, so we suggest a bit less than your expected spending."}
          </p>
        </div>
        <div className="mini">
          <h3>❓ Ask HR before you enroll</h3>
          <ul className="small">
            <li>Are my doctors in-network for {best.plan.name}?</li>
            <li>Are my prescriptions on this plan's drug list?</li>
            <li>Is the family deductible "embedded" (per person)?</li>
          </ul>
        </div>
      </div>

      <div className="upsell">
        <div>
          <h3>Married or partnered? Compare against your spouse's employer too.</h3>
          <p className="muted small">
            Year Pass: spouse-plan comparison, deductible &amp; FSA tracker, deadline reminders and
            free re-checks after life events — for {usd(29)}/year.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onUpgrade}>
          See Year Pass
        </button>
      </div>

      <div className="nav">
        <button className="btn btn-ghost" onClick={onEdit}>
          ← Change answers
        </button>
        <button className="btn btn-ghost" onClick={copy}>
          {copied ? "Link copied ✓" : "Share this result"}
        </button>
        <button className="btn btn-ghost" onClick={onRestart}>
          Start over
        </button>
      </div>
    </section>
  );
}
