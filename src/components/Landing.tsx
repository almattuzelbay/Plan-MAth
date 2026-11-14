import { useRef, useState } from "react";
import { LIFE_EVENTS } from "../lib/lifeEvents";
import type { LifeEvent } from "../lib/types";

interface Props {
  lifeEvent: LifeEvent;
  onLifeEvent: (e: LifeEvent) => void;
  onDemo: () => void;
  onManual: () => void;
  onUpload: (file: File) => Promise<void>;
}

const MAX_BYTES = 4 * 1024 * 1024;

export function Landing({ lifeEvent, onLifeEvent, onDemo, onManual, onUpload }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tip = LIFE_EVENTS.find((e) => e.key === lifeEvent)?.tip;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That file is over 4 MB. Try a screenshot of just the plan comparison table.");
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try the sample company.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hero">
      <p className="eyebrow">Independent · no sign-up · we don't sell insurance</p>
      <h1>
        Pick the health plan that <span className="accent">actually costs you less.</span>
      </h1>
      <p className="lead">
        Most employees pick their health plan by gut feeling and overpay hundreds to thousands of
        dollars a year. Upload your employer's benefits guide — we do the math for your family in
        3 minutes.
      </p>

      <div className="chips" role="radiogroup" aria-label="What's happening for you?">
        {LIFE_EVENTS.map((e) => (
          <button
            key={e.key}
            role="radio"
            aria-checked={lifeEvent === e.key}
            className={`chip ${lifeEvent === e.key ? "chip-on" : ""}`}
            onClick={() => onLifeEvent(e.key)}
          >
            {e.label}
          </button>
        ))}
      </div>
      {tip && <p className="tip">💡 {tip}</p>}

      <div className="cta-row">
        <button className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Reading your document…" : "Upload benefits guide (PDF or screenshot)"}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={onDemo}>
          Try with a sample company
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p className="error">
          {error}{" "}
          <button className="link" onClick={onManual}>
            Enter plans manually
          </button>
        </p>
      )}

      <div className="stats">
        <div>
          <strong>61%</strong>
          <span>of employees chose a plan that wasn't the best deal for them</span>
        </div>
        <div>
          <strong>~$1,700</strong>
          <span>average yearly overpayment for picking the wrong plan</span>
        </div>
        <div>
          <strong>$4.5B</strong>
          <span>lost by FSA holders to "use it or lose it" in 2023</span>
        </div>
      </div>
      <p className="fineprint">
        Sources: Carnegie Mellon study via Money.com; TIAA Institute; Money.com FSA analysis.
      </p>
    </section>
  );
}
