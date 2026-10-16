import type { Metadata } from "next";
import { BrandShowcase } from "@/components/catalogue/BrandShowcase";
import { CatalogueView } from "@/components/catalogue/CatalogueView";
import { PageHero } from "@/components/ui/PageHero";
import { parseQuery } from "@/lib/catalogue/params";
import { brandRepo, categoryRepo, productRepo } from "@/lib/repositories";

export const revalidate = 600;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string>> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q?.slice(0, 60);
  return {
    title: q ? `“${q}” — catalogue search` : "Laboratory catalogue — chemicals, glassware, instruments",
    description: "Search list rates across 29 laboratory brands: chemicals, culture media, glassware, plasticware, filtration and instruments. Add items to a quote request.",
    alternates: { canonical: "/catalogue" },
  };
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseQuery(await searchParams);
  const [page, brands, categories, live, showcase] = await Promise.all([
    productRepo().search(query), brandRepo().listActive(), categoryRepo().list(), productRepo().countLive(),
    brandRepo().listShowcase(),
  ]);
  return (
    <>
      <PageHero tag="Catalogue" crumbs={[{ href: "/", label: "Home" }, { label: "Catalogue" }]}
        title={<>Every list, <span className="grad-text">one search.</span></>}
        aside={<BrandShowcase brands={showcase} />}
        lede="Published list rates from the makers we supply, searchable by name, catalogue code or CAS number. Add what you need to a quote list; the office replies with a price against current stock and quantity.">
        <div className="hero-stats" data-a>
          <div><b>{live.toLocaleString("en-IN")}</b><span>Items listed</span></div>
          <div><b>{brands.length}</b><span>Brands</span></div>
          <div><b>{categories.length}</b><span>Categories</span></div>
        </div>
      </PageHero>
      <section className="section" style={{ paddingTop: 0 }}>
        <CatalogueView initial={page} query={query} categories={categories} brands={brands} />
      </section>
    </>
  );
}
