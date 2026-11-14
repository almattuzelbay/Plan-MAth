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
  /**
   * Employee contribution per pay period, exactly as the document states it, by coverage tier.
   * null = not provided. Annual premium = amount × premiumPeriods (no rounding through monthly values).
   */
  premiums: Record<CoverageTier, number | null>;
  /** How many deductions per year the premiums above are quoted for: 12, 24, 26, 52 or 1 (annual). */
  premiumPeriods: number;
  deductible: { individual: number | null; family: number | null };
  outOfPocketMax: { individual: number | null; family: number | null };
  /**
   * Embedded: each person has their own deductible inside the family one.
   * Aggregate: the whole family deductible must be met first (common on HDHPs).
   */
  embeddedDeductible: boolean | null;
  /** Your share after the deductible, 0–1. */
  coinsurance: number;
  copays: Copays;
  hsaEligible: boolean;
  /** Employer contribution to the HSA per year. null = not provided (0 only when the document says so). */
  employerHsa: { individual: number | null; family: number | null };
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
  therapySessions: number;
  urgentCareVisits: number;
  erVisits: number;
  labsImaging: number;
  genericRx: number;
  brandRx: number;
}

export type PriceKey =
  | "primaryVisit"
  | "specialistVisit"
  | "therapySession"
  | "urgentCareVisit"
  | "erVisit"
  | "labOrImaging"
  | "genericRxMonth"
  | "brandRxMonth"
  | "specialtyRxMonth"
  | "baby"
  | "surgery"
  | "hospitalization";

export type Prices = Record<PriceKey, number>;

export interface Household {
  members: Member[];
  /** Illustrative allowed amounts used for pricing care; editable by the user. */
  prices: Prices;
  /** How much the household could pay for a surprise medical bill today. */
  emergencyFund: number;
  /** Include tax savings from HSA contributions. Off by default: it depends on personal tax situation. */
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
  /** HSA contribution that would cover expected bills after employer money. null for plans without an HSA. */
  suggestedHsa: number | null;
}

export interface Recommendation {
  coverage: CoverageTier;
  results: PlanResult[];
  /** Plans left out because a required number is missing. */
  incomplete: { plan: Plan; missing: string[] }[];
  lowest: PlanResult;
  /** Set when the lowest-cost plan's out-of-pocket maximum exceeds the reserve the user entered. */
  riskWarning: string | null;
  /** Plans whose expected cost is within $1 of the lowest (a tie, not a unique winner). */
  tiedWithLowest: string[];
}
