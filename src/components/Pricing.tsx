import { Check, X } from "lucide-react";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined;

export function Pricing({ onClose }: Props) {
  const [demo, setDemo] = useState(false);
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Pricing" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Close" onClick={onClose}><X size={22} /></button>
        <h2>Simple pricing. We never sell insurance.</h2>
        <p className="muted">
          No commissions from insurers — our price doesn't depend on which plan you pick. During the beta every feature is free.
        </p>
        <div className="tiers">
          <div className="tier">
            <h3>Free</h3>
            <p className="price">$0</p>
            <ul>
              {["Unlimited plans, typed in by hand", "Household with care profiles", "Light / expected / bad year", "What-if chart", "Save as PDF"].map((f) => (
                <li key={f}><Check size={15} /> {f}</li>
              ))}
            </ul>
          </div>
          <div className="tier tier-on">
            <span className="ribbon">Planned</span>
            <h3>Decision Pack</h3>
            <p className="price">$19 <small>one-time · one coverage decision · 90 days</small></p>
            <ul>
              {[
                "AI import of up to 3 documents with page sources",
                "Your plans vs. your spouse's employer plans",
                "Detailed printable report for you and HR",
                "Re-check if your situation changes within 90 days",
                "Full refund if your document or plan isn't supported",
              ].map((f) => (
                <li key={f}><Check size={15} /> {f}</li>
              ))}
            </ul>
            {PAYMENT_LINK ? (
              <a className="btn btn-primary" href={PAYMENT_LINK} target="_blank" rel="noreferrer">Get Decision Pack (test checkout)</a>
            ) : (
              <button className="btn btn-primary" onClick={() => setDemo(true)}>Get Decision Pack</button>
            )}
            {demo && <p className="tip small">Thanks! Payments are off in this hackathon beta — everything is free and no card was charged.</p>}
          </div>
        </div>
        <p className="fineprint">
          No subscription: choosing a health plan is a once-a-year decision, so you pay once for it.
        </p>
      </div>
    </div>
  );
}
