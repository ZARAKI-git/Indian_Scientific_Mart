import type { QuoteRequest } from "@/lib/domain/types";
import { formatINR } from "@/lib/format";

/** Plain-text rendering shared by every channel (email body, WhatsApp text, logs). */
export function quoteAsText(r: QuoteRequest, adminUrl?: string): string {
  const lines = [
    `New quote request — ${r.name}${r.institution ? `, ${r.institution}` : ""}`,
    `Email: ${r.email}${r.phone ? `   Phone: ${r.phone}` : ""}`,
    r.needs.length ? `Needs: ${r.needs.join(", ")}` : "",
    "",
    r.items.length ? `Items (${r.items.length}):` : "No catalogue items; see message.",
    ...r.items.map((i, n) =>
      `${n + 1}. ${i.qty} × ${i.name} [${i.brand ?? ""} ${i.code}]` +
      `${i.listRate !== null ? ` — list ${formatINR(i.listRate)}` : ""}${i.note ? ` — note: ${i.note}` : ""}`),
    "",
    r.message ? `Message:\n${r.message}` : "",
    adminUrl ? `\nOpen in admin: ${adminUrl}` : "",
    `\nRef ${r.id}`,
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
