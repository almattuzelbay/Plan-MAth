import { RotateCcw } from "lucide-react";
import { PRICE_LABELS, PRICES_VERSION, SERVICE_COST } from "../lib/assumptions";
import { breakdown } from "../lib/calc";
import { usd } from "../lib/format";
import type { Household, PriceKey, ScenarioKey } from "../lib/types";

interface Props {
  household: Household;
  scenario: ScenarioKey;
  scenarioLabel: string;
  onPrices: (prices: Household["prices"]) => void;
}

/** Shows exactly which care the estimate assumes: count × price = subtotal, with editable prices. */
export function CareCosts({ household, scenario, scenarioLabel, onPrices }: Props) {
  const rows = breakdown(household, scenario);
  const total = rows.reduce((s, r) => s + r.subtotal, 0);
  const edited = (Object.keys(SERVICE_COST) as PriceKey[]).some((k) => household.prices[k] !== SERVICE_COST[k]);
  const setPrice = (k: PriceKey, v: number) => onPrices({ ...household.prices, [k]: Math.max(0, v) });

  return (
    <div className="care-costs" id="care-costs">
      <div className="care-head">
        <div>
          <h3>Care cost assumptions — {scenarioLabel.toLowerCase()}</h3>
          <p className="muted small">
            Illustrative allowed amounts ({PRICES_VERSION}) — not your plan's negotiated prices and not a forecast. Edit
            any price; every total updates.
          </p>
        </div>
        {edited && (
          <button className="btn btn-ghost btn-small-plain" onClick={() => onPrices({ ...SERVICE_COST })}>
            <RotateCcw size={14} /> Reset prices
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table className="breakdown">
          <thead>
            <tr>
              <th>Service</th>
              <th>Count / year</th>
              <th>Allowed price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">No paid care in this scenario (preventive care is usually free).</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.priceKey}>
                <td>{PRICE_LABELS[r.priceKey].label}</td>
                <td>
                  {r.count}
                  {r.priceKey.endsWith("RxMonth") && <small className="muted"> fills ({r.count / 12} medicine{r.count / 12 > 1 ? "s" : ""} × 12)</small>}
                </td>
                <td>
                  <div className="money">
                    <span>$</span>
                    <input
                      type="number"
                      min={0}
                      value={household.prices[r.priceKey]}
                      aria-label={`Price: ${PRICE_LABELS[r.priceKey].label}`}
                      onChange={(e) => setPrice(r.priceKey, Number(e.target.value))}
                    />
                  </div>
                  <small className="muted">{PRICE_LABELS[r.priceKey].unit}</small>
                </td>
                <td>{usd(r.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total">
              <td colSpan={3}>Total allowed charges for covered in-network care</td>
              <td>{usd(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
