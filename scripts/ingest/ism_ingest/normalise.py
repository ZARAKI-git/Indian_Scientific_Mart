"""Pure cleaning functions: money, GST, pack sizes, codes, CAS numbers."""
from __future__ import annotations

import re

_POR = re.compile(r"^\s*(POR|POA|P\.O\.R|ON REQUEST|PRICE ON REQUEST|ASK)\b", re.I)
_MONEY = re.compile(r"(\d[\d,]*(?:\.\d+)?)")


def is_price_on_request(text: str | None) -> bool:
    return bool(text and _POR.search(text))


def parse_money(text: str | None) -> float | None:
    """'₹ 1,29,500.00' -> 129500.0 ; '50,000/-' -> 50000.0. Handles Indian lakh grouping."""
    if not text:
        return None
    t = text.replace("₹", "").replace("Rs.", "").replace("Rs", "").replace("INR", "")
    t = t.replace("/-", "").replace("`", "").strip()
    m = _MONEY.search(t)
    if not m:
        return None
    try:
        v = float(m.group(1).replace(",", ""))
    except ValueError:
        return None
    return v if v > 0 else None


def parse_gst(text: str | float | int | None) -> int | None:
    """'18%' / '18.00' / 0.18 / 18 -> 18. Whatman stores a fraction."""
    if text is None or text == "":
        return None
    if isinstance(text, (int, float)):
        v = float(text)
    else:
        m = re.search(r"\d+(?:\.\d+)?", str(text))
        if not m:
            return None
        v = float(m.group(0))
    if 0 < v < 1:
        v *= 100
    v = round(v)
    return v if v in (0, 3, 5, 12, 18, 28) else None


_UNIT_MAP = {
    "ml": "ml", "mls": "ml", "l": "l", "lt": "l", "ltr": "l", "ltrs": "l", "litre": "l", "liter": "l",
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g", "kg": "kg", "kgs": "kg",
    "mg": "mg", "ul": "µl", "µl": "µl", "ug": "µg", "µg": "µg", "mcg": "µg",
    "no": "no", "nos": "no", "pc": "pc", "pcs": "pc", "piece": "pc", "pieces": "pc", "ea": "ea",
    "pk": "pk", "pack": "pk", "box": "box", "set": "set", "bottle": "bottle", "vial": "vial",
    "test": "tests", "tests": "tests", "rxn": "rxn", "rxns": "rxn", "units": "units", "u": "units",
}
_PACK = re.compile(r"^\s*(\d+(?:[.,]\d+)?)\s*([A-Za-zµ]+)\.?\s*$")


def normalise_pack(text: str | None) -> tuple[str | None, str | None]:
    """'2,5 L' -> ('2.5 l', 'l'); '250 GM' -> ('250 g', 'g'); '1 EA' -> ('1 ea', 'ea')."""
    if not text:
        return None, None
    t = " ".join(str(text).split())
    m = _PACK.match(t)
    if not m:
        return t, None
    qty = m.group(1).replace(",", ".")
    unit = _UNIT_MAP.get(m.group(2).lower())
    if not unit:
        return t, None
    if qty.endswith(".0"):
        qty = qty[:-2]
    return f"{qty} {unit}", unit


_CAS = re.compile(r"\b(\d{2,7}-\d{2}-\d)\b")


def find_cas(text: str | None) -> str | None:
    if not text:
        return None
    m = _CAS.search(text)
    return m.group(1) if m else None


def clean_code(code: str | int | float | None) -> str | None:
    if code is None:
        return None
    if isinstance(code, float) and code.is_integer():
        code = int(code)
    c = " ".join(str(code).split()).strip(" *.:")
    return c or None


def clean_hsn(hsn: str | int | float | None) -> str | None:
    if hsn is None or hsn == "":
        return None
    if isinstance(hsn, float):
        hsn = int(hsn)
    digits = re.sub(r"\D", "", str(hsn))
    return digits if 4 <= len(digits) <= 8 else None


def clean_text(s: str | None) -> str:
    if not s:
        return ""
    s = s.replace(" ", " ").replace("ﬁ", "fi").replace("ﬂ", "fl")
    s = " ".join(s.split()).strip(" ,;|-–—")
    return re.sub(r"\s+,", ",", s)
