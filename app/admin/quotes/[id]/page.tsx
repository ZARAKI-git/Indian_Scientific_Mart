import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setQuoteStatus } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { formatINR } from "@/lib/format";
import { adminRepos } from "@/lib/repositories";

export default async function AdminQuote({ params }: { params: Promise<{ id: string }> }) {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const q = await r.quotes.get(id);
  if (!q) notFound();
  return (
    <>
      <AdminNav current="/admin/quotes" email={r.email} />
      <p className="crumbs"><Link href="/admin/quotes">← All requests</Link></p>
      <h1>{q.name}{q.institution ? `, ${q.institution}` : ""}</h1>
      <p style={{ color: "var(--muted)" }}>{new Date(q.createdAt).toLocaleString("en-IN")} · <a href={`mailto:${q.email}`} style={{ color: "var(--brand-dk)" }}>{q.email}</a>{q.phone ? ` · ${q.phone}` : ""} · ref {q.id.slice(0, 8).toUpperCase()}</p>
      {q.needs.length > 0 && <p style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{q.needs.map((n) => <span key={n} className="pill-sm">{n}</span>)}</p>}
      <form action={setQuoteStatus} style={{ display: "flex", gap: 10, alignItems: "center", margin: "18px 0" }}>
        <input type="hidden" name="id" value={q.id} />
        <span className="select"><select name="status" defaultValue={q.status} aria-label="Status">
          <option value="new">New</option><option value="in_progress">In progress</option><option value="quoted">Quoted</option><option value="closed">Closed</option>
        </select></span>
        <button className="btn btn-primary btn-sm" type="submit">Update status</button>
      </form>
      {q.message && <div className="qcard" style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}><b>Message</b><p style={{ marginTop: 8 }}>{q.message}</p></div>}
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Qty</th><th>Item</th><th>Brand · code</th><th>List rate (at request)</th><th>Note</th></tr></thead>
        <tbody>{q.items.map((i, n) => (
          <tr key={n}><td><b>{i.qty}</b></td><td>{i.productId ? <Link href={`/products/${i.productId}`} target="_blank" style={{ color: "var(--brand-dk)" }}>{i.name}</Link> : i.name}</td>
            <td>{i.brand} · <code>{i.code}</code></td><td>{i.listRate !== null ? formatINR(i.listRate) : "POR"}</td><td>{i.note}</td></tr>))}
          {!q.items.length && <tr><td colSpan={5}>No catalogue items — see the message.</td></tr>}</tbody>
      </table></div>
    </>
  );
}
