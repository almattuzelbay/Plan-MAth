export type CoverageTier = "employee" | "employeeSpouse" | "employeeChildren" | "family";

export type PlanType = "PPO" | "HMO" | "EPO" | "POS" | "HDHP" | "Other";

/** Services that can have a flat copay. null = goes through deductible + coinsurance. */
export interface Copays {
  primary: number | null;
  specialist: number | null;
  urgentCare: number | null;
  er: number | null;
  genericRx: number | null;
  brandRx: number | null;
  specialtyRx: number | null;
}

/** One health plan as it appears in an employer's benefits guide. In-network values. */
export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  /** Employee contribution per month by coverage tier. null = not found / not offered. */
  premiums: Record<CoverageTier, number | null>;
  deductible: { individual: number | null; family: number | null };
  outOfPocketMax: { individual: number | null; family: number | null };
  /**
   * Embedded: each person has their own deductible inside the family one.
   * Aggregate: the whole family deductible must be met first (common on HDHPs).
   */
  embeddedDeductible: boolean;
  /** Your share after the deductible, 0–1. */
  coinsurance: number;
  copays: Copays;
  hsaEligible: boolean;
  /** Employer contribution to the HSA per year. */
  employerHsa: { individual: number; family: number };
  /** Short quotes from the document that back up key numbers (filled by AI import). */
  sources?: Partial<Record<"premium" | "deductible" | "outOfPocketMax" | "copays" | "employerHsa", string>>;
}

export type CareProfile = "chronic" | "therapy" | "pregnancy" | "specialtyMeds" | "surgery" | "youngChild";

/** One covered person. All counts are per year; prescriptions are ongoing monthly fills. */
export interface Member {
  id: string;
  role: "you" | "spouse" | "child";
  profiles: CareProfile[];
  primaryVisits: number;
  specialistVisits: number;
  urgentCareVisits: number;
  erVisits: number;
  labsImaging: number;
  genericRx: number;
  brandRx: number;
}

export interface Household {
  members: Member[];
  /** How much the household could pay for a surprise medical bill today. */
  emergencyFund: number;
  /** Include tax savings from HSA/FSA contributions. Off by default: it depends on personal tax situation. */
  includeTaxes: boolean;
  /** Combined marginal tax rate used when includeTaxes is on. */
  taxRate: number;
  /** Plan the user is enrolled in today, used as the comparison baseline. */
  currentPlanId: string | null;
}

export type LifeEvent = "openEnrollment" | "newJob" | "turning26" | "baby";

export type ScenarioKey = "light" | "expected" | "bad";

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
  /** Suggested pre-tax account contribution (HSA for HSA-eligible plans, FSA otherwise). */
  suggestedAccount: { kind: "HSA" | "FSA"; amount: number };
}

export interface Recommendation {
  coverage: CoverageTier;
  results: PlanResult[];
  /** Plans left out because a required number is missing. */
  incomplete: { plan: Plan; missing: string[] }[];
  lowest: PlanResult;
  /** Set when the lowest-cost plan's bad-year out-of-pocket exceeds the emergency fund. */
  riskWarning: string | null;
}
