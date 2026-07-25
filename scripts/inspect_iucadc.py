# ============================================================
# 00. INSPECT THE REVISED PUBLIC 2024-25 IUC ADC CSV
# ============================================================
# This deliberately performs no analytical transformation. It records the exact
# source structure and representative values so the production builder can use
# published field names rather than assumptions.

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/08/IUCADC-Apr23-to-Mar25-Revised-1.csv"
OUTPUT_PATH = Path("public-data/inspection/iucadc-structure.json")
SAMPLE_PATH = Path("public-data/inspection/iucadc-sample.csv")


def decode(content: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            return content.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    raise RuntimeError("Could not decode the IUC ADC CSV")


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    text, encoding = decode(response.content)

    reader = csv.DictReader(io.StringIO(text))
    rows = []
    unique_values: dict[str, set[str]] = {column: set() for column in (reader.fieldnames or [])}

    for index, row in enumerate(reader):
        if index < 25:
            rows.append(row)
        for column, value in row.items():
            cleaned = (value or "").strip()
            if cleaned and len(unique_values[column]) < 40:
                unique_values[column].add(cleaned)

    structure = {
        "source_url": SOURCE_URL,
        "bytes": len(response.content),
        "encoding": encoding,
        "columns": reader.fieldnames or [],
        "sample_unique_values": {column: sorted(values) for column, values in unique_values.items()},
        "sample_rows": rows[:5],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(structure, indent=2, ensure_ascii=False), encoding="utf-8")

    with SAMPLE_PATH.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=reader.fieldnames or [])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {OUTPUT_PATH} and {SAMPLE_PATH}")


if __name__ == "__main__":
    main()
