import type { CareProfile, PriceKey, Prices } from "./types";

/** Version label shown next to the prices so users know they are fixed app assumptions. */
export const PRICES_VERSION = "PlanMath illustrative prices, Nov 2026";

/**
 * Illustrative "allowed amounts" (what a plan recognizes for covered in-network care).
 * App constants, not market averages from a verified source and not a personal forecast.
 * Users can edit every value on the results screen.
 */
export const SERVICE_COST: Prices = {
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
};

export const PRICE_LABELS: Record<PriceKey, { label: string; unit: string }> = {
  primaryVisit: { label: "Doctor visit", unit: "per visit" },
  specialistVisit: { label: "Specialist visit", unit: "per visit" },
  therapySession: { label: "Therapy session", unit: "per session" },
  urgentCareVisit: { label: "Urgent care visit", unit: "per visit" },
  erVisit: { label: "Emergency room visit", unit: "per visit" },
  labOrImaging: { label: "Lab test, X-ray or scan", unit: "per test" },
  genericRxMonth: { label: "Generic medication", unit: "per 30-day fill" },
  brandRxMonth: { label: "Brand-name medication", unit: "per 30-day fill" },
  specialtyRxMonth: { label: "Specialty medication", unit: "per 30-day fill" },
  baby: { label: "Pregnancy, delivery & newborn care", unit: "per birth" },
  surgery: { label: "Planned surgery or procedure", unit: "per procedure" },
  hospitalization: { label: "Unplanned hospital stay (bad year only)", unit: "per stay" },
};

/** IRS HSA contribution limits for 2027 (employer money counts toward them). */
export const HSA_LIMITS = { individual: 4500, family: 9000 } as const;

/** Default number of therapy sessions when "Therapy or counseling" is ticked (editable). */
export const DEFAULT_THERAPY_SESSIONS = 24;

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
    hint: "sets therapy sessions to 24 a year (about twice a month) — you can change the number below",
    adds: {},
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
