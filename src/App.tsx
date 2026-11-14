import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HouseholdForm } from "./components/HouseholdForm";
import { Landing } from "./components/Landing";
import { PlanEditor } from "./components/PlanEditor";
import { Pricing } from "./components/Pricing";
import { Results } from "./components/Results";
import { DEMO_COMPANY, DEMO_PLANS } from "./data/demo";
import { recommend } from "./lib/calc";
import { importDocument } from "./lib/importDoc";
import { householdFor } from "./lib/lifeEvents";
import type { Household, LifeEvent, Plan } from "./lib/types";

type Step = "landing" | "plans" | "household" | "results";

interface Session {
  step: Step;
  lifeEvent: LifeEvent;
  company: string;
  plans: Plan[];
  notes: string;
  household: Household;
}

const STORAGE_KEY = "planmath-session";
const STEPS: { key: Step; label: string }[] = [
  { key: "plans", label: "Plans" },
  { key: "household", label: "Household" },
  { key: "results", label: "Comparison" },
];

/** Answers live only in this browser tab (sessionStorage) — nothing personal goes to a server or a URL. */
function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const fresh = (): Session => ({
  step: "landing",
  lifeEvent: "openEnrollment",
  company: DEMO_COMPANY,
  plans: [],
  notes: "",
  household: householdFor("openEnrollment"),
});

export default function App() {
  const [s, setS] = useState<Session>(() => loadSession() ?? fresh());
  const [showPricing, setShowPricing] = useState(false);
  const patch = (p: Partial<Session>) => setS((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* storage can be unavailable (private mode); the app still works */
    }
  }, [s]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [s.step]);

  const rec = useMemo(
    () => (s.step === "results" ? recommend(s.plans, s.household) : null),
    [s.step, s.plans, s.household],
  );

  const stepIndex = STEPS.findIndex((x) => x.key === s.step);

  function restart() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setS(fresh());
  }

  return (
    <div className="app">
      <header className="top no-print">
        <button className="logo" onClick={restart} aria-label="PlanMath home">
          <span className="logo-mark">$</span> PlanMath
        </button>
        <nav className="top-links">
          <span className="beta">Beta</span>
          <button className="link" onClick={() => setShowPricing(true)}>Pricing</button>
        </nav>
      </header>

      {stepIndex >= 0 && (
        <ol className="progress no-print" aria-label="Progress">
          {STEPS.map((st, i) => (
            <li key={st.key} className={i < stepIndex ? "done" : i === stepIndex ? "current" : ""}>
              <button
                disabled={i > stepIndex}
                onClick={() => patch({ step: st.key })}
                aria-current={i === stepIndex ? "step" : undefined}
              >
                <span className="dot">{i < stepIndex ? <Check size={14} /> : i + 1}</span>
                {st.label}
              </button>
            </li>
          ))}
        </ol>
      )}

      <main>
        {s.step === "landing" && (
          <Landing
            lifeEvent={s.lifeEvent}
            onLifeEvent={(e) => patch({ lifeEvent: e, household: householdFor(e) })}
            onDemo={() => patch({ company: DEMO_COMPANY, plans: DEMO_PLANS, notes: "", step: "plans" })}
            onManual={() => patch({ company: "My employer", plans: [], notes: "", step: "plans" })}
            onUpload={async (file) => {
              const { plans, notes } = await importDocument(file);
              patch({ company: file.name.replace(/\.[^.]+$/, ""), plans, notes, step: "plans" });
            }}
          />
        )}
        {s.step === "plans" && (
          <PlanEditor
            company={s.company}
            plans={s.plans}
            notes={s.notes}
            onChange={(plans) => patch({ plans })}
            onBack={() => patch({ step: "landing" })}
            onNext={() => patch({ step: "household" })}
          />
        )}
        {s.step === "household" && (
          <HouseholdForm
            household={s.household}
            plans={s.plans}
            onChange={(household) => patch({ household })}
            onBack={() => patch({ step: "plans" })}
            onNext={() => patch({ step: "results" })}
          />
        )}
        {s.step === "results" && rec && (
          <Results
            rec={rec}
            household={s.household}
            onEdit={() => patch({ step: "household" })}
            onEditPlans={() => patch({ step: "plans" })}
            onRestart={restart}
            onUpgrade={() => setShowPricing(true)}
          />
        )}
        {s.step === "results" && !rec && (
          <section className="card center">
            <h2>We need a few more numbers</h2>
            <p className="muted">
              None of the plans has a premium for your coverage level, a deductible and an out-of-pocket max. Add them to compare.
            </p>
            <button className="btn btn-primary" onClick={() => patch({ step: "plans" })}>Back to plans</button>
          </section>
        )}
      </main>

      <footer className="foot">
        PlanMath is an educational calculator, not insurance, medical, tax or financial advice. Estimates depend on your
        inputs and typical prices; confirm plan details, networks and drug lists with your HR team or insurer. We don't sell
        insurance and don't store your documents or answers.
      </footer>

      {showPricing && <Pricing onClose={() => setShowPricing(false)} />}
    </div>
  );
}
