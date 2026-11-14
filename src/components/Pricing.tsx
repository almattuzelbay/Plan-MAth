import { useState } from "react";

interface Props {
  onClose: () => void;
}

const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: ["Best-plan recommendation", "3-scenario cost breakdown", "HSA/FSA amount", "Shareable result link"],
    cta: null,
  },
  {
    name: "Year Pass",
    price: "$29",
    period: "/ year per household",
    features: [
      "Compare your plan vs. your spouse's employer",
      "Deductible & FSA tracker all year",
      "Reminders before FSA, HSA and open-enrollment deadlines",
      "Free re-check after a new job, marriage or baby",
    ],
    cta: "Get Year Pass",
    highlight: true,
  },
  {
    name: "Life Event",
    price: "$12",
    period: "one-time",
    features: ["One full re-check for a new job, turning 26, marriage or a baby", "Spouse-plan comparison included"],
    cta: "Buy one check",
  },
];

export function Pricing({ onClose }: Props) {
  const [demoChoice, setDemoChoice] = useState<string | null>(null);
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Pricing" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2>Simple pricing. We never sell insurance.</h2>
        <p className="muted">
          No commissions from insurers means our recommendation is only about your money.
        </p>
        <div className="tiers">
          {TIERS.map((t) => (
            <div key={t.name} className={`tier ${t.highlight ? "tier-on" : ""}`}>
              <h3>{t.name}</h3>
              <p className="price">
                {t.price} <small>{t.period}</small>
              </p>
              <ul>
                {t.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {t.cta &&
                (PAYMENT_LINK ? (
                  <a className="btn btn-primary" href={PAYMENT_LINK} target="_blank" rel="noreferrer">
                    {t.cta}
                  </a>
                ) : (
                  <button className="btn btn-primary" onClick={() => setDemoChoice(t.name)}>
                    {t.cta}
                  </button>
                ))}
            </div>
          ))}
        </div>
        {demoChoice && (
          <p className="tip">
            ✅ Demo checkout: you chose <b>{demoChoice}</b>. Real payments are switched off in this
            hackathon build — no card was charged.
          </p>
        )}
        <p className="fineprint">
          Demo checkout runs in Stripe test mode — use card 4242 4242 4242 4242, any future date, any CVC.
        </p>
      </div>
    </div>
  );
}
