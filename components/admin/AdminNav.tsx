import Link from "next/link";
import { signOut } from "@/app/admin/actions";

const LINKS = [["/admin", "Overview"], ["/admin/products", "Products"], ["/admin/review", "Review queue"], ["/admin/quotes", "Quote requests"], ["/admin/brands", "Brands & categories"]] as const;

export function AdminNav({ current, email }: { current: string; email: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <nav className="admin-nav" aria-label="Admin">
        {LINKS.map(([href, label]) => <Link key={href} href={href} className={current === href ? "on" : undefined} aria-current={current === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <form action={signOut} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--muted)", marginBottom: 22 }}>
        {email}<button className="btn btn-ghost btn-sm" type="submit">Sign out</button>
      </form>
    </div>
  );
}
