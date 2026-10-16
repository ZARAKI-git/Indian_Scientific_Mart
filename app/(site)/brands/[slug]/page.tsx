import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueView } from "@/components/catalogue/CatalogueView";
import { PageHero } from "@/components/ui/PageHero";
import { parseQuery } from "@/lib/catalogue/params";
import { asOfLabel, BASIS_LABEL, isStale } from "@/lib/format";
import { CATEGORY_IMAGE } from "@/lib/images";
import { brandRepo, categoryRepo, productRepo } from "@/lib/repositories";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = await brandRepo().getBySlug((await params).slug);
  if (!b) return {};
  return {
    title: `${b.name} price list`,
    description: `${b.productCount.toLocaleString("en-IN")} ${b.name} items with list rates — search by name, code or CAS no. and request a quote from Indian Scientific Mart, Cuttack.`,
    alternates: { canonical: `/brands/${b.slug}` },
  };
}

export default async function BrandPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const brand = await brandRepo().getBySlug(slug);
  if (!brand || !brand.isActive) notFound();
  const query = parseQuery(await searchParams, { brand: slug });
  const [page, cats] = await Promise.all([productRepo().search(query), categoryRepo().forBrand(slug)]);
  const top = [...cats].sort((a, b) => b.count - a.count)[0];
  return (
    <>
      <PageHero deep tag={brand.country ?? "Brand"} image={CATEGORY_IMAGE[top?.slug ?? "general"]}
        crumbs={[{ href: "/", label: "Home" }, { href: "/brands", label: "Brands" }, { label: brand.name }]}
        title={brand.name}
        lede={`${brand.productCount.toLocaleString("en-IN")} items from ${brand.name}'s published price list${brand.priceAsOf ? ` (${asOfLabel(brand.priceAsOf)})` : ""}. Search, filter by category, and add items to your quote list.`}>
        <div className="hero-stats" data-a>
          <div><b>{brand.productCount.toLocaleString("en-IN")}</b><span>Items listed</span></div>
          <div><b>{cats.length}</b><span>Categories</span></div>
          <div><b style={{ fontSize: "clamp(16px,1.4vw,19px)", lineHeight: 1.25 }}>{BASIS_LABEL[brand.priceBasis]}</b><span>How this list is priced</span></div>
        </div>
      </PageHero>
      <section className="section" style={{ paddingTop: 0 }}>
        {(isStale(brand.priceAsOf) || brand.priceBasis === "unknown" || brand.note) && (
          <div className="wrap" style={{ paddingTop: 18 }}>
            {isStale(brand.priceAsOf) && <p className="notice warn"><span><b>Older price list ({asOfLabel(brand.priceAsOf)}).</b> Rates here are indicative only; the office confirms current prices on every quote.</span></p>}
            {brand.priceBasis === "unknown" && <p className="notice"><span><b>GST basis not stated</b> in this maker&apos;s list. Treat list rates as indicative; the quote states tax separately.</span></p>}
            {brand.note && !isStale(brand.priceAsOf) && <p className="notice"><span>{brand.note}</span></p>}
          </div>
        )}
        <CatalogueView initial={page} query={query} categories={cats} fixedBrand={slug} />
      </section>
    </>
  );
}
