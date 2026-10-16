import Link from "next/link";
import { NAV } from "./nav";

/** The reference footer, as a standalone block for natural-scroll pages. */
export function Footer({ bare = false }: { bare?: boolean }) {
  const inner = (
    <footer className="foot">
      <span>© {new Date().getFullYear()} Indian Scientific Mart · Cuttack, Odisha · Est. 2013 · GST registered 2017</span>
      <nav aria-label="Footer">{NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}<Link href="/quote">Request a quote</Link></nav>
      <span>List rates are indicative and taken from each maker&apos;s published price list. Final price on quotation.</span>
      <span style={{ flexBasis: "100%", textAlign: "center", paddingTop: 6 }}>Designed &amp; built by <b style={{ color: "var(--brand-dk)", fontWeight: 600 }}>Zenkai</b></span>
    </footer>
  );
  if (bare) return inner;
  return <div className="section alt" style={{ paddingTop: 0, paddingBottom: 28 }}><div className="wrap">{inner}</div></div>;
}
