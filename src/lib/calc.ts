import {
  ACCOUNT_LIMITS,
  FSA_SAFETY_FACTOR,
  LIGHT_YEAR_FACTOR,
  PROFILE_EFFECTS,
  SERVICE_COST,
} from "./assumptions";
import type {
  Copays,
  CoverageTier,
  Household,
  Member,
  Plan,
  PlanResult,
  Recommendation,
  ScenarioKey,
  ScenarioResult,
} from "./types";

/** A priced unit of care for one person. `copay` names the copay that applies, if the plan has one. */
export interface Service {
  memberIndex: number;
  allowed: number;
  count: number;
  copay: keyof Copays | null;
}

const round = (n: number) => Math.round(n);

/** Coverage tier follows from who is on the plan. */
export function coverageFor(members: Member[]): CoverageTier {
  const spouse = members.some((m) => m.role === "spouse");
  const kids = members.some((m) => m.role === "child");
  if (spouse && kids) return "family";
  if (spouse) return "employeeSpouse";
  if (kids) return "employeeChildren";
  return "employee";
}

/** A person's yearly usage after adding the care profiles they ticked. */
export function effectiveUsage(m: Member) {
  const u = {
    primaryVisits: m.primaryVisits,
    specialistVisits: m.specialistVisits,
    therapySessions: 0,
    urgentCareVisits: m.urgentCareVisits,
    erVisits: m.erVisits,
    labsImaging: m.labsImaging,
    genericRx: m.genericRx,
    brandRx: m.brandRx,
    specialtyRx: 0,
    events: [] as ("baby" | "surgery")[],
  };
  for (const p of m.profiles) {
    const a = PROFILE_EFFECTS[p].adds;
    u.primaryVisits += a.primaryVisits ?? 0;
    u.specialistVisits += a.specialistVisits ?? 0;
    u.therapySessions += a.therapySessions ?? 0;
    u.urgentCareVisits += a.urgentCareVisits ?? 0;
    u.labsImaging += a.labsImaging ?? 0;
    u.brandRx += a.brandRx ?? 0;
    u.specialtyRx += a.specialtyRx ?? 0;
    if (a.event) u.events.push(a.event);
  }
  return u;
}

/** The services the household uses in each scenario. */
export function buildScenario(h: Household, key: ScenarioKey): Service[] {
  const services: Service[] = [];
  const scale = (n: number) => (key === "light" ? Math.round(n * LIGHT_YEAR_FACTOR) : n);

  h.members.forEach((m, i) => {
    const u = effectiveUsage(m);
    const add = (allowed: number, count: number, copay: keyof Copays | null) => {
      if (count > 0) services.push({ memberIndex: i, allowed, count, copay });
    };
    add(SERVICE_COST.primaryVisit, scale(u.primaryVisits), "primary");
    add(SERVICE_COST.specialistVisit, scale(u.specialistVisits), "specialist");
    add(SERVICE_COST.therapySession, scale(u.therapySessions), "primary"); // mental health office visits usually use the PCP copay
    add(SERVICE_COST.urgentCareVisit, scale(u.urgentCareVisits), "urgentCare");
    add(SERVICE_COST.erVisit, key === "light" ? 0 : u.erVisits, "er");
    add(SERVICE_COST.labOrImaging, scale(u.labsImaging), null);
    // Ongoing prescriptions are filled every month in every scenario.
    add(SERVICE_COST.genericRxMonth, u.genericRx * 12, "genericRx");
    add(SERVICE_COST.brandRxMonth, u.brandRx * 12, "brandRx");
    add(SERVICE_COST.specialtyRxMonth, u.specialtyRx * 12, "specialtyRx");
    if (key !== "light") {
      for (const e of u.events) add(e === "baby" ? SERVICE_COST.baby : SERVICE_COST.surgery, 1, null);
    }
  });

  if (key === "bad") {
    const adult = Math.max(0, h.members.findIndex((m) => m.role !== "child"));
    services.push({ memberIndex: adult, allowed: SERVICE_COST.hospitalization, count: 1, copay: null });
  }
  return services;
}

/**
 * What the household pays for care under one plan.
 * Tracks each person and the family as a whole:
 *  - embedded deductible: a person stops paying the deductible at the individual amount;
 *  - aggregate deductible: nobody gets coinsurance until the family deductible is met;
 *  - out-of-pocket max is always capped per person (individual) and for the family.
 */
export function outOfPocket(plan: Plan, services: Service[], memberCount: number, family: boolean): number {
  const dInd = plan.deductible.individual ?? 0;
  const dFam = plan.deductible.family ?? dInd * 2;
  const mInd = plan.outOfPocketMax.individual ?? Infinity;
  const mFam = plan.outOfPocketMax.family ?? mInd * 2;

  const dedPaid = new Array(memberCount).fill(0);
  const oopPaid = new Array(memberCount).fill(0);
  let famDed = 0;
  let famOop = 0;

  const deductibleLeft = (i: number) => {
    if (!family) return Math.max(0, dInd - dedPaid[i]);
    if (plan.embeddedDeductible) return Math.max(0, Math.min(dInd - dedPaid[i], dFam - famDed));
    return Math.max(0, dFam - famDed);
  };
  const oopLeft = (i: number) =>
    family ? Math.max(0, Math.min(mInd - oopPaid[i], mFam - famOop)) : Math.max(0, mInd - oopPaid[i]);

  for (const s of services) {
    const copay = s.copay && plan.type !== "HDHP" ? plan.copays[s.copay] : null;
    for (let k = 0; k < s.count; k++) {
      const i = s.memberIndex;
      let charge: number;
      if (copay !== null) {
        charge = Math.min(copay, s.allowed);
      } else {
        const towardDeductible = Math.min(s.allowed, deductibleLeft(i));
        dedPaid[i] += towardDeductible;
        famDed += towardDeductible;
        charge = towardDeductible + plan.coinsurance * (s.allowed - towardDeductible);
      }
      const paid = Math.min(charge, oopLeft(i));
      oopPaid[i] += paid;
      famOop += paid;
    }
  }
  return famOop;
}

