import type { Brand, BrandShowcaseItem, PriceBasis, Product, ProductSummary, QuoteRequest } from "@/lib/domain/types";

/* Row shapes as PostgREST returns them. Kept here so only this layer knows column names. */
export interface BrandRow {
  id: number; name: string; slug: string; country: string | null; product_count: number;
  price_basis: PriceBasis; price_as_of: string | null; note: string | null; is_active: boolean;
}
export interface BrandShowcaseRow {
  id: number; name: string; slug: string; logo_url: string | null; logo_needs_chip: boolean; category: string | null;
}
export interface SearchRow {
  id: number; code: string; name: string; pack_size: string | null; cas_no: string | null;
  list_rate: number | string | null; price_basis: PriceBasis; price_on_request: boolean; price_as_of: string | null;
  image_url: string | null; brand_slug: string; brand_name: string; category_slug: string | null;
  category_name: string | null; total: number | string;
}
export interface ProductRow {
  id: number; code: string; name: string; description: string | null; cas_no: string | null; pack_size: string | null;
  unit: string | null; hsn_code: string | null; gst_rate: number | null; list_rate: number | string | null; currency: string;
  price_basis: PriceBasis; price_on_request: boolean; price_as_of: string | null; image_url: string | null;
  specs: Record<string, unknown> | null; source_file: string | null; source_page: number | null; updated_at: string;
  brands: { slug: string; name: string } | null; categories: { slug: string; name: string } | null;
}

const num = (v: number | string | null): number | null => (v === null || v === undefined ? null : Number(v));

export const toBrand = (r: BrandRow): Brand => ({
  id: r.id, name: r.name, slug: r.slug, country: r.country, productCount: r.product_count,
  priceBasis: r.price_basis, priceAsOf: r.price_as_of, note: r.note, isActive: r.is_active,
});

export const toBrandShowcase = (r: BrandShowcaseRow): BrandShowcaseItem => ({
  id: r.id, name: r.name, slug: r.slug, logoUrl: r.logo_url, logoNeedsChip: r.logo_needs_chip, category: r.category,
});

export const toSummaryFromSearch = (r: SearchRow): ProductSummary => ({
  id: r.id, code: r.code, name: r.name, packSize: r.pack_size, casNo: r.cas_no, listRate: num(r.list_rate),
  priceBasis: r.price_basis, priceOnRequest: r.price_on_request, priceAsOf: r.price_as_of, imageUrl: r.image_url,
  brand: { slug: r.brand_slug, name: r.brand_name },
  category: r.category_slug ? { slug: r.category_slug, name: r.category_name ?? r.category_slug } : null,
});

export const toProduct = (r: ProductRow): Product => ({
  id: r.id, code: r.code, name: r.name, packSize: r.pack_size, casNo: r.cas_no, listRate: num(r.list_rate),
  priceBasis: r.price_basis, priceOnRequest: r.price_on_request, priceAsOf: r.price_as_of, imageUrl: r.image_url,
  brand: r.brands ?? { slug: "", name: "" }, category: r.categories,
  description: r.description, unit: r.unit, hsnCode: r.hsn_code, gstRate: r.gst_rate, currency: r.currency,
  // keys starting with "_" are pipeline bookkeeping, never shown
  specs: Object.fromEntries(Object.entries(r.specs ?? {}).filter(([k, v]) => !k.startsWith("_") && v !== "" && v != null)
    .map(([k, v]) => [k, String(v)])),
  sourceFile: r.source_file, sourcePage: r.source_page, updatedAt: r.updated_at,
});

export interface QuoteRow {
  id: string; name: string; institution: string | null; email: string; phone: string | null; message: string | null;
  needs: string[]; status: QuoteRequest["status"]; created_at: string;
  quote_items?: Array<{ product_id: number | null; product_name_snapshot: string; code_snapshot: string;
    brand_snapshot: string | null; list_rate_snapshot: number | string | null; qty: number; note: string | null }>;
}

export const toQuote = (r: QuoteRow): QuoteRequest => ({
  id: r.id, name: r.name, institution: r.institution, email: r.email, phone: r.phone, message: r.message,
  needs: r.needs ?? [], status: r.status, createdAt: r.created_at,
  items: (r.quote_items ?? []).map((i) => ({
    productId: i.product_id, name: i.product_name_snapshot, code: i.code_snapshot, brand: i.brand_snapshot,
    listRate: num(i.list_rate_snapshot), qty: i.qty, note: i.note,
  })),
});
