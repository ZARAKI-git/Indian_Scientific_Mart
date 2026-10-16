"""Chemical and reagent price lists (Tier B, columnar text PDFs)."""
from __future__ import annotations

import re
from pathlib import Path

from ..layout import iter_rows
from ..model import RawProduct, Skip
from ..normalise import find_cas
from .base import BrandParser, Columns, ParseResult, join_name, looks_like_money, register, table_records

CODE_TOKEN = re.compile(r"^[A-Z0-9][A-Z0-9.\-/]{2,24}$", re.I)
CAS_ONLY = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _codey(s: str) -> bool:
    s = s.strip()
    return bool(CODE_TOKEN.match(s)) and any(ch.isdigit() for ch in s) and not CAS_ONLY.match(s)


@register("merck")
class MerckParser(BrandParser):
    """Product Code | Product Name | Pack | [CAS] | Price | HSN | GST — one row per SKU.
    The 'Part N: ...' banner above each table is kept as the section."""
    COLS = Columns([(0, "code"), (110, "name"), (315, "pack"), (360, "cas"), (425, "price"), (476, "hsn"), (518, "gst")])

    def parse(self, path: Path) -> ParseResult:
        section = None
        for row in iter_rows(str(path)):
            t = row.text
            if t.startswith("Part ") and ":" in t[:9]:
                section = t.split(":", 1)[1].strip(); continue
            f = self.COLS.split(row)
            code = f.get("code", "")
            if not _codey(code) or code.lower().startswith("product"):
                continue
            price = f.get("price", "")
            cas = f.get("cas") or None
            # A few rows carry the CAS in the price column slot when the price is unpadded.
            if cas and not CAS_ONLY.match(cas):
                f["name"] = join_name(f.get("name"), cas); cas = None
            if not looks_like_money(price):
                yield Skip(row.page, "price not readable", t); continue
            yield RawProduct(code=code, name=f.get("name", ""), pack=f.get("pack"), cas=cas, price=price,
                             hsn=f.get("hsn"), gst=f.get("gst"), section=section, source_page=row.page)


@register("thermofisher")
class ThermoFisherParser(BrandParser):
    """Product Code | Product Name | CAS Number | Pack Size | LP 2026 | HSN Code"""
    COLS = Columns([(0, "code"), (150, "name"), (540, "cas"), (605, "pack"), (668, "price"), (725, "hsn")])

    def parse(self, path: Path) -> ParseResult:
        for row in iter_rows(str(path)):
            f = self.COLS.split(row)
            code = f.get("code", "")
            if not _codey(code) or code.startswith("Product"):
                continue
            price = f.get("price", "")
            if not looks_like_money(price):
                yield Skip(row.page, "price not readable", row.text); continue
            cas = f.get("cas")
            yield RawProduct(code=code, name=f.get("name", ""), cas=cas if cas and CAS_ONLY.match(cas) else None,
                             pack=f.get("pack"), price=price, hsn=f.get("hsn"), source_page=row.page)


CYTIVA_CODE = re.compile(r"^(\d{4}-\d{3,4}|\d{8}|[0-9]{4}[A-Z]{0,2}|[A-Z]{2,5}\d{3,}[A-Z0-9]*)$")


@register("cytiva-pdf")
class CytivaPdfParser(BrandParser):
    """Lab Filtration catalogue: tables of (Cat No | Description | Price), often two
    tables side by side on one line. Scan cells for code, description, price triples."""

    def parse(self, path: Path) -> ParseResult:
        for row in iter_rows(str(path)):
            cells = row.texts()
            i = 0
            while i + 2 < len(cells):
                code, desc, price = cells[i], cells[i + 1], cells[i + 2]
                if CYTIVA_CODE.match(code) and not looks_like_money(desc) and looks_like_money(price):
                    yield RawProduct(code=code, name=desc, price=price, source_page=row.page)
                    i += 3
                else:
                    i += 1


# ------------------------------------------------------------------ LOBA Chemie

def blocks(rows, gap: float):
    """Split a page's rows into visual blocks separated by vertical whitespace."""
    cur, last_y = [], None
    for r in rows:
        if last_y is not None and r.y - last_y > gap and cur:
            yield cur; cur = []
        cur.append(r); last_y = r.y
    if cur:
        yield cur


