"""BrandParser contract, registry, and the shared row-to-record machinery.

OCP: a new brand is a new module that subclasses BrandParser and registers
itself. The pipeline discovers parsers through the registry and never imports a
concrete parser by name.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterator

from ..layout import Row, iter_rows
from ..model import RawProduct, Skip
from ..normalise import clean_text

ParseResult = Iterator[RawProduct | Skip]


class BrandParser(ABC):
    """Turns one supplier file into RawProducts (and Skips for anything it refuses)."""

    @abstractmethod
    def parse(self, path: Path) -> ParseResult: ...


_REGISTRY: dict[str, Callable[[], BrandParser]] = {}


def register(key: str):
    def deco(cls):
        if key in _REGISTRY:
            raise ValueError(f"parser {key!r} registered twice")
        _REGISTRY[key] = cls
        return cls
    return deco


def get_parser(key: str) -> BrandParser:
    try:
        return _REGISTRY[key]()
    except KeyError:
        raise KeyError(f"no parser registered for {key!r}; known: {sorted(_REGISTRY)}") from None


def registered() -> list[str]:
    return sorted(_REGISTRY)


# ---------------------------------------------------------------- column tables

MONEY_RX = re.compile(r"^(?:₹|Rs\.?|INR)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?(?:/-)?$|^(?:₹|Rs\.?)?\s*\d+(?:\.\d{1,2})?(?:/-)?$")
POR_RX = re.compile(r"^(POR|POA|P\.O\.R\.?|On Request|Price on Request)$", re.I)


def looks_like_money(s: str | None) -> bool:
    if not s:
        return False
    s = s.strip()
    return bool(MONEY_RX.match(s) or POR_RX.match(s))


@dataclass
class Columns:
    """Column layout as left edges: [(x_start, field), ...]. A cell belongs to the
    right-most column whose start is <= the cell's left edge (+ slack)."""
    starts: list[tuple[float, str]]
    slack: float = 6.0

    def __post_init__(self):
        self.starts.sort()

    def field_of(self, x0: float) -> str:
        chosen = self.starts[0][1]
        for x, f in self.starts:
            if x0 + self.slack >= x:
                chosen = f
        return chosen

    def split(self, row: Row) -> dict[str, str]:
        out: dict[str, list[str]] = {}
        for c in row.cells:
            out.setdefault(self.field_of(c.x0), []).append(c.text)
        return {k: " ".join(v).strip() for k, v in out.items()}


@dataclass
class Accumulator:
    """Collects multi-line records: a record opens on a row carrying a code and
    absorbs following rows (wrapped descriptions, late prices) until the next code."""
    page: int | None = None
    current: dict[str, str] | None = None
    extra: list[str] = field(default_factory=list)

    def open(self, fields: dict[str, str], page: int) -> dict[str, str] | None:
        done = self.close()
        self.current, self.extra, self.page = dict(fields), [], page
        return done

    def absorb(self, fields: dict[str, str]) -> None:
        if self.current is None:
            return
        for k, v in fields.items():
            if not v:
                continue
            if k == "name":
                self.extra.append(v)
            elif not self.current.get(k):
                self.current[k] = v

    def close(self) -> dict[str, str] | None:
        if self.current is None:
            return None
        rec = self.current
        if self.extra:
            rec["name_extra"] = " ".join(self.extra)
        rec["_page"] = str(self.page)
        self.current, self.extra = None, []
        return rec


def table_records(path: Path, cols: Columns, is_code: Callable[[str], bool],
                  skip_row: Callable[[Row], bool] = lambda r: False,
                  pages: range | None = None, y_tol: float = 3.0, gap: float = 8.0,
                  max_extra_lines: int = 4) -> Iterator[dict[str, str]]:
    """Generic multi-line record extraction for code-led tables."""
    acc = Accumulator()
    last_page = None
    for row in iter_rows(str(path), y_tol=y_tol, gap=gap, pages=pages):
        if row.page != last_page:
            done = acc.close()
            if done:
                yield done
            last_page = row.page
        if skip_row(row):
            continue
        f = cols.split(row)
        code = f.get("code", "")
        if code and is_code(code):
            done = acc.open(f, row.page)
            if done:
                yield done
        elif acc.current is not None and len(acc.extra) < max_extra_lines:
            acc.absorb(f)
    done = acc.close()
    if done:
        yield done


def join_name(*parts: str | None) -> str:
    return clean_text(" ".join(p for p in parts if p))


def synthetic_code(prefix: str, *parts: str | None) -> str:
    """Stable code for lists that print no catalogue number: same text, same code."""
    import hashlib
    key = "|".join(clean_text(p or "").lower() for p in parts)
    return f"{prefix}-{hashlib.sha1(key.encode()).hexdigest()[:8].upper()}"


SYNTHETIC = {"_code_synthetic": "true"}
