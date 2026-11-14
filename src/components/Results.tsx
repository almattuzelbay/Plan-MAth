import { AlertTriangle, ClipboardCheck, FileDown, PiggyBank, RotateCcw, Sparkles, TrendingDown } from "lucide-react";
import { useState } from "react";
import { ACCOUNT_LIMITS, SERVICE_COST } from "../lib/assumptions";
import { savingsVs } from "../lib/calc";
import { usd } from "../lib/format";
import type { Household, Recommendation, ScenarioKey } from "../lib/types";
import { WhatIfChart } from "./WhatIfChart";

interface Props {
  rec: Recommendation;
  household: Household;
  onEdit: () => void;
  onEditPlans: () => void;
  onRestart: () => void;
  onUpgrade: () => void;
}

const SCENARIOS: { key: ScenarioKey; label: string; desc: string }[] = [
  { key: "light", label: "Light year", desc: "about half the visits you expect, plus your regular medications" },
  { key: "expected", label: "Expected year", desc: "exactly what you described, including anything planned" },
  { key: "bad", label: "Bad year", desc: "your expected year plus an unplanned hospital stay for one adult" },
];

export function Results({ rec, household, onEdit, onEditPlans, onRestart, onUpgrade }: Props) {
  const [scenario, setScenario] = useState<ScenarioKey>("expected");
  const { lowest, results, riskWarning, incomplete, coverage } = rec;

  const highest = results[results.length - 1];
  const defaultBaseline =
    household.currentPlanId && results.some((r) => r.plan.id === household.currentPlanId) ? household.currentPlanId : highest.plan.id;
  const [baselineId, setBaselineId] = useState(defaultBaseline);
  const baseline = results.find((r) => r.plan.id === baselineId) ?? highest;
  const diff = savingsVs(rec, baseline.plan.id, scenario, lowest.plan.id) ?? 0;
  const max = Math.max(...results.map((r) => r.scenarios[scenario].total), 1);
  const scenarioInfo = SCENARIOS.find((s) => s.key === scenario)!;

  return (
    <section className="card results">
      <div className="verdict">
        <p className="muted">Lowest estimated cost for your expected year</p>
        <h2 className="big">{lowest.plan.name}</h2>
        <p className="big-total">{usd(lowest.scenarios.expected.total)} <small>/ year, all-in</small></p>
        {results.length > 1 && (
          <div className="compare-line">
            <TrendingDown size={18} />
            {baseline.plan.id === lowest.plan.id ? (
              <span>That's the plan you're comparing against — it's already the lowest-cost option here.</span>
            ) : (
              <span>
                <b className="good">{usd(diff)}</b> less in the {scenarioInfo.label.toLowerCase()} than{" "}
                <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)} aria-label="Compare with">
                  {results.map((r) => (
                    <option key={r.plan.id} value={r.plan.id}>
                      {r.plan.name}
                      {r.plan.id === household.currentPlanId ? " (your current plan)" : ""}
                    </option>
                  ))}
                </select>
              </span>
            )}
          </div>
        )}
      </div>

      {riskWarning && <p className="warn"><AlertTriangle size={18} /> {riskWarning}</p>}
      {incomplete.length > 0 && (
        <p className="warn">
          <AlertTriangle size={18} /> Not compared because numbers are missing:{" "}
          {incomplete.map((x) => `${x.plan.name} (${x.missing.join(", ")})`).join("; ")}.{" "}
          <button className="link" onClick={onEditPlans}>Fix plans</button>
        </p>
      )}

      <div className="tabs" role="tablist">
        {SCENARIOS.map((s) => (
          <button key={s.key} role="tab" aria-selected={scenario === s.key} className={`tab ${scenario === s.key ? "tab-on" : ""}`} onClick={() => setScenario(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted small">{scenarioInfo.label}: {scenarioInfo.desc}.</p>

      <div className="bars">
        {results.map((r) => {
          const s = r.scenarios[scenario];
          const isLowest = r.plan.id === results.slice().sort((a, b) => a.scenarios[scenario].total - b.scenarios[scenario].total)[0].plan.id;
          return (
            <div key={r.plan.id} className="bar-row">
              <div className="bar-label">
                {r.plan.name} {isLowest && <span className="badge">lowest</span>}
                {r.plan.id === household.currentPlanId && <span className="badge badge-grey">current</span>}
              </div>
              <div className="bar-track">
                <div className={`bar ${isLowest ? "bar-best" : ""}`} style={{ width: `${Math.max(3, (Math.max(s.total, 0) / max) * 100)}%` }} />
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
              <th>{scenarioInfo.label}</th>
              {results.map((r) => <th key={r.plan.id}>{r.plan.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td>Premiums from your paychecks</td>{results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].premiums)}</td>)}</tr>
            <tr><td>Your medical bills (deductible, copays, coinsurance)</td>{results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].outOfPocket)}</td>)}</tr>
            <tr><td>Employer money put in your HSA</td>{results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].employerHsa)}</td>)}</tr>
            {household.includeTaxes && (
              <tr><td>Tax savings (HSA / FSA)</td>{results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].taxSavings)}</td>)}</tr>
            )}
            <tr className="total"><td>Net yearly cost</td>{results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].total)}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <h3 className="section-title">What if your care costs more or less than you think?</h3>
      <WhatIfChart plans={results.map((r) => r.plan)} coverage={coverage} />

      <div className="grid2">
        <div className="mini">
          <h3><PiggyBank size={18} /> Set aside in your {lowest.suggestedAccount.kind}</h3>
          <p className="big-num">{usd(lowest.suggestedAccount.amount)} / year</p>
          <p className="muted small">
            {lowest.suggestedAccount.kind === "HSA"
              ? `Covers your expected bills after the employer's contribution. HSA money never expires. 2027 limit: ${usd(coverage === "employee" ? ACCOUNT_LIMITS.hsa.individual : ACCOUNT_LIMITS.hsa.family)} including employer money.`
              : "FSA money is use-it-or-lose-it, so this is a bit below your expected bills."}
          </p>
        </div>
        <div className="mini">
          <h3><ClipboardCheck size={18} /> Check before you enroll</h3>
          <ul className="small checklist">
            <li>Are your doctors in-network for {lowest.plan.name}?</li>
            <li>Are your medications on its drug list (formulary), and at which tier?</li>
            <li>Is the family deductible embedded or aggregate?</li>
            <li>When does the employer HSA money arrive, and are there conditions?</li>
          </ul>
        </div>
      </div>

      <details className="assumptions">
        <summary>Assumptions & limits — read before deciding</summary>
        <ul className="small">
          <li>An estimate under your inputs, not a prediction of your health and not a guarantee of savings.</li>
          <li>
            Typical in-network prices: doctor visit {usd(SERVICE_COST.primaryVisit)}, specialist {usd(SERVICE_COST.specialistVisit)}, therapy session{" "}
            {usd(SERVICE_COST.therapySession)}, urgent care {usd(SERVICE_COST.urgentCareVisit)}, ER {usd(SERVICE_COST.erVisit)}, lab/scan{" "}
            {usd(SERVICE_COST.labOrImaging)}, brand drug {usd(SERVICE_COST.brandRxMonth)}/month, birth {usd(SERVICE_COST.baby)}, surgery{" "}
            {usd(SERVICE_COST.surgery)}, hospital stay {usd(SERVICE_COST.hospitalization)}. Real prices differ by plan and city.
          </li>
          <li>Copays are treated as not counting toward the deductible; ER copays are treated as flat.</li>
          <li>Separate drug deductibles, out-of-network care, tiered networks and mid-year enrollment are not modeled yet.</li>
          <li>Premiums are counted for a full 12 months. Taxes are {household.includeTaxes ? "included at the rate you chose" : "not included"}.</li>
          <li>Doctor networks and drug lists can matter more than price — check them with the insurer.</li>
        </ul>
      </details>

      <div className="upsell">
        <Sparkles size={26} />
        <div>
          <h3>Decision Pack — planned at $19, free during beta</h3>
          <p className="muted small">Import several documents with page sources, compare your spouse's employer plans and get a printable report for one coverage decision.</p>
        </div>
        <button className="btn btn-primary" onClick={onUpgrade}>See what's included</button>
      </div>

      <div className="nav no-print">
        <button className="btn btn-ghost" onClick={onEdit}>← Change answers</button>
        <button className="btn btn-ghost" onClick={() => window.print()}><FileDown size={16} /> Save as PDF</button>
        <button className="btn btn-ghost" onClick={onRestart}><RotateCcw size={16} /> Start over</button>
      </div>
    </section>
  );
}
