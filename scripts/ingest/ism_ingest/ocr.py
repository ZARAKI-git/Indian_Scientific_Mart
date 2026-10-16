"""Tesseract OCR for scanned price lists, returning the same Row/Cell shapes as
text PDFs so OCR parsers reuse the layout helpers. Results are cached per page."""
from __future__ import annotations

import csv
import hashlib
import io
import os
import subprocess
from pathlib import Path

import pymupdf

from .layout import Cell, Row

CACHE = Path(os.environ.get("ISM_OCR_CACHE", Path(__file__).resolve().parent.parent / "out" / "ocr_cache"))
DPI = 220


def _tsv(path: Path, pno: int, page: pymupdf.Page) -> str:
    key = hashlib.sha1(f"{path.name}:{path.stat().st_size}:{pno}:{DPI}".encode()).hexdigest()[:16]
    f = CACHE / f"{key}.tsv"
    if f.exists():
        return f.read_text()
    CACHE.mkdir(parents=True, exist_ok=True)
    png = page.get_pixmap(dpi=DPI).tobytes("png")
    out = subprocess.run(["tesseract", "stdin", "stdout", "--psm", "4", "tsv"], input=png,
                         capture_output=True, check=True).stdout.decode("utf-8", "replace")
    f.write_text(out)
    return out


def ocr_rows(path: Path, pno: int, page: pymupdf.Page, gap: float = 10.0) -> list[Row]:
    """Rows in PDF points (not pixels), built from tesseract's line grouping."""
    scale = 72 / DPI
    lines: dict[tuple, list[dict]] = {}
    for rec in csv.DictReader(io.StringIO(_tsv(path, pno, page)), delimiter="\t", quoting=csv.QUOTE_NONE):
        if rec.get("level") != "5" or not (rec.get("text") or "").strip() or float(rec.get("conf") or -1) < 0:
            continue
        lines.setdefault((rec["block_num"], rec["par_num"], rec["line_num"]), []).append(rec)
    rows = []
    for ws in lines.values():
        ws.sort(key=lambda w: int(w["left"]))
        y = sum(int(w["top"]) + int(w["height"]) / 2 for w in ws) / len(ws) * scale
        row = Row(page=pno + 1, y=round(y, 1))
        for w in ws:
            x0, x1 = int(w["left"]) * scale, (int(w["left"]) + int(w["width"])) * scale
            if row.cells and x0 - row.cells[-1].x1 <= gap:
                row.cells[-1].text += " " + w["text"]; row.cells[-1].x1 = x1
            else:
                row.cells.append(Cell(x0, x1, w["text"]))
        rows.append(row)
    # tesseract blocks are column-major; merge lines that share a baseline into one visual row
    rows.sort(key=lambda r: (r.y, r.cells[0].x0))
    merged: list[Row] = []
    for r in rows:
        if merged and abs(merged[-1].y - r.y) < 4:
            merged[-1].cells = sorted(merged[-1].cells + r.cells, key=lambda c: c.x0)
        else:
            merged.append(r)
    return merged
