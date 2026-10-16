import { productRepo } from "@/lib/repositories";

export const PER_FILE = 40000;

/** Number of sitemap files: one for pages + brands, then one per 40k products. */
export async function sitemapCount(): Promise<number> {
  try { return Math.ceil((await productRepo().countLive()) / PER_FILE) + 1; } catch { return 1; }
}
