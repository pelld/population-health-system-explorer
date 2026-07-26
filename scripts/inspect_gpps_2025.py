# ============================================================
# 00. INSPECT GP PATIENT SURVEY 2025 PUBLIC CSV FILES
# ============================================================
# Downloads the published weighted national, ICS and practice CSV files and
# records their exact structure before the production extractor is written.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any
from urllib.parse import quote

import pandas as pd
import requests


BASE = "https://www.gp-patient.co.uk/FileDownload/Download?fileRedirect="
FILES = {
    "national": "2025/survey-results/national-results/national-data-csv/GPPS_2025_National_data_(weighted)_(csv)_PUBLIC.csv",
    "ics": "2025/survey-results/ics-results/ics-data-csv/GPPS_2025_ICS_data_(weighted)_(csv)_PUBLIC.csv",
    "practice": "2025/survey-results/practice-results/practice-data-csv/GPPS_2025_Practice_data_(weighted)_(csv)_PUBLIC.csv",
}
OUTPUT_PATH = Path("public-data/gpps-2025-inspection.json")


def source_url(path: str) -> str:
    return BASE + quote(path,safe="")


def scalar(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value,"item"):
        return value.item()
    return value


def inspect_file(label: str,path: str) -> dict[str,Any]:
    url = source_url(path)
    response = requests.get(url,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")

    dimensions: dict[str,list[str]] = {}
    for column in frame.columns:
        normalised = column.lower().replace("_"," ")
        if any(token in normalised for token in ("question","variable","measure","result","organisation","org","code","type","year","base","confidence","response")):
            values = sorted({str(value).strip() for value in frame[column].dropna() if str(value).strip()})
            if len(values) <= 250:
                dimensions[column] = values

    samples = [
        {column:scalar(row[column]) for column in frame.columns}
        for _,row in frame.head(25).iterrows()
    ]

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
    output = {"files":[inspect_file(label,path) for label,path in FILES.items()]}
    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
