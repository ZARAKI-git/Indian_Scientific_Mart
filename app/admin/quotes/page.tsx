import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminRepos } from "@/lib/repositories";

export default async function AdminQuotes({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const res = await r.quotes.list(30, (page - 1) * 30);
  return (
    <>
      <AdminNav current="/admin/quotes" email={r.email} />
      <h1>Quote requests</h1>
      <div className="tbl-wrap" style={{ marginTop: 16 }}><table className="tbl">
        <thead><tr><th>Received</th><th>From</th><th>Contact</th><th>Items</th><th>Status</th></tr></thead>
        <tbody>{res.items.map((q) => (
          <tr key={q.id}>
            <td>{new Date(q.createdAt).toLocaleString("en-IN")}</td>
            <td><Link href={`/admin/quotes/${q.id}`} style={{ color: "var(--brand-dk)", fontWeight: 600 }}>{q.name}</Link><br /><small>{q.institution}</small></td>
            <td><a href={`mailto:${q.email}`}>{q.email}</a><br /><small>{q.phone}</small></td>
            <td>{q.items.length}</td><td><span className={`pill-sm${q.status === "new" ? "" : " plain"}`}>{q.status.replace("_", " ")}</span></td>
          </tr>))}
          {!res.items.length && <tr><td colSpan={5}>No requests yet.</td></tr>}</tbody>
      </table></div>
      <div className="pager">
        {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?page=${page - 1}`}>← Newer</Link>}
        {page * 30 < res.total && <Link className="btn btn-ghost btn-sm" href={`?page=${page + 1}`}>Older →</Link>}
      </div>
    </>
  );
}
