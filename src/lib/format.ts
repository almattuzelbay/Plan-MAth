export const usd = (n: number) => {
  const r = Math.round(n);
  return (r < 0 ? "−$" : "$") + Math.abs(r).toLocaleString("en-US");
};

/** Keeps cents when the amount has them (e.g. premiums like $108.33), for exact reports. */
export const usdExact = (n: number) =>
  (n < 0 ? "−$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export const PERIOD_LABEL: Record<number, string> = {
  1: "Once a year",
  12: "Monthly",
  24: "Twice a month",
  26: "Every 2 weeks",
  52: "Weekly",
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;
