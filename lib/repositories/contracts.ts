/**
 * Repository contracts (DIP/ISP). UI, route handlers and server actions depend on
 * these interfaces only; the Supabase implementations live in ./supabase and are
 * the sole code that knows about the database.
 */
import type {
  Brand, Category, Page, Product, ProductQuery, ProductSummary, QuoteRequest, QuoteRequestInput,
} from "@/lib/domain/types";

export interface BrandRepository {
  listActive(): Promise<Brand[]>;
  getBySlug(slug: string): Promise<Brand | null>;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
  /** Categories that have live products for a brand, with counts. */
  forBrand(brandSlug: string): Promise<Array<Category & { count: number }>>;
}

export interface ProductRepository {
  search(query: ProductQuery): Promise<Page<ProductSummary>>;
  getById(id: number): Promise<Product | null>;
  related(product: Product, limit: number): Promise<ProductSummary[]>;
  /** Minimal rows for the sitemap, keyset-paged by id. */
  sitemapChunk(afterId: number, limit: number): Promise<Array<{ id: number; name: string; updatedAt: string }>>;
  countLive(): Promise<number>;
}

export interface QuoteRepository {
  /** Persists the request with name/code/price snapshots of each line. */
  create(input: QuoteRequestInput): Promise<QuoteRequest>;
  markNotified(id: string): Promise<void>;
}

/* ------------------------------------------------------------ admin (auth-gated) */

export interface ProductPatch {
  name?: string;
  listRate?: number | null;
  isActive?: boolean;
  priceOnRequest?: boolean;
  needsReview?: boolean;
  categoryId?: number | null;
  imageUrl?: string | null;
}

export interface AdminProductRow {
  id: number;
  code: string;
  name: string;
  brandName: string;
  brandSlug: string;
  categoryId: number | null;
  listRate: number | null;
  priceOnRequest: boolean;
  isActive: boolean;
  needsReview: boolean;
  reviewReason: string | null;
  sourceFile: string | null;
  sourcePage: number | null;
}

export interface AdminCatalogueRepository {
  stats(): Promise<{ live: number; review: number; inactive: number; brands: number; newQuotes: number }>;
  searchProducts(q: { q?: string; brand?: string; review?: boolean; limit: number; offset: number }): Promise<Page<AdminProductRow>>;
  updateProduct(id: number, patch: ProductPatch): Promise<void>;
  approveProducts(ids: number[]): Promise<void>;
  listBrands(): Promise<Brand[]>;
  upsertBrand(b: { id?: number; name: string; slug: string; isActive: boolean }): Promise<void>;
  listCategories(): Promise<Category[]>;
  upsertCategory(c: { id?: number; name: string; slug: string }): Promise<void>;
  refreshCounts(): Promise<void>;
}

export interface AdminQuoteRepository {
  list(limit: number, offset: number): Promise<Page<QuoteRequest>>;
  get(id: string): Promise<QuoteRequest | null>;
  setStatus(id: string, status: QuoteRequest["status"]): Promise<void>;
}
