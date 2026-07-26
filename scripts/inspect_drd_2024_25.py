# ============================================================
# 00. INSPECT REVISED DISCHARGE READY DATE CSV FILES
# ============================================================
# Downloads the twelve revised 2024-25 CSV publications and records their exact
# columns, geography levels, metric labels and representative rows. This file is
# temporary and is removed after the production extractor has been validated.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


BASE = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/07"
FILES = [
    ("Apr 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-April-2024-Revised.csv"),
    ("May 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-May-2024-Revised.csv"),
    ("Jun 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-June-2024-Revised.csv"),
    ("Jul 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-July-2024-Revised.csv"),
    ("Aug 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-August-2024-Revised.csv"),
    ("Sep 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-September-2024-Revised.csv"),
    ("Oct 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-October-2024-Revised.csv"),
    ("Nov 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-November-2024-Revised.csv"),
    ("Dec 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-December-2024-Revised.csv"),
    ("Jan 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-January-2025-Revised.csv"),
    ("Feb 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-February-2025-Revised.csv"),
    ("Mar 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-March-2025-Revised.csv"),
]
OUTPUT_PATH = Path("public-data/drd-2024-25-inspection.json")


def scalar(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value,"item"):
        return value.item()
    return value


def inspect_file(label: str,url: str) -> dict[str,Any]:
    response = requests.get(url,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")

    dimensions: dict[str,list[str]] = {}
    for column in frame.columns:
        normalised = column.lower().replace("_"," ")
        if any(token in normalised for token in ("type","level","geography","organisation","metric","measure","breakdown","threshold","status","period","month")):
            values = sorted({str(value).strip() for value in frame[column].dropna() if str(value).strip()})
            if len(values) <= 300:
                dimensions[column] = values

    type_profiles = {}
    if "Data Type" in frame.columns:
        for data_type,rows in frame.groupby("Data Type",dropna=False):
            type_profiles[str(data_type)] = {
                "rows":len(rows),
                "codes":int(rows["Code"].nunique(dropna=True)) if "Code" in rows else None,
                "organisations":int(rows["Organisation Name"].nunique(dropna=True)) if "Organisation Name" in rows else None,
                "measures":sorted({str(value).strip() for value in rows["Measure"].dropna() if str(value).strip()}),
            }

    sample_rows = [
        {column:scalar(row[column]) for column in frame.columns}
        for _,row in frame.head(30).iterrows()
    ]

    return {
        "label":label,
        "url":url,
        "bytes":len(response.content),
        "rows":len(frame),
        "columns":list(frame.columns),
        "dimensions":dimensions,
        "type_profiles":type_profiles,
        "sample_rows":sample_rows,
    }


def main() -> None:
    output = {"files":[inspect_file(label,url) for label,url in FILES]}
    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
