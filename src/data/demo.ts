import type { Plan } from "../lib/types";

/** Fictional employer used for the demo. Numbers are typical of US employer plans, not a real company. */
export const DEMO_COMPANY = "Acme Corp (sample data)";

export const DEMO_PLANS: Plan[] = [
  {
    id: "acme-ppo",
    name: "Gold PPO",
    type: "PPO",
    premiums: { employee: 190, employeeSpouse: 400, employeeChildren: 350, family: 520 },
    deductible: { individual: 500, family: 1000 },
    outOfPocketMax: { individual: 3000, family: 6000 },
    embeddedDeductible: true,
    coinsurance: 0.2,
    copays: { primary: 25, specialist: 50, urgentCare: 50, er: 250, genericRx: 10, brandRx: 40, specialtyRx: 150 },
    hsaEligible: false,
    employerHsa: { individual: 0, family: 0 },
  },
  {
    id: "acme-hmo",
    name: "Silver HMO",
    type: "HMO",
    premiums: { employee: 130, employeeSpouse: 305, employeeChildren: 260, family: 465 },
    deductible: { individual: 1500, family: 3000 },
    outOfPocketMax: { individual: 5000, family: 10000 },
    embeddedDeductible: true,
    coinsurance: 0.2,
    copays: { primary: 30, specialist: 60, urgentCare: 60, er: 350, genericRx: 15, brandRx: 50, specialtyRx: 250 },
    hsaEligible: false,
    employerHsa: { individual: 0, family: 0 },
  },
  {
    id: "acme-hdhp",
    name: "Bronze HDHP + HSA",
    type: "HDHP",
    premiums: { employee: 70, employeeSpouse: 190, employeeChildren: 170, family: 330 },
    deductible: { individual: 3500, family: 7000 },
    outOfPocketMax: { individual: 7000, family: 14000 },
    embeddedDeductible: false,
    coinsurance: 0.2,
    copays: { primary: null, specialist: null, urgentCare: null, er: null, genericRx: null, brandRx: null, specialtyRx: null },
    hsaEligible: true,
    employerHsa: { individual: 500, family: 1000 },
  },
];
