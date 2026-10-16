"""Tier C: scanned lists read by OCR. Every row is held for human review."""
from __future__ import annotations

import re
from pathlib import Path

import pymupdf

from ..model import RawProduct, Skip
from ..normalise import clean_text
from ..ocr import ocr_rows
from .base import BrandParser, ParseResult, join_name, register

REVIEW = "OCR — verify code, name and price against the scan"


@register("ocr-ambassador")
class AmbassadorOcrParser(BrandParser):
    """One product family per page: 'B.P.I.-10.' code, a bold name line, then a table of
    lettered variants (A., B., ...) whose priced columns follow the size columns."""

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            rows = ocr_rows(path, pno, doc[pno])
            code = name = None
            price_hdr = []
            for r in rows:
                t = clean_text(r.text.replace(" | ", " "))
                m = re.match(r"^(B\.?\s?P\.?\s?I\.?\s?-?\s?\d+[A-Z]?)\.?$", t)
                if m:
                    code, name = re.sub(r"\s", "", m.group(1)).rstrip("."), None
                    continue
                if code and name is None and len(t) > 15 and not re.match(r"^\d", t):
                    name = re.sub(r"\(HSN.*$", "", t).replace("®", "")
                    name = re.sub(r"[\s:]*[.:s]{4,}.*$", "", name).strip(" :")
                    continue
                if "Price" in t or "Rs" in t:
                    price_hdr += [(c.x0, c.text) for c in r.cells]
                lm = re.match(r"^([A-H])[.,]?$", r.cells[0].text.strip())
                if code and name and lm:
                    nums = [c for c in r.cells[1:] if re.fullmatch(r"\d{3,7}", c.text.replace(",", "").strip())]
                    if not nums:
                        yield Skip(pno + 1, "OCR variant row without a price", t); continue
                    size = (r.cells[1].text if len(r.cells) > 1 else "").strip("| ")
                    # the first 4+ digit number left-to-right is the base model price
                    price = next((c.text for c in nums if len(c.text.replace(",", "")) >= 4), nums[0].text)
                    yield RawProduct(code=f"{code}-{lm.group(1)}", name=join_name(name, "—", size), price=price,
                                     specs={"OCR row": t}, source_page=pno + 1,
                                     needs_review=True, review_reason=REVIEW)


@register("ocr-ambey")
class AmbeyOcrParser(BrandParser):
    """Catalogue of teaching trainers: 'AL-E029 Transistor Amplifier Trainer ...' with no prices."""
    CODE = re.compile(r"^(A[LI1]\s?-\s?[A-Z]{0,3}\s?\d{2,4}[A-Z]?)\s+(.{6,})$")

    def parse(self, path: Path) -> ParseResult:
        doc = pymupdf.open(str(path))
        for pno in range(doc.page_count):
            heading = None
            for r in ocr_rows(path, pno, doc[pno]):
                t = clean_text(r.text.replace(" | ", " "))
                if t.isupper() and 4 < len(t) < 40 and not self.CODE.match(t):
                    heading = t.title()
                m = self.CODE.match(t)
                if m:
                    code = re.sub(r"\s", "", m.group(1)).replace("A1-", "AL-").replace("AI-", "AL-")
                    yield RawProduct(code=code, name=m.group(2), price="POR", section=heading, source_page=pno + 1,
                                     needs_review=True, review_reason=REVIEW + " (catalogue has no prices)")
