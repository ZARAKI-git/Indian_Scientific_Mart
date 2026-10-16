"""Plasticware, instruments, education and small glassware lists (Tier B)."""
from __future__ import annotations

import re
from pathlib import Path

import pymupdf

from ..layout import iter_rows, page_rows
from ..model import RawProduct, Skip
from ..normalise import clean_text
from .base import (SYNTHETIC, BrandParser, Columns, ParseResult, join_name, looks_like_money, register,
                   synthetic_code, table_records)
from .chemicals import blocks
from .spec_tables import SpecTableConfig, SpecTableParser

DIGITS = re.compile(r"^\d+$")


@register("tarsons")
class TarsonsParser(BrandParser):
    """Sl. | Product Code | Item Description | HSN | Item Packing | Bulk Packing | GST | Rate (Box) | Bulk (Box).
    Some items print the description on the line above and below the code row."""
    COLS = Columns([(0, "sl"), (85, "code"), (140, "name"), (290, "hsn"), (340, "pack"), (405, "bulk"),
                    (440, "gst"), (478, "price"), (525, "bulk_price")])

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            rows = [r for r in page_rows(doc[pno]) if r.y > 150]
            fields = [self.COLS.split(r) for r in rows]
            for i, (r, f) in enumerate(zip(rows, fields)):
                if not (DIGITS.match(f.get("sl", "")) and DIGITS.match(f.get("code", "")) and looks_like_money(f.get("price"))):
                    continue
                name = f.get("name", "")
                if not name:  # description printed around the code row
                    above = fields[i - 1].get("name", "") if i and not fields[i - 1].get("code") else ""
                    below = fields[i + 1].get("name", "") if i + 1 < len(fields) and not fields[i + 1].get("code") else ""
                    name = join_name(above, below)
                yield RawProduct(code=f["code"], name=name, hsn=f.get("hsn"), gst=f.get("gst"), price=f["price"],
                                 pack=f"{f.get('pack', '')} pcs/box" if f.get("pack") else None,
                                 specs={"Item packing (per box)": f.get("pack", ""), "Bulk packing (boxes)": f.get("bulk", ""),
                                        "Bulk rate": f.get("bulk_price", ""), "Price basis": "per box"},
                                 source_page=r.page)


@register("polylab")
class PolylabParser(BrandParser):
    """Code No | Particular | Packing | Price/Pc | Price/Pack — list rate is per piece."""
    COLS = Columns([(0, "code"), (65, "name"), (430, "pack"), (480, "price"), (520, "pack_price")])

    def parse(self, path: Path) -> ParseResult:
        for row in iter_rows(str(path)):
            f = self.COLS.split(row)
            if DIGITS.match(f.get("code", "")) and looks_like_money(f.get("price")):
                yield RawProduct(code=f["code"], name=f.get("name", ""), price=f["price"],
                                 specs={"Packing (pcs)": f.get("pack", ""), "Price per pack": f.get("pack_price", ""),
                                        "Price basis": "per piece"}, source_page=row.page)


@register("jgw")
class JgwParser(BrandParser):
    """TYPE is printed once, vertically centred beside its group of ITEM rows; items
    have no catalogue number. Each item takes the nearest TYPE label on the page."""
    COLS = Columns([(0, "sl"), (85, "type"), (190, "item"), (530, "hsn"), (585, "gst"), (620, "price"), (670, "unit"), (705, "pack")])

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            rows = [r for r in page_rows(doc[pno]) if r.y > 45]
            labels, items, heading = [], [], None
            for r in rows:
                f = self.COLS.split(r)
                if f.get("type"):
                    if labels and r.y - labels[-1][0] < 9:
                        labels[-1] = ((labels[-1][0] + r.y) / 2, labels[-1][1] + " " + f["type"])
                    else:
                        labels.append((r.y, f["type"]))
                if looks_like_money(f.get("price")):
                    items.append((r, f, heading))
                elif not f.get("type") and len(r.cells) == 1 and r.cells[0].x0 > 280:
                    heading = r.cells[0].text  # centred section banner, e.g. "PIPETTES – BENNY"
            for r, f, head in items:
                typ = min(labels, key=lambda l: abs(l[0] - r.y))[1] if labels else (head or "")
                name = join_name(typ.title(), "—", f.get("item"))
                yield RawProduct(code=synthetic_code("JGW", typ, f.get("item"), f.get("pack"), f.get("price")),
                                 name=name, hsn=f.get("hsn"), gst=f.get("gst"), price=f["price"],
                                 unit=f.get("unit"), section=head,
                                 specs={**SYNTHETIC, "Standard pack": f.get("pack", "")}, source_page=r.page)


