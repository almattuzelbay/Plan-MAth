import { HSA_LIMITS, LIGHT_YEAR_FACTOR, PROFILE_EFFECTS } from "./assumptions";
import type {
  Copays,
  CoverageTier,
  Household,
  Member,
  Plan,
  PlanResult,
  PriceKey,
  Recommendation,
  ScenarioKey,
  ScenarioResult,
} from "./types";

/** A priced unit of care for one person. `copay` names the copay that applies, if the plan has one. */
export interface Service {
  memberIndex: number;
  priceKey: PriceKey;
  allowed: number;
  count: number;
  copay: keyof Copays | null;
}

/** One line of the care-cost breakdown shown to the user (summed over household members). */
export interface BreakdownRow {
  priceKey: PriceKey;
  count: number;
  unitPrice: number;
  subtotal: number;
}

const round = (n: number) => Math.round(n);
const cents = (n: number) => Math.round(n * 100) / 100;

/** Coverage tier follows from who is on the plan. */
export function coverageFor(members: Member[]): CoverageTier {
  const spouse = members.some((m) => m.role === "spouse");
  const kids = members.some((m) => m.role === "child");
  if (spouse && kids) return "family";
  if (spouse) return "employeeSpouse";
  if (kids) return "employeeChildren";
  return "employee";
}

/** A person's yearly usage after adding the care profiles they ticked. Therapy is its own editable field. */
export function effectiveUsage(m: Member) {
  const u = {
    primaryVisits: m.primaryVisits,
    specialistVisits: m.specialistVisits,
    therapySessions: m.therapySessions ?? 0,
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
    u.urgentCareVisits += a.urgentCareVisits ?? 0;
    u.labsImaging += a.labsImaging ?? 0;
    u.brandRx += a.brandRx ?? 0;
    u.specialtyRx += a.specialtyRx ?? 0;
    if (a.event) u.events.push(a.event);
  }
  return u;
}

/** The services the household uses in each scenario, priced with the household's (editable) prices. */
export function buildScenario(h: Household, key: ScenarioKey): Service[] {
  const services: Service[] = [];
  const scale = (n: number) => (key === "light" ? Math.round(n * LIGHT_YEAR_FACTOR) : n);

  h.members.forEach((m, i) => {
    const u = effectiveUsage(m);
    const add = (priceKey: PriceKey, count: number, copay: keyof Copays | null) => {
      if (count > 0) services.push({ memberIndex: i, priceKey, allowed: h.prices[priceKey], count, copay });
    };
    add("primaryVisit", scale(u.primaryVisits), "primary");
    add("specialistVisit", scale(u.specialistVisits), "specialist");
    add("therapySession", scale(u.therapySessions), "primary"); // mental health office visits usually use the PCP copay
    add("urgentCareVisit", scale(u.urgentCareVisits), "urgentCare");
    add("erVisit", key === "light" ? 0 : u.erVisits, "er");
    add("labOrImaging", scale(u.labsImaging), null);
    // Ongoing prescriptions: medicines per month × 12 fills, in every scenario.
    add("genericRxMonth", u.genericRx * 12, "genericRx");
    add("brandRxMonth", u.brandRx * 12, "brandRx");
    add("specialtyRxMonth", u.specialtyRx * 12, "specialtyRx");
    if (key !== "light") for (const e of u.events) add(e, 1, null);
  });

  if (key === "bad") {
    const adult = Math.max(0, h.members.findIndex((m) => m.role !== "child"));
    services.push({ memberIndex: adult, priceKey: "hospitalization", allowed: h.prices.hospitalization, count: 1, copay: null });
  }
  return services;
}

/** Count × price per service type, the same numbers the cost engine uses. */
export function breakdown(h: Household, key: ScenarioKey): BreakdownRow[] {
  const rows = new Map<PriceKey, BreakdownRow>();
  for (const s of buildScenario(h, key)) {
    const row = rows.get(s.priceKey) ?? { priceKey: s.priceKey, count: 0, unitPrice: s.allowed, subtotal: 0 };
    row.count += s.count;
    row.subtotal += s.count * s.allowed;
    rows.set(s.priceKey, row);
  }
  return [...rows.values()];
}

/** Total allowed charges for covered in-network care in a scenario. */
export const totalAllowed = (h: Household, key: ScenarioKey) =>
  breakdown(h, key).reduce((sum, r) => sum + r.subtotal, 0);

/**
 * What the household pays for care under one plan.
 * Tracks each person and the family as a whole:
 *  - embedded deductible: a person stops paying the deductible at the individual amount;
 *  - aggregate deductible: nobody gets coinsurance until the family deductible is met;
 *  - out-of-pocket max is always capped per person (individual) and for the family.
 * Callers must check missingFor() first; unknown values are never silently treated as 0 there.
 */
