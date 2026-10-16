import Link from "next/link";
import { redirect } from "next/navigation";
import { saveProduct } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminRepos } from "@/lib/repositories";
import { productHref } from "@/lib/format";

const PER = 40;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [brands, res] = await Promise.all([
    r.catalogue.listBrands(),
    r.catalogue.searchProducts({ q: sp.q, brand: sp.brand, limit: PER, offset: (page - 1) * PER }),
  ]);
  const back = `/admin/products?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`;
  const qs = (n: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.brand ? { brand: sp.brand } : {}), page: String(n) })}`;
  return (
    <>
      <AdminNav current="/admin/products" email={r.email} />
      <h1>Products</h1>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>Edit names and list rates, hide items, or mark them price-on-request. Re-running the ingestion keeps these edits.</p>
      <form className="toolbar on-white" style={{ position: "static", border: 0, padding: "0 0 14px", background: "none" }}>
        <div className="row" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
          <label className="search"><span className="sr-only">Search</span><input name="q" defaultValue={sp.q} placeholder="Code or name" /></label>
          <span className="select"><select name="brand" defaultValue={sp.brand ?? ""} aria-label="Brand">
            <option value="">All brands</option>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></span>
          <button className="btn btn-primary btn-sm" type="submit">Search</button>
        </div>
      </form>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{res.total.toLocaleString("en-IN")} products</p>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Code</th><th>Brand</th><th style={{ width: "38%" }}>Name</th><th>List rate ₹</th><th>Live</th><th>POR</th><th /></tr></thead>
        <tbody>
          {res.items.map((p) => (
            <tr key={p.id}>
              <td><Link href={productHref(p)} target="_blank" style={{ color: "var(--brand-dk)" }}>{p.code}</Link>{p.needsReview && <div><span className="pill-sm warn">review</span></div>}</td>
              <td>{p.brandName}</td>
              <td colSpan={5}>
                <form action={saveProduct} style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) minmax(90px,1fr) auto auto auto", gap: 10, alignItems: "center" }}>
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
                  <input type="text" name="name" defaultValue={p.name} aria-label="Name" />
                  <input type="text" name="listRate" inputMode="decimal" defaultValue={p.listRate ?? ""} aria-label="List rate" />
                  <label className="switch"><input type="checkbox" name="isActive" defaultChecked={p.isActive} />Live</label>
                  <label className="switch"><input type="checkbox" name="priceOnRequest" defaultChecked={p.priceOnRequest} />POR</label>
                  <button className="btn btn-ghost btn-sm" type="submit">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="pager">
        {page > 1 && <Link className="btn btn-ghost btn-sm" href={qs(page - 1)}>← Previous</Link>}
        <span className="msg">Page {page} of {Math.max(1, Math.ceil(res.total / PER))}</span>
        {page * PER < res.total && <Link className="btn btn-ghost btn-sm" href={qs(page + 1)}>Next →</Link>}
      </div>
    </>
  );
}
