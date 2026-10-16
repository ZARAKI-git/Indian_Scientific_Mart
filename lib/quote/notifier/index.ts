import "server-only";
import { EmailNotifier } from "./EmailNotifier";
import { LogNotifier } from "./LogNotifier";
import type { QuoteNotifier } from "./QuoteNotifier";

/** Picks the delivery channel from QUOTE_NOTIFIER. A WhatsApp notifier slots in as another case. */
export function quoteNotifier(): QuoteNotifier {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  switch (process.env.QUOTE_NOTIFIER) {
    case "email": {
      const { RESEND_API_KEY, QUOTE_NOTIFY_TO, QUOTE_NOTIFY_FROM } = process.env;
      if (RESEND_API_KEY && QUOTE_NOTIFY_TO && QUOTE_NOTIFY_FROM)
        return new EmailNotifier({ apiKey: RESEND_API_KEY, to: QUOTE_NOTIFY_TO, from: QUOTE_NOTIFY_FROM, siteUrl: site });
      console.warn("[quote] QUOTE_NOTIFIER=email but Resend settings are missing; falling back to log");
      return new LogNotifier();
    }
    default:
      return new LogNotifier();
  }
}
export type { QuoteNotifier };
