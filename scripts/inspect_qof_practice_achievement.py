# ============================================================
# 00. INSPECT QOF PRACTICE ACHIEVEMENT WORKBOOK
# ============================================================

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/EB/16B1C0/qof-2425-prac-dom-ach.xlsx"
OUTPUT_PATH = Path("public-data/qof-2024-25-practice-achievement-inspection.json")


def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()
    workbook = pd.ExcelFile(io.BytesIO(response.content))
    sheets = []

    for sheet_name in workbook.sheet_names:
        frame = pd.read_excel(workbook,sheet_name=sheet_name,header=None,dtype=str)
        non_empty = frame.dropna(how="all").dropna(axis=1,how="all")
        sheets.append({
            "name":sheet_name,
            "rows":int(frame.shape[0]),
            "columns":int(frame.shape[1]),
            "first_rows":non_empty.head(20).fillna("").values.tolist(),
        })

    OUTPUT_PATH.write_text(json.dumps({"source_url":SOURCE_URL,"sheets":sheets},indent=2),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
