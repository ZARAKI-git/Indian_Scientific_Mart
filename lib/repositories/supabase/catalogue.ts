import type { SupabaseClient } from "@supabase/supabase-js";
import type { Brand, BrandShowcaseItem, Category, Page, Product, ProductQuery, ProductSummary } from "@/lib/domain/types";
import type { BrandRepository, CategoryRepository, ProductRepository } from "../contracts";
import { type BrandRow, type BrandShowcaseRow, type ProductRow, type SearchRow, toBrand, toBrandShowcase, toProduct, toSummaryFromSearch } from "./mappers";

const BRAND_COLS = "id,name,slug,country,product_count,price_basis,price_as_of,note,is_active";
const PRODUCT_COLS =
  "id,code,name,description,cas_no,pack_size,unit,hsn_code,gst_rate,list_rate,currency,price_basis,price_on_request," +
  "price_as_of,image_url,specs,source_file,source_page,updated_at,brands(slug,name),categories(slug,name)";

function fail(op: string, error: { message: string } | null): never {
  throw new Error(`${op}: ${error?.message ?? "unknown error"}`);
}

export class SupabaseBrandRepository implements BrandRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listActive(): Promise<Brand[]> {
    const { data, error } = await this.db.from("brands").select(BRAND_COLS).eq("is_active", true)
      .gt("product_count", 0).order("name");
    if (error) fail("brands.listActive", error);
    return (data as BrandRow[]).map(toBrand);
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const { data, error } = await this.db.from("brands").select(BRAND_COLS).eq("slug", slug).maybeSingle();
    if (error) fail("brands.getBySlug", error);
    return data ? toBrand(data as BrandRow) : null;
  }

  async listShowcase(): Promise<BrandShowcaseItem[]> {
    const { data, error } = await this.db.from("brand_showcase").select("id,name,slug,logo_url,logo_needs_chip,category")
      .order("display_order").order("name");
    if (error) fail("brands.listShowcase", error);
    return (data as BrandShowcaseRow[]).map(toBrandShowcase);
  }
}

export class SupabaseCategoryRepository implements CategoryRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Category[]> {
    const { data, error } = await this.db.from("categories").select("id,name,slug").order("display_order");
    if (error) fail("categories.list", error);
    return data as Category[];
  }

  async forBrand(brandSlug: string): Promise<Array<Category & { count: number }>> {
    const cats = await this.list();
    const brand = await this.db.from("brands").select("id").eq("slug", brandSlug).maybeSingle();
    if (brand.error) fail("categories.forBrand", brand.error);
    const brandId = brand.data?.id;
    if (!brandId) return [];
    const counts = await Promise.all(cats.map(async (c) => {
      const { count, error } = await this.db.from("products").select("id", { count: "exact", head: true })
        .eq("brand_id", brandId).eq("category_id", c.id).eq("is_active", true).eq("needs_review", false);
      if (error) fail("categories.forBrand.count", error);
      return { ...c, count: count ?? 0 };
    }));
    return counts.filter((c) => c.count > 0);
  }
}

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly db: SupabaseClient) {}

  async search(q: ProductQuery): Promise<Page<ProductSummary>> {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 100);
    const offset = Math.max(q.offset ?? 0, 0);
    const { data, error } = await this.db.rpc("search_products", {
      q: q.q?.trim() || null, p_brand: q.brand || null, p_category: q.category || null,
      p_basis: q.basis || null, p_sort: q.sort ?? (q.q ? "relevance" : "name"), p_limit: limit, p_offset: offset,
    });
    if (error) fail("products.search", error);
    const rows = (data ?? []) as SearchRow[];
    let total = rows.length ? Number(rows[0]!.total) : 0;
    if (!rows.length && offset > 0) total = offset; // past the end: report what we know
    return { items: rows.map(toSummaryFromSearch), total, limit, offset };
  }

  async getById(id: number): Promise<Product | null> {
    const { data, error } = await this.db.from("products").select(PRODUCT_COLS).eq("id", id).maybeSingle();
    if (error) fail("products.getById", error);
    return data ? toProduct(data as unknown as ProductRow) : null;
  }

  async related(p: Product, limit: number): Promise<ProductSummary[]> {
    // same brand, same product family name, other pack sizes first
    const stem = p.name.split(/ — | - |,/)[0]!.slice(0, 60);
    const page = await this.search({ q: stem, brand: p.brand.slug, limit: limit + 1, sort: "relevance" });
    return page.items.filter((x) => x.id !== p.id).slice(0, limit);
  }

  async sitemapChunk(afterId: number, limit: number) {
    const { data, error } = await this.db.from("products").select("id,name,updated_at").gt("id", afterId)
      .eq("is_active", true).eq("needs_review", false).order("id").limit(limit);
    if (error) fail("products.sitemapChunk", error);
    return (data ?? []).map((r: { id: number; name: string; updated_at: string }) => ({ id: r.id, name: r.name, updatedAt: r.updated_at }));
  }

  async countLive(): Promise<number> {
    const { count, error } = await this.db.from("products").select("id", { count: "estimated", head: true })
      .eq("is_active", true).eq("needs_review", false);
    if (error) fail("products.countLive", error);
    return count ?? 0;
  }
}
