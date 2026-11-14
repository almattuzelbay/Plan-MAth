import { describe, expect, it } from "vitest";
import { DEMO_PLANS } from "../data/demo";
import { costCurve, coverageFor, evaluatePlan, outOfPocket, recommend, type Service } from "./calc";
import { householdFor, newMember } from "./lifeEvents";
import { blankPlan, normalizePlan } from "./normalize";
import type { Household, Plan } from "./types";

const [ppo, , hdhp] = DEMO_PLANS;
const single = (): Household => householdFor("openEnrollment");
const big = (memberIndex: number, allowed: number): Service => ({ memberIndex, allowed, count: 1, copay: null });

/** The worked example from the methodology document (self-only, no copays). */
const planA: Plan = { ...hdhp, id: "a", type: "PPO", hsaEligible: false, employerHsa: { individual: 0, family: 0 },
  premiums: { employee: (100 * 26) / 12, employeeSpouse: null, employeeChildren: null, family: null },
  deductible: { individual: 1000, family: 2000 }, outOfPocketMax: { individual: 4000, family: 8000 }, coinsurance: 0.1 };
const planB: Plan = { ...hdhp, id: "b", employerHsa: { individual: 500, family: 1000 },
  premiums: { employee: (50 * 26) / 12, employeeSpouse: null, employeeChildren: null, family: null },
  deductible: { individual: 3000, family: 6000 }, outOfPocketMax: { individual: 6500, family: 13000 }, coinsurance: 0.2 };

describe("simple model (methodology worked example)", () => {
  it("matches the hand-checked numbers at S = $5,000", () => {
    expect(Math.round(costCurve(planA, "employee", 5000))).toBe(4000);
    expect(Math.round(costCurve(planB, "employee", 5000) + 500)).toBe(4700); // before employer HSA
    expect(Math.round(costCurve(planB, "employee", 5000))).toBe(4200);
  });
  it("caps at premium + out-of-pocket max", () => {
    expect(Math.round(costCurve(planA, "employee", 40000))).toBe(6600);
  });
  it("cost never decreases as spending grows", () => {
    let prev = -Infinity;
    for (let s = 0; s <= 50000; s += 500) {
      const c = costCurve(planB, "employee", s);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe("outOfPocket", () => {
  it("charges copays on a copay plan", () => {
    expect(outOfPocket(ppo, [{ memberIndex: 0, allowed: 180, count: 2, copay: "primary" }], 1, false)).toBe(50);
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
  it("care profiles increase expected costs", () => {
    const base = evaluatePlan(ppo, single()).scenarios.expected.outOfPocket;
    const h = single();
    h.members[0].profiles = ["chronic", "therapy"];
    expect(evaluatePlan(ppo, h).scenarios.expected.outOfPocket).toBeGreaterThan(base);
  });
  it("taxes are excluded unless switched on", () => {
    expect(evaluatePlan(hdhp, single()).scenarios.expected.taxSavings).toBe(0);
    const h = { ...single(), includeTaxes: true, members: [{ ...newMember("you"), specialistVisits: 6 }] };
    expect(evaluatePlan(hdhp, h).scenarios.expected.taxSavings).toBeGreaterThan(0);
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
  it("converts bi-weekly premiums to monthly and keeps missing values empty", () => {
    const p = normalizePlan({ name: "X", type: "PPO", premiumPeriodsPerYear: 26, premiums: { employee: 100 } }, 0);
    expect(p.premiums.employee).toBe(216.67);
    expect(p.premiums.family).toBeNull();
    expect(p.deductible.individual).toBeNull();
  });
  it("turns '20%' coinsurance into 0.2", () => {
    expect(normalizePlan({ coinsurance: "20%" }, 0).coinsurance).toBe(0.2);
  });
});
