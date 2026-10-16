import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductImage } from "@/components/product/ProductImage";
import { asOfLabel, BASIS_LABEL, formatINR, isStale, parseProductId, productHref } from "@/lib/format";
import { productRepo } from "@/lib/repositories";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;     // ISR: 100k pages render on first request, then cache
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

const load = cache(async (param: string) => {
  const id = parseProductId(param);
  return id ? productRepo().getById(id) : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  if (!p) return {};
  const title = `${p.name}${p.packSize ? `, ${p.packSize}` : ""} — ${p.brand.name} ${p.code}`;
  const desc = `${p.brand.name} ${p.code}: ${p.name}${p.packSize ? `, ${p.packSize}` : ""}.${p.casNo ? ` CAS ${p.casNo}.` : ""} ` +
    (p.listRate !== null && !p.priceOnRequest ? `List rate ${formatINR(p.listRate)} (${BASIS_LABEL[p.priceBasis].toLowerCase()}). ` : "") +
    "Request a quote from Indian Scientific Mart, Cuttack.";
  return { title, description: desc.slice(0, 300), alternates: { canonical: productHref(p) },
    openGraph: { title, description: desc.slice(0, 300), type: "website", ...(p.imageUrl ? { images: [p.imageUrl] } : {}) } };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const p = await load(raw);
  if (!p) notFound();
  const canonical = productHref(p);
  if (`/products/${raw}` !== canonical) permanentRedirect(canonical);
  const related = await productRepo().related(p, 6);
  const priced = p.listRate !== null && !p.priceOnRequest;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.code, mpn: p.code,
    brand: { "@type": "Brand", name: p.brand.name }, category: p.category?.name,
    url: `${SITE_URL}${canonical}`, ...(p.imageUrl ? { image: p.imageUrl } : {}),
    ...(p.description ? { description: p.description.slice(0, 500) } : {}),
    ...(priced ? { offers: { "@type": "Offer", priceCurrency: "INR", price: p.listRate,
      priceSpecification: { "@type": "UnitPriceSpecification", price: p.listRate, priceCurrency: "INR",
        valueAddedTaxIncluded: p.priceBasis === "incl_gst" },
      seller: { "@type": "Organization", name: "Indian Scientific Mart" }, url: `${SITE_URL}${canonical}` } } : {}),
  };
  const specs: [string, string][] = [
    ["Catalogue code", p.code], ["Brand", p.brand.name], ...(p.packSize ? [["Pack size", p.packSize] as [string, string]] : []),
    ...(p.casNo ? [["CAS number", p.casNo] as [string, string]] : []), ...(p.hsnCode ? [["HSN code", p.hsnCode] as [string, string]] : []),
    ...(p.gstRate !== null ? [["GST rate", `${p.gstRate}%`] as [string, string]] : []),
    ...Object.entries(p.specs).filter(([k]) => !["Section", "Price basis"].includes(k)),
    ...(p.category ? [["Category", p.category.name] as [string, string]] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="page-hero" style={{ background: "#fff" }}>
        <div className="sky-bg" />
        <Reveal className="wrap" style={{ position: "relative", zIndex: 1 }}>
          <nav className="crumbs" aria-label="Breadcrumb" data-a>
            <Link href="/">Home</Link> / <Link href="/brands">Brands</Link> / <Link href={`/brands/${p.brand.slug}`}>{p.brand.name}</Link>
            {p.category && <> / <Link href={`/brands/${p.brand.slug}?category=${p.category.slug}`}>{p.category.name}</Link></>}
          </nav>
          <div className="pd">
            <div className="pd-media" data-a><ProductImage src={p.imageUrl} alt={p.name} category={p.category?.slug} large priority /></div>
            <div>
              <span className="tag" data-a>{p.brand.name}</span>
              <h1 data-split>{p.name}</h1>
              <div className="ids" data-a>
                <span className="pill-sm">Code {p.code}</span>
                {p.packSize && <span className="pill-sm plain">{p.packSize}</span>}
                {p.casNo && <span className="pill-sm plain">CAS {p.casNo}</span>}
                {p.hsnCode && <span className="pill-sm plain">HSN {p.hsnCode}</span>}
              </div>
              <div className="buy" data-a>
                <div className="rate">
                  {priced ? <b>{formatINR(p.listRate!)}</b> : <span className="por">Price on request</span>}
                  {priced && <span className="pill-sm">{BASIS_LABEL[p.priceBasis]}</span>}
                  {isStale(p.priceAsOf) && <span className="pill-sm warn">List of {asOfLabel(p.priceAsOf)}</span>}
                </div>
                <p className="indicative">
                  {priced ? "Indicative list rate from the maker's published price list — final quote on request, by quantity." :
                    "The maker lists this item without a price. Add it to your list and the office will quote it."}
                  {p.priceAsOf && !isStale(p.priceAsOf) ? ` List effective ${asOfLabel(p.priceAsOf)}.` : ""}
                </p>
                <BuyBox p={p} />
              </div>
              <h2 className="sm" data-a>Specifications</h2>
              <table className="spec" data-a><tbody>
                {specs.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
              </tbody></table>
              {p.description && p.description !== p.name && (<><h2 className="sm" data-a>Description</h2><p className="desc" data-a>{p.description}</p></>)}
              {related.length > 0 && (
                <>
                  <h2 className="sm" data-a>Other packs and related items</h2>
                  <div className="related" data-a>
                    {related.map((r) => (
                      <Link key={r.id} href={productHref(r)}>
                        <b>{r.name}</b>
                        <small>{r.code}{r.packSize ? ` · ${r.packSize}` : ""}{r.listRate !== null && !r.priceOnRequest ? ` · ${formatINR(r.listRate)}` : ""}</small>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <p className="indicative" style={{ marginTop: 28, fontSize: 12.5 }} data-a>
                Source: {p.brand.name} price list{p.sourceFile ? ` (${p.sourceFile}${p.sourcePage ? `, ${p.sourceFile.endsWith(".xlsx") ? "row" : "p."} ${p.sourcePage}` : ""})` : ""}.
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
