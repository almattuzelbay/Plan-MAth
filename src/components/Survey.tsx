import type { BigEvent, CoverageTier, Household } from "../lib/types";

interface Props {
  household: Household;
  onChange: (h: Household) => void;
  onBack: () => void;
  onNext: () => void;
}

const COVERAGE: { key: CoverageTier; label: string }[] = [
  { key: "employee", label: "Just me" },
  { key: "employeeSpouse", label: "Me + spouse/partner" },
  { key: "employeeChildren", label: "Me + kids" },
  { key: "family", label: "Whole family" },
];

const BIG: { key: BigEvent; label: string }[] = [
  { key: "none", label: "Nothing planned" },
  { key: "baby", label: "A baby" },
  { key: "surgery", label: "A planned surgery" },
];

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" aria-label={label}>
      <button onClick={() => onChange(Math.max(0, value - 1))} aria-label={`fewer ${label}`}>
        −
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label={`more ${label}`}>
        +
      </button>
    </div>
  );
}

export function Survey({ household: h, onChange, onBack, onNext }: Props) {
  const set = <K extends keyof Household>(k: K, v: Household[K]) => onChange({ ...h, [k]: v });

  return (
    <section className="card">
      <p className="step">Step 2 of 3</p>
      <h2>Six quick questions about next year</h2>
      <p className="muted">Rough guesses are fine. We never ask for diagnoses.</p>

      <div className="q">
        <label>1. Who needs coverage?</label>
        <div className="chips">
          {COVERAGE.map((c) => (
            <button key={c.key} className={`chip ${h.coverage === c.key ? "chip-on" : ""}`} onClick={() => set("coverage", c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="q two">
        <div>
          <label>2. Regular doctor visits (whole household, per year)</label>
          <Stepper label="primary visits" value={h.primaryVisits} onChange={(n) => set("primaryVisits", n)} />
        </div>
        <div>
          <label>3. Specialist visits per year</label>
          <Stepper label="specialist visits" value={h.specialistVisits} onChange={(n) => set("specialistVisits", n)} />
        </div>
      </div>

      <div className="q">
        <label>4. Ongoing monthly prescriptions (generic)</label>
        <Stepper label="prescriptions" value={h.monthlyPrescriptions} onChange={(n) => set("monthlyPrescriptions", n)} />
      </div>

      <div className="q">
        <label>5. Anything big planned next year?</label>
        <div className="chips">
          {BIG.map((b) => (
            <button key={b.key} className={`chip ${h.bigEvent === b.key ? "chip-on" : ""}`} onClick={() => set("bigEvent", b.key)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="q">
        <label htmlFor="fund">
          6. If a surprise medical bill came tomorrow, how much could you pay without debt?
        </label>
        <div className="money wide">
          <span>$</span>
          <input
            id="fund"
            type="number"
            min={0}
            step={500}
            value={h.emergencyFund}
            onChange={(e) => set("emergencyFund", Math.max(0, Number(e.target.value)))}
          />
        </div>
      </div>

      <details className="advanced">
        <summary>Advanced: tax rate used for HSA/FSA savings ({Math.round(h.taxRate * 100)}%)</summary>
        <input
          type="range"
          min={10}
          max={45}
          value={Math.round(h.taxRate * 100)}
          onChange={(e) => set("taxRate", Number(e.target.value) / 100)}
          aria-label="Combined tax rate"
        />
        <p className="muted small">Federal + state income tax + 7.65% payroll tax. 30% is typical for a middle-income worker.</p>
      </details>

      <div className="nav">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Show my best plan →
        </button>
      </div>
    </section>
  );
}
