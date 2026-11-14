// Vercel serverless function: reads an employer benefits document (PDF or image)
// with Google's Gemini API and returns the medical plans as structured JSON.
// The API key stays on the server (env var GEMINI_API_KEY) and is never sent to the browser.

const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean);

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
- premiums are the EMPLOYEE's contribution. Set premiumPeriodsPerYear to how often the document states them: 12 = monthly, 24 = semi-monthly, 26 = bi-weekly, 52 = weekly, 1 = annual.
- If a copay applies only after the deductible, or the plan is a high-deductible plan, use null for that copay.
- Use 0 for numbers you cannot find. Do not invent plans.`;

async function callGemini(model, apiKey, mimeType, data) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Gemini error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return JSON.parse(text);
}

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

  let lastError;
  for (const model of MODELS) {
    try {
      const result = await callGemini(model, apiKey, mimeType, data);
      const plans = Array.isArray(result?.plans) ? result.plans : [];
      if (plans.length === 0) {
        return res.status(422).json({ error: "No medical plans found in this document" });
      }
      return res.status(200).json({ plans, notes: result?.notes || "", model });
    } catch (e) {
      lastError = e;
      // Try the next model only when this one is unknown/unavailable.
      if (e.status !== 404 && e.status !== 400) break;
    }
  }
  const status = lastError?.status === 429 ? 429 : 502;
  return res.status(status).json({
    error:
      status === 429
        ? "The free AI quota is busy. Try again in a minute or use the sample company."
        : "Could not read this document. You can enter the plans manually.",
  });
}
