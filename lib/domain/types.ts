/** Domain shapes shared by UI, server actions and repositories. No I/O here. */

export type PriceBasis = "excl_gst" | "incl_gst" | "unknown";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  productCount: number;
  priceBasis: PriceBasis;
  priceAsOf: string | null;
  note: string | null;
  isActive: boolean;
}

/** A brand as the catalogue's spotlight shows it: logo, name and its main category. */
export interface BrandShowcaseItem {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  /** Logo needs a white chip to read on the sky panel. Set per brand, never guessed. */
  logoNeedsChip: boolean;
  category: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

/** What a listing row needs: small, so pages of 50 stay light. */
export interface ProductSummary {
  id: number;
  code: string;
  name: string;
  packSize: string | null;
  casNo: string | null;
  listRate: number | null;
  priceBasis: PriceBasis;
  priceOnRequest: boolean;
  priceAsOf: string | null;
  imageUrl: string | null;
  brand: { slug: string; name: string };
  category: { slug: string; name: string } | null;
}

export interface Product extends ProductSummary {
  description: string | null;
  unit: string | null;
  hsnCode: string | null;
  gstRate: number | null;
  currency: string;
  specs: Record<string, string>;
  sourceFile: string | null;
  sourcePage: number | null;
  updatedAt: string;
}

export type SortKey = "relevance" | "name" | "price_asc" | "price_desc" | "code";

export interface ProductQuery {
  q?: string;
  brand?: string;
  category?: string;
  basis?: PriceBasis;
  sort?: SortKey;
  limit?: number;
  offset?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuoteLine {
  productId: number;
  qty: number;
  note?: string;
}

export interface QuoteRequestInput {
  name: string;
  institution?: string;
  email: string;
  phone?: string;
  message?: string;
  needs: string[];
  lines: QuoteLine[];
}

/** A stored request with item snapshots, as the notifier and admin see it. */
export interface QuoteRequest {
  id: string;
  name: string;
  institution: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  needs: string[];
  status: "new" | "in_progress" | "quoted" | "closed";
  createdAt: string;
  items: Array<{
    productId: number | null;
    name: string;
    code: string;
    brand: string | null;
    listRate: number | null;
    qty: number;
    note: string | null;
  }>;
}
