import "server-only";
/**
 * Composition root for data access. Pages and actions ask for a repository by
 * contract; only this file decides which implementation and client back it.
 */
import { publicDb, serviceDb, sessionDb } from "@/lib/supabase/server";
import type {
  AdminCatalogueRepository, AdminQuoteRepository, BrandRepository, CategoryRepository, ProductRepository, QuoteRepository,
} from "./contracts";
import { SupabaseAdminCatalogueRepository } from "./supabase/admin";
import { SupabaseBrandRepository, SupabaseCategoryRepository, SupabaseProductRepository } from "./supabase/catalogue";
import { SupabaseAdminQuoteRepository, SupabaseQuoteRepository } from "./supabase/quotes";

export const brandRepo = (): BrandRepository => new SupabaseBrandRepository(publicDb());
export const categoryRepo = (): CategoryRepository => new SupabaseCategoryRepository(publicDb());
export const productRepo = (): ProductRepository => new SupabaseProductRepository(publicDb());
export const quoteRepo = (): QuoteRepository => new SupabaseQuoteRepository(serviceDb());

/** Returns null unless the signed-in user is an admin. */
export async function adminRepos(): Promise<{ catalogue: AdminCatalogueRepository; quotes: AdminQuoteRepository; email: string } | null> {
  const db = await sessionDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await db.rpc("is_admin");
  if (!isAdmin) return null;
  return { catalogue: new SupabaseAdminCatalogueRepository(db, serviceDb), quotes: new SupabaseAdminQuoteRepository(db),
    email: user.email ?? "" };
}

export type * from "./contracts";
