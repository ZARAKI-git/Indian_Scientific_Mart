import Link from "next/link";
import { redirect } from "next/navigation";
import { approve, rejectReview, saveProduct } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminRepos } from "@/lib/repositories";

const PER = 30;

/** Rows the pipeline could not trust (OCR'd scans, unconfirmed maker, conflicting duplicates). */
export default async function ReviewQueue({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [brands, res] = await Promise.all([r.catalogue.listBrands(),
    r.catalogue.searchProducts({ review: true, brand: sp.brand, q: sp.q, limit: PER, offset: (page - 1) * PER })]);
  const back = `/admin/review?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <AdminNav current="/admin/review" email={r.email} />
      <h1>Review queue</h1>
      <p style={{ color: "var(--muted)", marginBottom: 16, maxWidth: "70ch" }}>
        These rows came from scanned lists (read by OCR) or could not be verified automatically. Check each against the source page, correct the
        name or price, then approve it into the live catalogue. Rows from inactive brands (e.g. scanned lists) only appear publicly once the brand is switched on.
      </p>
      <form style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="select"><select name="brand" defaultValue={sp.brand ?? ""} aria-label="Brand">
          <option value="">All brands</option>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></span>
        <button className="btn btn-ghost btn-sm" type="submit">Filter</button>
      </form>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{res.total.toLocaleString("en-IN")} rows waiting</p>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Source</th><th>Reason</th><th style={{ width: "50%" }}>Edit</th><th>Decide</th></tr></thead>
        <tbody>{res.items.map((p) => (
          <tr key={p.id}>
            <td><b>{p.brandName}</b><br /><code>{p.code}</code><br /><small>{p.sourceFile}{p.sourcePage ? ` · p.${p.sourcePage}` : ""}</small></td>
            <td><small>{p.reviewReason}</small></td>
            <td>
              <form action={saveProduct} style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) minmax(80px,1fr) auto", gap: 8 }}>
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} /><input type="hidden" name="isActive" value="on" />
                <input type="text" name="name" defaultValue={p.name} aria-label="Name" />
                <input type="text" name="listRate" inputMode="decimal" defaultValue={p.listRate ?? ""} aria-label="List rate" placeholder="POR" />
                <button className="btn btn-ghost btn-sm" type="submit">Save</button>
              </form>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>
              <form action={approve} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
                <button className="btn btn-primary btn-sm" type="submit">Approve</button></form>{" "}
              <form action={rejectReview} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
                <button className="btn btn-ghost btn-sm" type="submit">Hide</button></form>
            </td>
          </tr>
        ))}
        {!res.items.length && <tr><td colSpan={4}>Nothing waiting.</td></tr>}</tbody>
      </table></div>
      <div className="pager">
        {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?page=${page - 1}${sp.brand ? `&brand=${sp.brand}` : ""}`}>← Previous</Link>}
        <span className="msg">Page {page} of {Math.max(1, Math.ceil(res.total / PER))}</span>
        {page * PER < res.total && <Link className="btn btn-ghost btn-sm" href={`?page=${page + 1}${sp.brand ? `&brand=${sp.brand}` : ""}`}>Next →</Link>}
      </div>
    </>
  );
}
