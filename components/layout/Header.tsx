"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuoteCart } from "@/lib/quote/cart";
import { headerStore, useHeaderState } from "@/lib/ui/headerStore";
import { ListIcon } from "@/components/ui/icons";
import { LogoMark } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV } from "./nav";

/** Fixed header from the reference: blurs to solid on scroll, `on-dark` over dark heroes. */
export function Header() {
  const pathname = usePathname();
  const { solid, onDark, active, engine } = useHeaderState();
  const [open, setOpen] = useState(false);
  const count = useQuoteCart().length;

  // pages without the scene engine: solid after 30px of scroll, like initScrollMode()
  useEffect(() => {
    if (engine) return;
    const on = () => headerStore.set({ solid: window.scrollY > 30 });
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [engine, pathname]);
  useEffect(() => setOpen(false), [pathname]);

  const isOn = (id: string, href: string) => (pathname === "/" ? active === id : pathname.startsWith(href));

  return (
    <>
      <header className={`hdr${solid ? " solid" : ""}${onDark ? " on-dark" : ""}`} id="hdr">
        <div className="wrap">
          <Link className="brand" href="/#top" aria-label="Indian Scientific Mart, home">
            <LogoMark />
            <span><b>Indian Scientific Mart</b><small>Science for Everyone · Cuttack</small></span>
          </Link>
          <nav className="main" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={isOn(n.id, n.href) ? "on" : undefined}
                aria-current={isOn(n.id, n.href) ? "page" : undefined}>{n.label}</Link>
            ))}
          </nav>
          <Link href="/quote" className="btn btn-primary" aria-label={`Request a quote${count ? `, ${count} item${count > 1 ? "s" : ""} in your list` : ""}`}>
            Request a quote{count > 0 && <span className="qbadge" aria-hidden="true">{count}</span>}
          </Link>
          <div className="burger-wrap">
            <Link href="/quote" className="qmini" aria-label={`Quote list, ${count} item${count === 1 ? "" : "s"}`}>
              <ListIcon />{count > 0 && <span className="qbadge" aria-hidden="true">{count}</span>}
            </Link>
            <button className="burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="menu" onClick={() => setOpen((o) => !o)}>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M0 1h18M0 6h18M0 11h18" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} count={count} />
    </>
  );
}
