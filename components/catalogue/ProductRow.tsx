import Link from "next/link";
import type { ProductSummary } from "@/lib/domain/types";
import { productHref } from "@/lib/format";
import { PriceTag } from "@/components/product/PriceTag";
import { ProductImage } from "@/components/product/ProductImage";
import { AddToQuote } from "@/components/quote/AddToQuote";

export function ProductRow({ p, showBrand = true }: { p: ProductSummary; showBrand?: boolean }) {
  return (
    <div className="prow">
      <div className="thumb" style={{ position: "relative" }}><ProductImage src={p.imageUrl} alt={p.name} category={p.category?.slug} /></div>
      <div className="nm">
        <Link href={productHref(p)}>{p.name}</Link>
        <div className="sub">
          <code>{p.code}</code>
          {showBrand && <span>{p.brand.name}</span>}
          {p.casNo && <span>CAS {p.casNo}</span>}
          {p.packSize && <span className="pack-inline">{p.packSize}</span>}
        </div>
      </div>
      <div className="pack">{p.packSize ?? "—"}<small>{p.category?.name ?? ""}</small></div>
      <PriceTag rate={p.listRate} onRequest={p.priceOnRequest} basis={p.priceBasis} asOf={p.priceAsOf} />
      <div className="act"><AddToQuote p={p} /></div>
    </div>
  );
}
