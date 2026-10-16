import Link from "next/link";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <main id="main" className="page">
        <section className="page-hero"><div className="sky-bg" /><div className="grid-bg" />
          <div className="wrap" style={{ position: "relative" }}>
            <span className="tag">Not found</span>
            <h1>That page isn&apos;t on the shelf.</h1>
            <p className="lede">The link may be old, or the item may have left a maker&apos;s current list. Search the catalogue, or send your list and the office will price it.</p>
            <div className="hero-cta"><Link className="btn btn-primary" href="/catalogue">Search the catalogue</Link><Link className="btn btn-ghost" href="/quote">Send a list</Link></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