@register("rakiro")
class RakiroParser(BrandParser):
    """Code | Name | Range | [No of Tests | Packing] | DP | MRP. DP (dealer price) is the list rate."""

    def parse(self, path: Path) -> ParseResult:
        section = None
        for row in iter_rows(str(path)):
            t = row.texts()
            if len(t) == 1 and row.cells[0].x0 > 120 and row.y > 80:
                section = t[0]; continue
            if len(t) >= 4 and re.match(r"^[A-Z]{2,}[A-Z0-9]*\*?$", t[0]) and looks_like_money(t[-1]) and looks_like_money(t[-2]):
                code = t[0].rstrip("*")
                name, rng = t[1], (t[2] if len(t) >= 5 else "")
                specs = {"Range": rng, "MRP": t[-1], "Price basis": "dealer price (DP)"}
                if len(t) >= 6:
                    specs["No. of tests / packing"] = t[3]
                if t[0].endswith("*"):
                    specs["Method"] = "Colour comparison"
                yield RawProduct(code=code, name=join_name(name, f"({rng})" if rng else ""), price=t[-2],
                                 section=section, specs=specs, source_page=row.page)


@register("remi")
class RemiParser(BrandParser):
    """[class] | CAT NO. | DESCRIPTION | [NEW] | PRICE — descriptions wrap onto following rows."""
    COLS = Columns([(0, "cls"), (80, "code"), (160, "name"), (455, "flag"), (540, "price")])

    def parse(self, path: Path) -> ParseResult:
        for rec in table_records(path, self.COLS, is_code=lambda c: bool(re.match(r"^[A-Z]{1,5}[\w\-/. ]*\d[\w\-/.]*$", c)),
                                 max_extra_lines=2):
            if not looks_like_money(rec.get("price")):
                continue
            name = join_name(rec.get("name"), rec.get("name_extra"))
            yield RawProduct(code=rec["code"], name=name, price=rec["price"], source_page=int(rec["_page"]),
                             specs={"New introduction": "yes"} if "NEW" in rec.get("flag", "") else {})


@register("labtronics")
class LabtronicsParser(BrandParser):
    """MODEL NO. | DESCRIPTION | PRICE — description runs for several lines; HSN is inside the text."""
    COLS = Columns([(0, "code"), (95, "name"), (530, "price")])

    def parse(self, path: Path) -> ParseResult:
        for rec in table_records(path, self.COLS, is_code=lambda c: bool(re.match(r"^[A-Z]{1,4}-?\s?[\w\-/]+$", c)) and c != "NEW",
                                 max_extra_lines=8):
            if not looks_like_money(rec.get("price")):
                continue
            full = join_name(rec.get("name"), rec.get("name_extra"))
            hsn = re.search(r"HSN\s*CODE\s*:?\s*(\d{4,8})", full, re.I)
            full = re.sub(r"\(?\s*HSN\s*CODE\s*:?\s*\d+\s*\)?", "", full, flags=re.I).strip()
            title = re.split(r"(?<=[a-z\)])\.\s|\s{2,}", full)[0]
            if len(title) > 110:
                title = title[:110].rsplit(" ", 1)[0] + "…"
            yield RawProduct(code=rec["code"], name=title, description=full, price=rec["price"],
                             hsn=hsn.group(1) if hsn else None, source_page=int(rec["_page"]))


