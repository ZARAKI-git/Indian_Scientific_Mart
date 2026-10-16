import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, QuoteRequest, QuoteRequestInput } from "@/lib/domain/types";
import type { AdminQuoteRepository, QuoteRepository } from "../contracts";
import { type QuoteRow, toQuote } from "./mappers";

const QUOTE_COLS = "id,name,institution,email,phone,message,needs,status,created_at," +
  "quote_items(product_id,product_name_snapshot,code_snapshot,brand_snapshot,list_rate_snapshot,qty,note)";

/** Writes with the service role: the public never gets insert rights on quotes. */
export class SupabaseQuoteRepository implements QuoteRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: QuoteRequestInput): Promise<QuoteRequest> {
    const ids = [...new Set(input.lines.map((l) => l.productId))];
    const products = new Map<number, { id: number; name: string; code: string; brand_id: number; list_rate: number | null;
      brands: { name: string } | null }>();
    if (ids.length) {
      const { data, error } = await this.db.from("products").select("id,name,code,brand_id,list_rate,brands(name)")
        .in("id", ids).eq("is_active", true);
      if (error) throw new Error(`quote.products: ${error.message}`);
      (data ?? []).forEach((p) => products.set(p.id, p as never));
    }
    const { data: req, error } = await this.db.from("quote_requests").insert({
      name: input.name, institution: input.institution || null, email: input.email, phone: input.phone || null,
      message: input.message || null, needs: input.needs,
    }).select("id").single();
    if (error) throw new Error(`quote.create: ${error.message}`);

    const items = input.lines.filter((l) => products.has(l.productId)).map((l) => {
      const p = products.get(l.productId)!;
      return { quote_request_id: req.id, product_id: p.id, brand_id: p.brand_id, product_name_snapshot: p.name,
        code_snapshot: p.code, brand_snapshot: p.brands?.name ?? null, list_rate_snapshot: p.list_rate,
        qty: l.qty, note: l.note || null };
    });
    if (items.length) {
      const ins = await this.db.from("quote_items").insert(items);
      if (ins.error) throw new Error(`quote.items: ${ins.error.message}`);
    }
    const full = await this.db.from("quote_requests").select(QUOTE_COLS).eq("id", req.id).single();
    if (full.error) throw new Error(`quote.reload: ${full.error.message}`);
    return toQuote(full.data as unknown as QuoteRow);
  }

  async markNotified(id: string): Promise<void> {
    await this.db.from("quote_requests").update({ notified: true }).eq("id", id);
  }
}

export class SupabaseAdminQuoteRepository implements AdminQuoteRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(limit: number, offset: number): Promise<Page<QuoteRequest>> {
    const { data, count, error } = await this.db.from("quote_requests").select(QUOTE_COLS, { count: "exact" })
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`admin.quotes.list: ${error.message}`);
    return { items: (data as unknown as QuoteRow[]).map(toQuote), total: count ?? 0, limit, offset };
  }

  async get(id: string): Promise<QuoteRequest | null> {
    const { data, error } = await this.db.from("quote_requests").select(QUOTE_COLS).eq("id", id).maybeSingle();
    if (error) throw new Error(`admin.quotes.get: ${error.message}`);
    return data ? toQuote(data as unknown as QuoteRow) : null;
  }

  async setStatus(id: string, status: QuoteRequest["status"]): Promise<void> {
    const { error } = await this.db.from("quote_requests").update({ status }).eq("id", id);
    if (error) throw new Error(`admin.quotes.setStatus: ${error.message}`);
  }
}
