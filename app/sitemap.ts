import type { MetadataRoute } from "next";
import { brandRepo, productRepo } from "@/lib/repositories";
import { productHref } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

import { PER_FILE } from "@/lib/seo";

export const revalidate = 86400;

/** Sitemap index: file 0 holds the static pages + brands; files 1..n hold products. */
export async function generateSitemaps() {
  try {
    const n = Math.ceil((await productRepo().countLive()) / PER_FILE);
    return Array.from({ length: n + 1 }, (_, id) => ({ id }));
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id: rawId }: { id: number | string | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await rawId);   // a Promise from Next 15.5 on
  if (id === 0) {
    const brands = await brandRepo().listActive();
    return [
      { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
      { url: `${SITE_URL}/catalogue`, changeFrequency: "weekly", priority: .9 },
      { url: `${SITE_URL}/brands`, changeFrequency: "weekly", priority: .8 },
      { url: `${SITE_URL}/quote`, changeFrequency: "yearly", priority: .5 },
      ...brands.map((b) => ({ url: `${SITE_URL}/brands/${b.slug}`, changeFrequency: "weekly" as const, priority: .7 })),
    ];
  }
  // keyset-walk to the start of this file, then collect PER_FILE rows
  const repo = productRepo();
  let after = 0, skipped = 0;
  const target = (id - 1) * PER_FILE;
  const out: MetadataRoute.Sitemap = [];
  while (out.length < PER_FILE) {
    const rows = await repo.sitemapChunk(after, 1000);
    if (!rows.length) break;
    after = rows[rows.length - 1]!.id;
    for (const r of rows) {
      if (skipped < target) { skipped++; continue; }
      if (out.length < PER_FILE) out.push({ url: `${SITE_URL}${productHref(r)}`, lastModified: r.updatedAt, changeFrequency: "monthly", priority: .6 });
    }
  }
  return out;
}
