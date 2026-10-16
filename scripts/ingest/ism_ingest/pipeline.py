"""Run every brand parser, normalise, de-duplicate, and write the review set.

Output (in --out):
  products.jsonl   one normalised Product per line (live + review rows)
  products.csv     same, for spreadsheet review
  report.json/.md  per-brand counts: parsed, skipped, flagged, with reasons
"""
from __future__ import annotations

import csv
import re
import hashlib
import json
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from . import parsers  # noqa: F401  (registers every parser module)
from .model import Product, RawProduct, Skip
from .normalise import (clean_code, clean_hsn, clean_text, find_cas, is_price_on_request,
                        normalise_pack, parse_gst, parse_money)
from .parsers.base import get_parser
from .sources import BRANDS, NON_CATALOGUE_FILES, Brand
from .taxonomy import CATEGORY_SLUGS, categorise


@dataclass
class BrandReport:
    slug: str
    name: str
    tier: str
    files: list[dict] = field(default_factory=list)
    parsed: int = 0
    kept: int = 0
    flagged: int = 0
    duplicates: int = 0
    skipped: int = 0
    skip_reasons: Counter = field(default_factory=Counter)
    flag_reasons: Counter = field(default_factory=Counter)
    categories: Counter = field(default_factory=Counter)
    seconds: float = 0.0


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def to_product(brand: Brand, raw: RawProduct, source_file: str) -> tuple[Product | None, str | None]:
    name = clean_text(raw.name)
    code = clean_code(raw.code)
    if not name:
        return None, "empty name"
    if not code:
        return None, "missing code"
    por = is_price_on_request(raw.price)
    rate = None if por else parse_money(raw.price)
    needs_review, reasons = raw.needs_review, [raw.review_reason] if raw.review_reason else []
    if rate is None and not por:
        return None, "no price"
    if rate is not None and rate > 5_000_000:
        needs_review, reasons = True, reasons + ["implausible price > 50 lakh"]
    if re.match(r"^[a-z]", name) and not re.match(r"^(p|o|m|n|sec|tert|cis|trans|iso|neo|alpha|beta|d|l|dl|tri|di|bis|mono|tetra|penta|hexa|[a-z])-|^[a-z]{1,3}\d|^[a-z]{1,4}[A-Z]|^pH\b|^e\.", name):
        needs_review, reasons = True, reasons + ["name looks like description text"]
    pack, unit = normalise_pack(raw.pack)
    if raw.unit and not unit:
        unit = clean_text(raw.unit).lower() or None
    cat = categorise(brand.slug, name, raw.section)
    assert cat in CATEGORY_SLUGS, cat
    specs = {k: clean_text(v) for k, v in raw.specs.items() if v and clean_text(v) and not re.fullmatch(r"[\d\s]+", k)}
    if raw.section:
        specs.setdefault("Section", clean_text(raw.section))
    return Product(
        brand_slug=brand.slug, code=code, name=name,
        description=clean_text(raw.description) or None,
        cas_no=raw.cas.strip() if raw.cas else find_cas(name),
        pack_size=pack, unit=unit, hsn_code=clean_hsn(raw.hsn), gst_rate=parse_gst(raw.gst),
        list_rate=rate, currency="INR", price_basis=brand.price_basis, price_on_request=por,
        price_as_of=brand.price_as_of, category_slug=cat, specs=specs, source_file=source_file,
        source_page=raw.source_page, needs_review=needs_review or brand.tier == "C",
        review_reason="; ".join(r for r in reasons if r) or ("OCR — verify against the scan" if brand.tier == "C" else None),
    ), None


