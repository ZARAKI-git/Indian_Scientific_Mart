"""Run one parser over a page range and print what it extracts.
python -m ism_ingest.debug <parser-key> <file> [first_page-last_page] [limit]"""
import sys
from pathlib import Path

from . import parsers  # noqa: F401
from .model import Skip
from .parsers.base import get_parser

key, f = sys.argv[1], Path(sys.argv[2])
rng = sys.argv[3] if len(sys.argv) > 3 else None
limit = int(sys.argv[4]) if len(sys.argv) > 4 else 40
lo, hi = (int(x) for x in rng.split("-")) if rng else (0, 10**9)
n = shown = 0
for item in get_parser(key).parse(f):
    pg = item.source_page or 0
    if not (lo <= pg <= hi):
        continue
    n += 1
    if shown < limit:
        shown += 1
        if isinstance(item, Skip):
            print(f"SKIP p{pg} {item.reason}: {item.text[:120]}")
        else:
            print(f"p{pg} {item.code!s:16} | {item.name[:70]:70} | {item.pack!s:10} | {item.price!s:12} | "
                  f"gst={item.gst} hsn={item.hsn} cas={item.cas} sec={str(item.section)[:30]} {item.specs if item.specs else ''}"[:260])
print("total in range:", n)
