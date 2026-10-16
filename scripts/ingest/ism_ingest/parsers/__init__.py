"""Importing this package registers every parser module."""
from importlib import import_module
from pathlib import Path

for _p in sorted(Path(__file__).parent.glob("*.py")):
    if _p.stem not in ("__init__", "base"):
        import_module(f"{__name__}.{_p.stem}")
