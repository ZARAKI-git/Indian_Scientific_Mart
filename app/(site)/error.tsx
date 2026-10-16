"use client";
import Link from "next/link";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page-hero"><div className="sky-bg" />
      <div className="wrap" style={{ position: "relative" }}>
        <span className="tag">Something went wrong</span>
        <h1>The catalogue didn&apos;t load.</h1>
        <p className="lede">This is usually momentary. Try again, or send your list directly and the office will price it.</p>
        <div className="hero-cta"><button className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn btn-ghost" href="/quote">Send a list</Link></div>
      </div>
    </section>
  );
}
