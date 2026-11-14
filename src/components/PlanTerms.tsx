import { annualPremium, employerHsaFor } from "../lib/calc";
import { PERIOD_LABEL, usd, usdExact } from "../lib/format";
import type { CoverageTier, Plan } from "../lib/types";

const TIER_LABEL: Record<CoverageTier, string> = {
  employee: "Self-only",
  employeeSpouse: "You + spouse",
  employeeChildren: "You + children",
  family: "Family",
};

const NP = <span className="np">Not provided</span>;

/**
 * The original plan terms the comparison used, so a printed report can be checked independently.
 * Premiums keep their original precision; the annual figure comes from amount × deductions.
 */
export function PlanTerms({ plans, coverage }: { plans: Plan[]; coverage: CoverageTier }) {
  const family = coverage !== "employee";
  const rows: { label: string; value: (p: Plan) => JSX.Element | string }[] = [
    { label: "Plan year", value: (p) => p.planYear ?? NP },
    { label: "Coverage tier", value: () => TIER_LABEL[coverage] },
    {
      label: "Employee premium per deduction",
      value: (p) => (p.premiums[coverage] === null ? NP : usdExact(p.premiums[coverage]!)),
    },
    { label: "Premium frequency", value: (p) => PERIOD_LABEL[p.premiumPeriods] ?? `${p.premiumPeriods} times a year` },
    { label: "Deductions per full plan year", value: (p) => String(p.premiumPeriods) },
    {
      label: "Annual employee premium",
      value: (p) => (p.premiums[coverage] === null ? NP : usdExact(annualPremium(p, coverage))),
    },
    {
      label: `${family ? "Family" : "Individual"} in-network deductible`,
      value: (p) => {
        const v = family ? p.deductible.family : p.deductible.individual;
        return v === null ? NP : usd(v);
      },
    },
    { label: "Employee coinsurance", value: (p) => `${Math.round(p.coinsurance * 100)}%` },
    {
      label: `${family ? "Family" : "Individual"} in-network out-of-pocket maximum`,
      value: (p) => {
        const v = family ? p.outOfPocketMax.family : p.outOfPocketMax.individual;
        return v === null ? NP : usd(v);
      },
    },
    {
      label: "Annual employer HSA contribution",
      value: (p) => {
        if (!p.hsaEligible) return "Not applicable (no HSA)";
        const v = family ? p.employerHsa.family : p.employerHsa.individual;
        return v === null ? NP : usd(employerHsaFor(p, coverage));
      },
    },
  ];
  if (family) {
    rows.splice(7, 0, {
      label: "Family deductible type",
      value: (p) => (p.embeddedDeductible === null ? NP : p.embeddedDeductible ? "Embedded" : "Aggregate"),
    });
  }

  return (
    <div className="plan-terms print-block">
      <h3 className="section-title screen-block">Plan terms used in this comparison</h3>
      <div className="table-wrap">
        <table className="breakdown">
          <thead>
            <tr className="print-row">
              <th colSpan={plans.length + 1} className="print-title">Plan terms used in this comparison</th>
            </tr>
            <tr>
              <th>Input</th>
              {plans.map((p) => <th key={p.id}>{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {plans.map((p) => <td key={p.id}>{r.value(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
