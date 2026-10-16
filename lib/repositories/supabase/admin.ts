import type { SupabaseClient } from "@supabase/supabase-js";
import type { Brand, Category, Page } from "@/lib/domain/types";
import type { AdminCatalogueRepository, AdminProductRow, ProductPatch } from "../contracts";
import { type BrandRow, toBrand } from "./mappers";

/** Session-bound: every write passes RLS only when auth.uid() is in admin_users. */
export class SupabaseAdminCatalogueRepository implements AdminCatalogueRepository {
  constructor(private readonly db: SupabaseClient, private readonly service: () => SupabaseClient) {}

  async stats() {
    const head = { count: "exact" as const, head: true };
    const [live, review, inactive, brands, quotes] = await Promise.all([
      this.db.from("products").select("id", head).eq("is_active", true).eq("needs_review", false),
      this.db.from("products").select("id", head).eq("needs_review", true),
      this.db.from("products").select("id", head).eq("is_active", false),
      this.db.from("brands").select("id", head),
      this.db.from("quote_requests").select("id", head).eq("status", "new"),
    ]);
    return { live: live.count ?? 0, review: review.count ?? 0, inactive: inactive.count ?? 0,
      brands: brands.count ?? 0, newQuotes: quotes.count ?? 0 };
  }

  async searchProducts(q: { q?: string; brand?: string; review?: boolean; limit: number; offset: number }): Promise<Page<AdminProductRow>> {
    let query = this.db.from("products")
      .select("id,code,name,category_id,list_rate,price_on_request,is_active,needs_review,review_reason,source_file,source_page,brands!inner(name,slug)",
        { count: "exact" });
    if (q.brand) query = query.eq("brands.slug", q.brand);
    if (q.review) query = query.eq("needs_review", true);
    if (q.q?.trim()) {
      const t = q.q.trim().replace(/[%,()]/g, " ");
      query = query.or(`code.ilike.${t}%,name.ilike.%${t}%`);
    }
    const { data, count, error } = await query.order("id").range(q.offset, q.offset + q.limit - 1);
    if (error) throw new Error(`admin.products: ${error.message}`);
    const items = (data ?? []).map((r: Record<string, unknown>) => {
      const b = r.brands as { name: string; slug: string };
      return { id: r.id as number, code: r.code as string, name: r.name as string, brandName: b.name, brandSlug: b.slug,
        categoryId: r.category_id as number | null, listRate: r.list_rate === null ? null : Number(r.list_rate),
        priceOnRequest: r.price_on_request as boolean, isActive: r.is_active as boolean, needsReview: r.needs_review as boolean,
        reviewReason: r.review_reason as string | null, sourceFile: r.source_file as string | null,
        sourcePage: r.source_page as number | null };
    });
    return { items, total: count ?? 0, limit: q.limit, offset: q.offset };
  }

  async updateProduct(id: number, p: ProductPatch): Promise<void> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.name !== undefined) row.name = p.name;
    if (p.listRate !== undefined) row.list_rate = p.listRate;
    if (p.isActive !== undefined) row.is_active = p.isActive;
    if (p.priceOnRequest !== undefined) row.price_on_request = p.priceOnRequest;
    if (p.needsReview !== undefined) row.needs_review = p.needsReview;
    if (p.categoryId !== undefined) row.category_id = p.categoryId;
    if (p.imageUrl !== undefined) row.image_url = p.imageUrl;
    const { error } = await this.db.from("products").update(row).eq("id", id);
    if (error) throw new Error(`admin.updateProduct: ${error.message}`);
  }

  async approveProducts(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.db.from("products").update({ needs_review: false, review_reason: null }).in("id", ids);
    if (error) throw new Error(`admin.approve: ${error.message}`);
  }

  async listBrands(): Promise<Brand[]> {
    const { data, error } = await this.db.from("brands")
      .select("id,name,slug,country,product_count,price_basis,price_as_of,note,is_active").order("display_order");
    if (error) throw new Error(`admin.brands: ${error.message}`);
    return (data as BrandRow[]).map(toBrand);
  }

  async upsertBrand(b: { id?: number; name: string; slug: string; isActive: boolean }): Promise<void> {
    const row = { name: b.name, slug: b.slug, is_active: b.isActive };
    const { error } = b.id ? await this.db.from("brands").update(row).eq("id", b.id) : await this.db.from("brands").insert(row);
    if (error) throw new Error(`admin.upsertBrand: ${error.message}`);
  }

  async listCategories(): Promise<Category[]> {
    const { data, error } = await this.db.from("categories").select("id,name,slug").order("display_order");
    if (error) throw new Error(`admin.categories: ${error.message}`);
    return data as Category[];
  }

  async upsertCategory(c: { id?: number; name: string; slug: string }): Promise<void> {
    const row = { name: c.name, slug: c.slug };
    const { error } = c.id ? await this.db.from("categories").update(row).eq("id", c.id) : await this.db.from("categories").insert(row);
    if (error) throw new Error(`admin.upsertCategory: ${error.message}`);
  }

  async refreshCounts(): Promise<void> {
    const { error } = await this.service().rpc("refresh_brand_counts");
    if (error) throw new Error(`admin.refreshCounts: ${error.message}`);
  }
}
