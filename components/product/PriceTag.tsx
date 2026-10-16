import { BASIS_SHORT, formatINR, isStale } from "@/lib/format";
import type { PriceBasis } from "@/lib/domain/types";

/** Every price says what it is: an indicative list rate with its GST basis. */
export function PriceTag({ rate, onRequest, basis, asOf }: { rate: number | null; onRequest: boolean; basis: PriceBasis; asOf: string | null }) {
  if (onRequest || rate === null)
    return <div className="price"><span className="por">Price on request</span><small>Quoted by the office</small></div>;
  return (
    <div className="price">
      <b>{formatINR(rate)}</b>
      <small>List rate · {BASIS_SHORT[basis]}{isStale(asOf) ? " · older list" : ""}</small>
    </div>
  );
}
