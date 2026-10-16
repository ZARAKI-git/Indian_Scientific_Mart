import type { QuoteRequest } from "@/lib/domain/types";

/**
 * How ISM hears about a new quote request. ISM has not confirmed the channel
 * (email / WhatsApp / dashboard only), so delivery sits behind this interface:
 * add a channel by adding an implementation and a case in ./index.ts.
 */
export interface QuoteNotifier {
  readonly channel: string;
  notify(request: QuoteRequest): Promise<void>;
}
