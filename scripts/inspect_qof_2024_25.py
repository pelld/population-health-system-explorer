# ============================================================
# 00. INSPECT QOF 2024-25 RAW CSV ZIP
# ============================================================
# Downloads the official NHS England raw-data ZIP and records the exact file
# names, columns, row counts and representative rows needed for the production
# prevalence, achievement and personalised-care-adjustment extractor.

from __future__ import annotations

import csv
import io
import json
import zipfile
from pathlib import Path

import requests


SOURCE_URL = "https://files.digital.nhs.uk/95/4708D7/QOF2425.zip"
OUTPUT_PATH = Path("public-data/qof-2024-25-inspection.json")


# ============================================================
# 01. DOWNLOAD AND CSV PROFILING HELPERS
# ============================================================
def decode_csv(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="replace")


def profile_csv(name: str, raw: bytes) -> dict:
    text = decode_csv(raw)
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    header = rows[0] if rows else []
    samples = [dict(zip(header, row)) for row in rows[1:4]] if header else []
    return {
        "name": name,
        "bytes": len(raw),
        "row_count": max(len(rows) - 1, 0),
        "column_count": len(header),
        "columns": header,
        "sample_rows": samples,
    }


# ============================================================
# 02. DOWNLOAD, INSPECT AND WRITE A COMPACT STRUCTURAL SUMMARY
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        names = sorted(name for name in archive.namelist() if not name.endswith("/"))
        csv_profiles = []

        for name in names:
            if name.lower().endswith(".csv"):
                csv_profiles.append(profile_csv(name, archive.read(name)))

        output = {
            "source_url": SOURCE_URL,
            "zip_bytes": len(response.content),
            "file_count": len(names),
            "files": names,
            "csv_profiles": csv_profiles,
        }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(csv_profiles)} CSV files")


if __name__ == "__main__":
    main()
