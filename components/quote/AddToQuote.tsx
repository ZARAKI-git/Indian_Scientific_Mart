"use client";
import { useState } from "react";
import { cart, useQuoteCart } from "@/lib/quote/cart";
import type { ProductSummary } from "@/lib/domain/types";

/** Add / added toggle for a catalogue row. Works by tap or click; announces the change. */
export function AddToQuote({ p, qty = 1, size = "sm" }: { p: ProductSummary; qty?: number; size?: "sm" | "md" }) {
  const inList = useQuoteCart().some((i) => i.productId === p.id);
  const [flash, setFlash] = useState(false);
  const add = () => {
    cart.add({ productId: p.id, name: p.name, code: p.code, brand: p.brand.name, packSize: p.packSize, listRate: p.listRate,
      priceOnRequest: p.priceOnRequest }, qty);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  };
  return (
    <button type="button" className={`btn ${size === "sm" ? "btn-sm " : ""}btn-primary btn-add${inList ? " added" : ""}`} onClick={add}
      aria-label={`${inList ? "Add more" : "Add to quote"}: ${p.name}`}>
      <span aria-live="polite">{flash ? "Added ✓" : inList ? "Add more" : "Add to quote"}</span>
    </button>
  );
}
