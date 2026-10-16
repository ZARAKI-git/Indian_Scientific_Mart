import type { MetadataRoute } from "next";
import { SITE_LIVE, SITE_URL } from "@/lib/site";
import { sitemapCount } from "@/lib/seo";

/** Closed to crawlers until NEXT_PUBLIC_SITE_LIVE=true (client sign-off on contact details). */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!SITE_LIVE) return { rules: { userAgent: "*", disallow: "/" } };
  const n = await sitemapCount();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: Array.from({ length: n }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`) };
}
