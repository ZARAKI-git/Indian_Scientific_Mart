"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminRepos } from "@/lib/repositories";
import { CATALOGUE_TAG, sessionDb } from "@/lib/supabase/server";

/** Admin writes change what the public sees: drop cached catalogue reads at once. */
const purge = () => revalidateTag(CATALOGUE_TAG);

async function repos() {
  const r = await adminRepos();
  if (!r) redirect("/admin/login");
  return r;
}

const ProductForm = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(400),
  listRate: z.string().trim().max(20),
  isActive: z.string().optional(),
  priceOnRequest: z.string().optional(),
  imageUrl: z.string().trim().max(500).optional(),
  back: z.string().max(400).optional(),
});

export async function saveProduct(fd: FormData) {
  const { catalogue } = await repos();
  const v = ProductForm.parse(Object.fromEntries(fd));
  const rate = v.listRate === "" ? null : Number(v.listRate.replace(/,/g, ""));
  if (rate !== null && !(rate >= 0 && rate < 1e9)) throw new Error("List rate must be a number");
  await catalogue.updateProduct(v.id, {
    name: v.name, listRate: rate, isActive: v.isActive === "on", priceOnRequest: v.priceOnRequest === "on",
    ...(v.imageUrl !== undefined ? { imageUrl: v.imageUrl || null } : {}),
  });
  purge();
  revalidatePath(`/products/${v.id}`, "page");
  redirect(v.back?.startsWith("/admin") ? v.back : "/admin/products");
}

export async function approve(fd: FormData) {
  const { catalogue } = await repos();
  const ids = fd.getAll("id").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  await catalogue.approveProducts(ids);
  await catalogue.refreshCounts();
  purge();
  revalidatePath("/brands");
  redirect(String(fd.get("back") ?? "/admin/review"));
}

export async function rejectReview(fd: FormData) {
  const { catalogue } = await repos();
  const id = Number(fd.get("id"));
  await catalogue.updateProduct(id, { isActive: false });
  purge();
  redirect(String(fd.get("back") ?? "/admin/review"));
}

const BrandForm = z.object({ id: z.coerce.number().int().optional(), name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "slug: lowercase letters, digits and dashes"), isActive: z.string().optional() });
export async function saveBrand(fd: FormData) {
  const { catalogue } = await repos();
  const v = BrandForm.parse(Object.fromEntries(fd));
  await catalogue.upsertBrand({ id: v.id || undefined, name: v.name, slug: v.slug, isActive: v.isActive === "on" });
  await catalogue.refreshCounts();
  purge();
  revalidatePath("/brands");
  redirect("/admin/brands");
}

const CatForm = z.object({ id: z.coerce.number().int().optional(), name: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/) });
export async function saveCategory(fd: FormData) {
  const { catalogue } = await repos();
  const v = CatForm.parse(Object.fromEntries(fd));
  await catalogue.upsertCategory({ id: v.id || undefined, name: v.name, slug: v.slug });
  purge();
  redirect("/admin/brands");
}

export async function setQuoteStatus(fd: FormData) {
  const { quotes } = await repos();
  const id = String(fd.get("id"));
  const status = z.enum(["new", "in_progress", "quoted", "closed"]).parse(fd.get("status"));
  await quotes.setStatus(id, status);
  redirect(`/admin/quotes/${id}`);
}

export async function signOut() {
  const db = await sessionDb();
  await db.auth.signOut();
  redirect("/admin/login");
}