export function outOfPocket(plan: Plan, services: Service[], memberCount: number, family: boolean): number {
  const dInd = plan.deductible.individual ?? 0;
  const dFam = plan.deductible.family ?? Infinity;
  const mInd = plan.outOfPocketMax.individual ?? Infinity;
  const mFam = plan.outOfPocketMax.family ?? Infinity;
  const embedded = plan.embeddedDeductible ?? true;

  const dedPaid = new Array(memberCount).fill(0);
  const oopPaid = new Array(memberCount).fill(0);
  let famDed = 0;
  let famOop = 0;

  const deductibleLeft = (i: number) => {
    if (!family) return Math.max(0, dInd - dedPaid[i]);
    if (embedded) return Math.max(0, Math.min(dInd - dedPaid[i], dFam - famDed));
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

/** Annual premium straight from the stored per-period amount — never rebuilt from rounded monthly figures. */
export function annualPremium(plan: Plan, coverage: CoverageTier): number {
  return cents((plan.premiums[coverage] ?? 0) * plan.premiumPeriods);
}

export function employerHsaFor(plan: Plan, coverage: CoverageTier): number {
  if (!plan.hsaEligible) return 0;
  return (coverage === "employee" ? plan.employerHsa.individual : plan.employerHsa.family) ?? 0;
}

/** Numbers that must be known to compare a plan for this coverage tier. */
export function missingFor(plan: Plan, coverage: CoverageTier): string[] {
  const family = coverage !== "employee";
  const missing: string[] = [];
  if (plan.premiums[coverage] === null) missing.push("premium for this coverage level");
  if (plan.deductible.individual === null) missing.push("individual deductible");
  if (plan.outOfPocketMax.individual === null) missing.push("individual out-of-pocket max");
  if (family) {
    if (plan.deductible.family === null) missing.push("family deductible");
    if (plan.outOfPocketMax.family === null) missing.push("family out-of-pocket max");
    if (plan.embeddedDeductible === null) missing.push("embedded or aggregate deductible");
  }
  if (plan.hsaEligible && (family ? plan.employerHsa.family : plan.employerHsa.individual) === null) {
    missing.push(`employer HSA contribution (${family ? "family" : "individual"}; enter 0 if none)`);
  }
  return missing;
}

/** HSA contribution that would cover expected bills after the employer's money, within the 2027 limit. */
export function suggestHsa(plan: Plan, coverage: CoverageTier, expectedOop: number): number | null {
  if (!plan.hsaEligible) return null;
  const employer = employerHsaFor(plan, coverage);
  const limit = (coverage === "employee" ? HSA_LIMITS.individual : HSA_LIMITS.family) - employer;
  return Math.floor(Math.max(0, Math.min(limit, expectedOop - employer)) / 50) * 50;
}

export function evaluatePlan(plan: Plan, h: Household): PlanResult {
  const coverage = coverageFor(h.members);
  const family = coverage !== "employee";
  const premiums = annualPremium(plan, coverage);
  const employerHsa = employerHsaFor(plan, coverage);

  const oopFor = (key: ScenarioKey) => outOfPocket(plan, buildScenario(h, key), h.members.length, family);
  const oop = { light: oopFor("light"), expected: oopFor("expected"), bad: oopFor("bad") };
  const hsa = suggestHsa(plan, coverage, oop.expected);

  const scenario = (key: ScenarioKey): ScenarioResult => {
    // Tax effect only for an HSA the user funds, and only when the user switches taxes on.
    const taxSavings = h.includeTaxes && hsa ? hsa * h.taxRate : 0;
    return {
      premiums: cents(premiums),
      outOfPocket: round(oop[key]),
      employerHsa: round(employerHsa),
      taxSavings: round(taxSavings),
      total: round(premiums + oop[key] - employerHsa - taxSavings),
    };
  };

  return {
    plan,
    scenarios: { light: scenario("light"), expected: scenario("expected"), bad: scenario("bad") },
    suggestedHsa: hsa,
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
  const tiedWithLowest = results
    .slice(1)
    .filter((r) => r.scenarios.expected.total - lowest.scenarios.expected.total <= 1)
    .map((r) => r.plan.id);

  const family = coverage !== "employee";
  const oopMax = (family ? lowest.plan.outOfPocketMax.family : lowest.plan.outOfPocketMax.individual) ?? 0;
  const riskWarning =
    oopMax > h.emergencyFund
      ? `Your entered reserve is $${h.emergencyFund.toLocaleString("en-US")}. ${lowest.plan.name}'s annual in-network out-of-pocket maximum is $${oopMax.toLocaleString("en-US")}, excluding premiums and uncovered care. Review how you would cover these costs.`
      : null;

  return { coverage, results, incomplete, lowest, riskWarning, tiedWithLowest };
}

/** Difference vs. a baseline plan in a scenario (positive = cheaper than baseline). */
export function savingsVs(rec: Recommendation, baselineId: string, key: ScenarioKey, planId: string): number | null {
  const base = rec.results.find((r) => r.plan.id === baselineId);
  const other = rec.results.find((r) => r.plan.id === planId);
  if (!base || !other) return null;
  return base.scenarios[key].total - other.scenarios[key].total;
}

/**
 * Simple model used by the what-if chart: all care S goes through the deductible and coinsurance.
 *   O(S) = min(M, min(S, D) + c × max(S − D, 0))
 *   cost before HSA = P + O(S);  net cost = P + O(S) − employer HSA
 */
export function simpleCost(plan: Plan, coverage: CoverageTier, spend: number) {
  const family = coverage !== "employee";
  const D = (family ? plan.deductible.family : plan.deductible.individual) ?? 0;
  const M = (family ? plan.outOfPocketMax.family : plan.outOfPocketMax.individual) ?? Infinity;
  const P = annualPremium(plan, coverage);
  const H = employerHsaFor(plan, coverage);
  const O = Math.min(M, Math.min(spend, D) + plan.coinsurance * Math.max(spend - D, 0));
  return { premiums: P, outOfPocket: O, employerHsa: H, beforeHsa: P + O, net: P + O - H };
}

export const costCurve = (plan: Plan, coverage: CoverageTier, spend: number) => simpleCost(plan, coverage, spend).net;