/** Pre-tax account the household should fund, decided once at enrollment from the expected year. */
export function suggestAccount(plan: Plan, family: boolean, expectedOop: number) {
  if (plan.hsaEligible) {
    const employer = family ? plan.employerHsa.family : plan.employerHsa.individual;
    const limit = (family ? ACCOUNT_LIMITS.hsa.family : ACCOUNT_LIMITS.hsa.individual) - employer;
    const amount = Math.max(0, Math.min(limit, expectedOop - employer));
    return { kind: "HSA" as const, amount: Math.floor(amount / 50) * 50 };
  }
  const amount = Math.min(ACCOUNT_LIMITS.healthFsa, expectedOop * FSA_SAFETY_FACTOR);
  return { kind: "FSA" as const, amount: Math.floor(amount / 50) * 50 };
}

/** Numbers that must be present to compare a plan for this coverage tier. */
export function missingFor(plan: Plan, coverage: CoverageTier): string[] {
  const family = coverage !== "employee";
  const missing: string[] = [];
  if (plan.premiums[coverage] === null) missing.push("premium for this coverage level");
  if (plan.deductible.individual === null) missing.push("deductible");
  if (plan.outOfPocketMax.individual === null) missing.push("out-of-pocket max");
  if (family && plan.outOfPocketMax.family === null) missing.push("family out-of-pocket max");
  return missing;
}

export function evaluatePlan(plan: Plan, h: Household): PlanResult {
  const coverage = coverageFor(h.members);
  const family = coverage !== "employee";
  const premiums = (plan.premiums[coverage] ?? 0) * 12;
  const employerHsa = plan.hsaEligible ? (family ? plan.employerHsa.family : plan.employerHsa.individual) : 0;

  const oopFor = (key: ScenarioKey) => outOfPocket(plan, buildScenario(h, key), h.members.length, family);
  const oop = { light: oopFor("light"), expected: oopFor("expected"), bad: oopFor("bad") };
  const account = suggestAccount(plan, family, oop.expected);

  const scenario = (key: ScenarioKey): ScenarioResult => {
    let taxSavings = 0;
    if (h.includeTaxes) {
      taxSavings = account.amount * h.taxRate;
      // FSA is use-it-or-lose-it: unspent money is forfeited.
      if (account.kind === "FSA") taxSavings -= Math.max(0, account.amount - oop[key]);
    }
    return {
      premiums: round(premiums),
      outOfPocket: round(oop[key]),
      employerHsa: round(employerHsa),
      taxSavings: round(taxSavings),
      total: round(premiums + oop[key] - employerHsa - taxSavings),
    };
  };

  return {
    plan,
    scenarios: { light: scenario("light"), expected: scenario("expected"), bad: scenario("bad") },
    suggestedAccount: account,
  };
}

export function recommend(plans: Plan[], h: Household): Recommendation | null {
  const coverage = coverageFor(h.members);
  const incomplete = plans
    .map((plan) => ({ plan, missing: missingFor(plan, coverage) }))
    .filter((x) => x.missing.length > 0);
  const complete = plans.filter((p) => missingFor(p, coverage).length === 0);
  if (complete.length === 0) return null;

  const results = complete
    .map((p) => evaluatePlan(p, h))
    .sort((a, b) => a.scenarios.expected.total - b.scenarios.expected.total);
  const lowest = results[0];

  const badOop = lowest.scenarios.bad.outOfPocket;
  const riskWarning =
    badOop > h.emergencyFund
      ? `In a bad year ${lowest.plan.name} could cost up to $${badOop.toLocaleString("en-US")} in medical bills — more than the $${h.emergencyFund.toLocaleString("en-US")} you could cover today. Consider saving toward that in your ${lowest.suggestedAccount.kind}.`
      : null;

  return { coverage, results, incomplete, lowest, riskWarning };
}

/** Difference vs. a baseline plan in a scenario (positive = cheaper than baseline). */
export function savingsVs(rec: Recommendation, baselineId: string, key: ScenarioKey, planId: string): number | null {
  const base = rec.results.find((r) => r.plan.id === baselineId);
  const other = rec.results.find((r) => r.plan.id === planId);
  if (!base || !other) return null;
  return base.scenarios[key].total - other.scenarios[key].total;
}

/**
 * Total yearly cost for one adult as a function of total care spending S (all through the deductible).
 * Used for the "what if my care costs $X" chart — the simple model from the methodology:
 *   O(S) = min(M, min(S, D) + c × max(S − D, 0)),   C(S) = premiums + O(S) − employer HSA
 */
export function costCurve(plan: Plan, coverage: CoverageTier, spend: number): number {
  const family = coverage !== "employee";
  const D = (family ? plan.deductible.family : plan.deductible.individual) ?? 0;
  const M = (family ? plan.outOfPocketMax.family : plan.outOfPocketMax.individual) ?? Infinity;
  const P = (plan.premiums[coverage] ?? 0) * 12;
  const H = plan.hsaEligible ? (family ? plan.employerHsa.family : plan.employerHsa.individual) : 0;
  const O = Math.min(M, Math.min(spend, D) + plan.coinsurance * Math.max(spend - D, 0));
  return P + O - H;
}
