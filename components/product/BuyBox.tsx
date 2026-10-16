"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductSummary } from "@/lib/domain/types";
import { useQuoteCart } from "@/lib/quote/cart";
import { AddToQuote } from "@/components/quote/AddToQuote";

export function BuyBox({ p }: { p: ProductSummary }) {
  const [qty, setQty] = useState(1);
  const inList = useQuoteCart().find((i) => i.productId === p.id);
  const set = (n: number) => setQty(Math.min(100000, Math.max(1, Math.round(n) || 1)));
  return (
    <div className="buy-row">
      <span className="qty" role="group" aria-label="Quantity">
        <button type="button" aria-label="Decrease quantity" onClick={() => set(qty - 1)}>−</button>
        <input type="number" inputMode="numeric" min={1} max={100000} value={qty} aria-label="Quantity" onChange={(e) => set(Number(e.target.value))} />
        <button type="button" aria-label="Increase quantity" onClick={() => set(qty + 1)}>+</button>
      </span>
      <AddToQuote p={p} qty={qty} size="md" />
      {inList && <Link href="/quote" className="btn btn-ghost">Review list ({inList.qty} in list)</Link>}
    </div>
  );
}
