import { describe, expect, it } from "vitest";
import { DEMO_PLANS } from "../data/demo";
import { annualPremium, breakdown, costCurve, coverageFor, evaluatePlan, missingFor, outOfPocket, recommend, simpleCost, totalAllowed, type Service } from "./calc";
import { householdFor, newMember } from "./lifeEvents";
import { blankPlan, normalizePlan } from "./normalize";
import type { Household, Plan } from "./types";

const [ppo, , hdhp] = DEMO_PLANS;
const single = (): Household => householdFor("openEnrollment");
const big = (memberIndex: number, allowed: number): Service => ({ memberIndex, priceKey: "surgery", allowed, count: 1, copay: null });

/** Test plans from the corrections document (self-only, no copays, $X × 26 paychecks). */
const planA: Plan = { ...hdhp, id: "a", name: "Standard PPO", type: "PPO", hsaEligible: false, embeddedDeductible: null,
  premiumPeriods: 26, employerHsa: { individual: 0, family: null },
  premiums: { employee: 100, employeeSpouse: null, employeeChildren: null, family: null },
  deductible: { individual: 1000, family: null }, outOfPocketMax: { individual: 4000, family: null }, coinsurance: 0.1 };
const planB: Plan = { ...hdhp, id: "b", name: "Saver HDHP", embeddedDeductible: null,
  premiumPeriods: 26, employerHsa: { individual: 500, family: null },
  premiums: { employee: 50, employeeSpouse: null, employeeChildren: null, family: null },
  deductible: { individual: 3000, family: null }, outOfPocketMax: { individual: 6500, family: null }, coinsurance: 0.2 };

