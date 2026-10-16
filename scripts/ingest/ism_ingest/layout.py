"""Positional text extraction: rebuild visual rows and cells from PDF words.

PDF text order is unreliable (columns interleave), so every PDF parser works on
rows reconstructed from word bounding boxes instead of raw text.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator

import pymupdf


@dataclass
class Cell:
    x0: float
    x1: float
    text: str


@dataclass
class Row:
    page: int
    y: float
    cells: list[Cell] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " | ".join(c.text for c in self.cells)

    def texts(self) -> list[str]:
        return [c.text for c in self.cells]


def page_rows(page: pymupdf.Page, y_tol: float = 3.0, gap: float = 8.0) -> list[Row]:
    """Group words into rows by vertical centre, then split rows into cells on x gaps."""
    words = page.get_text("words")  # x0, y0, x1, y1, word, block, line, wno
    words.sort(key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    rows: list[list[tuple]] = []
    for w in words:
        yc = (w[1] + w[3]) / 2
        if rows and abs(((rows[-1][0][1] + rows[-1][0][3]) / 2) - yc) <= y_tol:
            rows[-1].append(w)
        else:
            rows.append([w])
    out: list[Row] = []
    for ws in rows:
        ws.sort(key=lambda w: w[0])
        row = Row(page=page.number + 1, y=round((ws[0][1] + ws[0][3]) / 2, 1))
        for w in ws:
            if row.cells and w[0] - row.cells[-1].x1 <= gap:
                c = row.cells[-1]
                c.text += " " + w[4]
                c.x1 = w[2]
            else:
                row.cells.append(Cell(w[0], w[2], w[4]))
        out.append(row)
    return out


def iter_rows(path: str, y_tol: float = 3.0, gap: float = 8.0,
              pages: range | None = None) -> Iterator[Row]:
    doc = pymupdf.open(path)
    for i in pages if pages is not None else range(doc.page_count):
        yield from page_rows(doc[i], y_tol, gap)


@dataclass
class StyledRow(Row):
    bold: bool = False      # first visible span is bold
    size: float = 0.0       # largest font size on the row


def styled_rows(page: pymupdf.Page, y_tol: float = 3.0, gap: float = 8.0) -> list[StyledRow]:
    """page_rows plus typography, so headings can be told apart from body text."""
    spans = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if s["text"].strip():
                    spans.append(((s["bbox"][1] + s["bbox"][3]) / 2, s["bbox"][0], s["size"], bool(s["flags"] & 16)))
    out: list[StyledRow] = []
    for r in page_rows(page, y_tol, gap):
        mine = [s for s in spans if abs(s[0] - r.y) <= y_tol + 1]
        sr = StyledRow(page=r.page, y=r.y, cells=r.cells)
        if mine:
            first = min(mine, key=lambda s: s[1])
            sr.bold, sr.size = first[3], max(s[2] for s in mine)
        out.append(sr)
    return out