def run(src: Path, out: Path, only: set[str] | None = None) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    hashes: dict[str, str] = {}
    by_hash: dict[str, list[str]] = defaultdict(list)
    for p in sorted(src.iterdir()):
        if p.is_file() and not p.name.startswith("."):
            hashes[p.name] = file_hash(p)
            by_hash[hashes[p.name]].append(p.name)
    seen_hash: dict[str, str] = {}
    claimed: set[str] = set(NON_CATALOGUE_FILES)
    products: list[Product] = []
    reports: list[BrandReport] = []

    for brand in BRANDS:
        if only and brand.slug not in only:
            continue
        rep = BrandReport(brand.slug, brand.name, brand.tier)
        t0 = time.time()
        keyed: dict[str, Product] = {}
        for sf in brand.files:
            claimed.add(sf.filename)
            path = src / sf.filename
            entry = {"file": sf.filename}
            if not path.exists():
                entry["status"] = "missing"; rep.files.append(entry); continue
            h = hashes[sf.filename]
            entry["sha256"] = h[:16]
            if sf.superseded_by:
                entry["status"] = f"not parsed — content covered by {sf.superseded_by}"
                rep.files.append(entry); continue
            if h in seen_hash:
                entry["status"] = f"skipped — byte-identical to {seen_hash[h]}"
                rep.files.append(entry); continue
            seen_hash[h] = sf.filename
            n_before = rep.parsed
            for item in get_parser(sf.parser).parse(path):
                if isinstance(item, Skip):
                    rep.skipped += 1; rep.skip_reasons[item.reason] += 1; continue
                rep.parsed += 1
                prod, why = to_product(brand, item, sf.filename)
                if prod is None:
                    rep.skipped += 1; rep.skip_reasons[why] += 1; continue
                prev = keyed.get(prod.code)
                if prev is not None and sf.supplement:
                    rep.skip_reasons["already in primary file"] += 1; rep.skipped += 1
                    continue
                if prev is not None:
                    rep.duplicates += 1
                    if prev.list_rate != prod.list_rate or prev.pack_size != prod.pack_size:
                        # same code, different data: keep both visible, make the second unique
                        prod.code = f"{prod.code}~p{prod.source_page}"
                        if prod.code in keyed:
                            continue
                        prod.needs_review = True
                        prod.review_reason = "code repeated in source with different price/pack"
                    else:
                        continue
                keyed[prod.code] = prod
            entry["status"] = "parsed"
            entry["rows"] = rep.parsed - n_before
            rep.files.append(entry)
        for p in keyed.values():
            rep.kept += 1
            rep.categories[p.category_slug] += 1
            if p.needs_review:
                rep.flagged += 1; rep.flag_reasons[p.review_reason or "?"] += 1
        products.extend(keyed.values())
        rep.seconds = round(time.time() - t0, 1)
        reports.append(rep)
        print(f"{brand.slug:22} kept={rep.kept:6} flagged={rep.flagged:5} skipped={rep.skipped:5} "
              f"dups={rep.duplicates:4} ({rep.seconds}s)", flush=True)

    unclaimed = sorted(set(hashes) - claimed) if not only else []
    identical = [names for names in by_hash.values() if len(names) > 1]
    _write(out, products, reports, unclaimed, identical)
    return {"products": len(products), "brands": len(reports)}


def _write(out: Path, products: list[Product], reports: list[BrandReport],
           unclaimed: list[str], identical: list[list[str]]) -> None:
    with (out / "products.jsonl").open("w") as f:
        for p in products:
            f.write(json.dumps(p.to_dict(), ensure_ascii=False) + "\n")
    cols = [k for k in Product.__dataclass_fields__]
    with (out / "products.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in products:
            d = p.to_dict(); d["specs"] = json.dumps(d["specs"], ensure_ascii=False)
            w.writerow(d)
    rj = [{**r.__dict__, "skip_reasons": dict(r.skip_reasons), "flag_reasons": dict(r.flag_reasons),
           "categories": dict(r.categories)} for r in reports]
    (out / "report.json").write_text(json.dumps({"brands": rj, "unclaimed_files": unclaimed,
                                                 "byte_identical_groups": identical}, indent=2, ensure_ascii=False))
    L = ["# Ingestion report", "",
         f"Products written: **{len(products):,}** "
         f"(live-eligible {sum(not p.needs_review for p in products):,}, held for review {sum(p.needs_review for p in products):,})", "",
         "| Brand | Tier | Kept | Flagged | Skipped | Dup codes | Top skip reasons |", "|---|---|---:|---:|---:|---:|---|"]
    for r in reports:
        top = ", ".join(f"{k} ({v})" for k, v in r.skip_reasons.most_common(3)) or "—"
        L.append(f"| {r.name} | {r.tier} | {r.kept:,} | {r.flagged:,} | {r.skipped:,} | {r.duplicates:,} | {top} |")
    L += ["", "## Files", ""]
    for r in reports:
        for fi in r.files:
            L.append(f"- **{r.name}** — `{fi['file']}`: {fi.get('status')}" + (f", {fi['rows']} rows" if "rows" in fi else ""))
    L += ["", "## Byte-identical uploads", ""] + [f"- {' == '.join(g)}" for g in identical]
    L += ["", "## Files not claimed by any brand", ""] + ([f"- {u}" for u in unclaimed] or ["- none"])
    (out / "report.md").write_text("\n".join(L) + "\n")
