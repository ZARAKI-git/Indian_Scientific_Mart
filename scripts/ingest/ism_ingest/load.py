"""Load the reviewed pipeline output into Supabase (idempotent).

  python -m ism_ingest.load --in out [--dry-run]

Upserts categories (by slug), brands (by slug) and products (by brand_id + code)
through PostgREST with the service-role key from ../../.env.local. Rows from a
previous run that are no longer in the source are deactivated, never deleted,
so quote history keeps its product links. Admin edits to list rate, is_active
and price_on_request are preserved unless --overwrite-admin-edits is passed.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from .sources import BRANDS
from .taxonomy import CATEGORIES

ROOT = Path(__file__).resolve().parents[3]


def _vals() -> dict[str, str]:
    vals = dict(os.environ)
    f = ROOT / ".env.local"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                vals.setdefault(k.strip(), v.strip().strip('"'))
    return vals


def env() -> tuple[str, str]:
    vals = _vals()
    url, key = vals.get("NEXT_PUBLIC_SUPABASE_URL"), vals.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local)")
    return url.rstrip("/"), key


class Rest:
    def __init__(self, url: str, key: str):
        self.base, self.key = f"{url}/rest/v1", key

    def call(self, method: str, path: str, body=None, prefer: str | None = None, tries: int = 4):
        data = None if body is None else json.dumps(body).encode()
        for attempt in range(tries):
            req = urllib.request.Request(f"{self.base}/{path}", data=data, method=method)
            req.add_header("apikey", self.key)
            req.add_header("Authorization", f"Bearer {self.key}")
            req.add_header("Content-Type", "application/json")
            if prefer:
                req.add_header("Prefer", prefer)
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    raw = r.read()
                    return json.loads(raw) if raw else None
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:500]
                if e.code >= 500 and attempt < tries - 1:
                    time.sleep(2 ** attempt); continue
                raise SystemExit(f"{method} {path} -> {e.code}: {msg}")
            except urllib.error.URLError:
                if attempt < tries - 1:
                    time.sleep(2 ** attempt); continue
                raise

    def select_all(self, path: str, page: int = 1000):
        out, start = [], 0
        while True:
            sep = "&" if "?" in path else "?"
            rows = self.call("GET", f"{path}{sep}limit={page}&offset={start}")
            out += rows
            if len(rows) < page:
                return out
            start += page


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", type=Path, default=Path("out"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--overwrite-admin-edits", action="store_true")
    ap.add_argument("--batch", type=int, default=800)
    a = ap.parse_args()

    products = [json.loads(l) for l in (a.inp / "products.jsonl").open()]
    print(f"{len(products):,} products in {a.inp}/products.jsonl")
    if a.dry_run:
        return
    db = Rest(*env())

    db.call("POST", "categories?on_conflict=slug", [{"name": n, "slug": s, "display_order": i} for i, (s, n) in enumerate(CATEGORIES)],
            prefer="resolution=merge-duplicates,return=minimal")
    cats = {c["slug"]: c["id"] for c in db.call("GET", "categories?select=id,slug")}

    brand_rows = [{"name": b.name, "slug": b.slug, "country": b.country, "is_active": b.active,
                   "source_file": ", ".join(f.filename for f in b.files if not f.superseded_by),
                   "price_basis": b.price_basis, "price_as_of": b.price_as_of, "note": b.note, "display_order": i}
                  for i, b in enumerate(BRANDS)]
    db.call("POST", "brands?on_conflict=slug", brand_rows, prefer="resolution=merge-duplicates,return=minimal")
    brands = {b["slug"]: b["id"] for b in db.call("GET", "brands?select=id,slug")}

    # admin-owned fields are not overwritten for rows that already exist
    existing = {}
    if not a.overwrite_admin_edits:
        for r in db.select_all("products?select=brand_id,code,list_rate,is_active,price_on_request,needs_review,image_url"):
            existing[(r["brand_id"], r["code"])] = r

    seen: dict[int, set[str]] = {}
    batch: list[dict] = []
    sent = 0

    def flush():
        nonlocal sent, batch
        if batch:
            db.call("POST", "products?on_conflict=brand_id,code", batch, prefer="resolution=merge-duplicates,return=minimal")
            sent += len(batch); batch = []
            print(f"\r  upserted {sent:,}", end="", flush=True)

    for p in products:
        bid = brands[p["brand_slug"]]
        seen.setdefault(bid, set()).add(p["code"])
        row = {
            "brand_id": bid, "category_id": cats[p["category_slug"]], "code": p["code"], "name": p["name"],
            "description": p["description"], "cas_no": p["cas_no"], "pack_size": p["pack_size"], "unit": p["unit"],
            "hsn_code": p["hsn_code"], "gst_rate": p["gst_rate"], "list_rate": p["list_rate"], "currency": p["currency"],
            "price_basis": p["price_basis"], "price_on_request": p["price_on_request"], "price_as_of": p["price_as_of"],
            "specs": p["specs"], "source_file": p["source_file"], "source_page": p["source_page"],
            "is_active": True, "needs_review": p["needs_review"], "review_reason": p["review_reason"],
            "updated_at": "now()",
        }
        prev = existing.get((bid, p["code"]))
        if prev:
            row["list_rate"], row["is_active"], row["price_on_request"] = prev["list_rate"], prev["is_active"], prev["price_on_request"]
            row["needs_review"] = prev["needs_review"] and p["needs_review"]   # once approved, stays approved
            if prev.get("image_url"):
                row["image_url"] = prev["image_url"]
        row.pop("updated_at")
        batch.append(row)
        if len(batch) >= a.batch:
            flush()
    flush()
    print()

    # deactivate rows that vanished from a brand's source
    gone = 0
    for slug, bid in brands.items():
        if bid not in seen:
            continue
        current = db.select_all(f"products?select=id,code&brand_id=eq.{bid}&is_active=eq.true")
        stale = [r["id"] for r in current if r["code"] not in seen[bid]]
        for i in range(0, len(stale), 300):
            ids = ",".join(map(str, stale[i:i + 300]))
            db.call("PATCH", f"products?id=in.({ids})", {"is_active": False}, prefer="return=minimal")
        gone += len(stale)
    db.call("POST", "rpc/refresh_brand_counts", {})
    print(f"done: {sent:,} upserted, {gone:,} deactivated (no longer in source)")
    revalidate_site()


def revalidate_site() -> None:
    """Ask the running site to drop cached catalogue reads (otherwise they expire within 5 minutes)."""
    v = _vals()
    site, secret = v.get("NEXT_PUBLIC_SITE_URL"), v.get("REVALIDATE_SECRET")
    if not (site and secret):
        print("site cache: not purged (set NEXT_PUBLIC_SITE_URL + REVALIDATE_SECRET); it refreshes within 5 minutes")
        return
    req = urllib.request.Request(f"{site.rstrip('/')}/api/revalidate", method="POST", headers={"x-revalidate-secret": secret})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        print("site cache: purged")
    except Exception as e:  # the site may simply not be running locally
        print(f"site cache: could not reach {site} ({e}); it refreshes within 5 minutes")


if __name__ == "__main__":
    main()
