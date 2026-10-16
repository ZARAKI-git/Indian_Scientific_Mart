"""Pipeline data shapes. Parsers emit RawProduct; the normaliser turns it into Product."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal

PriceBasis = Literal["excl_gst", "incl_gst", "unknown"]


@dataclass
class RawProduct:
    """What a parser saw, as strings, before any cleaning."""
    code: str | None
    name: str
    price: str | None = None          # raw price text ("1,290.00", "POR", "₹ 16,000")
    pack: str | None = None
    unit: str | None = None
    cas: str | None = None
    hsn: str | None = None
    gst: str | None = None            # "18%", "0.18", "18"
    description: str | None = None
    section: str | None = None        # nearest heading in the source; drives categorisation
    specs: dict[str, str] = field(default_factory=dict)
    source_page: int | None = None
    needs_review: bool = False
    review_reason: str | None = None


@dataclass
class Product:
    brand_slug: str
    code: str
    name: str
    description: str | None
    cas_no: str | None
    pack_size: str | None
    unit: str | None
    hsn_code: str | None
    gst_rate: int | None
    list_rate: float | None
    currency: str
    price_basis: PriceBasis
    price_on_request: bool
    price_as_of: str | None
    category_slug: str
    specs: dict[str, Any]
    source_file: str
    source_page: int | None
    needs_review: bool
    review_reason: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Skip:
    source_page: int | None
    reason: str
    text: str
