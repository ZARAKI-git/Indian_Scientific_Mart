"""Tier A: clean spreadsheets. These define the normalised schema."""
from __future__ import annotations

from pathlib import Path

import openpyxl

from ..model import RawProduct, Skip
from ..normalise import clean_code, clean_text
from .base import BrandParser, ParseResult, register


def _rows(path: Path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    for i, r in enumerate(ws.iter_rows(values_only=True), start=1):
        yield i, r


@register("nice-chemicals-xlsx")
class NiceChemicalsParser(BrandParser):
    """CODE | PRODUCT | CAS No | QTY | HSN | TAX | RATE"""

    def parse(self, path: Path) -> ParseResult:
        for i, r in _rows(path):
            if i == 1:
                if [str(c).strip().upper() for c in r[:7]] != ["CODE", "PRODUCT", "CAS NO", "QTY", "HSN", "TAX", "RATE"]:
                    raise ValueError(f"NICE header changed: {r}")
                continue
            code, name, cas, qty, hsn, tax, rate = (list(r) + [None] * 7)[:7]
            if not code and not name:
                continue
            if not code or not name:
                yield Skip(i, "missing code or name", str(r)); continue
            yield RawProduct(code=clean_code(code), name=clean_text(name), cas=cas and str(cas).strip(),
                             pack=qty and str(qty), hsn=hsn and str(hsn), gst=tax, price=None if rate is None else str(rate),
                             source_page=i)


@register("whatman-xlsx")
class WhatmanParser(BrandParser):
    """Cat No. | Product Description | HSN | GST% (fraction) | 2026 INR LP"""

    def parse(self, path: Path) -> ParseResult:
        for i, r in _rows(path):
            if i == 1:
                if not (str(r[0]).startswith("Cat No") and "INR" in str(r[4])):
                    raise ValueError(f"Whatman header changed: {r}")
                continue
            code, desc, hsn, gst, price = (list(r) + [None] * 5)[:5]
            if code is None and desc is None:
                continue
            if code is None or desc is None:
                yield Skip(i, "missing code or description", str(r)); continue
            yield RawProduct(code=clean_code(code), name=clean_text(str(desc)), hsn=hsn and str(hsn),
                             gst=gst, price=None if price is None else str(price), source_page=i)
