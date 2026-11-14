import { missingFields } from "../lib/normalize";
import type { Plan, PlanType } from "../lib/types";

interface Props {
  company: string;
  plans: Plan[];
  notes?: string;
  onChange: (plans: Plan[]) => void;
  onBack: () => void;
  onNext: () => void;
}

type NumberPath =
  | ["premiums", "employee" | "employeeSpouse" | "employeeChildren" | "family"]
  | ["deductible" | "outOfPocketMax" | "employerHsa", "individual" | "family"]
  | ["copays", "primary" | "specialist" | "genericRx"]
  | ["coinsurance"];

const ROWS: { label: string; path: NumberPath; hint?: string; percent?: boolean; nullable?: boolean }[] = [
  { label: "Premium / month — just you", path: ["premiums", "employee"] },
  { label: "Premium / month — you + spouse", path: ["premiums", "employeeSpouse"] },
  { label: "Premium / month — you + children", path: ["premiums", "employeeChildren"] },
  { label: "Premium / month — family", path: ["premiums", "family"] },
  { label: "Deductible — individual", path: ["deductible", "individual"] },
  { label: "Deductible — family", path: ["deductible", "family"] },
  { label: "Out-of-pocket max — individual", path: ["outOfPocketMax", "individual"] },
  { label: "Out-of-pocket max — family", path: ["outOfPocketMax", "family"] },
  { label: "Coinsurance (your share)", path: ["coinsurance"], percent: true },
  { label: "Primary care copay", path: ["copays", "primary"], nullable: true, hint: "blank = goes to deductible" },
  { label: "Specialist copay", path: ["copays", "specialist"], nullable: true },
  { label: "Generic drug copay", path: ["copays", "genericRx"], nullable: true },
  { label: "Employer HSA money — individual", path: ["employerHsa", "individual"] },
  { label: "Employer HSA money — family", path: ["employerHsa", "family"] },
];

function read(plan: Plan, path: NumberPath): number | null {
  if (path.length === 1) return plan.coinsurance;
  const group = plan[path[0]] as Record<string, number | null>;
  return group[path[1]];
}

function write(plan: Plan, path: NumberPath, value: number | null): Plan {
  if (path.length === 1) return { ...plan, coinsurance: value ?? 0 };
  const group = { ...(plan[path[0]] as Record<string, number | null>), [path[1]]: value };
  return { ...plan, [path[0]]: group } as Plan;
}

const TYPES: PlanType[] = ["PPO", "HMO", "EPO", "HDHP", "Other"];

export function PlanEditor({ company, plans, notes, onChange, onBack, onNext }: Props) {
  const update = (i: number, p: Plan) => onChange(plans.map((x, j) => (j === i ? p : x)));
  const remove = (i: number) => onChange(plans.filter((_, j) => j !== i));
  const add = () =>
    onChange([
      ...plans,
      {
        id: `plan-${Date.now()}`,
        name: `Plan ${plans.length + 1}`,
        type: "PPO",
        premiums: { employee: 0, employeeSpouse: 0, employeeChildren: 0, family: 0 },
        deductible: { individual: 0, family: 0 },
        outOfPocketMax: { individual: 0, family: 0 },
        coinsurance: 0.2,
        copays: { primary: null, specialist: null, genericRx: null },
        hsaEligible: false,
        employerHsa: { individual: 0, family: 0 },
      },
    ]);

  const anyMissing = plans.some((p) => missingFields(p).length > 0);

  return (
    <section className="card">
      <p className="step">Step 1 of 3</p>
      <h2>Check your plans — {company}</h2>
      <p className="muted">
        Review every number — if you uploaded a document, AI read these values and may have missed
        something. The math is only as good as the inputs. In-network amounts, US dollars.
      </p>
      {notes && <p className="tip">📝 {notes}</p>}

      <div className="table-wrap">
        <table className="plans">
          <thead>
            <tr>
              <th />
              {plans.map((p, i) => (
                <th key={p.id}>
                  <input
                    className="name"
                    value={p.name}
                    aria-label="Plan name"
                    onChange={(e) => update(i, { ...p, name: e.target.value })}
                  />
                  <div className="row-tight">
                    <select
                      value={p.type}
                      aria-label="Plan type"
                      onChange={(e) => {
                        const type = e.target.value as PlanType;
                        update(i, { ...p, type, hsaEligible: type === "HDHP" ? true : p.hsaEligible });
                      }}
                    >
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    {plans.length > 1 && (
                      <button className="link danger" onClick={() => remove(i)}>
                        remove
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="row-label">
                  {row.label}
                  {row.hint && <small>{row.hint}</small>}
                </td>
                {plans.map((p, i) => {
                  const v = read(p, row.path);
                  const shown = v === null ? "" : row.percent ? Math.round(v * 100) : v;
                  return (
                    <td key={p.id}>
                      <div className="money">
                        {!row.percent && <span>$</span>}
                        <input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={shown}
                          placeholder={row.nullable ? "—" : "0"}
                          aria-label={`${p.name}: ${row.label}`}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = raw === "" ? (row.nullable ? null : 0) : Number(raw);
                            update(i, write(p, row.path, n === null ? null : row.percent ? n / 100 : n));
                          }}
                        />
                        {row.percent && <span>%</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="row-label">HSA-eligible</td>
              {plans.map((p, i) => (
                <td key={p.id}>
                  <input
                    type="checkbox"
                    checked={p.hsaEligible}
                    aria-label={`${p.name}: HSA-eligible`}
                    onChange={(e) => update(i, { ...p, hsaEligible: e.target.checked })}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {anyMissing && (
        <p className="warn">Some plans are missing a premium or out-of-pocket max — please fill them in.</p>
      )}

      <div className="nav">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-ghost" onClick={add}>
          + Add a plan
        </button>
        <button className="btn btn-primary" disabled={plans.length === 0} onClick={onNext}>
          Looks right →
        </button>
      </div>
    </section>
  );
}
