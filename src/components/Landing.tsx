import {
  ArrowRight,
  Baby,
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  Check,
  Lock,
  PartyPopper,
  PencilLine,
  ShieldCheck,
  Upload,
  X as XIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { LIFE_EVENTS } from "../lib/lifeEvents";
import type { LifeEvent } from "../lib/types";
import { HeroScene, LifeScene, Photo, StepScene } from "./Scenes";

interface Props {
  lifeEvent: LifeEvent;
  onLifeEvent: (e: LifeEvent) => void;
  onDemo: () => void;
  onManual: () => void;
  onUpload: (file: File) => Promise<void>;
}

const EVENT_ICONS: Record<LifeEvent, JSX.Element> = {
  openEnrollment: <CalendarCheck size={16} />,
  newJob: <Briefcase size={16} />,
  turning26: <PartyPopper size={16} />,
  baby: <Baby size={16} />,
};

const WHO: { key: LifeEvent; title: string; text: string; photo: string; alt: string }[] = [
  {
    key: "openEnrollment",
    title: "Open enrollment",
    text: "Your yearly chance to switch. Check whether last year's plan is still the right deal before it renews by default.",
    photo: "open-enrollment.jpg",
    alt: "Person reviewing benefits paperwork at a desk",
  },
  {
    key: "newJob",
    title: "Starting a new job",
    text: "A new benefits packet and a short deadline. Compare every option in minutes instead of guessing on day one.",
    photo: "new-job.jpg",
    alt: "New employee on their first day at the office",
  },
  {
    key: "turning26",
    title: "Turning 26",
    text: "Aging off a parent's plan means choosing your own for the first time. We explain each number in plain English.",
    photo: "turning-26.jpg",
    alt: "Young adult planning finances on a laptop",
  },
  {
    key: "baby",
    title: "Having a baby",
    text: "A birth can flip which plan is cheapest. See the deductible, out-of-pocket max and real yearly cost side by side.",
    photo: "baby.jpg",
    alt: "Parents holding their newborn baby",
  },
];

const STEPS = [
  { title: "Add your plans", text: "Upload your employer's plan comparison (PDF or screenshot) or type the numbers in. AI reads premiums, deductibles, copays and HSA money — you check every value." },
  { title: "Describe your household", text: "Who's covered, how often you see doctors, regular medicines and anything planned, like a baby or surgery. Kinds of care only — never diagnoses." },
  { title: "Code does the math", text: "Transparent, tested formulas price every visit for every person under every plan: copays, deductibles, coinsurance and out-of-pocket limits." },
  { title: "Compare and decide", text: "Net yearly cost in a light, expected and bad year, the point where another plan becomes cheaper, and a checklist for HR. Save it as a PDF." },
];

const WHY_ROWS: { label: string; values: [boolean, boolean, boolean, boolean] }[] = [
  { label: "Available to anyone, no employer contract", values: [true, true, false, true] },
  { label: "Uses the exact numbers of your plans", values: [true, true, true, false] },
  { label: "Math done by tested code, not guessed", values: [true, false, true, false] },
  { label: "Shows light, expected and bad-year costs", values: [true, false, true, false] },
  { label: "No insurer commissions behind the advice", values: [true, true, false, true] },
];

const FAQ = [
  {
    q: "Is a lower premium always the cheaper plan?",
    a: "No. A low-premium plan usually has a higher deductible. If you use a lot of care, you can pay more over the year. Medi Plan adds premiums and your share of medical bills to show the full yearly cost.",
  },
  {
    q: "Do you need my medical history?",
    a: "No. You tick kinds of care — like regular checkups, therapy or a planned birth — and adjust visit counts. Nothing is stored on a server; answers stay in your browser tab.",
  },
  {
    q: "Where do the prices come from?",
    a: "Your plan's numbers come from your own documents. The cost of each visit or medicine is an illustrative allowed amount you can see and edit on the results page.",
  },
  {
    q: "Do you sell insurance?",
    a: "No. We don't take commissions from insurers, so the comparison is only about your money.",
  },
  {
    q: "Is this financial advice?",
    a: "No. It's an educational calculator. Confirm doctor networks, drug lists and plan rules with your HR team or insurer before enrolling.",
  },
];

export function Landing({ lifeEvent, onLifeEvent, onDemo, onManual, onUpload }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tip = LIFE_EVENTS.find((e) => e.key === lifeEvent)?.tip;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const pick = (e: LifeEvent) => {
    onLifeEvent(e);
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* HERO */}
      <section className="hero" id="start">
        <div className="hero-text">
          <p className="eyebrow">
            <ShieldCheck size={16} /> Independent · no sign-up · we never sell insurance
          </p>
          <h1>
            Choose the health plan that costs you <span className="accent">less — in dollars.</span>
          </h1>
          <p className="lead">
            Employers hand you a PDF of premiums, deductibles and copays and a short deadline. Medi Plan turns it into one
            clear answer: what each plan would really cost your household this year.
          </p>

          <p className="label">What's happening for you?</p>
          <div className="chips" role="radiogroup" aria-label="What's happening for you?">
            {LIFE_EVENTS.map((e) => (
              <button
                key={e.key}
                role="radio"
                aria-checked={lifeEvent === e.key}
                className={`chip ${lifeEvent === e.key ? "chip-on" : ""}`}
                onClick={() => onLifeEvent(e.key)}
              >
                {EVENT_ICONS[e.key]} {e.label}
              </button>
            ))}
          </div>
          {tip && <p className="tip">{tip}</p>}

          <div className="cta-row">
            <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => input.current?.click()}>
              <Upload size={18} /> {busy ? "Reading your document…" : "Upload benefits guide"}
            </button>
            <button className="btn btn-ghost btn-lg" disabled={busy} onClick={onDemo}>
              Try the demo <ArrowRight size={16} />
            </button>
          </div>
          <button className="link small" onClick={onManual} disabled={busy}>
            <PencilLine size={14} /> or type in your plans by hand
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {busy && (
            <div className="loading" role="status">
              <span className="spinner" /> Reading the plans from your document — usually 10–30 seconds…
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              <strong>We couldn't read that document.</strong> {error}
              <div className="row-tight">
                <button className="btn btn-small" onClick={() => input.current?.click()}>Try again</button>
                <button className="btn btn-small btn-ghost" onClick={onManual}>Enter plans by hand</button>
              </div>
            </div>
          )}
          <div className="trust">
            <span><BadgeCheck size={16} /> No account needed</span>
            <span><Lock size={16} /> PDFs read in your browser</span>
            <span><ShieldCheck size={16} /> No insurer commissions</span>
          </div>
        </div>
        <div className="hero-art-wrap">
          <HeroScene />
        </div>
      </section>

      {/* PROBLEM */}
      <section className="band" id="problem">
        <div className="section-head">
          <p className="kicker">The problem</p>
          <h2>A low premium doesn't mean a low yearly cost</h2>
          <p className="muted">
            Every plan trades a paycheck deduction for a different deductible, copays and out-of-pocket limit. The right
            choice depends on how much care your family uses — and most people pick by gut feeling.
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>61%</strong>
            <span>of employees in a large-employer study picked a plan that cost more than another option no matter how much care they used</span>
          </div>
          <div>
            <strong>$7,471</strong>
            <span>average yearly family premium paid by workers in 2026 — before deductibles and copays</span>
          </div>
          <div>
            <strong>$1,955</strong>
            <span>average single-coverage general deductible in 2026</span>
          </div>
        </div>
        <p className="fineprint center">Sources: Bhargava, Loewenstein & Sydnor (study of one large US employer); KFF 2026 Employer Health Benefits Survey.</p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="section-head">
          <p className="kicker">How it works</p>
          <h2>From benefits PDF to a clear answer in about 3 minutes</h2>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step-card">
              <StepScene step={(i + 1) as 1 | 2 | 3 | 4} />
              <span className="step-no">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="center">
          <button className="btn btn-primary btn-lg" onClick={onDemo}>See it on a sample company <ArrowRight size={16} /></button>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="band" id="who">
        <div className="section-head">
          <p className="kicker">Who it's for</p>
          <h2>Built for the moments you have to choose</h2>
          <p className="muted">US workers aged 25–40 with health insurance through an employer.</p>
        </div>
        <div className="who-grid">
          {WHO.map((w) => (
            <button key={w.key} className="who-card" onClick={() => pick(w.key)}>
              <div className="who-media">
                <Photo name={w.photo} alt={w.alt} fallback={<LifeScene kind={w.key} />} />
              </div>
              <div className="who-body">
                <h3>{EVENT_ICONS[w.key]} {w.title}</h3>
                <p>{w.text}</p>
                <span className="link small">Start with this <ArrowRight size={14} /></span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section id="why">
        <div className="section-head">
          <p className="kicker">Why Medi Plan</p>
          <h2>The independent calculator employers don't give you</h2>
        </div>
        <div className="table-wrap why">
          <table>
            <thead>
              <tr>
                <th />
                <th className="why-us">Medi Plan</th>
                <th>Chatbot</th>
                <th>Employer tool</th>
                <th>Guessing</th>
              </tr>
            </thead>
            <tbody>
              {WHY_ROWS.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className={i === 0 ? "why-us" : ""}>
                      {v ? <Check size={18} className="yes" /> : <XIcon size={18} className="no" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fineprint center">Employer decision-support tools exist, but only if your employer buys them. Chatbots can explain terms but are unreliable at multi-scenario arithmetic.</p>
      </section>

      {/* FAQ */}
      <section className="band" id="faq">
        <div className="section-head">
          <p className="kicker">FAQ</p>
          <h2>Good questions</h2>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Open enrollment is happening now.</h2>
        <p>Find out what each plan really costs before you click "enroll".</p>
        <div className="cta-row center">
          <button className="btn btn-white btn-lg" onClick={() => input.current?.click()}><Upload size={18} /> Upload benefits guide</button>
          <button className="btn btn-outline-white btn-lg" onClick={onDemo}>Try the demo</button>
        </div>
      </section>
    </>
  );
}
