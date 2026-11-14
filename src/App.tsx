import { useEffect, useMemo, useState } from "react";
import { Landing } from "./components/Landing";
import { PlanEditor } from "./components/PlanEditor";
import { Pricing } from "./components/Pricing";
import { Results } from "./components/Results";
import { Survey } from "./components/Survey";
import { DEMO_COMPANY, DEMO_PLANS } from "./data/demo";
import { recommend } from "./lib/calc";
import { householdFor } from "./lib/lifeEvents";
import { normalizePlan } from "./lib/normalize";
import { decodeState, shareUrl } from "./lib/share";
import type { Household, LifeEvent, Plan } from "./lib/types";

type Step = "landing" | "plans" | "survey" | "results";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [step, setStep] = useState<Step>("landing");
  const [lifeEvent, setLifeEvent] = useState<LifeEvent>("openEnrollment");
  const [company, setCompany] = useState(DEMO_COMPANY);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [notes, setNotes] = useState("");
  const [household, setHousehold] = useState<Household>(householdFor("openEnrollment"));
  const [showPricing, setShowPricing] = useState(false);

  // Open a shared result straight from the link.
  useEffect(() => {
    const shared = decodeState(window.location.hash);
    if (shared) {
      setCompany(shared.company);
      setPlans(shared.plans);
      setHousehold(shared.household);
      setStep("results");
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const rec = useMemo(
    () => (step === "results" && plans.length ? recommend(plans, household) : null),
    [step, plans, household],
  );

  function chooseLifeEvent(e: LifeEvent) {
    setLifeEvent(e);
    setHousehold(householdFor(e));
  }

  function startDemo() {
    setCompany(DEMO_COMPANY);
    setPlans(DEMO_PLANS);
    setNotes("");
    setStep("plans");
  }

  function startManual() {
    setCompany("My employer");
    setPlans([]);
    setNotes("Add each medical plan from your benefits guide.");
    setStep("plans");
  }

  async function upload(file: File) {
    const data = await fileToBase64(file);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: file.type, data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Could not read this document.");
    setCompany(file.name.replace(/\.[^.]+$/, ""));
    setPlans((body.plans as unknown[]).map(normalizePlan));
    setNotes(body.notes || "");
    setStep("plans");
  }

  function restart() {
    history.replaceState(null, "", window.location.pathname);
    setStep("landing");
  }

  return (
    <div className="app">
      <header className="top">
        <button className="logo" onClick={restart}>
          <span className="logo-mark">$</span> PlanMath
        </button>
        <button className="link" onClick={() => setShowPricing(true)}>
          Pricing
        </button>
      </header>

      <main>
        {step === "landing" && (
          <Landing
            lifeEvent={lifeEvent}
            onLifeEvent={chooseLifeEvent}
            onDemo={startDemo}
            onManual={startManual}
            onUpload={upload}
          />
        )}
        {step === "plans" && (
          <PlanEditor
            company={company}
            plans={plans}
            notes={notes}
            onChange={setPlans}
            onBack={() => setStep("landing")}
            onNext={() => setStep("survey")}
          />
        )}
        {step === "survey" && (
          <Survey
            household={household}
            onChange={setHousehold}
            onBack={() => setStep("plans")}
            onNext={() => setStep("results")}
          />
        )}
        {step === "results" && rec && (
          <Results
            rec={rec}
            shareLink={shareUrl({ company, plans, household })}
            onEdit={() => setStep("survey")}
            onRestart={restart}
            onUpgrade={() => setShowPricing(true)}
          />
        )}
      </main>

      <footer className="foot">
        PlanMath is an educational calculator, not insurance, medical, tax or financial advice. Costs
        are estimates based on typical prices; confirm plan details with your HR team. We don't sell
        insurance and don't store your documents.
      </footer>

      {showPricing && <Pricing onClose={() => setShowPricing(false)} />}
    </div>
  );
}
