import "server-only";
import type { QuoteRequest } from "@/lib/domain/types";
import { quoteAsText } from "./format";
import type { QuoteNotifier } from "./QuoteNotifier";

/** Email through Resend's HTTP API (no SDK; one POST). */
export class EmailNotifier implements QuoteNotifier {
  readonly channel = "email";
  constructor(private readonly opts: { apiKey: string; to: string; from: string; siteUrl: string }) {}

  async notify(r: QuoteRequest): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.opts.from,
        to: this.opts.to.split(",").map((s) => s.trim()),
        reply_to: r.email,
        subject: `Quote request: ${r.name}${r.institution ? ` (${r.institution})` : ""} — ${r.items.length} item(s)`,
        text: quoteAsText(r, `${this.opts.siteUrl}/admin/quotes/${r.id}`),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
