export const usd = (n: number) => {
  const r = Math.round(n);
  return (r < 0 ? "−$" : "$") + Math.abs(r).toLocaleString("en-US");
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;
