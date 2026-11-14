import { Baby, Briefcase, CalendarCheck, Calculator, FileSearch, Lock, PartyPopper, PencilLine, ShieldCheck, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { LIFE_EVENTS } from "../lib/lifeEvents";
import type { LifeEvent } from "../lib/types";
import { HeroIllustration } from "./Illustrations";

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

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">
            <ShieldCheck size={16} /> Independent · no sign-up · we never sell insurance
          </p>
          <h1>
            Compare your employer health plans <span className="accent">in dollars.</span>
          </h1>
          <p className="lead">
            A low premium doesn't mean a low yearly cost. PlanMath turns your benefits guide into one
            clear table and shows what each plan would cost your household in a light, expected and
            bad year.
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
              Try the demo
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
                <button className="btn btn-small" onClick={() => input.current?.click()}>
                  Try again
                </button>
                <button className="btn btn-small btn-ghost" onClick={onManual}>
                  Enter plans by hand
                </button>
              </div>
            </div>
          )}
          <p className="fineprint">
            <Lock size={12} /> PDFs are read in your browser; only the text is sent to our AI to find the
            numbers. Please remove names and member IDs before uploading.
          </p>
        </div>
        <HeroIllustration />
      </section>

      <section className="how">
        <h2>How it works</h2>
        <div className="how-grid">
          <div className="how-card">
            <span className="how-icon"><FileSearch size={22} /></span>
            <h3>1. We read your plans</h3>
            <p>Upload your benefits guide or rate sheet. AI pulls out premiums, deductibles, copays and HSA money — you check every number.</p>
          </div>
          <div className="how-card">
            <span className="how-icon"><PencilLine size={22} /></span>
            <h3>2. You describe your year</h3>
            <p>Who's covered, how often you see doctors, medications and anything planned — like a baby or surgery. No diagnoses needed.</p>
          </div>
          <div className="how-card">
            <span className="how-icon"><Calculator size={22} /></span>
            <h3>3. Code does the math</h3>
            <p>Transparent, tested formulas compare every plan in three scenarios. AI never invents the totals.</p>
          </div>
        </div>
      </section>

      <section className="stats">
        <div>
          <strong>61%</strong>
          <span>of employees in a large-employer study picked a plan that cost more than another option no matter how much care they used</span>
        </div>
        <div>
          <strong>$7,471</strong>
          <span>average yearly family premium paid by workers in 2026, before deductibles and copays</span>
        </div>
        <div>
          <strong>$1,955</strong>
          <span>average single-coverage general deductible in 2026</span>
        </div>
      </section>
      <p className="fineprint center">
        Sources: Bhargava, Loewenstein & Sydnor (study of one large US employer); KFF 2026 Employer Health Benefits Survey.
      </p>
    </>
  );
}