@register("dp")
class DpParser(BrandParser):
    """DP Labman / Wensar: the INDEX pages hold every model as one row:
    Model No. | Model Name | Category | Sr. No. | H Group | List Price | Option C | Option G."""

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            if "INDEX" not in page.get_text() or "List Price" not in page.get_text():
                continue
            rows = page_rows(page)
            hdr = next((r for r in rows if "List Price" in r.text and "Model" in r.text), None)
            if not hdr:
                continue
            xs = {c.text: c.x0 for c in hdr.cells}
            cols = Columns([(0, "code"), (min(xs.get("Model Name", 80), 84) - 6, "name"), (xs.get("Category", 245) - 6, "cat"),
                            (xs.get("Sr. No.", 310) - 6, "sr"), (xs.get("H Group", 365) - 6, "h"),
                            (xs.get("List Price", 420) - 8, "price"), (xs.get("Option C", 480) - 8, "optc"),
                            (xs.get("Option G", 535) - 8, "optg")])
            for r in rows:
                if r.y <= hdr.y:
                    continue
                f = cols.split(r)
                if re.match(r"^[A-Z][A-Z0-9\-]{2,}$", f.get("code", "")) and looks_like_money(f.get("price")):
                    yield RawProduct(code=f["code"], name=join_name(f.get("name"), f"({f['cat']})" if f.get("cat") else ""),
                                     price=f["price"], source_page=pno + 1,
                                     specs={"Range": f.get("cat", ""), "Option C (advance RTGS, service-centre guarantee)": f.get("optc", ""),
                                            "Option G (advance RTGS, onsite guarantee)": f.get("optg", "")})


@register("haxane")
class HaxaneParser(BrandParser):
    """Group heading on the left (x<150) on the same line as the column header
    (Model | Capacity | ... | List Price INR.); model rows below it."""

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(3, doc.page_count):
            group, sub, header = None, None, []
            for r in page_rows(doc[pno]):
                cells = r.cells
                if any(c.text == "Model" for c in cells) and any("Price" in c.text for c in cells):
                    left = [c for c in cells if c.x0 < 150]
                    group = left[0].text if left else group
                    header = [(c.x0, c.text) for c in cells if c.x0 >= 150]
                    continue
                if not header:
                    continue
                if cells[0].x0 < 150 and len(cells) == 1 and group and r.y - 0 > 0 and len(cells[0].text) < 40:
                    group = f"{group} {cells[0].text}" if not sub else group
                    continue
                if cells[0].text.startswith("Content Code"):
                    sub = cells[1].text if len(cells) > 1 else None
                    continue
                body = [c for c in cells if c.x0 >= 150]
                if len(body) >= 2 and re.match(r"^[A-Z]{2,}[\- ]", body[0].text) and (looks_like_money(body[-1].text) or "P.O.R" in body[-1].text):
                    specs = {}
                    for c in body[1:-1]:
                        lab = min(header, key=lambda h: abs(h[0] - c.x0))[1]
                        specs[lab] = c.text
                    model = re.sub(r"\s+", "", body[0].text) if re.match(r"^[A-Z]+-\s", body[0].text) else body[0].text
                    yield RawProduct(code=model, name=join_name(sub or group, "—", model), description=sub, price=body[-1].text,
                                     section=group, specs=specs, source_page=pno + 1)


@register("dxbidt")
class DxbidtParser(BrandParser):
    """Catalog # | Product description | Size | Price — each product a vertical block,
    with the code and price vertically centred against a multi-line description."""

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            rows = page_rows(page)
            hdr = next((r for r in rows if "Catalog #" in r.text), None)
            if not hdr:
                continue
            body = [r for r in rows if hdr.y < r.y < page.rect.height - 120]
            heading = next((r.text for r in rows if r.y < hdr.y and r.cells[0].x0 < 120), None)
            for blk in blocks(body, gap=22):
                code = next((c.text for r in blk for c in r.cells if c.x0 < 60 and re.match(r"^[A-Z]{1,3}\d{3,6}", c.text)), None)
                price = next((c.text for r in blk for c in r.cells if c.x0 > 490 and looks_like_money(c.text.replace("₹", "").strip())), None)
                size = " ".join(c.text for r in blk for c in r.cells if 380 < c.x0 < 490)
                desc = [c.text for r in blk for c in r.cells if 100 < c.x0 < 380]
                if not code or not price:
                    if code or price:
                        yield Skip(pno + 1, "DXBIDT block missing code or price", " ".join(r.text for r in blk)[:150])
                    continue
                title = desc[0] if desc else heading or ""
                if len(desc) > 1 and (desc[0].endswith(("-", "cDNA", "For")) or len(desc[0]) < 32):
                    title = join_name(desc[0], desc[1])
                yield RawProduct(code=code.split()[0], name=title, description=" ".join(desc), price=price.replace("₹", ""),
                                 pack=size or None, section=heading, source_page=pno + 1)


