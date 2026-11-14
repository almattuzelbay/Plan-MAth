import { SERVICE_COST } from "./assumptions";
import type { Household, LifeEvent, Member } from "./types";

export const LIFE_EVENTS: { key: LifeEvent; label: string; tip: string }[] = [
  {
    key: "openEnrollment",
    label: "Open enrollment",
    tip: "Open enrollment is your once-a-year chance to switch plans. Staying in last year's plan by default can quietly cost you money.",
  },
  {
    key: "newJob",
    label: "Starting a new job",
    tip: "New hires usually have a short window (often about 30 days) to enroll. Check the exact deadline with HR.",
  },
  {
    key: "turning26",
    label: "Turning 26",
    tip: "At 26 you age off a parent's plan. Losing that coverage usually opens a special enrollment window — check the deadline with HR.",
  },
  {
    key: "baby",
    label: "Having a baby",
    tip: "A planned birth can flip which plan is cheapest. A birth also usually lets you change plans mid-year — check the deadline with HR.",
  },
];

let counter = 0;
export function newMember(role: Member["role"]): Member {
  counter += 1;
  const child = role === "child";
  return {
    id: `m-${Date.now()}-${counter}`,
    role,
    profiles: [],
    primaryVisits: child ? 2 : 1,
    specialistVisits: 0,
    therapySessions: 0,
    urgentCareVisits: 0,
    erVisits: 0,
    labsImaging: child ? 0 : 1,
    genericRx: 0,
    brandRx: 0,
  };
}

export function householdFor(event: LifeEvent): Household {
  const base: Household = {
    members: [newMember("you")],
    prices: { ...SERVICE_COST },
    emergencyFund: 3000,
    includeTaxes: false,
    taxRate: 0.3,
    currentPlanId: null,
  };
  if (event === "turning26") return { ...base, emergencyFund: 1500 };
  if (event === "baby") {
    const you = newMember("you");
    const spouse = { ...newMember("spouse"), profiles: ["pregnancy" as const] };
    return { ...base, members: [you, spouse], emergencyFund: 4000 };
  }
  return base;
}
