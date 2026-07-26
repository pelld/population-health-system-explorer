# ============================================================
# 00. PROFILE SELECTED GPPS 2025 SUMMARY MEASURES
# ============================================================

from __future__ import annotations

import io
import json
from pathlib import Path
from urllib.parse import quote

import pandas as pd
import requests

BASE = "https://www.gp-patient.co.uk/FileDownload/Download?fileRedirect="
FILES = {
    "national":"2025/survey-results/national-results/national-data-csv/GPPS_2025_National_data_(weighted)_(csv)_PUBLIC.csv",
    "ics":"2025/survey-results/ics-results/ics-data-csv/GPPS_2025_ICS_data_(weighted)_(csv)_PUBLIC.csv",
    "practice":"2025/survey-results/practice-results/practice-data-csv/GPPS_2025_Practice_data_(weighted)_(csv)_PUBLIC.csv",
}
OUTPUT = Path("public-data/gpps-2025-selected-profile.json")
KEYWORDS = (
    "localgpservicesphone","localgpserviceswebsite","localgpservicesapp",
    "localgpservicesreception","localgpservicesprefhpsee","gpcontactoverall",
    "lastgpapptlisten","lastgpapptcare","confidence","overallgp",
)


def url(path: str) -> str:
    return BASE + quote(path,safe="")


def load(path: str) -> pd.DataFrame:
    response = requests.get(url(path),timeout=300)
    response.raise_for_status()
    return pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")


def main() -> None:
    output = {}
    for label,path in FILES.items():
        frame = load(path)
        selected = [
            column for column in frame.columns
            if any(keyword in column.lower() for keyword in KEYWORDS)
            and any(column.endswith(suffix) for suffix in (".pcteval",".lowileval",".hiwileval",".baseevaluw",".count"))
        ]
        first = frame.iloc[0]
        output[label] = {
            "rows":len(frame),
            "identifier_columns":list(frame.columns[:15]),
            "identifier_values":{column:first.get(column) for column in frame.columns[:15]},
            "selected_fields":{column:first.get(column) for column in selected},
        }
    OUTPUT.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