@register("om-lab")
class OmLabParser(BrandParser):
    """OM-code | NAME | PRICE. Rows under a heading row (e.g. DIP CIRCLE) are variants of it."""
    COLS = Columns([(0, "code"), (100, "name"), (455, "price")])

    def parse(self, path: Path) -> ParseResult:
        heading = None
        last_page = None
        for row in iter_rows(str(path)):
            if row.page != last_page:
                heading, last_page = None, row.page
            f = self.COLS.split(row)
            code, name, price = f.get("code", ""), f.get("name", ""), f.get("price", "")
            if code.startswith("OM-") and looks_like_money(price):
                variant = heading and (len(name) < 28 or name.isupper() and len(name.split()) <= 4)
                yield RawProduct(code=code, name=join_name(heading, "—", name) if variant else name, price=price,
                                 section=heading, source_page=row.page)
            elif not code and name and name.isupper() and not price and len(name) < 70:
                heading = name
            elif code.startswith("OM-"):
                heading = name  # priced variants follow on the next rows


@register("adarsh")
class AdarshParser(BrandParser):
    """S.No. | Items | Price | GST% HSN. A code row without a price is the parent of
    the coded rows under it (PH 009 → PH 009/1 ...)."""
    COLS = Columns([(200, "code"), (280, "name"), (515, "price"), (560, "gsthsn")])

    def parse(self, path: Path) -> ParseResult:
        parent, parent_gst, parent_code = None, None, None
        for row in iter_rows(str(path)):
            row.cells = [c for c in row.cells if c.x0 >= 200]
            if not row.cells:
                continue
            f = self.COLS.split(row)
            code, name, price = f.get("code", ""), f.get("name", ""), f.get("price", "")
            m = re.match(r"^([A-Z]{1,5}[ -]?\d[\w/\-]*)\s*(.*)$", code)
            if not m:
                continue
            code, spill = m.group(1), m.group(2)
            name = join_name(spill, name)
            pm = re.search(r"(\d[\d,]*\.\d{2})$", name)
            if not looks_like_money(price) and pm:  # price glued onto the description
                price, name = pm.group(1), name[: pm.start()].strip()
            gst = hsn = None
            gm = re.match(r"(\d+)%\s*(\d+)?", f.get("gsthsn", ""))
            if gm:
                gst, hsn = gm.group(1), gm.group(2)
            if looks_like_money(price):
                is_child = parent and "/" in code and parent_code and code.split("/")[0].replace(" ", "") == parent_code.replace(" ", "")
                yield RawProduct(code=code, name=join_name(parent, "—", name) if is_child else name, price=price,
                                 gst=gst or (parent_gst[0] if is_child and parent_gst else None),
                                 hsn=hsn or (parent_gst[1] if is_child and parent_gst else None), source_page=row.page)
            else:
                parent, parent_gst, parent_code = name, (gst, hsn), code


@register("ses")
class SesParser(BrandParser):
    """S.No. | Particulars | Unit price — particulars wrap; follow-on lines are spec text."""

    def parse(self, path: Path) -> ParseResult:
        cols = Columns([(0, "code"), (100, "name"), (480, "price")])
        for rec in table_records(path, cols, is_code=lambda c: bool(re.match(r"^\(?\w{1,4}\)?\.?(\s*\(\w\))?$", c)), max_extra_lines=3):
            if not looks_like_money(rec.get("price")):
                continue
            name = clean_text(rec.get("name"))
            model = re.search(r"Model:?\s+([A-Z0-9\-]+(?:-[A-Z0-9]+)*)|,\s*([A-Z]{2,}-\d+[A-Z0-9\-]*)", name)
            code = (model.group(1) or model.group(2)) if model else synthetic_code("SES", name, rec.get("price"))
            yield RawProduct(code=code, name=name, description=rec.get("name_extra"), price=rec["price"],
                             specs={} if model else dict(SYNTHETIC), source_page=int(rec["_page"]))


@register("physics-meters")
class PhysicsMetersParser(BrandParser):
    """S.No | DESCRIPTION | QTY | PRICE | AMOUNT (quotation layout, no maker named)."""

    def parse(self, path: Path) -> ParseResult:
        for row in iter_rows(str(path)):
            t = row.texts()
            if len(t) >= 3 and DIGITS.match(t[0]):
                money = re.findall(r"[\d,]+\.\d{2}", " ".join(t[2:]))
                if money:
                    yield RawProduct(code=synthetic_code("UNC", t[1]), name=t[1].title(), price=money[0],
                                     specs={**SYNTHETIC, "List S.No.": t[0]}, source_page=row.page,
                                     needs_review=True, review_reason="maker not identified by client")


