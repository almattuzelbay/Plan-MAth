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

/**
 * Turns whatever the AI extracted into a safe Plan object.
 * Missing numbers stay null (never silently 0) so the user must fill them in before comparing.
 */
export function normalizePlan(raw: any, index: number): Plan {
  const type: PlanType = PLAN_TYPES.includes(raw?.type) ? raw.type : "Other";
  let coinsurance = toNumber(raw?.coinsurance) ?? 0.2;
  if (coinsurance > 1) coinsurance /= 100; // "20" -> 0.2
  coinsurance = Math.min(1, Math.max(0, coinsurance));

  // Store premiums per month; convert from per-paycheck or annual amounts.
  const periods = toNumber(raw?.premiumPeriodsPerYear) ?? 12;
  const premiums = {} as Plan["premiums"];
  for (const t of TIERS) {
    const v = toNumber(raw?.premiums?.[t]);
    premiums[t] = v === null ? null : Math.round(((v * periods) / 12) * 100) / 100;
  }

  const copays = {} as Copays;
  for (const c of COPAYS) copays[c] = type === "HDHP" ? null : toNumber(raw?.copays?.[c]);

  const hsaEligible = Boolean(raw?.hsaEligible) || type === "HDHP";
  const sources = typeof raw?.sources === "object" && raw.sources ? raw.sources : undefined;

  return {
    id: `plan-${Date.now()}-${index}`,
    name: String(raw?.name || `Plan ${index + 1}`).slice(0, 60),
    type,
    premiums,
    deductible: { individual: toNumber(raw?.deductible?.individual), family: toNumber(raw?.deductible?.family) },
    outOfPocketMax: {
      individual: toNumber(raw?.outOfPocketMax?.individual),
      family: toNumber(raw?.outOfPocketMax?.family),
    },
    embeddedDeductible: typeof raw?.embeddedDeductible === "boolean" ? raw.embeddedDeductible : type !== "HDHP",
    coinsurance,
    copays,
    hsaEligible,
    employerHsa: {
      individual: toNumber(raw?.employerHsa?.individual) ?? 0,
      family: toNumber(raw?.employerHsa?.family) ?? 0,
    },
    sources,
  };
}

export function blankPlan(index: number): Plan {
  return normalizePlan({ name: `Plan ${index + 1}`, type: "PPO" }, index);
}
