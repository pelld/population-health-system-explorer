# ============================================================
# 00. INSPECT HES APC OPEN DATA - OTHER
# ============================================================
# Checks whether the final annual open-data file contains admission-method-specific
# bed-days, length of stay or discharge fields that can safely populate the
# hospital-flow branch.

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/1D/C82CE8/hosp-epis-stat-admi-oth-2024-25.csv"
OUTPUT_PATH = Path("public-data/hes-apc-2024-25-other-inspection.json")


# ============================================================
# 01. DOWNLOAD AND RECORD STRUCTURE
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")

    distinct = {}
    for column in frame.columns:
        values = frame[column].dropna().astype(str).str.strip()
        unique_values = sorted(value for value in values.unique() if value != "")
        if len(unique_values) <= 250:
            distinct[column] = unique_values

    output = {
        "source_url":SOURCE_URL,
        "bytes":len(response.content),
        "rows":int(len(frame)),
        "columns":list(frame.columns),
        "distinct_values":distinct,
        "sample_rows":frame.head(40).where(pd.notna(frame),None).to_dict(orient="records"),
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(frame)} rows")


if __name__ == "__main__":
    main()
