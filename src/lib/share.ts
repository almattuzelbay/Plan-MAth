import type { Household, Plan } from "./types";

export interface SharedState {
  company: string;
  plans: Plan[];
  household: Household;
}

const toBase64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromBase64 = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

/** Results live in the URL, so they can be shared without accounts or a database. */
export function encodeState(state: SharedState): string {
  return toBase64(JSON.stringify(state));
}

export function decodeState(hash: string): SharedState | null {
  const match = hash.match(/r=([^&]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(fromBase64(decodeURIComponent(match[1])));
    if (!Array.isArray(parsed?.plans) || !parsed?.household) return null;
    return parsed as SharedState;
  } catch {
    return null;
  }
}

export function shareUrl(state: SharedState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#r=${encodeURIComponent(encodeState(state))}`;
}
