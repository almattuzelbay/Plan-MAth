// Vercel serverless function: reads an employer benefits document (PDF or image)
// with Google's Gemini API and returns the medical plans as structured JSON.
// The API key stays on the server (env var GEMINI_API_KEY) and is never sent to the browser.

const API = "https://generativelanguage.googleapis.com/v1beta";

// Preferred models, tried in order. If none exist for this key, we ask Google which models are available.
const PREFERRED_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
].filter(Boolean);

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_BASE64_LENGTH = 5_500_000; // ~4 MB file (Vercel request limit is 4.5 MB)

const PROMPT = `You read US employer health benefits documents (benefits guides, plan comparison charts, Summary of Benefits and Coverage).
Extract EVERY medical plan offered (ignore dental, vision, life insurance).
Return ONLY JSON in exactly this shape:
{
  "plans": [
    {
      "name": "plan name as written",
      "type": "PPO" | "HMO" | "EPO" | "HDHP" | "Other",
      "premiumPeriodsPerYear": 12,
      "premiums": { "employee": number, "employeeSpouse": number, "employeeChildren": number, "family": number },
      "deductible": { "individual": number, "family": number },
      "outOfPocketMax": { "individual": number, "family": number },
      "coinsurance": number between 0 and 1 (the member's share after deductible, in-network),
      "copays": { "primary": number | null, "specialist": number | null, "genericRx": number | null },
      "hsaEligible": boolean,
      "employerHsa": { "individual": number, "family": number }
    }
  ],
  "notes": "short note about anything unclear"
}
Rules:
- Use IN-NETWORK values only.
- premiums are the EMPLOYEE's contribution. Set premiumPeriodsPerYear to how often the document states them: 12 = monthly, 24 = semi-monthly, 26 = bi-weekly, 52 = weekly, 1 = annual. Prefer monthly figures when several are shown.
- If a service is "subject to deductible", or the plan is a high-deductible plan, use null for that copay.
- If coinsurance is not stated, use 0.2.
- Employer HSA contributions are sometimes called "seed dollars" or "HSA funding".
- Use 0 for numbers you cannot find. Do not invent plans.`;

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Parse JSON even if the model wrapped it in ```json fences. */
function parseJson(text) {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

async function callGemini(model, apiKey, mimeType, data) {
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GeminiError(body?.error?.message || `HTTP ${res.status}`, res.status);
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new GeminiError("Empty answer from the model", 502);
  try {
    return parseJson(text);
  } catch {
    throw new GeminiError("The model did not return valid JSON", 502);
  }
}

/** Ask Google which Flash models this key can use (names change over time). */
async function discoverModels(apiKey) {
  const res = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return (body.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name).replace(/^models\//, ""))
    .filter((name) => /flash/i.test(name) && !/image|tts|audio|live|thinking|embedding/i.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })); // newest versions first
}

// These mean the key itself is the problem, so trying other models won't help.
const isKeyProblem = (e) =>
  e.status === 401 || e.status === 403 || e.status === 429 || /api key/i.test(e.message);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });

  const { mimeType, data } = req.body || {};
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: "Upload a PDF, PNG, JPG or WEBP file" });
  }
  if (typeof data !== "string" || data.length === 0 || data.length > MAX_BASE64_LENGTH) {
    return res.status(400).json({ error: "File is empty or larger than 4 MB" });
  }

  const tried = new Set();
  let lastError;

  async function tryModels(models) {
    for (const model of models) {
      if (tried.has(model)) continue;
      tried.add(model);
      try {
        return { result: await callGemini(model, apiKey, mimeType, data), model };
      } catch (e) {
        lastError = e;
        console.error(`[extract] ${model} failed: ${e.status} ${e.message}`);
        if (isKeyProblem(e)) return null;
      }
    }
    return null;
  }

  let found = await tryModels(PREFERRED_MODELS);
  if (!found && lastError && !isKeyProblem(lastError)) {
    found = await tryModels((await discoverModels(apiKey)).slice(0, 4));
  }

  if (found) {
    const plans = Array.isArray(found.result?.plans) ? found.result.plans : [];
    if (plans.length === 0) {
      return res.status(422).json({ error: "No medical plans found in this document." });
    }
    return res.status(200).json({ plans, notes: found.result?.notes || "", model: found.model });
  }

  const status = lastError?.status === 429 ? 429 : 502;
  const reason = lastError?.message ? ` (${lastError.message.slice(0, 160)})` : "";
  return res.status(status).json({
    error:
      status === 429
        ? "The free AI quota is busy. Try again in a minute or use the sample company."
        : `Could not read this document${reason}.`,
  });
}
