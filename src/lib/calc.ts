import { ACCOUNT_LIMITS, FSA_SAFETY_FACTOR, SERVICE_COST } from "./assumptions";
import type {
  Household,
  Plan,
  PlanResult,
  Recommendation,
  ScenarioKey,
  ScenarioResult,
} from "./types";

type ServiceKind = "primary" | "specialist" | "genericRx" | "major";

interface Service {
  kind: ServiceKind;
  allowed: number;
  count: number;
}

const round = (n: number) => Math.round(n);

export const isFamilyCoverage = (h: Household) => h.coverage !== "employee";

/** The services a household uses in each scenario. */
export function buildScenario(h: Household, key: ScenarioKey): Service[] {
  const rx: Service = {
    kind: "genericRx",
    allowed: SERVICE_COST.genericRxMonth,
    count: h.monthlyPrescriptions * 12,
  };

  if (key === "good") {
    return [{ kind: "primary", allowed: SERVICE_COST.primaryVisit, count: 1 }, rx];
  }

  const services: Service[] = [
    { kind: "primary", allowed: SERVICE_COST.primaryVisit, count: h.primaryVisits },
    { kind: "specialist", allowed: SERVICE_COST.specialistVisit, count: h.specialistVisits },
    rx,
  ];
  if (h.bigEvent === "baby") services.push({ kind: "major", allowed: SERVICE_COST.baby, count: 1 });
  if (h.bigEvent === "surgery") services.push({ kind: "major", allowed: SERVICE_COST.surgery, count: 1 });
  if (key === "bad") services.push({ kind: "major", allowed: SERVICE_COST.hospitalization, count: 1 });
  return services;
}

/** What the household pays out of pocket for a set of services under one plan. */
export function outOfPocket(plan: Plan, services: Service[], family: boolean): number {
  const deductible = family ? plan.deductible.family : plan.deductible.individual;
  const oopMax = family ? plan.outOfPocketMax.family : plan.outOfPocketMax.individual;
  let deductibleLeft = deductible;
  let paid = 0;

  for (const s of services) {
    const copay = s.kind === "major" ? null : plan.copays[s.kind];
    for (let i = 0; i < s.count; i++) {
      if (copay !== null && plan.type !== "HDHP") {
        paid += Math.min(copay, s.allowed);
      } else {
        const towardDeductible = Math.min(s.allowed, deductibleLeft);
        deductibleLeft -= towardDeductible;
        paid += towardDeductible + plan.coinsurance * (s.allowed - towardDeductible);
      }
      if (paid >= oopMax) return oopMax;
    }
  }
  return Math.min(paid, oopMax);
}

/** Pre-tax account the household should fund, decided once at enrollment from the expected year. */
export function suggestAccount(plan: Plan, h: Household, expectedOop: number) {
  const family = isFamilyCoverage(h);
  if (plan.hsaEligible) {
    const employer = family ? plan.employerHsa.family : plan.employerHsa.individual;
    const limit = (family ? ACCOUNT_LIMITS.hsa.family : ACCOUNT_LIMITS.hsa.individual) - employer;
    const amount = Math.max(0, Math.min(limit, expectedOop - employer));
    return { kind: "HSA" as const, amount: Math.floor(amount / 50) * 50 };
  }
  const amount = Math.min(ACCOUNT_LIMITS.healthFsa, expectedOop * FSA_SAFETY_FACTOR);
  return { kind: "FSA" as const, amount: Math.floor(amount / 50) * 50 };
}

export function evaluatePlan(plan: Plan, h: Household): PlanResult {
  const family = isFamilyCoverage(h);
  const premiums = plan.premiums[h.coverage] * 12;
  const employerHsa = plan.hsaEligible
    ? family
      ? plan.employerHsa.family
      : plan.employerHsa.individual
    : 0;

  const oop = {
    good: outOfPocket(plan, buildScenario(h, "good"), family),
    expected: outOfPocket(plan, buildScenario(h, "expected"), family),
    bad: outOfPocket(plan, buildScenario(h, "bad"), family),
  };
  const account = suggestAccount(plan, h, oop.expected);

  const scenario = (key: ScenarioKey): ScenarioResult => {
    let taxSavings = account.amount * h.taxRate;
    // FSA is use-it-or-lose-it: unspent money is forfeited.
    if (account.kind === "FSA") taxSavings -= Math.max(0, account.amount - oop[key]);
    const total = premiums + oop[key] - employerHsa - taxSavings;
    return {
      premiums: round(premiums),
      outOfPocket: round(oop[key]),
      employerHsa: round(employerHsa),
      taxSavings: round(taxSavings),
      total: round(total),
    };
  };

  return {
    plan,
    scenarios: { good: scenario("good"), expected: scenario("expected"), bad: scenario("bad") },
    suggestedAccount: account,
  };
}

export function recommend(plans: Plan[], h: Household): Recommendation {
  if (plans.length === 0) throw new Error("No plans to compare");
  const results = plans
    .map((p) => evaluatePlan(p, h))
    .sort((a, b) => a.scenarios.expected.total - b.scenarios.expected.total);
  const best = results[0];
  const worst = results[results.length - 1];

  const badOop = best.scenarios.bad.outOfPocket;
  const riskWarning =
    badOop > h.emergencyFund
      ? `In a bad year ${best.plan.name} could cost you up to $${badOop.toLocaleString()} out of pocket — more than the $${h.emergencyFund.toLocaleString()} you could cover today. Consider building that cushion in your ${best.suggestedAccount.kind}.`
      : null;

  return {
    results,
    best,
    savingsVsWorst: worst.scenarios.expected.total - best.scenarios.expected.total,
    riskWarning,
  };
}
