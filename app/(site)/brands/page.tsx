import type { Metadata } from "next";
import { BrandGrid } from "@/components/brands/BrandGrid";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/PageHero";
import { brandRepo } from "@/lib/repositories";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Brands we supply",
  description: "Laboratory brands supplied by Indian Scientific Mart, Cuttack: Merck, Borosil, HiMedia, SRL, LOBA, Tarsons, Whatman and more, each with its full price list.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsPage() {
  const brands = await brandRepo().listActive();
  const total = brands.reduce((n, b) => n + b.productCount, 0);
  return (
    <>
      <PageHero deep tag="Brands" crumbs={[{ href: "/", label: "Home" }, { label: "Brands" }]} image="1639775425635-fd86a889f2a7"
        title={<>The makers on <span style={{ color: "var(--sky-300)" }}>our shelves.</span></>}
        lede="Each brand's own published price list, searchable item by item. Pick a maker to browse its catalogue, or search across all of them.">
        <div className="hero-stats" data-a>
          <div><b>{brands.length}</b><span>Brands</span></div>
          <div><b>{total.toLocaleString("en-IN")}</b><span>Items listed</span></div>
        </div>
      </PageHero>
      <Reveal as="section" className="section">
        <div className="wrap"><BrandGrid brands={brands} /></div>
      </Reveal>
    </>
  );
}
