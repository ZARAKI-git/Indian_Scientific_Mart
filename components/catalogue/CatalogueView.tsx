"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Brand, Category, Page, ProductQuery, ProductSummary } from "@/lib/domain/types";
import { PAGE_SIZE, toSearchParams } from "@/lib/catalogue/params";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { staggerIn } from "@/lib/motion/primitives";
import { SearchIcon } from "@/components/ui/icons";
import { ProductRow } from "./ProductRow";

interface Props {
  initial: Page<ProductSummary>;
  query: ProductQuery & { page: number };
  categories: Array<Category & { count?: number }>;
  brands?: Brand[];          // omitted on a brand page (brand is fixed)
  fixedBrand?: string;
  /** Nearest listed items, shown when the query has no exact result. */
  closest?: ProductSummary[];
}

export function CatalogueView({ initial, query, categories, brands, fixedBrand, closest = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startNav] = useTransition();
  const [term, setTerm] = useState(query.q ?? "");

  // push a new query into the URL; the server component re-renders with fresh results
  const navigate = (patch: Partial<ProductQuery>) => {
    const next = { ...query, ...patch, page: 1 };
    const s = toSearchParams(next, fixedBrand ? ["brand"] : []);
    startNav(() => router.replace(`${pathname}${s.size ? `?${s}` : ""}`, { scroll: false }));
  };
  useEffect(() => {
    if ((query.q ?? "") === term) return;
    const t = window.setTimeout(() => navigate({ q: term || undefined, sort: term ? query.sort : query.sort === "relevance" ? undefined : query.sort }), 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const listKey = toSearchParams(query).toString();
  return (
    <>
      <div className="toolbar" role="search">
        <div className="wrap">
          <div className="row">
            <label className="search">
              <span className="sr-only">Search products</span>
              <SearchIcon />
              <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} enterKeyHint="search"
                placeholder={fixedBrand ? "Search this brand by name, code or CAS no." : "Search 100,000+ items by name, code or CAS no."}
                aria-label="Search products by name, catalogue code or CAS number" />
            </label>
            {brands && (
              <span className="select">
                <select aria-label="Brand" value={query.brand ?? ""} onChange={(e) => navigate({ brand: e.target.value || undefined })}>
                  <option value="">All brands</option>
                  {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                </select>
              </span>
            )}
            <span className="select">
              <select aria-label="GST basis of list rate" value={query.basis ?? ""} onChange={(e) => navigate({ basis: (e.target.value || undefined) as ProductQuery["basis"] })}>
                <option value="">Any price basis</option>
                <option value="excl_gst">Rates excl. GST</option>
                <option value="unknown">GST basis not stated</option>
              </select>
            </span>
            <span className="select">
              <select aria-label="Sort" value={query.sort ?? (query.q ? "relevance" : "name")} onChange={(e) => navigate({ sort: e.target.value as ProductQuery["sort"] })}>
                {query.q && <option value="relevance">Best match</option>}
                <option value="name">Name A–Z</option>
                <option value="code">Catalogue code</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </span>
          </div>
          <div className="cat-chips" role="group" aria-label="Category">
            <button type="button" className="chip" aria-pressed={!query.category} onClick={() => navigate({ category: undefined })}>All categories</button>
            {categories.map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={query.category === c.slug}
                onClick={() => navigate({ category: query.category === c.slug ? undefined : c.slug })}>
                {c.name}{c.count !== undefined ? ` · ${c.count.toLocaleString("en-IN")}` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap">
        <CatalogueList closest={closest} key={listKey} initial={initial} query={query} showBrand={!fixedBrand} />
      </div>
    </>
  );
}

/** Windowed list: only the rows near the viewport are in the DOM, however far you scroll. */
function CatalogueList({ initial, query, showBrand, closest }: {
  initial: Page<ProductSummary>; query: ProductQuery & { page: number }; showBrand: boolean; closest: ProductSummary[];
}) {
  const env = useMotionEnv();
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initial.offset + initial.items.length);
  const [margin, setMargin] = useState(0);
  const hasMore = offsetRef.current < total;

  useEffect(() => { setMargin(listRef.current?.offsetTop ?? 0); }, []);
  const v = useWindowVirtualizer({
    count: items.length, estimateSize: () => 92, overscan: 8, scrollMargin: margin,
    getItemKey: (i) => items[i]!.id,
  });

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true); setError(false);
    try {
      const s = toSearchParams(query);
      s.set("offset", String(offsetRef.current));
      s.delete("page");
      const res = await fetch(`/api/products?${s}`);
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as Page<ProductSummary>;
      offsetRef.current += page.items.length;
      setItems((cur) => [...cur, ...page.items]);
      if (page.items.length < PAGE_SIZE) setTotal(offsetRef.current);
    } catch { setError(true); } finally { setLoading(false); }
  };

  // auto-load as the sentinel approaches the viewport
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) void loadMore(); }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  });

  // first page: the shared row entrance
  useEffect(() => {
    if (!env.ready || !listRef.current) return;
    return staggerIn(Array.from(listRef.current.querySelectorAll(".prow")).slice(0, 12), env);
  }, [env.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(initial.total / PAGE_SIZE));
  const pageHref = (n: number) => { const s = toSearchParams({ ...query, page: n }); return `?${s}`; };

  if (!items.length && closest.length)
    return (
      <>
        <div className="results-meta" aria-live="polite">
          <span>No exact match{query.q ? <> for “{query.q}”</> : null}. <b>Closest items we list:</b></span>
          <span>Not what you need? <Link href="/quote" style={{ color: "var(--brand-dk)", fontWeight: 600 }}>Send your list</Link> — the office prices unlisted items too.</span>
        </div>
        <ul className="prows closest">
          {closest.map((p) => <li key={p.id}><ProductRow p={p} showBrand={showBrand} /></li>)}
        </ul>
      </>
    );

  if (!items.length)
    return (
      <div className="empty" style={{ marginTop: 24 }}>
        <h2>Nothing matches that yet.</h2>
        <p>Try a shorter search, a catalogue code, or a CAS number. Or send the list as you have it — the office prices items that are not listed here too.</p>
        <p style={{ marginTop: 18 }}><Link className="btn btn-primary" href="/quote">Send your list instead</Link></p>
      </div>
    );

  return (
    <>
      <div className="results-meta" aria-live="polite">
        <span><b>{total.toLocaleString("en-IN")}</b> item{total === 1 ? "" : "s"}{query.q ? <> for “{query.q}”</> : null}</span>
        <span>List rates are indicative. Final price on quotation.</span>
      </div>
      <ul className="prows" ref={listRef} style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((row) => (
          <li key={row.key} data-index={row.index} ref={v.measureElement}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start - v.options.scrollMargin}px)` }}>
            <ProductRow p={items[row.index]!} showBrand={showBrand} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} />
      <div className="pager">
        {loading && <span className="msg">Loading more…</span>}
        {error && <button className="btn btn-ghost btn-sm" onClick={() => void loadMore()}>Couldn’t load more — retry</button>}
        {!loading && !error && hasMore && <button className="btn btn-ghost btn-sm" onClick={() => void loadMore()}>Load more</button>}
        {!hasMore && items.length > PAGE_SIZE && <span className="msg">End of results.</span>}
      </div>
      {/* without JS (or for crawlers) the same results page through plain links */}
      <nav className="pager pager-static" aria-label="Pages">
        {query.page > 1 && <Link className="btn btn-ghost btn-sm" href={pageHref(query.page - 1)} rel="prev">← Previous</Link>}
        <span className="msg">Page {query.page} of {pages.toLocaleString("en-IN")}</span>
        {query.page < pages && <Link className="btn btn-ghost btn-sm" href={pageHref(query.page + 1)} rel="next">Next →</Link>}
      </nav>
    </>
  );
}
