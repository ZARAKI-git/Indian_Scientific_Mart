import type { QuoteRequest } from "@/lib/domain/types";
import { quoteAsText } from "./format";
import type { QuoteNotifier } from "./QuoteNotifier";

/** Development / not-yet-decided channel: the request is stored, and logged here. */
export class LogNotifier implements QuoteNotifier {
  readonly channel = "log";
  async notify(r: QuoteRequest): Promise<void> {
    console.info(`[quote] ${quoteAsText(r)}`);
  }
}
