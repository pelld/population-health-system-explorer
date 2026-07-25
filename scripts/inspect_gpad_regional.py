# ============================================================
# 00. INSPECT THE PUBLIC GPAD REGIONAL ARCHIVE
# ============================================================
# Downloads the official April 2025 regional archive and records the file
# names, columns and sample values needed to build a reproducible 2024-25 ICB
# layer for the operational map.

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/34/684B0F/Appointments_GP_Regional_CSV_Apr_25.zip"
OUTPUT_PATH = Path("public-data/inspection/gpad-regional-summary.json")


def read_csv(content: bytes) -> pd.DataFrame:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            return pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False, encoding=encoding)
        except Exception as error:
            errors.append(f"{encoding}: {type(error).__name__}: {error}")
    raise RuntimeError("Could not read CSV. " + " | ".join(errors))


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    summaries = []

    for name in archive.namelist():
        if not name.lower().endswith(".csv"):
            continue

        content = archive.read(name)
        frame = read_csv(content)
        frame.columns = frame.columns.astype(str).str.strip()

        summary = {
            "name": name,
            "bytes": len(content),
            "rows": int(len(frame)),
            "columns": frame.columns.tolist(),
            "samples": {},
        }

        for column in frame.columns[:18]:
            values = frame[column].dropna().astype(str).str.strip()
            values = values.loc[values.ne("")]
            summary["samples"][column] = values.drop_duplicates().head(12).tolist()

        summaries.append(summary)

    output = {
        "source_url": SOURCE_URL,
        "archive_bytes": len(response.content),
        "csv_count": len(summaries),
        "files": summaries,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(summaries)} CSV summaries")


if __name__ == "__main__":
    main()
