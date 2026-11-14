import { AlertCircle, ChevronDown, Plus, Quote, Trash2 } from "lucide-react";
import { useState } from "react";
import { blankPlan } from "../lib/normalize";
import type { Copays, CoverageTier, Plan, PlanType } from "../lib/types";
import { EmptyPlansArt } from "./Illustrations";

interface Props {
  company: string;
  plans: Plan[];
  notes?: string;
  onChange: (plans: Plan[]) => void;
  onBack: () => void;
  onNext: () => void;
}

type Field =
  | { kind: "premium"; tier: CoverageTier }
  | { kind: "pair"; group: "deductible" | "outOfPocketMax" | "employerHsa"; key: "individual" | "family" }
  | { kind: "copay"; key: keyof Copays }
  | { kind: "coinsurance" };

interface Row {
  label: string;
  field: Field;
  required?: boolean;
  hint?: string;
}

const SECTIONS: { title: string; rows: Row[]; collapsible?: boolean }[] = [
  {
    title: "Your premium per month",
    rows: [
      { label: "Just you", field: { kind: "premium", tier: "employee" }, required: true },
      { label: "You + spouse", field: { kind: "premium", tier: "employeeSpouse" } },
      { label: "You + children", field: { kind: "premium", tier: "employeeChildren" } },
      { label: "Family", field: { kind: "premium", tier: "family" } },
    ],
  },
  {
    title: "Deductible & out-of-pocket max (in-network)",
    rows: [
      { label: "Deductible — individual", field: { kind: "pair", group: "deductible", key: "individual" }, required: true },
      { label: "Deductible — family", field: { kind: "pair", group: "deductible", key: "family" } },
      { label: "Out-of-pocket max — individual", field: { kind: "pair", group: "outOfPocketMax", key: "individual" }, required: true },
      { label: "Out-of-pocket max — family", field: { kind: "pair", group: "outOfPocketMax", key: "family" } },
      { label: "Coinsurance (your share)", field: { kind: "coinsurance" }, hint: "\"Plan pays 80%\" = 20% for you" },
    ],
  },
  {
    title: "Copays",
    collapsible: true,
    rows: [
      { label: "Primary care visit", field: { kind: "copay", key: "primary" }, hint: "empty = you pay toward the deductible" },
      { label: "Specialist visit", field: { kind: "copay", key: "specialist" } },
      { label: "Urgent care", field: { kind: "copay", key: "urgentCare" } },
      { label: "Emergency room", field: { kind: "copay", key: "er" } },
      { label: "Generic drug (30 days)", field: { kind: "copay", key: "genericRx" } },
      { label: "Brand-name drug (30 days)", field: { kind: "copay", key: "brandRx" } },
      { label: "Specialty drug (30 days)", field: { kind: "copay", key: "specialtyRx" } },
    ],
  },
  {
    title: "Employer HSA money per year",
    rows: [
      { label: "Individual", field: { kind: "pair", group: "employerHsa", key: "individual" } },
      { label: "Family", field: { kind: "pair", group: "employerHsa", key: "family" } },
    ],
  },
];

const TYPES: PlanType[] = ["PPO", "HMO", "EPO", "POS", "HDHP", "Other"];

function read(p: Plan, f: Field): number | null {
  switch (f.kind) {
    case "premium":
      return p.premiums[f.tier];
    case "pair":
      return p[f.group][f.key];
    case "copay":
      return p.copays[f.key];
    case "coinsurance":
      return Math.round(p.coinsurance * 100);
  }
}

function write(p: Plan, f: Field, v: number | null): Plan {
  switch (f.kind) {
    case "premium":
      return { ...p, premiums: { ...p.premiums, [f.tier]: v } };
    case "pair":
      return { ...p, [f.group]: { ...p[f.group], [f.key]: f.group === "employerHsa" ? v ?? 0 : v } } as Plan;
    case "copay":
      return { ...p, copays: { ...p.copays, [f.key]: v } };
    case "coinsurance":
      return { ...p, coinsurance: Math.min(100, Math.max(0, v ?? 0)) / 100 };
  }
}