_META = re.compile(r"^(HSN|CAS No|Expiry|UN No|\"?Store)", re.I)
_TITLE_TAIL = re.compile(r"^(Extra Pure|Pure|AR\b|GR\b|ACS|For |New$|NIST|basis\)|traceable|\(?[\d.]+%)", re.I)


def _needs_tail(first: str) -> bool:
    return first.count("(") > first.count(")") or bool(re.search(r"(-|,|\bto|\bfor|\bof|\band|\bwith)$", first, re.I))


@register("loba")
class LobaParser(BrandParser):
    """Each product is a block: title line(s), synonyms/notes, 'HSN:' and 'CAS No.:' lines,
    with one SKU (code + pack code, pkg, price) per line on the right."""
    COLS = Columns([(0, "name"), (260, "hazard"), (360, "code"), (445, "pack"), (515, "price")])

    def parse(self, path: Path) -> ParseResult:
        import pymupdf
        from ..layout import page_rows
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            if "Price (" not in page.get_text():
                continue
            rows = [r for r in page_rows(page) if r.y > 75 and r.y < page.rect.height - 30]
            for blk in blocks(rows, gap=13):
                yield from self._block(blk)

    def _block(self, blk):
        lines = [self.COLS.split(r) for r in blk]
        names = [l.get("name", "") for l in lines]
        skus = [(l, r) for l, r in zip(lines, blk) if looks_like_money(l.get("price")) and l.get("code")]
        if not skus:
            return
        first = names[0]
        title_parts, i = [first], 1
        while i < len(names) and names[i] and not _META.match(names[i]) and (_needs_tail(title_parts[-1]) or _TITLE_TAIL.match(names[i])):
            title_parts.append(names[i]); i += 1
        title = re.sub(r"\s+New$", "", join_name(*title_parts))
        desc, specs = [], {}
        for n in names[i:]:
            if not n:
                continue
            m = re.match(r"HSN:\s*([\d.]+)(?:\s+UN No\.?:\s*(\S+))?", n)
            if m:
                specs["HSN"] = m.group(1)
                if m.group(2):
                    specs["UN No."] = m.group(2)
                continue
            m = re.match(r"CAS No\.?:\s*(\S+)\s*(.*)", n)
            if m:
                specs["CAS"] = m.group(1)
                if m.group(2):
                    specs["Formula / M.W."] = m.group(2)
                continue
            if specs.get("Formula / M.W.") and re.match(r"^[\d.]+$", n):
                specs["Formula / M.W."] += " " + n; continue
            desc.append(n)
        cas = specs.pop("CAS", None)
        hsn = specs.pop("HSN", None)
        for l, r in skus:
            code = " ".join((l.get("code") or "").split())
            if not code:
                yield Skip(r.page, "SKU without code", r.text); continue
            yield RawProduct(code=code.replace(" ", "-"), name=title, pack=l.get("pack"), price=l["price"],
                             cas=cas if cas and CAS_ONLY.match(cas) else None, hsn=hsn,
                             description=" ".join(desc) or None, specs=dict(specs), source_page=r.page)


# ---------------------------------------------------------------------- SRL

_SRL_CODE = re.compile(r"^\d{5}$")
_SRL_CAS = re.compile(r"^\[(\d{2,7}-\d{2}-\d)\]$")
_PACK_WORD = re.compile(r"^(\d+(?:\.\d+)?|Gms?|Kg|ml|Ltr?s?|Mg|mg|g|L|Units?|Tests?|Vials?|Nos?|Discs?|x|X|Pcs?|ul|µl|Plates?|Mtr|Cart|Pack|KU|MU)$")


def _lines(words, tol=2.5):
    """words -> list of (y, text) lines, words sorted by y then x."""
    out = []
    for w in sorted(words, key=lambda w: (round(w[1] / tol), w[0])):
        y = (w[1] + w[3]) / 2
        if out and abs(out[-1][0] - y) <= tol:
            out[-1][1].append(w)
        else:
            out.append([y, [w]])
    return [(y, " ".join(x[4] for x in sorted(ws, key=lambda w: w[0]))) for y, ws in out]


_TITLE_GRADE = re.compile(r"^(\d+(\.\d+)?%|extrapure|pure|AR\b|ACS|ExiPlus|for |Harmonized|BioVeg|BactoBio|GR\b|LR\b|HPLC|AAS|LC-MS|GC|Molecular|Cell|Multi)", re.I)


