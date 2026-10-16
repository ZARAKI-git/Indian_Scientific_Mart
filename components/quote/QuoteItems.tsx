"use client";
import Link from "next/link";
import { cart, useQuoteCart } from "@/lib/quote/cart";
import { formatINR } from "@/lib/format";
import { CloseIcon } from "@/components/ui/icons";

/** The quote list: editable quantities and notes; never shows a total as if it were a price. */
export function QuoteItems() {
  const items = useQuoteCart();
  if (!items.length)
    return (
      <div className="qempty">
        Your list is empty. <Link href="/catalogue" style={{ color: "var(--brand-dk)", fontWeight: 600 }}>Browse the catalogue</Link> and
        use “Add to quote”, or just paste your list in the message box.
      </div>
    );
  return (
    <>
      <ul className="qitems" aria-label="Items in your quote list">
        {items.map((i) => (
          <li className="qitem" key={i.productId}>
            <div>
              <b><Link href={`/products/${i.productId}`}>{i.name}</Link></b>
              <small>{i.brand} · {i.code}{i.packSize ? ` · ${i.packSize}` : ""} · {i.priceOnRequest || i.listRate === null ? "price on request" : `list ${formatINR(i.listRate)}`}</small>
            </div>
            <span className="qty sm" role="group" aria-label={`Quantity of ${i.name}`}>
              <button type="button" aria-label="Decrease" onClick={() => cart.setQty(i.productId, i.qty - 1)}>−</button>
              <input type="number" inputMode="numeric" min={1} value={i.qty} aria-label="Quantity" onChange={(e) => cart.setQty(i.productId, Number(e.target.value))} />
              <button type="button" aria-label="Increase" onClick={() => cart.setQty(i.productId, i.qty + 1)}>+</button>
            </span>
            <button type="button" className="rm" aria-label={`Remove ${i.name}`} onClick={() => cart.remove(i.productId)}><CloseIcon /></button>
            <label className="note-in">
              <span className="sr-only">Note for {i.name}</span>
              <input type="text" maxLength={300} placeholder="Note (grade, make preference, delivery…)" value={i.note} onChange={(e) => cart.setNote(i.productId, e.target.value)} />
            </label>
          </li>
        ))}
      </ul>
      <div className="qsum">
        <span>{items.length} item{items.length > 1 ? "s" : ""} · {items.reduce((n, i) => n + i.qty, 0).toLocaleString("en-IN")} units</span>
        <button type="button" onClick={() => cart.clear()} style={{ color: "var(--brand-dk)", fontWeight: 600 }}>Clear list</button>
      </div>
    </>
  );
}
