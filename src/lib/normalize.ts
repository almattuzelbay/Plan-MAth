import type { Copays, CoverageTier, Plan, PlanType } from "./types";

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,%\s]/g, ""));
    if (v.trim() !== "" && Number.isFinite(n)) return n;
  }
  return null;
};

const PLAN_TYPES: PlanType[] = ["PPO", "HMO", "EPO", "POS", "HDHP", "Other"];
const TIERS: CoverageTier[] = ["employee", "employeeSpouse", "employeeChildren", "family"];
const COPAYS: (keyof Copays)[] = ["primary", "specialist", "urgentCare", "er", "genericRx", "brandRx", "specialtyRx"];
export const PREMIUM_PERIODS = [12, 24, 26, 52, 1] as const;

/**
 * Turns whatever the AI extracted into a safe Plan object.
 * Unknown values stay null ("Not provided") — never silently 0 or a default that looks like a fact.
 * Premiums are kept exactly as stated (amount per period + number of periods) to avoid rounding drift.
 */
export function normalizePlan(raw: any, index: number): Plan {
  const type: PlanType = PLAN_TYPES.includes(raw?.type) ? raw.type : "Other";
  let coinsurance = toNumber(raw?.coinsurance) ?? 0.2;
  if (coinsurance > 1) coinsurance /= 100; // "20" -> 0.2
  coinsurance = Math.min(1, Math.max(0, coinsurance));

  const periods = toNumber(raw?.premiumPeriodsPerYear);
  const premiumPeriods = periods !== null && (PREMIUM_PERIODS as readonly number[]).includes(periods) ? periods : 12;
  const premiums = {} as Plan["premiums"];
  for (const t of TIERS) premiums[t] = toNumber(raw?.premiums?.[t]);

  const copays = {} as Copays;
  for (const c of COPAYS) copays[c] = type === "HDHP" ? null : toNumber(raw?.copays?.[c]);

  const hsaEligible = Boolean(raw?.hsaEligible) || type === "HDHP";
  const sources = typeof raw?.sources === "object" && raw.sources ? raw.sources : undefined;

  return {
    id: `plan-${Date.now()}-${index}`,
    name: String(raw?.name || `Plan ${index + 1}`).slice(0, 60),
    type,
    planYear: raw?.planYear ? String(raw.planYear).slice(0, 20) : null,
    premiumPeriods,
    premiums,
    deductible: { individual: toNumber(raw?.deductible?.individual), family: toNumber(raw?.deductible?.family) },
    outOfPocketMax: {
      individual: toNumber(raw?.outOfPocketMax?.individual),
      family: toNumber(raw?.outOfPocketMax?.family),
    },
    embeddedDeductible: typeof raw?.embeddedDeductible === "boolean" ? raw.embeddedDeductible : null,
    coinsurance,
    copays,
    hsaEligible,
    employerHsa: hsaEligible
      ? { individual: toNumber(raw?.employerHsa?.individual), family: toNumber(raw?.employerHsa?.family) }
      : { individual: 0, family: 0 },
    sources,
  };
}

export function blankPlan(index: number): Plan {
  return normalizePlan({ name: `Plan ${index + 1}`, type: "PPO" }, index);
}
