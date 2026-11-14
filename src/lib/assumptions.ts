import type { CareProfile } from "./types";

/**
 * Typical "allowed amounts" (what an insurer pays an in-network provider), national ballpark.
 * Kept in one place so they are easy to review. Estimates, not quotes — real prices vary by plan and city.
 */
export const SERVICE_COST = {
  primaryVisit: 180,
  specialistVisit: 320,
  therapySession: 150,
  urgentCareVisit: 220,
  erVisit: 2400,
  labOrImaging: 250,
  /** One month of one prescription. */
  genericRxMonth: 25,
  brandRxMonth: 450,
  specialtyRxMonth: 5000,
  /** Pregnancy, delivery and newborn care. */
  baby: 15000,
  /** A planned outpatient/inpatient surgery. */
  surgery: 22000,
  /** "Bad year" shock for one adult: an unplanned hospital stay. */
  hospitalization: 45000,
} as const;

/** IRS limits for the 2027 plan year (HSA). FSA uses the 2026 limit until the 2027 figure is confirmed. */
export const ACCOUNT_LIMITS = {
  hsa: { individual: 4500, family: 9000 },
  healthFsa: 3400,
} as const;

/** FSA money is "use it or lose it", so we suggest contributing a bit less than expected spend. */
export const FSA_SAFETY_FACTOR = 0.85;

/** In a "light year" people use about half of the care they expect. */
export const LIGHT_YEAR_FACTOR = 0.5;

/** What each care profile adds to a person's year. Shown to users so the effect is transparent. */
export const PROFILE_EFFECTS: Record<
  CareProfile,
  {
    label: string;
    hint: string;
    adds: {
      primaryVisits?: number;
      specialistVisits?: number;
      therapySessions?: number;
      urgentCareVisits?: number;
      labsImaging?: number;
      brandRx?: number;
      specialtyRx?: number;
      event?: "baby" | "surgery";
    };
    adultsOnly?: boolean;
    childrenOnly?: boolean;
  }
> = {
  chronic: {
    label: "Ongoing condition",
    hint: "e.g. diabetes, asthma, high blood pressure — adds 4 checkups, 2 specialist visits, 2 lab tests and 1 brand-name drug",
    adds: { primaryVisits: 4, specialistVisits: 2, labsImaging: 2, brandRx: 1 },
  },
  therapy: {
    label: "Therapy or counseling",
    hint: "adds 24 sessions (about twice a month)",
    adds: { therapySessions: 24 },
  },
  pregnancy: {
    label: "Pregnancy / having a baby",
    hint: "adds prenatal visits, delivery and newborn care (~$15,000 allowed)",
    adds: { event: "baby", specialistVisits: 10, labsImaging: 4 },
    adultsOnly: true,
  },
  specialtyMeds: {
    label: "Specialty medication",
    hint: "e.g. injectables or biologics — adds 1 specialty drug every month",
    adds: { specialtyRx: 1 },
  },
  surgery: {
    label: "Planned surgery or procedure",
    hint: "adds a procedure (~$22,000 allowed) and follow-up visits",
    adds: { event: "surgery", specialistVisits: 3, labsImaging: 2 },
  },
  youngChild: {
    label: "Young child (often sick)",
    hint: "adds 4 sick visits and 1 urgent care visit",
    adds: { primaryVisits: 4, urgentCareVisits: 1 },
    childrenOnly: true,
  },
};
