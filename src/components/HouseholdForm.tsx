import { Info, Minus, Plus, UserPlus, X } from "lucide-react";
import { PROFILE_EFFECTS } from "../lib/assumptions";
import { coverageFor } from "../lib/calc";
import { newMember } from "../lib/lifeEvents";
import type { CareProfile, Household, Member, Plan } from "../lib/types";
import { Avatar } from "./Illustrations";

interface Props {
  household: Household;
  plans: Plan[];
  onChange: (h: Household) => void;
  onBack: () => void;
  onNext: () => void;
}

const COVERAGE_LABEL = {
  employee: "Just you",
  employeeSpouse: "You + spouse",
  employeeChildren: "You + children",
  family: "Family",
};

const ROLE_LABEL = { you: "You", spouse: "Spouse / partner", child: "Child" };

type CountKey = "primaryVisits" | "specialistVisits" | "urgentCareVisits" | "erVisits" | "labsImaging" | "genericRx" | "brandRx";

const COUNTS: { key: CountKey; label: string; unit: string }[] = [
  { key: "primaryVisits", label: "Doctor visits (sick or follow-up)", unit: "per year" },
  { key: "specialistVisits", label: "Specialist visits", unit: "per year" },
  { key: "urgentCareVisits", label: "Urgent care visits", unit: "per year" },
  { key: "erVisits", label: "Emergency room visits", unit: "per year" },
  { key: "labsImaging", label: "Lab tests, X-rays or scans", unit: "per year" },
  { key: "genericRx", label: "Generic medications", unit: "taken every month" },
  { key: "brandRx", label: "Brand-name medications", unit: "taken every month" },
];

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Fewer: ${label}`}><Minus size={14} /></button>
      <span aria-live="polite">{value}</span>
      <button onClick={() => onChange(Math.min(99, value + 1))} aria-label={`More: ${label}`}><Plus size={14} /></button>
    </div>
  );
}

export function HouseholdForm({ household: h, plans, onChange, onBack, onNext }: Props) {
  const setMember = (i: number, m: Member) => onChange({ ...h, members: h.members.map((x, j) => (j === i ? m : x)) });
  const addMember = (role: Member["role"]) => onChange({ ...h, members: [...h.members, newMember(role)] });
  const removeMember = (i: number) => onChange({ ...h, members: h.members.filter((_, j) => j !== i) });
  const hasSpouse = h.members.some((m) => m.role === "spouse");
  const coverage = coverageFor(h.members);
  let childNo = 0;

  const toggleProfile = (i: number, p: CareProfile) => {
    const m = h.members[i];
    const profiles = m.profiles.includes(p) ? m.profiles.filter((x) => x !== p) : [...m.profiles, p];
    setMember(i, { ...m, profiles });
  };

  return (
    <section className="card">
      <h2>Your household next year</h2>
      <p className="muted">
        Rough guesses are fine. We ask about the <b>kind of care</b> you expect, never about diagnoses. Your answers stay in
        this browser tab.
      </p>

      <div className="coverage-pill">Coverage level: <b>{COVERAGE_LABEL[coverage]}</b></div>

      <div className="members">
        {h.members.map((m, i) => {
          const title = m.role === "child" ? `Child ${++childNo}` : ROLE_LABEL[m.role];
          return (
            <div className="member" key={m.id}>
              <div className="member-head">
                <Avatar role={m.role} index={i} />
                <h3>{title}</h3>
                {m.role !== "you" && (
                  <button className="icon-btn" aria-label={`Remove ${title}`} onClick={() => removeMember(i)}><X size={16} /></button>
                )}
              </div>

              <p className="label">Anything that applies next year?</p>
              <div className="chips">
                {(Object.keys(PROFILE_EFFECTS) as CareProfile[])
                  .filter((p) => !(PROFILE_EFFECTS[p].adultsOnly && m.role === "child") && !(PROFILE_EFFECTS[p].childrenOnly && m.role !== "child"))
                  .map((p) => (
                    <button
                      key={p}
                      className={`chip chip-sm ${m.profiles.includes(p) ? "chip-on" : ""}`}
                      title={PROFILE_EFFECTS[p].hint}
                      onClick={() => toggleProfile(i, p)}
                      aria-pressed={m.profiles.includes(p)}
                    >
                      {PROFILE_EFFECTS[p].label}
                    </button>
                  ))}
              </div>
              {m.profiles.length > 0 && (
                <ul className="profile-effects">
                  {m.profiles.map((p) => <li key={p}><Info size={13} /> {PROFILE_EFFECTS[p].label}: {PROFILE_EFFECTS[p].hint}</li>)}
                </ul>
              )}

              <details className="usage" open={i === 0}>
                <summary>Usual care {m.profiles.length ? "(on top of the above)" : ""}</summary>
                <div className="usage-grid">
                  {COUNTS.map((c) => (
                    <div className="usage-row" key={c.key}>
                      <span>{c.label}<small>{c.unit}</small></span>
                      <Stepper label={`${title} ${c.label}`} value={m[c.key]} onChange={(n) => setMember(i, { ...m, [c.key]: n })} />
                    </div>
                  ))}
                </div>
                <p className="fineprint">Preventive checkups and screenings are free on most plans, so they're not counted.</p>
              </details>
            </div>
          );
        })}

        <div className="add-members">
          {!hasSpouse && <button className="btn btn-ghost" onClick={() => addMember("spouse")}><UserPlus size={16} /> Add spouse / partner</button>}
          <button className="btn btn-ghost" onClick={() => addMember("child")}><UserPlus size={16} /> Add a child</button>
        </div>
      </div>

      <div className="grid2">
        <div className="q">
          <label htmlFor="fund">If a surprise medical bill came tomorrow, how much could you pay without borrowing?</label>
          <div className="money wide">
            <span>$</span>
            <input id="fund" type="number" min={0} step={500} value={h.emergencyFund}
              onChange={(e) => onChange({ ...h, emergencyFund: Math.max(0, Number(e.target.value)) })} />
          </div>
        </div>
        <div className="q">
          <label htmlFor="current">Which plan are you on today? <span className="muted">(optional)</span></label>
          <select id="current" className="select-lg" value={h.currentPlanId ?? ""}
            onChange={(e) => onChange({ ...h, currentPlanId: e.target.value || null })}>
            <option value="">Not on any of these / new hire</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="q">
        <label className="switch-row">
          <span className="switch">
            <input type="checkbox" checked={h.includeTaxes} onChange={(e) => onChange({ ...h, includeTaxes: e.target.checked })} />
            <span />
          </span>
          Include tax savings from HSA / FSA contributions
        </label>
        {h.includeTaxes && (
          <div className="tax">
            <input type="range" min={10} max={45} value={Math.round(h.taxRate * 100)}
              onChange={(e) => onChange({ ...h, taxRate: Number(e.target.value) / 100 })} aria-label="Combined tax rate" />
            <span><b>{Math.round(h.taxRate * 100)}%</b> combined rate (federal + state + 7.65% payroll). Depends on your situation — off by default.</span>
          </div>
        )}
      </div>

      <div className="nav">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={onNext}>See the comparison →</button>
      </div>
    </section>
  );
}
