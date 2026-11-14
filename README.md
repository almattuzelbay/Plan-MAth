# PlanMath 💲

**Pick the employer health plan that actually costs you less.**
Upload your benefits guide → answer 6 questions → see which plan saves you the most money, in dollars.

Built in 24 hours for Business Cup 2.0 "From Zero to Product" (Zimran). Track: **Money**. Audience: US adults 25–40. B2C, web only, no sign-up.

## The problem

Every year American workers choose a health plan from a confusing PDF of premiums, deductibles and out-of-pocket maximums. Most get it wrong:

- 61% of employees in a large-employer study picked a plan that wasn't the best deal (Carnegie Mellon, via Money.com).
- Employees who skip the cheaper plan overpay by ~$1,700 a year on average (TIAA Institute).
- FSA holders forfeited ≈ $4.5B in 2023 to "use it or lose it" (Money.com).

Decision-support tools exist (Nayya, ALEX, Healthee), but they are sold to employers. If your company didn't buy one, you are on your own — and chatbots are unreliable at multi-scenario arithmetic.

## How it works

1. **Read** — the browser extracts the PDF text locally (pdf.js); only text is sent to a serverless function that asks Google Gemini to return each medical plan as structured JSON with short source quotes (`api/extract.js`). Scans/images fall back to sending the image. Missing numbers stay empty — never silently $0. The user reviews every number.
2. **Describe the household** — each person (you, spouse, children) with care profiles instead of diagnoses (ongoing condition, therapy, pregnancy, specialty medication, planned surgery, young child) plus visits, urgent care, ER, labs and monthly medications.
3. **Calculate** — a deterministic engine (`src/lib/calc.ts`) prices every service for every person under every plan:
   - copays where the plan has them, otherwise deductible → coinsurance;
   - embedded vs. aggregate family deductibles;
   - out-of-pocket max capped per person and per family;
   - three scenarios: light, expected, bad year (+ an unplanned hospital stay).

```
net yearly cost = premiums + medical bills − employer HSA money (− tax savings, optional)
simple what-if model:  O(S) = min(M, min(S, D) + c × max(S − D, 0))
```

AI only reads the document. **All math is plain TypeScript with unit tests** (`src/lib/calc.test.ts`, including the hand-checked worked example from our methodology), so results are reproducible.

4. **Compare** — lowest estimated cost, difference vs. your current plan, a what-if chart where you can see the lines cross, HSA/FSA amount, a pre-enrollment checklist, and an explicit "Assumptions & limits" section. Results can be saved as PDF via print.

## Business model

| Tier | Price | What you get |
|---|---|---|
| Free | $0 | Manual entry, household & care profiles, 3 scenarios, what-if chart, PDF export |
| Decision Pack (planned) | $19 one-time, one coverage decision, 90 days | AI import of several documents with sources, spouse-employer comparison, detailed report; refund if the document isn't supported |

During the hackathon beta everything is free and checkout is a demo. We never take insurer commissions. One payment per decision instead of a subscription, because choosing a plan is a once-a-year job.

## Privacy

- No accounts, no database. Answers live in the browser tab (sessionStorage) and are never put in URLs.
- PDFs are read locally; only extracted text goes to the AI, and it is not logged or stored by the app.
- We ask about kinds of care, not diagnoses.

## Tech stack (all free tiers)

- React 18 + TypeScript + Vite (frontend)
- Vercel (hosting + one serverless function)
- Google Gemini API free tier (document extraction)
- Stripe Payment Links in test mode (checkout demo)
- No database: answers stay in the browser tab; documents are never stored.

## Project structure

```
api/extract.js            Serverless function: document → plans JSON (Gemini)
src/lib/calc.ts           Cost engine (scenarios, deductible, coinsurance, OOP max, HSA/FSA)
src/lib/calc.test.ts      Unit tests for the engine
src/lib/assumptions.ts    Price assumptions and 2026 IRS limits in one place
src/lib/normalize.ts      Validates AI output into safe Plan objects
src/lib/importDoc.ts      Local PDF text extraction + call to the extraction API
src/data/demo.ts          Fictional "Acme Corp" sample plans
src/components/           Landing, PlanEditor, HouseholdForm, Results, WhatIfChart, Pricing, Illustrations
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 (the sample company works without any keys)
npm test           # engine unit tests
```

To test document upload locally, install the Vercel CLI and run `vercel dev` with `GEMINI_API_KEY` in `.env`.

## Deploy

1. Import the repo in Vercel (framework: Vite).
2. Add environment variables: `GEMINI_API_KEY` (free from aistudio.google.com) and `VITE_STRIPE_PAYMENT_LINK` (Stripe test-mode Payment Link).
3. Deploy.

## Limitations (honest)

- Cost of care uses national ballpark prices (`assumptions.ts`), not your local prices.
- Doctor networks and drug formularies are not checked yet — the app tells users to confirm with HR.
- Separate drug deductibles, out-of-network care, tiered networks and mid-year enrollment are not modeled yet.

PlanMath is an educational calculator, not insurance, medical, tax or financial advice.
