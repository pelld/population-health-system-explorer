# ============================================================
# 00. INSPECT PUBLIC OVERNIGHT BED AVAILABILITY CSV FILES
# ============================================================
# Downloads the cumulative KH03 available and occupied overnight-bed files and
# records their columns, period values and representative rows. This temporary
# output is used to build a validated 2024-25 provider extractor.

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


FILES = {
    "available":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/09/KH03-Available-Overnight-only.csv",
    "occupied":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/09/KH03-Occupied-Overnight-only.csv",
    "occupied_by_specialty":"https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2024/09/KH03-Occupied-by-Spec-Overnight-only.csv",
}
OUTPUT_PATH = Path("public-data/bed-occupancy-2024-25-inspection.json")


def read_csv(url: str) -> tuple[pd.DataFrame,int]:
    response = requests.get(url,timeout=300,headers={"User-Agent":"Mozilla/5.0"})
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")
    return frame,len(response.content)


def main() -> None:
    output = {"files":{}}

    for name,url in FILES.items():
        frame,byte_count = read_csv(url)
        distinct = {}
        for column in frame.columns:
            values = frame[column].dropna().astype(str).str.strip()
            unique = sorted(value for value in values.unique().tolist() if value)
            if len(unique) <= 80:
                distinct[column] = unique

        sample = frame.head(20).where(pd.notna(frame),None).to_dict(orient="records")
        recent = frame.tail(20).where(pd.notna(frame),None).to_dict(orient="records")
        output["files"][name] = {
            "url":url,
            "bytes":byte_count,
            "rows":len(frame),
            "columns":frame.columns.tolist(),
            "distinct_values":distinct,
            "sample_rows":sample,
            "recent_rows":recent,
        }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
