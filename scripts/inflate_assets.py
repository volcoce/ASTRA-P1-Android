#!/usr/bin/env python3
"""Restore the original ASTRA generated ephemerides from gzip assets."""
from pathlib import Path
import gzip
import hashlib
root=Path(__file__).resolve().parents[1] / "app/src/main/assets"
for name in ("data.js","p1-data.js"):
    archived=root / (name+".gz")
    raw=gzip.decompress(archived.read_bytes())
    target=root / name
    target.write_bytes(raw)
    print(f"Restored {name}: {len(raw)} bytes, SHA256 {hashlib.sha256(raw).hexdigest()}")
