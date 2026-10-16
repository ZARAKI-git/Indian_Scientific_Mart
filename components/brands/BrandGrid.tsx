import Link from "next/link";
import type { Brand } from "@/lib/domain/types";
import { TiltGroup } from "@/components/motion/Tilt";
import { asOfLabel, isStale } from "@/lib/format";

/** Brand names only (no logos, per the brief), product counts, tilt + staggered entrance. */
export function BrandGrid({ brands }: { brands: Brand[] }) {
  const letters = [...new Set(brands.map((b) => b.name.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "#"))];
  return (
    <>
      <nav className="brand-index" aria-label="Brands by letter" data-a>
        {letters.map((l) => <a key={l} href={`#brand-${l}`} className="chip">{l}</a>)}
      </nav>
      <TiltGroup selector=".brand-card" className="brand-grid">
        {brands.map((b, i) => {
          const letter = b.name.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "#";
          const first = brands.findIndex((x) => (x.name.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "#") === letter) === i;
          return (
            <Link key={b.slug} href={`/brands/${b.slug}`} className="brand-card" data-a id={first ? `brand-${letter}` : undefined}>
              {isStale(b.priceAsOf) && <span className="basis pill-sm warn">List {asOfLabel(b.priceAsOf)}</span>}
              <div>
                <span className="k">{b.country ?? "Brand"}</span>
                <h2>{b.name}</h2>
              </div>
              <div className="meta">
                <span className="count">{b.productCount.toLocaleString("en-IN")}<small>items listed</small></span>
                <span className="go" aria-hidden="true">→</span>
              </div>
            </Link>
          );
        })}
      </TiltGroup>
    </>
  );
}
