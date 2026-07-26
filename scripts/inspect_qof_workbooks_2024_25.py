# ============================================================
# 00. INSPECT QOF 2024-25 NATIONAL AND ICB WORKBOOKS
# ============================================================
# Records sheet names, dimensions, likely header rows and representative values
# so the production raw-data aggregation can be reconciled to direct published
# England and ICB tables.

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


SOURCES = {
    "national":"https://files.digital.nhs.uk/53/9DC070/qof-2425-nat-reg-ach-prev-pca.xlsx",
    "icb":"https://files.digital.nhs.uk/2D/50DE48/qof-2425-icb-ach-prev-pca.xlsx",
}
OUTPUT_PATH = Path("public-data/qof-2024-25-workbook-inspection.json")


# ============================================================
# 01. WORKBOOK PROFILING
# ============================================================
def inspect_workbook(label: str, url: str) -> dict:
    response = requests.get(url, timeout=300)
    response.raise_for_status()
    workbook = pd.ExcelFile(io.BytesIO(response.content))
    sheets = []

    for sheet_name in workbook.sheet_names:
        frame = pd.read_excel(workbook, sheet_name=sheet_name, header=None, dtype=str)
        non_empty = frame.dropna(how="all").dropna(axis=1, how="all")
        sheets.append({
            "name":sheet_name,
            "rows":int(frame.shape[0]),
            "columns":int(frame.shape[1]),
            "first_non_empty_rows":non_empty.head(15).fillna("").astype(str).values.tolist(),
        })

    return {
        "label":label,
        "url":url,
        "bytes":len(response.content),
        "sheet_count":len(workbook.sheet_names),
        "sheets":sheets,
    }


# ============================================================
# 02. WRITE STRUCTURAL INSPECTION
# ============================================================
def main() -> None:
    output = {"workbooks":[inspect_workbook(label, url) for label, url in SOURCES.items()]}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
