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

1. **Read** — a serverless function sends the uploaded PDF/image to Google Gemini, which returns each medical plan as structured JSON (`api/extract.js`). The user reviews and edits every number.
2. **Ask** — six questions: who's covered, doctor visits, specialist visits, prescriptions, planned big events (baby/surgery) and emergency savings.
3. **Calculate** — a deterministic engine (`src/lib/calc.ts`) computes the yearly cost of each plan in three scenarios:

```
total = premiums + out-of-pocket − employer HSA money − tax savings
out-of-pocket: copays, or deductible then coinsurance, capped at the out-of-pocket max
```

AI only reads the document. **All math is plain TypeScript with unit tests** (`src/lib/calc.test.ts`), so results are reproducible and never "hallucinated".

4. **Recommend** — best plan, savings vs. the worst option, a bad-year risk warning, and how much to put in the HSA/FSA (FSA is reduced to avoid forfeiting money).

## Business model

| Tier | Price | What you get |
|---|---|---|
| Free | $0 | Recommendation, 3-scenario breakdown, HSA/FSA amount, share link |
| Year Pass | $29/yr per household | Spouse-plan comparison, deductible & FSA tracker, deadline reminders, free life-event re-checks |
| Life Event | $12 one-time | Re-check after a new job, turning 26, marriage or a baby |

We never take insurer commissions — the recommendation is only about the user's money. Demand is seasonal (open enrollment), so revenue is smoothed by annual billing, FSA/HSA deadlines (Dec–Apr) and year-round life events.

## Tech stack (all free tiers)

- React 18 + TypeScript + Vite (frontend)
- Vercel (hosting + one serverless function)
- Google Gemini API free tier (document extraction)
- Stripe Payment Links in test mode (checkout demo)
- No database: results are encoded in the share link, documents are never stored.

## Project structure

```
api/extract.js            Serverless function: document → plans JSON (Gemini)
src/lib/calc.ts           Cost engine (scenarios, deductible, coinsurance, OOP max, HSA/FSA)
src/lib/calc.test.ts      Unit tests for the engine
src/lib/assumptions.ts    Price assumptions and 2026 IRS limits in one place
src/lib/normalize.ts      Validates AI output into safe Plan objects
src/lib/share.ts          Shareable result links without a database
src/data/demo.ts          Fictional "Acme Corp" sample plans
src/components/           Landing, PlanEditor, Survey, Results, Pricing
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
- Family deductibles are treated as aggregate (non-embedded).

PlanMath is an educational calculator, not insurance, medical, tax or financial advice.
