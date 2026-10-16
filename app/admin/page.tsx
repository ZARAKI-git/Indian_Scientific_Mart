import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminRepos } from "@/lib/repositories";

export default async function AdminHome() {
  const r = await adminRepos();
  if (!r) redirect("/admin/login?denied=1");
  const [s, recent] = await Promise.all([r.catalogue.stats(), r.quotes.list(5, 0)]);
  return (
    <>
      <AdminNav current="/admin" email={r.email} />
      <h1>Overview</h1>
      <dl className="stat-grid">
        <div className="stat"><dt>Live products</dt><dd>{s.live.toLocaleString("en-IN")}</dd></div>
        <div className="stat"><dt>Awaiting review</dt><dd>{s.review.toLocaleString("en-IN")}</dd></div>
        <div className="stat"><dt>Hidden</dt><dd>{s.inactive.toLocaleString("en-IN")}</dd></div>
        <div className="stat"><dt>New quote requests</dt><dd>{s.newQuotes}</dd></div>
      </dl>
      <h2 style={{ fontSize: 22, margin: "26px 0 12px" }}>Latest quote requests</h2>
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>When</th><th>From</th><th>Items</th><th>Status</th></tr></thead><tbody>
        {recent.items.map((q) => (
          <tr key={q.id}><td>{new Date(q.createdAt).toLocaleString("en-IN")}</td>
            <td><Link href={`/admin/quotes/${q.id}`} style={{ color: "var(--brand-dk)", fontWeight: 600 }}>{q.name}</Link>{q.institution ? ` · ${q.institution}` : ""}</td>
            <td>{q.items.length}</td><td>{q.status}</td></tr>
        ))}
        {!recent.items.length && <tr><td colSpan={4}>No requests yet.</td></tr>}
      </tbody></table></div>
    </>
  );
}

