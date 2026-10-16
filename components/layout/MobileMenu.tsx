"use client";
import Link from "next/link";
import { useEffect } from "react";
import { NAV } from "./nav";

export function MobileMenu({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open, onClose]);
  return (
    <div className={`menu${open ? " open" : ""}`} id="menu" aria-hidden={!open} inert={!open}
      onClick={(e) => (e.target as HTMLElement).closest("a") && onClose()}>
      {NAV.map((n, i) => (
        <Link key={n.href} href={n.href}><span>{String(i + 1).padStart(2, "0")}</span>{n.label}</Link>
      ))}
      <Link href="/quote"><span>{String(NAV.length + 1).padStart(2, "0")}</span>Request a quote{count ? ` (${count})` : ""}</Link>
    </div>
  );
}
