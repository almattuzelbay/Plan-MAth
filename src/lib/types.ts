export type CoverageTier = "employee" | "employeeSpouse" | "employeeChildren" | "family";

export type PlanType = "PPO" | "HMO" | "EPO" | "HDHP" | "Other";

/** One health plan as it appears in an employer's benefits guide. */
export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  /** Employee contribution per month, by coverage tier. */
  premiums: Record<CoverageTier, number>;
  deductible: { individual: number; family: number };
  outOfPocketMax: { individual: number; family: number };
  /** Your share after the deductible, 0–1 (e.g. 0.2 = 20%). */
  coinsurance: number;
  /** Flat copays. null = the service goes through deductible + coinsurance instead. */
  copays: {
    primary: number | null;
    specialist: number | null;
    genericRx: number | null;
  };
  hsaEligible: boolean;
  /** Employer contribution to the HSA per year. */
  employerHsa: { individual: number; family: number };
}

export type LifeEvent = "openEnrollment" | "newJob" | "turning26" | "baby";

export type BigEvent = "none" | "baby" | "surgery";

/** Answers to the 6-question survey. Counts are for the whole household per year. */
export interface Household {
  coverage: CoverageTier;
  primaryVisits: number;
  specialistVisits: number;
  /** Number of ongoing monthly generic prescriptions across the household. */
  monthlyPrescriptions: number;
  bigEvent: BigEvent;
  /** How much the household could pay for a surprise medical bill today. */
  emergencyFund: number;
  /** Combined marginal tax rate used for HSA/FSA savings (federal + FICA + state). */
  taxRate: number;
}

export type ScenarioKey = "good" | "expected" | "bad";

export interface ScenarioResult {
  premiums: number;
  outOfPocket: number;
  employerHsa: number;
  taxSavings: number;
  total: number;
}

export interface PlanResult {
  plan: Plan;
  scenarios: Record<ScenarioKey, ScenarioResult>;
  /** Suggested pre-tax account contribution (HSA for HDHP, FSA otherwise). */
  suggestedAccount: { kind: "HSA" | "FSA"; amount: number };
}

export interface Recommendation {
  results: PlanResult[];
  best: PlanResult;
  /** Expected-year savings of the best plan vs the most expensive plan. */
  savingsVsWorst: number;
  /** Set when the best plan's bad-year out-of-pocket exceeds the emergency fund. */
  riskWarning: string | null;
}
