# ============================================================
# 00. EXTRACT DIRECT ENGLAND ROWS FROM THE QOF NATIONAL WORKBOOK
# ============================================================
# Produces a compact machine-readable reference containing the title, published
# column headings and direct England row for every condition-group worksheet.

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/53/9DC070/qof-2425-nat-reg-ach-prev-pca.xlsx"
OUTPUT_PATH = Path("public-data/qof-2024-25-national-reference.json")


# ============================================================
# 01. NORMALISE CELL VALUES
# ============================================================
def clean(value):
    if pd.isna(value):
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


# ============================================================
# 02. FIND PUBLISHED HEADER AND ENGLAND ROWS
# ============================================================
def summarise_sheet(workbook: pd.ExcelFile, sheet_name: str) -> dict | None:
    frame = pd.read_excel(workbook, sheet_name=sheet_name, header=None)
    england_rows = frame.index[frame.iloc[:, 0].astype(str).str.strip().eq("ENG")].tolist()
    if not england_rows:
        return None

    england_index = england_rows[0]
    header_index = england_index - 1
    title_values = frame.iloc[:header_index, 0].dropna().astype(str).tolist()
    title = next((value for value in title_values if value.startswith("Table ")), sheet_name)

    return {
        "sheet":sheet_name,
        "title":title,
        "header_row":[clean(value) for value in frame.iloc[header_index].tolist()],
        "england_row":[clean(value) for value in frame.iloc[england_index].tolist()],
    }


# ============================================================
# 03. WRITE COMPACT DIRECT-PUBLISHED REFERENCE
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    workbook = pd.ExcelFile(io.BytesIO(response.content))
    sheets = []

    for sheet_name in workbook.sheet_names:
        summary = summarise_sheet(workbook, sheet_name)
        if summary:
            sheets.append(summary)

    output = {"source_url":SOURCE_URL, "sheet_count":len(sheets), "sheets":sheets}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(sheets)} direct England rows")


if __name__ == "__main__":
    main()
