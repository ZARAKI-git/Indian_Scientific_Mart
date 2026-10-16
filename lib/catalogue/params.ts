import type { PriceBasis, ProductQuery, SortKey } from "@/lib/domain/types";

export const PAGE_SIZE = 50;
const SORTS: SortKey[] = ["relevance", "name", "price_asc", "price_desc", "code"];
const BASES: PriceBasis[] = ["excl_gst", "incl_gst", "unknown"];
const slug = (v: string | null | undefined) => (v && /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined);

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const read = (p: Params, k: string) => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return Array.isArray(v) ? v[0] : v ?? undefined;
};

/** One parser for URL → query, used by pages, the API route and the client list. */
export function parseQuery(p: Params, fixed: Partial<ProductQuery> = {}): ProductQuery & { page: number } {
  const page = Math.min(Math.max(Number(read(p, "page")) || 1, 1), 2000);
  const sort = read(p, "sort") as SortKey | undefined;
  const basis = read(p, "basis") as PriceBasis | undefined;
  const offsetRaw = read(p, "offset");
  return {
    q: (read(p, "q") ?? "").slice(0, 120) || undefined,
    brand: fixed.brand ?? slug(read(p, "brand")),
    category: slug(read(p, "category")),
    basis: basis && BASES.includes(basis) ? basis : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    limit: PAGE_SIZE,
    offset: offsetRaw !== undefined ? Math.max(0, Number(offsetRaw) || 0) : (page - 1) * PAGE_SIZE,
    page,
  };
}

export function toSearchParams(q: ProductQuery & { page?: number }, omit: string[] = []): URLSearchParams {
  const s = new URLSearchParams();
  const put = (k: string, v: string | number | undefined) => { if (v !== undefined && v !== "" && !omit.includes(k)) s.set(k, String(v)); };
  put("q", q.q); put("brand", q.brand); put("category", q.category); put("basis", q.basis); put("sort", q.sort);
  if (q.page && q.page > 1) put("page", q.page);
  return s;
}
