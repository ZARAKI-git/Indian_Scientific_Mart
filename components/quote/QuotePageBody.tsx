"use client";
import Link from "next/link";
import { useState } from "react";
import type { QuoteResult } from "@/app/actions/quote";
import { Tick } from "@/components/ui/icons";
import { ContactAside } from "./ContactAside";
import { QuoteForm } from "./QuoteForm";
import { QuoteItems } from "./QuoteItems";

export function QuotePageBody() {
  const [done, setDone] = useState<Extract<QuoteResult, { ok: true }> | null>(null);
  if (done)
    return (
      <div className="qcard done" role="status">
        <span className="tick"><Tick /></span>
        <h2>Thanks, {done.firstName}. Your list is with the office.</h2>
        <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: "56ch" }}>
          {done.items ? `${done.items} item${done.items > 1 ? "s" : ""} were sent with list rates as reference. ` : ""}
          You will get a price against current stock and your quantities. List rates shown on the site are indicative; the quote is the price.
        </p>
        <p style={{ marginTop: 14 }}>Reference <span className="ref">{done.ref}</span></p>
        <div className="hero-cta"><Link className="btn btn-primary" href="/catalogue">Back to the catalogue</Link><Link className="btn btn-ghost" href="/">Home</Link></div>
      </div>
    );
  return (
    <div className="quote-grid">
      <div style={{ display: "grid", gap: 18 }}>
        <div className="qcard" data-a>
          <span className="tag">Your list</span>
          <h2 style={{ marginBottom: 14 }}>Items to price.</h2>
          <QuoteItems />
        </div>
        <QuoteForm variant="page" onDone={setDone} />
      </div>
      <ContactAside />
    </div>
  );
}