describe("control values from the corrections document", () => {
  const table: [number, number, number, number][] = [
    [0, 2600, 1300, 800],
    [1000, 3600, 2300, 1800],
    [3000, 3800, 4300, 3800],
    [5000, 4000, 4700, 4200],
    [6470, 4147, 4994, 4494],
    [40000, 6600, 7800, 7300],
  ];
  it.each(table)("allowed charges $%i", (s, a, bBefore, bAfter) => {
    expect(simpleCost(planA, "employee", s).net).toBeCloseTo(a, 6);
    expect(simpleCost(planB, "employee", s).beforeHsa).toBeCloseTo(bBefore, 6);
    expect(simpleCost(planB, "employee", s).net).toBeCloseTo(bAfter, 6);
  });
  it("annual premium is exact: $100 × 26 = $2,600 and $50 × 26 = $1,300", () => {
    expect(annualPremium(planA, "employee")).toBe(2600);
    expect(annualPremium(planB, "employee")).toBe(1300);
  });
  it("cost never decreases as spending grows", () => {
    let prev = -Infinity;
    for (let s = 0; s <= 50000; s += 500) {
      const c = costCurve(planB, "employee", s);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
  it("family comparison is blocked when family terms are not provided", () => {
    expect(missingFor(planA, "employeeSpouse")).toEqual(
      expect.arrayContaining(["premium for this coverage level", "family deductible", "embedded or aggregate deductible"]),
    );
    expect(missingFor(planB, "employee")).toEqual([]);
  });
  it("reports a tie instead of a unique winner when totals are equal", () => {
    const h = single();
    h.members[0] = { ...h.members[0], primaryVisits: 0, labsImaging: 0 };
    h.prices = { ...h.prices, surgery: 3000 };
    h.members[0].profiles = ["surgery"];
    // surgery adds 3 specialist visits + 2 labs; zero their prices so allowed charges are exactly $3,000
    h.prices.specialistVisit = 0;
    h.prices.labOrImaging = 0;
    const rec = recommend([planA, planB], h)!;
    expect(rec.lowest.scenarios.expected.total).toBe(3800);
    expect(rec.tiedWithLowest).toHaveLength(1);
  });
});

describe("outOfPocket", () => {
  it("charges copays on a copay plan", () => {
    expect(outOfPocket(ppo, [{ memberIndex: 0, priceKey: "primaryVisit", allowed: 180, count: 2, copay: "primary" }], 1, false)).toBe(50);
  });
  it("ignores copays on an HDHP and applies the deductible", () => {
    // $5,000: $3,500 deductible + 20% of $1,500 = $3,800
    expect(outOfPocket(hdhp, [big(0, 5000)], 1, false)).toBe(3800);
  });
  it("caps each person at the individual out-of-pocket max", () => {
    expect(outOfPocket(ppo, [big(0, 100000)], 2, true)).toBe(ppo.outOfPocketMax.individual);
  });
  it("caps the family at the family out-of-pocket max", () => {
    expect(outOfPocket(ppo, [big(0, 100000), big(1, 100000), big(2, 100000)], 3, true)).toBe(
      ppo.outOfPocketMax.family,
    );
  });
  it("embedded deductible: one person stops at the individual deductible", () => {
    // $2,000 for one person on a $500/$1,000 embedded plan: 500 + 20% × 1,500 = 800
    expect(outOfPocket(ppo, [big(0, 2000)], 2, true)).toBe(800);
  });
  it("aggregate deductible: one person pays up to the family deductible", () => {
    // $8,000 for one person on a $3,500/$7,000 aggregate HDHP: 7,000 + 20% × 1,000 = 7,200, capped at $7,000 individual OOP
    expect(outOfPocket(hdhp, [big(0, 8000)], 2, true)).toBe(7000);
  });
});

describe("household", () => {
  it("derives the coverage tier from members", () => {
    expect(coverageFor([newMember("you")])).toBe("employee");
    expect(coverageFor([newMember("you"), newMember("child")])).toBe("employeeChildren");
    expect(coverageFor([newMember("you"), newMember("spouse"), newMember("child")])).toBe("family");
  });
  it("changing one price changes its subtotal, total allowed charges and plan costs", () => {
    const h = single();
    h.members[0].specialistVisits = 2;
    const before = { total: totalAllowed(h, "expected"), cost: evaluatePlan(hdhp, h).scenarios.expected.total };
    h.prices = { ...h.prices, specialistVisit: 500 };
    const row = breakdown(h, "expected").find((r) => r.priceKey === "specialistVisit")!;
    expect(row.subtotal).toBe(1000);
    expect(totalAllowed(h, "expected")).toBeGreaterThan(before.total);
    expect(evaluatePlan(hdhp, h).scenarios.expected.total).toBeGreaterThan(before.cost);
  });
  it("counts therapy sessions once", () => {
    const h = single();
    h.members[0] = { ...h.members[0], profiles: ["therapy"], therapySessions: 24 };
    expect(breakdown(h, "expected").find((r) => r.priceKey === "therapySession")!.count).toBe(24);
  });
  it("care profiles increase expected costs", () => {
    const base = evaluatePlan(ppo, single()).scenarios.expected.outOfPocket;
    const h = single();
    h.members[0].profiles = ["chronic", "therapy"];
    expect(evaluatePlan(ppo, h).scenarios.expected.outOfPocket).toBeGreaterThan(base);
  });
  it("taxes are excluded unless switched on; employer HSA stays a separate line", () => {
    const off = evaluatePlan(hdhp, { ...single(), members: [{ ...newMember("you"), specialistVisits: 6 }] }).scenarios.expected;
    expect(off.taxSavings).toBe(0);
    expect(off.employerHsa).toBe(500);
    const h = { ...single(), includeTaxes: true, members: [{ ...newMember("you"), specialistVisits: 6 }] };
    expect(evaluatePlan(hdhp, h).scenarios.expected.taxSavings).toBeGreaterThan(0);
  });
  it("never suggests an FSA amount (FSA availability is unknown)", () => {
    expect(evaluatePlan(ppo, single()).suggestedHsa).toBeNull();
    expect(evaluatePlan(ppo, { ...single(), includeTaxes: true }).scenarios.expected.taxSavings).toBe(0);
  });
});

describe("recommend", () => {
  it("prefers the HDHP for a healthy single person in the demo", () => {
    expect(recommend(DEMO_PLANS, single())!.lowest.plan.type).toBe("HDHP");
  });
  it("prefers a low-deductible plan for a family expecting a baby in the demo", () => {
    expect(recommend(DEMO_PLANS, householdFor("baby"))!.lowest.plan.type).not.toBe("HDHP");
  });
  it("sorts from lowest to highest expected cost", () => {
    const totals = recommend(DEMO_PLANS, householdFor("baby"))!.results.map((r) => r.scenarios.expected.total);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });
  it("leaves out plans with missing numbers instead of treating them as $0", () => {
    const rec = recommend([...DEMO_PLANS, blankPlan(3)], single())!;
    expect(rec.results).toHaveLength(3);
    expect(rec.incomplete).toHaveLength(1);
  });
  it("warns when a bad year exceeds the emergency fund", () => {
    expect(recommend(DEMO_PLANS, { ...single(), emergencyFund: 500 })!.riskWarning).not.toBeNull();
  });
});

describe("normalizePlan", () => {
  it("keeps premiums exactly as stated and unknown values empty", () => {
    const p = normalizePlan({ name: "X", type: "PPO", premiumPeriodsPerYear: 26, premiums: { employee: 100 } }, 0);
    expect(p.premiums.employee).toBe(100);
    expect(p.premiumPeriods).toBe(26);
    expect(annualPremium(p, "employee")).toBe(2600);
    expect(p.premiums.family).toBeNull();
    expect(p.deductible.individual).toBeNull();
    expect(p.embeddedDeductible).toBeNull();
  });
  it("keeps an unknown employer HSA as unknown, not $0", () => {
    const p = normalizePlan({ type: "HDHP", employerHsa: { individual: 500 } }, 0);
    expect(p.employerHsa.individual).toBe(500);
    expect(p.employerHsa.family).toBeNull();
  });
  it("turns '20%' coinsurance into 0.2", () => {
    expect(normalizePlan({ coinsurance: "20%" }, 0).coinsurance).toBe(0.2);
  });
});
