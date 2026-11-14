import { normalizePlan } from "./normalize";
import type { Plan } from "./types";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_PAGES = 40;
const MAX_TEXT_CHARS = 60_000;
/** Below this, a PDF is probably a scan without a text layer. */
const MIN_TEXT_CHARS = 200;

export interface ImportResult {
  plans: Plan[];
  notes: string;
}

/**
 * Reads the PDF text in the browser (pdf.js) so only text — not the file — is sent for extraction.
 * This is faster, cheaper for the free AI tier and keeps the original document on the user's device.
 */
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Rebuild lines from text positions so table rows stay together.
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], s: item.str });
      rows.set(y, row);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map((r) => r.s).join("  |  "));
    pages.push(`--- Page ${i} ---\n${lines.join("\n")}`);
    if (pages.join("\n").length > MAX_TEXT_CHARS) break;
  }
  return pages.join("\n").slice(0, MAX_TEXT_CHARS);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

async function callApi(body: object): Promise<ImportResult> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Import failed (${res.status}).`);
  const plans = (data.plans as unknown[]).map(normalizePlan);
  return { plans, notes: data.notes || "" };
}

export async function importDocument(file: File): Promise<ImportResult> {
  if (file.type === "application/pdf") {
    let text = "";
    try {
      text = await pdfToText(file);
    } catch {
      // Fall through to sending the file itself.
    }
    if (text.replace(/\s|-|Page \d+/g, "").length >= MIN_TEXT_CHARS) {
      return callApi({ text });
    }
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("This file is over 4 MB and has no readable text. Upload a screenshot of the plan comparison table instead.");
  }
  return callApi({ mimeType: file.type, data: await fileToBase64(file) });
}