@register("jsgw")
class JsgwParser(SpecTableParser):
    cfg = SpecTableConfig(
        code_rx=re.compile(r"^\d{1,4}[A-Z]{0,2}/\d+[A-Z]?$"),
        is_title=lambda r: getattr(r, "jsgw_title", False),
        top=25, bottom=25,
        title_clean=lambda s: s)

    def _page_filter(self, rows):
        """Pages are mirrored: the thumb index sits right of the table on one page
        and left of it on the next. Keep only cells inside this page's table band."""
        hdr = [r for r in rows if "Cat. No." in r.text]
        if not hdr:
            return rows
        lo = min(r.cells[0].x0 for r in hdr) - 15
        hi = max(r.cells[-1].x1 for r in hdr) + 30
        out = []
        for r in rows:
            r.cells = [c for c in r.cells if lo - 60 <= c.x0 and c.x1 <= hi + 40]
            if r.cells:
                out.append(r)
        return out

    def _row(self, r, st):
        first = r.cells[0].text
        m = re.match(r'^(\d{1,4}[A-Z]{0,6})\s+(\S.{18,})$', first)
        if len(r.cells) >= 2 and re.match(r"^\d{1,4}[A-Z]{0,6}$", first) and len(r.cells[1].text) > 20:
            r.cells = r.cells[1:]
            r.jsgw_title = True
        elif m and not self.cfg.code_rx.match(first):
            r.cells[0].text = m.group(2)
            r.jsgw_title = True
        if getattr(r, "jsgw_title", False):
            r.cells[0].text = re.sub(r'"JSGW"\s*,?\s*', "", r.cells[0].text)
            r.cells = r.cells[:1]
        yield from super()._row(r, st)


@register("jrm")
class JrmParser(BrandParser):
    """Thermometer tables without catalogue numbers: a section heading, a header with one
    or two rate columns (Red Spirit / Mercury), and rows keyed by range or IP/ASTM number."""

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            page = doc[pno]
            rows = page_rows(page)
            title = None
            rate_cols: list[tuple[float, str]] = []
            hdr_cells: list[tuple[float, str]] = []
            for r in rows:
                t = r.text
                if len(r.cells) == 1 and r.cells[0].x0 < 70 and 120 < r.y < 175 and len(t) < 50:
                    title = t
                if "Red Spirit" in t and "Mercury" in t:
                    rate_cols = [(c.x0, c.text) for c in r.cells if c.text in ("Red Spirit", "Mercury")]
                if re.search(r"Range|IP No|ASTM|STPTC|Schedule|Rate", t) and not looks_like_money(r.cells[-1].text):
                    hdr_cells += [(c.x0, c.text) for c in r.cells]
                    if "Rate" in t and "Red Spirit" not in t and not rate_cols:
                        rate_cols = []
                nums = [c for c in r.cells if re.match(r"^\d{2,5}$", c.text)]
                if title and len(r.cells) >= 3 and nums and re.search(r"\d", r.cells[0].text) and r.y > 230:
                    key = r.cells[0].text
                    if rate_cols:
                        prices = [(min(rate_cols, key=lambda rc: abs(rc[0] - c.x0))[1], c) for c in r.cells[-len(rate_cols):]]
                    else:
                        prices = [("", r.cells[-1])]
                    others = [c for c in r.cells[1:] if c not in [p for _, p in prices]]
                    specs = {}
                    for c in others:
                        if hdr_cells:
                            specs[min(hdr_cells, key=lambda h: abs(h[0] - c.x0))[1]] = c.text
                    for variant, cell in prices:
                        if not looks_like_money(cell.text):
                            continue
                        desc = ", ".join(f"{k} {v}" for k, v in specs.items())
                        name = join_name(title, key, f"({variant})" if variant else "")
                        yield RawProduct(code=synthetic_code("JRM", title, key, variant, desc), name=name, price=cell.text,
                                         description=desc or None, section=title,
                                         specs={**SYNTHETIC, **specs, **({"Fill": variant} if variant else {})}, source_page=pno + 1)
