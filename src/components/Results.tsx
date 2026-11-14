import { AlertTriangle, ClipboardCheck, FileDown, PiggyBank, RotateCcw, Sparkles, TrendingDown, Wallet } from "lucide-react";
import { useState } from "react";
import { HSA_LIMITS } from "../lib/assumptions";
import { employerHsaFor, savingsVs, totalAllowed } from "../lib/calc";
import { usd } from "../lib/format";
import type { Household, Recommendation, ScenarioKey } from "../lib/types";
import { CareCosts } from "./CareCosts";
import { WhatIfChart } from "./WhatIfChart";

interface Props {
  rec: Recommendation;
  household: Household;
  onHousehold: (h: Household) => void;
  onEdit: () => void;
  onEditPlans: () => void;
  onRestart: () => void;
  onUpgrade: () => void;
}

const SCENARIOS: { key: ScenarioKey; label: string; desc: string }[] = [
  { key: "light", label: "Light year", desc: "about half the visits you expect, plus your regular medicines" },
  { key: "expected", label: "Expected year", desc: "exactly what you described, including anything planned" },
  { key: "bad", label: "Bad year", desc: "your expected year plus an unplanned hospital stay for one adult" },
];

export function Results({ rec, household, onHousehold, onEdit, onEditPlans, onRestart, onUpgrade }: Props) {
  const [scenario, setScenario] = useState<ScenarioKey>("expected");
  const { lowest, results, riskWarning, incomplete, coverage, tiedWithLowest } = rec;
  const family = coverage !== "employee";

  const highest = results[results.length - 1];
  const defaultBaseline =
    household.currentPlanId && results.some((r) => r.plan.id === household.currentPlanId) ? household.currentPlanId : highest.plan.id;
  const [baselineId, setBaselineId] = useState(defaultBaseline);
  const baseline = results.find((r) => r.plan.id === baselineId) ?? highest;
  const diff = savingsVs(rec, baseline.plan.id, scenario, lowest.plan.id) ?? 0;
  const sorted = results.slice().sort((a, b) => a.scenarios[scenario].total - b.scenarios[scenario].total);
  const min = sorted[0].scenarios[scenario].total;
  const max = Math.max(...results.map((r) => r.scenarios[scenario].total), 1);
  const scenarioInfo = SCENARIOS.find((s) => s.key === scenario)!;
  const expectedAllowed = totalAllowed(household, "expected");
  const tied = tiedWithLowest.length > 0;
  const tiedNames = [lowest, ...results.filter((r) => tiedWithLowest.includes(r.plan.id))].map((r) => r.plan.name);
  const anyHsa = results.some((r) => r.plan.hsaEligible);
  const lowestHsa = employerHsaFor(lowest.plan, coverage);

  return (
    <section className="card results">
      <div className="verdict">
        <p className="muted">{tied ? "Tie on estimated cost for your expected year" : "Lowest estimated cost for your expected year"}</p>
        <h2 className="big">{tied ? tiedNames.join(" = ") : lowest.plan.name}</h2>
        <p className="big-total">
          {usd(lowest.scenarios.expected.total)} <small>/ year, net estimated cost{lowestHsa > 0 ? " after employer HSA contribution" : ""}</small>
        </p>
        <p className="small">
          Based on {usd(expectedAllowed)} of allowed charges for covered in-network care.{" "}
          <a className="link" href="#care-costs">View care cost assumptions</a>
        </p>
        {results.length > 1 && !tied && (
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
          <AlertTriangle size={18} /> Not compared because terms are not provided:{" "}
          {incomplete.map((x) => `${x.plan.name} (${x.missing.join(", ")})`).join("; ")}.{" "}
          <button className="link" onClick={onEditPlans}>Add them</button>
        </p>
      )}

      <div className="tabs no-print" role="tablist">
        {SCENARIOS.map((s) => (
          <button key={s.key} role="tab" aria-selected={scenario === s.key} className={`tab ${scenario === s.key ? "tab-on" : ""}`} onClick={() => setScenario(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted small">{scenarioInfo.label}: {scenarioInfo.desc}.</p>

      <div className="bars">
        {sorted.map((r) => {
          const s = r.scenarios[scenario];
          const isLowest = s.total - min <= 1;
          return (
            <div key={r.plan.id} className="bar-row">
              <div className="bar-label">
                {r.plan.name} {isLowest && <span className="badge">{sorted.filter((x) => x.scenarios[scenario].total - min <= 1).length > 1 ? "tie" : "lowest"}</span>}
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
            <tr><td>Your share of medical bills<small>deductible, copays, coinsurance</small></td>{results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].outOfPocket)}</td>)}</tr>
            <tr><td><b>Cost before employer HSA</b></td>{results.map((r) => <td key={r.plan.id}><b>{usd(r.scenarios[scenario].premiums + r.scenarios[scenario].outOfPocket)}</b></td>)}</tr>
            {anyHsa && (
              <tr><td>Employer HSA contribution<small>money added to your HSA — your medical bills stay the same</small></td>{results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].employerHsa)}</td>)}</tr>
            )}
            {household.includeTaxes && (
              <tr><td>Tax effect of your own HSA contribution</td>{results.map((r) => <td key={r.plan.id}>{usd(-r.scenarios[scenario].taxSavings)}</td>)}</tr>
            )}
            <tr className="total"><td>Net estimated annual cost{anyHsa ? " after employer HSA contribution" : ""}</td>{results.map((r) => <td key={r.plan.id}>{usd(r.scenarios[scenario].total)}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="fineprint">Taxes {household.includeTaxes ? `included at ${Math.round(household.taxRate * 100)}% for HSA plans only` : "not included"}. Annual estimate under the assumptions below.</p>

      <CareCosts
        household={household}
        scenario={scenario}
        scenarioLabel={scenarioInfo.label}
        onPrices={(prices) => onHousehold({ ...household, prices })}
      />

      <h3 className="section-title">What if your care costs more or less than you think?</h3>
      <WhatIfChart key={Math.round(expectedAllowed)} plans={results.map((r) => r.plan)} coverage={coverage} expectedSpend={expectedAllowed} />

      <div className="grid2">
        {lowest.suggestedHsa !== null ? (
          <div className="mini">
            <h3><PiggyBank size={18} /> HSA for {lowest.plan.name}</h3>
            <p className="big-num">{usd(lowest.suggestedHsa)} / year</p>
            <p className="muted small">
              Your expected medical bills ({usd(lowest.scenarios.expected.outOfPocket)}) minus the employer's {usd(lowestHsa)}. A possible
              contribution target, not advice. 2027 HSA limit: {usd(family ? HSA_LIMITS.family : HSA_LIMITS.individual)} including employer money.
            </p>
          </div>
        ) : (
          <div className="mini">
            <h3><Wallet size={18} /> Health FSA</h3>
            <p className="small">
              Check whether your employer offers a health FSA. Review eligible expenses and plan rules before choosing a contribution.
            </p>
          </div>
        )}
        <div className="mini">
          <h3><ClipboardCheck size={18} /> Check before you enroll</h3>
          <ul className="small checklist">
            <li>Are your doctors in-network for {lowest.plan.name}?</li>
            <li>Are your medicines on its drug list (formulary), and at which tier?</li>
            {family && <li>Is the family deductible embedded or aggregate? (you entered: {lowest.plan.embeddedDeductible ? "embedded" : "aggregate"})</li>}
            {lowest.plan.hsaEligible && (
              <li>
                Employer HSA money: {usd(lowestHsa)} a year per your inputs — confirm when it's deposited and whether there are conditions.
              </li>
            )}
          </ul>
        </div>
      </div>

      <details className="assumptions" open>
        <summary>Assumptions & limits — read before deciding</summary>
        <ul className="small">
          <li>An annual estimate under your inputs — not a prediction of your health and not a guarantee of savings.</li>
          <li>Prices are illustrative allowed amounts for covered in-network care (see the table above); real negotiated prices differ by plan and city.</li>
          <li>Copays are treated as not counting toward the deductible; an empty copay means deductible, then coinsurance.</li>
          <li>Separate drug deductibles, out-of-network care, tiered networks and mid-year enrollment are not modeled yet.</li>
          <li>The out-of-pocket maximum covers in-network covered care only; premiums and uncovered care are on top.</li>
          <li>Premiums are counted for a full year from the amount and number of deductions you entered.</li>
          <li>Doctor networks and drug lists can matter more than price — check them with the insurer.</li>
        </ul>
      </details>

      <div className="upsell no-print">
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
