# ============================================================
# 00. INSPECT 2024-25 ACUTE DISCHARGE SITREP CSV FILES
# ============================================================
# Downloads representative months around the 27 May 2024 definition change and
# records columns, dimensions and sample rows before the production extractor is
# written. This file is temporary and is removed after the build is validated.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


FILES = {
    "April 2024":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-1-CSV-apr24.csv",
    "May 2024":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-2-CSV-may24.csv",
    "June 2024":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-3-CSV-jun24.csv",
    "March 2025":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-12-CSV-mar25.csv",
}
OUTPUT_PATH = Path("public-data/acute-discharge-2024-25-inspection.json")


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
        if any(token in normalised for token in ("level","metric","measure","organisation type","org type","breakdown","category","period","date")):
            values = sorted({str(value).strip() for value in frame[column].dropna() if str(value).strip()})
            if len(values) <= 250:
                dimensions[column] = values

    samples = []
    for _,row in frame.head(30).iterrows():
        samples.append({column:scalar(row[column]) for column in frame.columns})

    return {
        "label":label,
        "url":url,
        "bytes":len(response.content),
        "rows":len(frame),
        "columns":list(frame.columns),
        "dimensions":dimensions,
        "sample_rows":samples,
    }


def main() -> None:
    output = {"files":[inspect_file(label,url) for label,url in FILES.items()]}
    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
