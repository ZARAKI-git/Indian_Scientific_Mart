import type { PriceBasis } from "@/lib/domain/types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatINR = (v: number) => inr.format(v);

export const BASIS_LABEL: Record<PriceBasis, string> = {
  excl_gst: "List rate, excl. GST",
  incl_gst: "List rate, incl. GST",
  unknown: "List rate · GST basis not stated",
};
export const BASIS_SHORT: Record<PriceBasis, string> = { excl_gst: "+ GST", incl_gst: "incl. GST", unknown: "GST basis not stated" };

/** A list older than this is shown with a "prices may be out of date" flag. */
export function isStale(asOf: string | null, now = new Date()): boolean {
  if (!asOf) return false;
  const d = new Date(asOf);
  return (now.getTime() - d.getTime()) / 86_400_000 > 400;
}
export const asOfLabel = (asOf: string | null) =>
  asOf ? new Date(asOf).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : null;

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 70).replace(/-+$/, "");
}
export const productHref = (p: { id: number; name: string }) => `/products/${p.id}-${slugify(p.name)}`;
export const parseProductId = (param: string) => {
  const m = /^(\d+)/.exec(param);
  return m ? Number(m[1]) : null;
};
