/**
 * Cost assumptions used by the engine.
 * These are national ballpark "allowed amounts" (what an insurer typically pays a provider),
 * kept in one place so they are easy to review and update. They are estimates, not quotes.
 */
export const SERVICE_COST = {
  primaryVisit: 180,
  specialistVisit: 320,
  /** Allowed cost of one month of one generic prescription. */
  genericRxMonth: 25,
  /** Pregnancy, delivery and newborn care, typical allowed amount. */
  baby: 15000,
  /** A planned outpatient/inpatient surgery. */
  surgery: 22000,
  /** "Bad year" shock: an unplanned hospitalization. */
  hospitalization: 45000,
} as const;

/** 2026 IRS limits. */
export const ACCOUNT_LIMITS = {
  hsa: { individual: 4400, family: 8750 },
  healthFsa: 3400,
} as const;

/** FSA money is "use it or lose it", so we suggest contributing a bit less than expected spend. */
export const FSA_SAFETY_FACTOR = 0.85;