@register("srl")
class SrlParser(BrandParser):
    """Two catalogue columns per page. Each half: Code | Name | Packing | Price, where
    pack sizes and prices sit on their own baselines — paired by order within a product."""

    def parse(self, path: Path) -> ParseResult:
        import pymupdf
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            words = page.get_text("words")
            hdr = [w for w in words if w[4] in ("Code", "Name", "Packing", "Price") and w[1] < 80]
            codes = sorted(w[0] for w in hdr if w[4] == "Code")
            if len(codes) != 2:
                continue  # not a price page (intro, index, terms)
            section = None
            for w in words:
                if w[1] < 45 and w[4].startswith("Part"):
                    section = " ".join(x[4] for x in words if abs(x[1] - w[1]) < 2 and x[0] >= w[0])
                    section = section.split("–", 1)[-1].strip()
                    break
            mid = codes[1] - 4
            hdr_y = max(w[3] for w in hdr)
            foot = page.rect.height - 40
            for lo, hi in ((0, mid), (mid, 10_000)):
                cols = {w[4]: w[0] for w in hdr if lo <= w[0] < hi}
                zone = {"name": cols["Name"] - 4, "pack": cols["Packing"] - 14, "price": cols["Price"] - 14}
                half = [w for w in words if lo <= w[0] < hi and hdr_y < w[1] < foot]
                yield from self._half(half, zone, pno + 1, section)

    def _half(self, words, zone, page, section):
        def z(w):
            x = w[0]
            if x < zone["name"]:
                return "code"
            if x < zone["pack"]:
                return "name"
            if x < zone["price"]:
                return "pack"
            return "price"
        anchors = sorted((w[1], w[4]) for w in words if z(w) == "code" and _SRL_CODE.match(w[4]))
        for i, (y, code) in enumerate(anchors):
            y0 = y - 4
            y1 = anchors[i + 1][0] - 4 if i + 1 < len(anchors) else 10_000
            blk = [w for w in words if y0 <= w[1] < y1]
            name_lines = [t for _, t in _lines([w for w in blk if z(w) == "name"])]
            # glyph letters (hazard symbols) render as single letters in the code zone
            pack_lines: list[str] = []
            for _, t in _lines([w for w in blk if z(w) == "pack" and _PACK_WORD.match(w[4])]):
                if pack_lines and not t[0].isdigit():
                    pack_lines[-1] += " " + t   # "10000" / "Units" wrapped onto two lines
                else:
                    pack_lines.append(t)
            prices = [w[4] for w in sorted((w for w in blk if z(w) == "price"), key=lambda w: w[1]) if looks_like_money(w[4]) or w[4].upper() == "POR"]
            cas = next((m.group(1) for w in blk if z(w) == "code" for m in [_SRL_CAS.match(w[4])] if m), None)
            if not name_lines:
                yield Skip(page, "SRL block without name", code); continue
            title = [name_lines[0]]
            k = 1
            while k < len(name_lines) and not name_lines[k].startswith("(") and (
                    re.search(r"(,|-|\bfor|\bof|\band|\bwith|\bin|\bex\.?)$", title[-1].rstrip(), re.I)
                    or (_TITLE_GRADE.match(name_lines[k]) and len(name_lines[k]) < 28)
                    or ("%" not in " ".join(title) and "%" in name_lines[k] and len(name_lines[k]) < 40)):
                title.append(name_lines[k]); k += 1
            desc = " ".join(name_lines[k:])
            if not prices or len(pack_lines) != len(prices):
                yield Skip(page, "pack/price count mismatch", f"{code} {title[0]} packs={pack_lines} prices={prices}")
                continue
            for pack, price in zip(pack_lines, prices):
                yield RawProduct(code=f"{code}-{pack.replace(' ', '')}", name=join_name(*title), pack=pack, price=price,
                                 cas=cas, description=desc or None, section=section,
                                 specs={"SRL code": code}, source_page=page)


# ------------------------------------------------------------------ HiMedia

_HM_NOT_TITLE = re.compile(r"^(No\. of|g/L|Gms/Lit|For more|Store|MW|CAS|Meets|specifications|for |used |\(see|Assay|DCM)|.*\bSee\s*:|^[A-Za-z .]+\s:\s", re.I)
_HM_CODE = re.compile(r"^[A-Z]{1,7}\d{1,5}[A-Z]{0,3}-[A-Za-z0-9.x]+$|^[A-Z]{1,7}\d{1,5}[A-Z]{0,3}-$")


