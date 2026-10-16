import { redirect } from "next/navigation";
import { saveBrand, saveCategory } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { BASIS_LABEL } from "@/lib/format";
import { adminRepos } from "@/lib/repositories";

export default async function AdminBrands() {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const [brands, cats] = await Promise.all([r.catalogue.listBrands(), r.catalogue.listCategories()]);
  const row = { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) auto auto", gap: 8, alignItems: "center" } as const;
  return (
    <>
      <AdminNav current="/admin/brands" email={r.email} />
      <h1>Brands &amp; categories</h1>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>Rename a brand, change its URL slug, or switch it on/off in the public catalogue. Scanned-list brands stay off until their rows are reviewed.</p>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th style={{ width: "60%" }}>Brand (name · slug · live)</th><th>Live items</th><th>Price basis</th></tr></thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id}>
              <td><form action={saveBrand} style={row}>
                <input type="hidden" name="id" value={b.id} />
                <input type="text" name="name" defaultValue={b.name} aria-label="Brand name" />
                <input type="text" name="slug" defaultValue={b.slug} aria-label="Slug" />
                <label className="switch"><input type="checkbox" name="isActive" defaultChecked={b.isActive} />Live</label>
                <button className="btn btn-ghost btn-sm" type="submit">Save</button>
              </form></td>
              <td>{b.productCount.toLocaleString("en-IN")}</td><td><small>{BASIS_LABEL[b.priceBasis]}</small></td>
            </tr>
          ))}
          <tr><td colSpan={3}><form action={saveBrand} style={row}>
            <input type="text" name="name" placeholder="New brand name" aria-label="New brand name" required />
            <input type="text" name="slug" placeholder="new-brand-slug" aria-label="New brand slug" required pattern="[a-z0-9-]{2,60}" />
            <label className="switch"><input type="checkbox" name="isActive" />Live</label>
            <button className="btn btn-primary btn-sm" type="submit">Add brand</button>
          </form></td></tr>
        </tbody>
      </table></div>
      <h2 style={{ fontSize: 22, margin: "28px 0 12px" }}>Categories</h2>
      <div className="tbl-wrap"><table className="tbl"><tbody>
        {cats.map((c) => (
          <tr key={c.id}><td><form action={saveCategory} style={{ ...row, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) auto" }}>
            <input type="hidden" name="id" value={c.id} />
            <input type="text" name="name" defaultValue={c.name} aria-label="Category name" />
            <input type="text" name="slug" defaultValue={c.slug} aria-label="Category slug" />
            <button className="btn btn-ghost btn-sm" type="submit">Save</button>
          </form></td></tr>
        ))}
        <tr><td><form action={saveCategory} style={{ ...row, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) auto" }}>
          <input type="text" name="name" placeholder="New category" aria-label="New category name" required />
          <input type="text" name="slug" placeholder="new-category" aria-label="New category slug" required pattern="[a-z0-9-]{2,60}" />
          <button className="btn btn-primary btn-sm" type="submit">Add category</button>
        </form></td></tr>
      </tbody></table></div>
    </>
  );
}
