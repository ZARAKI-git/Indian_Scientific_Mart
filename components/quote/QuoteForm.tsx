"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { submitQuote, type QuoteResult } from "@/app/actions/quote";
import { cart, useQuoteCart } from "@/lib/quote/cart";
import { Arrow } from "@/components/ui/icons";
import { NEEDS } from "./needs";

/**
 * The reference quote form (same fields, chips, honeypot and messages), now
 * submitting for real. `variant="scene"` is the home Quote scene; "page" is /quote.
 */
export function QuoteForm({ variant, onDone }: { variant: "scene" | "page"; onDone?: (r: Extract<QuoteResult, { ok: true }>) => void }) {
  const items = useQuoteCart();
  const [needs, setNeeds] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "" | "bad" | "good"; text: string }>({ kind: "", text: "" });
  const [errField, setErrField] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const pre = (e: Event) => { const l = (e as CustomEvent<string>).detail; setNeeds((n) => (n.includes(l) ? n : [...n, l])); };
    document.addEventListener("quote:preselect", pre);
    return () => document.removeEventListener("quote:preselect", pre);
  }, []);

  const fail = (field: string | undefined, text: string) => {
    setErrField(field ?? null);
    setMsg({ kind: "bad", text });
    if (field) form.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus({ preventScroll: true });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrField(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    if (get("website")) return; // honeypot: silently drop bots
    const name = get("name").trim(), mail = get("email").trim();
    if (!name) return fail("name", "Add your name so the quote can be addressed to you.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return fail("email", "That email doesn't look right. Please check it.");
    if (!items.length && !get("message").trim()) return fail("message", "Add items from the catalogue, or paste your list here.");
    setMsg({ kind: "", text: "Sending…" });
    start(async () => {
      const r = await submitQuote({
        name, email: mail, institution: get("org"), phone: get("phone"), message: get("message"), website: get("website"),
        needs, lines: items.map((i) => ({ productId: i.productId, qty: i.qty, note: i.note || undefined })),
      });
      if (!r.ok) return fail(r.field, r.error);
      setMsg({ kind: "good", text: `Thanks, ${r.firstName}. Your list${r.items ? ` of ${r.items} item${r.items > 1 ? "s" : ""}` : ""} is with the office (ref ${r.ref}). We reply with a price against current stock.` });
      cart.clear();
      form.current?.reset();
      setNeeds([]);
      onDone?.(r);
    });
  };

  const field = (id: string) => `field${errField === id ? " err" : ""}`;
  return (
    <form className="qcard" id="qform" noValidate data-a ref={form} onSubmit={submit}>
      <span className="tag">Request a quote</span>
      <h2>{variant === "page" ? "Your details." : "Send your list."}</h2>
      <p>Tell us what you need. We reply with a price against current stock.</p>
      <div className="fgrid">
        <div className={field("name")}><label htmlFor="n">Your name</label><input id="n" name="name" placeholder="Full name" autoComplete="name" maxLength={80} required aria-invalid={errField === "name"} /></div>
        <div className="field"><label htmlFor="i">Institution</label><input id="i" name="org" placeholder="School, college, institute or hospital" autoComplete="organization" maxLength={120} /></div>
        <div className={field("email")}><label htmlFor="e">Email</label><input id="e" name="email" type="email" placeholder="name@institution.ac.in" autoComplete="email" maxLength={120} required aria-invalid={errField === "email"} /></div>
        <div className={field("phone")}><label htmlFor="p">Phone</label><input id="p" name="phone" type="tel" placeholder="+91" autoComplete="tel" maxLength={20} /></div>
        <div className="span2">
          <span className="flabel" id="catlbl">What do you need?</span>
          <div className="chips" role="group" aria-labelledby="catlbl" id="chips">
            {NEEDS.map((n) => (
              <button key={n} type="button" className="chip" role="checkbox" aria-checked={needs.includes(n)}
                onClick={() => setNeeds((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))}>{n}</button>
            ))}
          </div>
        </div>
        <div className={`${field("message")} span2`}>
          <label htmlFor="m">{items.length ? "Anything else to add?" : "Your list, or what you are equipping"}</label>
          <textarea id="m" name="message" rows={3} maxLength={4000}
            placeholder={items.length ? "Delivery location, deadlines, grades, or items not in the catalogue." : "Paste a list, or describe the bench you need to fit out."} />
        </div>
        <div className="hp" aria-hidden="true"><label htmlFor="w">Leave blank</label><input id="w" name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="form-foot span2">
          <button className="btn btn-primary" type="submit" disabled={pending}>Send enquiry <Arrow /></button>
          {variant === "scene" && (
            <Link href={items.length ? "/quote" : "/catalogue"} className="btn btn-ghost">
              {items.length ? `Review ${items.length} item${items.length > 1 ? "s" : ""}` : "Browse the catalogue"}
            </Link>
          )}
          <span className={`msg${msg.kind ? " " + msg.kind : ""}`} id="formmsg" role="status" aria-live="polite">
            {msg.text || (items.length ? `${items.length} catalogue item${items.length > 1 ? "s" : ""} will be attached.` : "Prices are confirmed by the office on reply.")}
          </span>
        </div>
      </div>
    </form>
  );
}
