import type { Plan, PlanType } from "./types";

const num = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,%\s]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : num(v, 0);

const PLAN_TYPES: PlanType[] = ["PPO", "HMO", "EPO", "HDHP", "Other"];

/**
 * Turns whatever the AI extracted into a safe Plan object.
 * Missing values become 0/null so the user can fix them in the table before calculating.
 */
export function normalizePlan(raw: any, index: number): Plan {
  const type = PLAN_TYPES.includes(raw?.type) ? raw.type : "Other";
  let coinsurance = num(raw?.coinsurance, 0.2);
  if (coinsurance > 1) coinsurance = coinsurance / 100; // "20" -> 0.2

  // Premiums are stored per month. The AI is asked to convert, but we also handle
  // documents that state a per-paycheck amount with a known pay frequency.
  const perYear = num(raw?.premiumPeriodsPerYear, 12);
  const scale = (v: unknown) => Math.round((num(v) * perYear) / 12);

  return {
    id: `plan-${index}`,
    name: String(raw?.name || `Plan ${index + 1}`).slice(0, 60),
    type,
    premiums: {
      employee: scale(raw?.premiums?.employee),
      employeeSpouse: scale(raw?.premiums?.employeeSpouse),
      employeeChildren: scale(raw?.premiums?.employeeChildren),
      family: scale(raw?.premiums?.family),
    },
    deductible: {
      individual: num(raw?.deductible?.individual),
      family: num(raw?.deductible?.family, num(raw?.deductible?.individual) * 2),
    },
    outOfPocketMax: {
      individual: num(raw?.outOfPocketMax?.individual),
      family: num(raw?.outOfPocketMax?.family, num(raw?.outOfPocketMax?.individual) * 2),
    },
    coinsurance,
    copays: {
      primary: numOrNull(raw?.copays?.primary),
      specialist: numOrNull(raw?.copays?.specialist),
      genericRx: numOrNull(raw?.copays?.genericRx),
    },
    hsaEligible: Boolean(raw?.hsaEligible) || type === "HDHP",
    employerHsa: {
      individual: num(raw?.employerHsa?.individual),
      family: num(raw?.employerHsa?.family),
    },
  };
}

/** List of fields that look missing, so the UI can highlight them. */
export function missingFields(p: Plan): string[] {
  const missing: string[] = [];
  if (!p.premiums.employee) missing.push("premium");
  if (!p.deductible.individual && p.type === "HDHP") missing.push("deductible");
  if (!p.outOfPocketMax.individual) missing.push("out-of-pocket max");
  return missing;
}
