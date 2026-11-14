import type { Household, LifeEvent } from "./types";

export const LIFE_EVENTS: { key: LifeEvent; label: string; tip: string }[] = [
  {
    key: "openEnrollment",
    label: "Open enrollment",
    tip: "Open enrollment is your once-a-year chance to switch plans. Staying in last year's plan by default is one of the most expensive habits in benefits.",
  },
  {
    key: "newJob",
    label: "Starting a new job",
    tip: "New hires usually have about 30 days to enroll. If you miss it, you may wait until next open enrollment.",
  },
  {
    key: "turning26",
    label: "Turning 26",
    tip: "At 26 you age off a parent's plan. Losing that coverage typically opens a special enrollment window (often 30 days for employer plans) — don't let it pass.",
  },
  {
    key: "baby",
    label: "Having a baby",
    tip: "A birth usually lets you change plans mid-year (often within 30 days). Planned big expenses can flip which plan is cheapest.",
  },
];

export const DEFAULT_HOUSEHOLD: Household = {
  coverage: "employee",
  primaryVisits: 3,
  specialistVisits: 1,
  monthlyPrescriptions: 0,
  bigEvent: "none",
  emergencyFund: 3000,
  taxRate: 0.3,
};

/** Sensible starting answers for each life event; the user can change all of them. */
export function householdFor(event: LifeEvent): Household {
  switch (event) {
    case "turning26":
      return { ...DEFAULT_HOUSEHOLD, coverage: "employee", primaryVisits: 2, specialistVisits: 0, emergencyFund: 1500 };
    case "baby":
      return { ...DEFAULT_HOUSEHOLD, coverage: "family", primaryVisits: 8, specialistVisits: 4, bigEvent: "baby" };
    default:
      return { ...DEFAULT_HOUSEHOLD };
  }
}
