import argparse
from pathlib import Path

from .pipeline import run

ap = argparse.ArgumentParser(prog="ism_ingest", description="Normalise supplier price lists into the ISM catalogue.")
ap.add_argument("--src", type=Path, required=True, help="folder holding the supplier files")
ap.add_argument("--out", type=Path, default=Path("out"))
ap.add_argument("--only", nargs="*", help="brand slugs to run (default: all)")
a = ap.parse_args()
print(run(a.src, a.out, set(a.only) if a.only else None))