@register("himedia")
class HiMediaParser(BrandParser):
    """Two half-page columns: Product | [Symbol | Levels] | Code | Packing | Price.
    Every SKU row carries its own code (e.g. M217-500G); the product title sits on
    the first SKU's line and is inherited by the pack rows under it. Prices shown as
    'u' point to another section and are skipped there."""

    def parse(self, path: Path) -> ParseResult:
        import pymupdf
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            raw = page.get_text("words")
            seen, words = set(), []
            for w in raw:  # some pages are overprinted: identical words stacked twice
                k = (round(w[0]), round(w[1]), w[4])
                if k not in seen:
                    seen.add(k); words.append(w)
            hdr = [w for w in words if w[1] < 80 and w[4] in ("Code", "Packing", "Price")]
            code_x = sorted({round(w[0]) for w in hdr if w[4] == "Code"})
            price_x = sorted({round(w[0]) for w in hdr if w[4] == "Price"})
            pack_x = sorted({round(w[0]) for w in hdr if w[4] == "Packing"})
            if len(code_x) < 2 or len(price_x) < 2 or len(pack_x) < 2:
                continue
            section = " ".join(w[4] for w in words if w[1] < 35 and w[0] > 100 and w[4] not in ("®",))
            hdr_y = max(w[3] for w in hdr)
            foot = page.rect.height - 30
            mid = price_x[0] + 28
            halves = ((0, mid, code_x[0], pack_x[0], price_x[0]), (mid, 10_000, code_x[-1], pack_x[-1], price_x[-1]))
            for lo, hi, cx, kx, px in halves:
                half = [w for w in words if lo <= w[0] < hi and hdr_y + 2 < w[1] < foot]
                yield from self._half(half, cx - 20, kx - 12, px - 6, pno + 1, section)

    def _half(self, words, code_start, pack_start, price_start, page, section):
        def z(w):
            x = w[0]
            return "name" if x < code_start else "code" if x < pack_start else "pack" if x < price_start else "price"
        lines = []  # [y, {zone: [words]}]
        for w in sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
            y = (w[1] + w[3]) / 2
            if lines and abs(lines[-1][0] - y) <= 2.5:
                lines[-1][1].setdefault(z(w), []).append(w)
            else:
                lines.append([y, {z(w): [w]}])
        txt = lambda ws: " ".join(w[4] for w in sorted(ws, key=lambda w: w[0])) if ws else ""
        title_parts: list[str] = []
        title_y, conts, cas = -1.0, 0, None
        buffered: list[tuple[str, str, str]] = []
        pending_code, prev_zs = None, {}

        def flush():
            if buffered and title_parts:
                t = join_name(*title_parts)
                for c, pack, price in buffered:
                    yield RawProduct(code=c, name=t, pack=pack, price=price, cas=cas, section=section, source_page=page)
            buffered.clear()

        for y, zs in lines:
            name = txt(zs.get("name"))
            code = txt(zs.get("code"))
            first = code.split()[0] if code else ""
            if name and first and _HM_CODE.match(first):
                yield from flush()
                title_parts, title_y, conts, cas = [name.lstrip("*∆ ")], y, 0, None
            elif name and title_parts:
                m = re.search(r"CAS\s*:\s*(\d{2,7}-\d{2}-\d)", name)
                if m:
                    cas = m.group(1)
                elif (y - title_y < 12 * (conts + 1) and conts < 2 and not _HM_NOT_TITLE.match(name)
                      and (name[0].isupper() or name[0] in "(" or
                           " ".join(title_parts).count("(") > " ".join(title_parts).count(")"))):
                    title_parts.append(name); conts += 1
                else:
                    conts = 99  # description reached; stop extending the title
            if not first:
                continue
            c = first
            if pending_code and not _HM_CODE.match(c):
                c, zs = pending_code + c, {**prev_zs, **{k: v for k, v in zs.items() if k != "name"}}
                pending_code = None
            elif not _HM_CODE.match(c):
                continue
            if c.endswith("-"):
                pending_code, prev_zs = c, zs
                continue
            price, pack = txt(zs.get("price")), txt(zs.get("pack"))
            if price.strip() in ("u", "®", ""):
                continue
            if not looks_like_money(price):
                yield Skip(page, "price not readable", f"{c} {pack} {price}"); continue
            if not title_parts:
                yield Skip(page, "SKU before any product title", c); continue
            buffered.append((c, pack, price))
        yield from flush()

    @staticmethod
    def _emit_ready(zs) -> bool:
        return True
