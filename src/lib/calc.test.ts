import { describe, expect, it } from "vitest";
import { DEMO_PLANS } from "../data/demo";
import { evaluatePlan, outOfPocket, recommend } from "./calc";
import { DEFAULT_HOUSEHOLD } from "./lifeEvents";
import type { Household } from "./types";

const [ppo, , hdhp] = DEMO_PLANS;

describe("outOfPocket", () => {
  it("charges copays for visits on a copay plan", () => {
    const paid = outOfPocket(ppo, [{ kind: "primary", allowed: 180, count: 2 }], false);
    expect(paid).toBe(50);
  });

  it("applies deductible then coinsurance on an HDHP", () => {
    // $5,000 of care: $3,500 deductible + 20% of $1,500 = $3,800
    const paid = outOfPocket(hdhp, [{ kind: "major", allowed: 5000, count: 1 }], false);
    expect(paid).toBe(3800);
  });

  it("never exceeds the out-of-pocket maximum", () => {
    const paid = outOfPocket(hdhp, [{ kind: "major", allowed: 100000, count: 1 }], true);
    expect(paid).toBe(hdhp.outOfPocketMax.family);
  });
});

describe("evaluatePlan", () => {
  it("adds premiums and subtracts employer HSA money and tax savings", () => {
    const r = evaluatePlan(hdhp, DEFAULT_HOUSEHOLD).scenarios.expected;
    expect(r.premiums).toBe(70 * 12);
    expect(r.employerHsa).toBe(500);
    expect(r.total).toBe(r.premiums + r.outOfPocket - r.employerHsa - r.taxSavings);
  });

  it("penalizes FSA money that would be forfeited in a healthy year", () => {
    const h: Household = { ...DEFAULT_HOUSEHOLD, primaryVisits: 10, specialistVisits: 6 };
    const r = evaluatePlan(ppo, h);
    expect(r.suggestedAccount.kind).toBe("FSA");
    expect(r.scenarios.good.taxSavings).toBeLessThan(r.scenarios.expected.taxSavings);
  });
});

describe("recommend", () => {
  it("picks the HDHP for a healthy single employee", () => {
    const rec = recommend(DEMO_PLANS, DEFAULT_HOUSEHOLD);
    expect(rec.best.plan.type).toBe("HDHP");
    expect(rec.savingsVsWorst).toBeGreaterThan(0);
  });

  it("can recommend a low-deductible plan when a baby is planned", () => {
    const rec = recommend(DEMO_PLANS, { ...DEFAULT_HOUSEHOLD, coverage: "family", bigEvent: "baby" });
    expect(rec.best.plan.type).not.toBe("HDHP");
  });

  it("sorts plans from cheapest to most expensive", () => {
    const rec = recommend(DEMO_PLANS, { ...DEFAULT_HOUSEHOLD, coverage: "family", bigEvent: "baby" });
    const totals = rec.results.map((r) => r.scenarios.expected.total);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });

  it("warns when a bad year would exceed the emergency fund", () => {
    const rec = recommend(DEMO_PLANS, { ...DEFAULT_HOUSEHOLD, emergencyFund: 500 });
    expect(rec.riskWarning).not.toBeNull();
  });
});