export function PlanEditor({ company, plans, notes, onChange, onBack, onNext }: Props) {
  const [showCopays, setShowCopays] = useState(true);
  const update = (i: number, p: Plan) => onChange(plans.map((x, j) => (j === i ? p : x)));
  const remove = (i: number) => onChange(plans.filter((_, j) => j !== i));
  const add = () => onChange([...plans, blankPlan(plans.length)]);

  const missingRequired = plans.some(
    (p) => p.premiums.employee === null && p.premiums.family === null && p.premiums.employeeSpouse === null && p.premiums.employeeChildren === null,
  ) || plans.some((p) => p.deductible.individual === null || p.outOfPocketMax.individual === null);

  if (plans.length === 0) {
    return (
      <section className="card center">
        <EmptyPlansArt />
        <h2>Add the plans you can choose from</h2>
        <p className="muted">Most employers offer 2–4 medical plans. Copy the numbers from your benefits guide.</p>
        <div className="nav center">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-primary" onClick={add}><Plus size={16} /> Add a plan</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Check your plans</h2>
      <p className="muted">
        <b>{company}</b> · {plans.length} plan{plans.length > 1 ? "s" : ""}. Every number is editable. If AI read
        them from your document, compare a few against the original — the math is only as good as the inputs.
      </p>
      {notes && <p className="tip"><AlertCircle size={16} /> {notes}</p>}

      <div className="table-wrap">
        <table className="plans">
          <thead>
            <tr>
              <th className="sticky-col" />
              {plans.map((p, i) => (
                <th key={p.id}>
                  <input className="name" value={p.name} aria-label="Plan name" onChange={(e) => update(i, { ...p, name: e.target.value })} />
                  <div className="row-tight">
                    <select
                      value={p.type}
                      aria-label="Plan type"
                      onChange={(e) => {
                        const type = e.target.value as PlanType;
                        update(i, { ...p, type, hsaEligible: type === "HDHP" ? true : p.hsaEligible });
                      }}
                    >
                      {TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {plans.length > 1 && (
                      <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => remove(i)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {SECTIONS.map((section) => {
            const hidden = section.collapsible && !showCopays;
            return (
              <tbody key={section.title}>
                <tr className="section-row">
                  <td colSpan={plans.length + 1}>
                    {section.collapsible ? (
                      <button className="section-toggle" onClick={() => setShowCopays(!showCopays)}>
                        <ChevronDown size={16} className={showCopays ? "" : "rot"} /> {section.title}
                      </button>
                    ) : (
                      section.title
                    )}
                  </td>
                </tr>
                {!hidden &&
                  section.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="row-label sticky-col">
                        {row.label}
                        {row.hint && <small>{row.hint}</small>}
                      </td>
                      {plans.map((p, i) => {
                        const v = read(p, row.field);
                        const isPct = row.field.kind === "coinsurance";
                        const copayOff = row.field.kind === "copay" && p.type === "HDHP";
                        const hsaOff = row.field.kind === "pair" && row.field.group === "employerHsa" && !p.hsaEligible;
                        const empty = v === null && row.required;
                        return (
                          <td key={p.id}>
                            <div className={`money ${empty ? "money-missing" : ""}`}>
                              {!isPct && <span>$</span>}
                              <input
                                type="number"
                                min={0}
                                inputMode="decimal"
                                disabled={copayOff || hsaOff}
                                value={v === null ? "" : v}
                                placeholder={copayOff ? "deductible" : empty ? "missing" : "—"}
                                aria-label={`${p.name}: ${row.label}`}
                                onChange={(e) => update(i, write(p, row.field, e.target.value === "" ? null : Number(e.target.value)))}
                              />
                              {isPct && <span>%</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            );
          })}
          <tbody>
            <tr className="section-row"><td colSpan={plans.length + 1}>Plan rules</td></tr>
            <tr>
              <td className="row-label sticky-col">HSA-eligible<small>usually high-deductible plans</small></td>
              {plans.map((p, i) => (
                <td key={p.id}>
                  <label className="switch">
                    <input type="checkbox" checked={p.hsaEligible} onChange={(e) => update(i, { ...p, hsaEligible: e.target.checked })} />
                    <span />
                  </label>
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label sticky-col">Embedded family deductible<small>off = whole family deductible first</small></td>
              {plans.map((p, i) => (
                <td key={p.id}>
                  <label className="switch">
                    <input type="checkbox" checked={p.embeddedDeductible} onChange={(e) => update(i, { ...p, embeddedDeductible: e.target.checked })} />
                    <span />
                  </label>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {plans.some((p) => p.sources && Object.keys(p.sources).length) && (
        <details className="sources">
          <summary><Quote size={14} /> Where these numbers came from</summary>
          {plans.map((p) =>
            p.sources ? (
              <div key={p.id} className="source-block">
                <b>{p.name}</b>
                <ul>
                  {Object.entries(p.sources).map(([k, q]) => q && <li key={k}><span className="muted">{k}:</span> "{q}"</li>)}
                </ul>
              </div>
            ) : null,
          )}
        </details>
      )}

      {missingRequired && (
        <p className="warn"><AlertCircle size={16} /> Some plans are missing a premium, deductible or out-of-pocket max. Plans with missing numbers are left out of the comparison instead of being treated as $0.</p>
      )}

      <div className="nav">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-ghost" onClick={add}><Plus size={16} /> Add a plan</button>
        <button className="btn btn-primary" onClick={onNext}>Next: your household →</button>
      </div>
    </section>
  );
}
