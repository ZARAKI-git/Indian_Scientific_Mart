"""Catalogue-style glassware lists: bold product headings followed by spec tables
whose first column is the catalogue number and whose last priced column is the rate.

One engine, configured per brand (title/subtitle detection, code pattern, margins).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import pymupdf

from ..layout import Cell, StyledRow, styled_rows
from ..model import RawProduct, Skip
from ..normalise import clean_text
from .base import BrandParser, ParseResult, join_name, looks_like_money, register

BULLET = re.compile(r"^[•●·▪\-–]")
PRICE_HDR = re.compile(r"price|rate|rs\s*/|each", re.I)
QTY_HDR = re.compile(r"qty|quantity|pack\s*unit|per\s*case|\bpack\b|\bpkg\b|std\.?\s*pack", re.I)
HEADER_WORDS = re.compile(r"\b(Cat\.?|Code|Product|Capacity|Price|Qty|Quantity|Pack|No\.|Size|Unit|Rate|Per Case|Description)\b", re.I)
UNIT_ONLY = re.compile(r"^(\(?(mm|ml|cm|mL|µm|nos?\.?|pcs|kg|g|l|ltr|`|₹|\(\s*`?\s*\))\)?\s*)+$", re.I)
NAME_HDR = re.compile(r"description|item name|particulars", re.I)


@dataclass
class Col:
    x0: float
    x1: float
    label: str

    @property
    def xc(self) -> float:
        return (self.x0 + self.x1) / 2


@dataclass
class SpecTableConfig:
    code_rx: re.Pattern[str]
    is_title: Callable[[StyledRow], bool]
    is_subtitle: Callable[[StyledRow], bool] = lambda r: False
    min_x: float = 0.0
    top: float = 0.0
    bottom: float = 30.0
    title_clean: Callable[[str], str] = lambda s: s
    max_spec_in_name: int = 2
    hsn_rx: re.Pattern[str] | None = re.compile(r"HSN\s*(?:Code)?\s*[:\-]?\s*(\d{4,8})", re.I)


@dataclass
class _State:
    title: str | None = None
    subtitle: str | None = None
    header: list[Col] = field(default_factory=list)
    header_open: bool = False
    pending: list[RawProduct] = field(default_factory=list)
    variant: str | None = None
    last_was_subtitle: bool = False
    title_open: bool = False     # heading ended with a comma: next heading line continues it
    fresh: bool = False          # a heading was just read; no header or data yet
    desc: list[str] = field(default_factory=list)


class SpecTableParser(BrandParser):
    cfg: SpecTableConfig

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        st = _State()
        for pno in range(doc.page_count):
            page = doc[pno]
            h = page.rect.height
            rows = [r for r in styled_rows(page) if self.cfg.top < r.y < h - self.cfg.bottom]
            for r in rows:
                r.cells = [c for c in r.cells if c.x0 >= self.cfg.min_x]
            rows = [r for r in rows if r.cells and (r.size == 0 or r.size >= 7)]
            rows = self._page_filter(rows)
            for r in rows:
                yield from self._row(r, st)
        yield from self._flush(st)

    def _page_filter(self, rows: list[StyledRow]) -> list[StyledRow]:
        return rows

    # --------------------------------------------------------------- row handling
    def _flush(self, st: _State):
        yield from (p for p in st.pending if p is not None)
        st.pending = []

    def _row(self, r: StyledRow, st: _State):
        cfg = self.cfg
        first = r.cells[0].text.strip()
        if cfg.hsn_rx and (m := cfg.hsn_rx.search(r.text)) and not cfg.code_rx.match(first):
            for p in st.pending:
                if isinstance(p, RawProduct):
                    p.hsn = p.hsn or m.group(1)
            return
        if cfg.code_rx.match(first) and any(looks_like_money(c.text) for c in r.cells[1:]):
            st.header_open, st.fresh = False, False
            p = self._product(r, st)
            if p is not None:
                st.pending.append(p)
            return
        if cfg.is_title(r):
            text = cfg.title_clean(clean_text(r.cells[0].text))
            open_tail = r.cells[0].text.strip().endswith(",")
            if st.title and st.title_open and st.fresh:
                st.title, st.title_open = f"{st.title}, {text}", open_tail   # heading wrapped onto a second line
                return
            st.title_open = open_tail
            yield from self._flush(st)
            st.variant = None
            st.title, st.subtitle, st.header, st.fresh, st.desc = text, None, [], True, []
            return
        if st.title and st.title.endswith(",") and r.bold and not HEADER_WORDS.search(r.text) and not st.header:
            st.title = clean_text(st.title + " " + r.text.replace(" | ", " "))
            return
        if BULLET.match(first):
            return
        if st.header and r.bold and len(r.cells) == 1 and not HEADER_WORDS.search(r.text) and len(r.text) < 60 and not UNIT_ONLY.match(r.text):
            st.variant, st.header_open = clean_text(r.text), False   # in-table subheading
            return
        if cfg.is_subtitle(r) and not HEADER_WORDS.search(r.text) and not st.header_open and not UNIT_ONLY.match(r.text.replace(" | ", " ")) and len(r.text) >= 4:
            text = clean_text(r.text.replace(" | ", " "))
            if st.subtitle and st.last_was_subtitle and not st.header:
                st.subtitle = f"{st.subtitle} {text}"
            elif st.header and len(r.cells) == 1:
                st.variant = text          # in-table subheading, e.g. "ISO / DIN Standard (Long Neck)"
            else:
                st.subtitle, st.variant = text, None
            st.last_was_subtitle = True
            return
        st.last_was_subtitle = False
        looks_header = (HEADER_WORDS.search(r.text) and all(len(c.text) < 36 for c in r.cells)
                        and (len(r.cells) >= 2 or r.bold or st.header_open or len(r.text) < 25))
        if looks_header or (st.header_open and all(len(c.text) < 36 for c in r.cells)):
            st.fresh = False
            if not st.header_open:
                st.header, st.header_open, st.variant = [], True, None
            self._add_header(st, r)
        elif st.title and not st.header and not r.bold:
            st.desc.append(clean_text(r.text.replace(" | ", " ")))

    def _add_header(self, st: _State, r: StyledRow):
        for c in r.cells:
            for col in st.header:
                if c.x0 < col.x1 + 6 and c.x1 > col.x0 - 6:
                    col.label = f"{col.label} {c.text}".strip()
                    col.x0, col.x1 = min(col.x0, c.x0), max(col.x1, c.x1)
                    break
            else:
                st.header.append(Col(c.x0, c.x1, c.text))
        st.header.sort(key=lambda c: c.x0)

    def _label_for(self, st: _State, c: Cell) -> str:
        if not st.header:
            return ""
        xc = (c.x0 + c.x1) / 2
        best = min(st.header, key=lambda col: abs(col.xc - xc))
        return best.label

    def _product(self, r: StyledRow, st: _State) -> RawProduct | Skip | None:
        code = r.cells[0].text.strip()
        if not st.title:
            return Skip(r.page, "row before any product heading", r.text)
        price = pack = None
        specs: dict[str, str] = {}
        money_cells = [c for c in r.cells[1:] if looks_like_money(c.text)]
        price_cell = None
        if st.header and any(PRICE_HDR.search(col.label) for col in st.header):
            priced = [c for c in money_cells if PRICE_HDR.search(self._label_for(st, c))]
            if not priced:
                return Skip(r.page, "no price in the price column", r.text)
            price_cell = priced[-1]
        elif st.header:
            last = r.cells[-1]
            beyond = last.x0 > max(col.x1 for col in st.header) - 5
            if beyond and (re.fullmatch(r"\d[\d,]*\.\d{2}", last.text.strip()) or re.fullmatch(r"(?i)on request|por", last.text.strip())):
                price_cell = last   # unlabelled rate column right of every labelled column
            else:
                return Skip(r.page, "table has no price column (spec table)", r.text)
        else:
            return Skip(r.page, "coded row outside any priced table", r.text)
        price = price_cell.text
        for c in r.cells[1:]:
            if c is price_cell:
                continue
            label = clean_text(self._label_for(st, c)) or "Spec"
            if PRICE_HDR.search(label):
                continue
            if QTY_HDR.search(label) and pack is None:
                pack = c.text
                specs[label] = c.text
                continue
            specs[label] = c.text
        specs = {k: v for k, v in specs.items() if not re.fullmatch(r"[\d\s]+", k)}   # thumb-index junk
        named = next((k for k in specs if NAME_HDR.search(k)), None)
        if named:   # description-style table: the row carries its own product name
            return RawProduct(code=code, name=join_name(specs.pop(named)), price=price, specs=specs, section=st.title,
                              source_page=r.page)
        summary = [f"{k} {v}" for k, v in list(specs.items()) if not QTY_HDR.search(k)][: self.cfg.max_spec_in_name]
        desc = " ".join(st.desc)
        cls = re.search(r"Class\s*['‘’\"]?\s*([AB])\b", desc)
        name = join_name(st.title, f", {st.subtitle}" if st.subtitle else "", f", {st.variant}" if st.variant else "",
                         f", Class {cls.group(1)}" if cls and "class" not in (st.title + (st.subtitle or "")).lower() else "", "— " + ", ".join(summary) if summary else "")
        if st.header:
            specs["Price basis"] = clean_text(self._label_for(st, price_cell))
        return RawProduct(code=code, name=name, price=price, pack=None, description=desc[:600] or None, specs={**specs, **({"Pack": pack} if pack else {})},
                          section=st.title, source_page=r.page)


def _bold_at_least(size: float, max_x: float = 10_000) -> Callable[[StyledRow], bool]:
    return lambda r: r.bold and r.size >= size and r.cells[0].x0 < max_x


@register("omsons")
class OmsonsParser(SpecTableParser):
    cfg = SpecTableConfig(
        code_rx=re.compile(r"^[A-Z]{0,3}\d{2,4}[A-Z]{0,2}(?:[/-]\w+)*$"),
        is_title=_bold_at_least(13.5, max_x=120),
        is_subtitle=lambda r: r.bold and 9.5 <= r.size < 13.5 and r.cells[0].x0 < 120 and len(r.text) < 50,
        top=55, bottom=40)


_BL_CODE = re.compile(r"^BL[A-Z0-9]{8,}$")


class _BorosilBase(SpecTableParser):
    """Adds Borosil's two other table shapes to the shared engine:
    accessories ("Description | Ordering Code | Price") and transposed instrument
    tables ("Model Name | m1 | m2 ...", "Ordering Code" row, "Price / Piece" row)."""

    def parse(self, path):
        self._models = None
        yield from super().parse(path)

    def _row(self, r, st):
        cells = r.cells
        first = cells[0].text.strip()
        if r.size >= 24:   # instrument pages: 30pt light two-line page title
            text = clean_text(r.text.replace(" | ", " "))
            if st.fresh and getattr(self, "_big_title", False):
                st.title = f"{st.title} {text}"
            else:
                yield from self._flush(st)
                st.title, st.subtitle, st.variant, st.header, st.fresh, st.desc = text, None, None, [], True, []
                self._models = None
            self._big_title = True
            return
        self._big_title = False
        # accessories: description, ordering code, price
        if len(cells) >= 3 and _BL_CODE.match(cells[-2].text.strip()) and looks_like_money(cells[-1].text) and not _BL_CODE.match(first):
            if st.title:
                st.pending.append(RawProduct(code=cells[-2].text.strip(), name=join_name(" ".join(c.text for c in cells[:-2])),
                                             price=cells[-1].text, section=st.title, specs={"Accessory for": st.title},
                                             source_page=r.page))
            return
        if first.startswith(("Model Name", "Model No", "Models")) and len(cells) >= 2:
            self._models = {"cols": [(c.x0, c.x1, c.text) for c in cells[1:]], "codes": {}, "prefix": None, "specs": {}}
            return
        m = self._models
        if m is not None:
            def col_of(c):
                xc = (c.x0 + c.x1) / 2
                return min(range(len(m["cols"])), key=lambda i: abs((m["cols"][i][0] + m["cols"][i][1]) / 2 - xc))
            if first.startswith("Ordering Code"):
                for c in cells[1:]:
                    i = col_of(c)
                    m["codes"][i] = (m["prefix"].get(i, "") if m["prefix"] else "") + c.text.strip()
                return
            if first.startswith(("Price", "List Price")):
                vals = cells[1:]
                for i, (_, _, model) in enumerate(m["cols"]):
                    if len(vals) == 1:
                        price = vals[0].text           # one value spanning every model
                    else:
                        hit = [c for c in vals if col_of(c) == i]
                        price = hit[0].text if hit else ""
                    if not (looks_like_money(price) or "request" in price.lower()):
                        st.pending.append(Skip(r.page, "transposed table model without price", model)); continue
                    code = m["codes"].get(i) or model
                    st.pending.append(RawProduct(code=code.replace(" ", ""), name=join_name(st.title or "", "—", model),
                                                 price="POR" if "request" in price.lower() else price, section=st.title,
                                                 specs={"Model": model, **{k: v.get(i, "") for k, v in m["specs"].items() if v.get(i)}},
                                                 source_page=r.page))
                self._models = None
                return
            if all(_BL_CODE.match(c.text.strip()) or re.match(r"^[A-Z]{4,}$", c.text.strip()) for c in cells) and len(cells) >= 1 and not first.startswith("HSN"):
                m["prefix"] = {col_of(c): c.text.strip() for c in cells}   # first half of a wrapped ordering code
                return
            label = first
            if len(cells) >= 2 and len(label) < 40:
                vals = cells[1:]
                m["specs"][label] = {i: (vals[0].text if len(vals) == 1 else next((c.text for c in vals if col_of(c) == i), ""))
                                     for i in range(len(m["cols"]))}
                return
        yield from super()._row(r, st)


@register("borosil")
class BorosilParser(_BorosilBase):
    cfg = SpecTableConfig(
        code_rx=re.compile(r"^[A-Z0-9]{4,}[A-Z0-9\-/]*$"),
        is_title=lambda r: r.bold and r.size >= 13.5 and re.match(r"^\d{3,5}[A-Z]? ?- ", r.cells[0].text) is not None,
        is_subtitle=lambda r: r.bold and 8.9 <= r.size < 13.5 and len(r.text) < 60 and (r.size >= 10.5 or len(r.cells) == 1),
        min_x=30, bottom=35,
        title_clean=lambda s: re.sub(r"^\d{3,5}[A-Z]? ?- ", "", s).title())


@register("nice-glassware")
class NiceGlassParser(SpecTableParser):
    cfg = SpecTableConfig(
        code_rx=re.compile(r"^NG ?\d{3,5}[A-Z]?$"),
        is_title=lambda r: r.bold and re.match(r"^\d{2,4} ?- ", r.cells[0].text) is not None,
        min_x=150, top=70, bottom=30,
        title_clean=lambda s: re.sub(r"^\d{2,4} ?- ", "", s).rstrip(","))


@register("riviera")
class RivieraParser(SpecTableParser):
    cfg = SpecTableConfig(
        code_rx=re.compile(r"^\d{5} ?\d{2,3}$|^[A-Z]{2,}[A-Z0-9\-]{3,}$"),
        is_title=lambda r: r.bold and 8.9 <= r.size < 20 and r.cells[0].x0 < 60 and len(r.cells[0].text) > 12,
        top=60, bottom=30)
