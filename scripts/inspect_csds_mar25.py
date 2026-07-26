# ============================================================
# 00. INSPECT THE OFFICIAL MARCH 2025 CSDS CORE-DATA ZIP
# ============================================================
# Downloads the published long-format CSV and records the organisation levels,
# count types and dimensions. It also captures plausible England headline rows so
# the production extractor can use published totals rather than overlapping sums.

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/39/AF1D09/csds-mar25-exp-core-data.zip"
OUTPUT_PATH = Path("public-data/csds-mar25-inspection.json")


def records(frame: pd.DataFrame,limit: int = 100) -> list[dict]:
    return frame.head(limit).where(pd.notna(frame),None).to_dict(orient="records")


def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        frame = pd.read_csv(archive.open(csv_name),dtype=str,low_memory=False,encoding="utf-8-sig")

    frame["MEASURE_VALUE_NUM"] = pd.to_numeric(frame["MEASURE_VALUE"],errors="coerce")

    org_levels = (
        frame.groupby(["ORG_LEVEL"],dropna=False)
        .size()
        .reset_index(name="rows")
        .sort_values("rows",ascending=False)
    )

    count_types = (
        frame.groupby(["COUNT_OF"],dropna=False)
        .size()
        .reset_index(name="rows")
        .sort_values("rows",ascending=False)
    )

    dimensions = (
        frame.groupby(["COUNT_OF","DIMENSION"],dropna=False)
        .size()
        .reset_index(name="rows")
        .sort_values(["COUNT_OF","rows"],ascending=[True,False])
    )

    national = frame.loc[
        frame["ORG_LEVEL"].fillna("").str.lower().isin(["national","england"])
        | frame["ORG_NAME"].fillna("").str.lower().eq("england")
    ].copy()

    headline_candidates = national.loc[
        national["COUNT_OF"].fillna("").str.contains("referral|person|contact",case=False,regex=True)
    ].sort_values(["COUNT_OF","DIMENSION","MEASURE","MEASURE_2"])

    simple_dimension_candidates = headline_candidates.loc[
        headline_candidates["DIMENSION"].fillna("").str.contains("total|all|org|provider",case=False,regex=True)
        | headline_candidates["MEASURE"].fillna("").str.contains("total|all",case=False,regex=True)
        | headline_candidates["MEASURE_2"].fillna("").str.contains("total|all",case=False,regex=True)
    ]

    output = {
        "source_url":SOURCE_URL,
        "zip_bytes":len(response.content),
        "csv_name":csv_name,
        "rows":int(len(frame)),
        "columns":list(frame.columns),
        "organisation_levels":records(org_levels,50),
        "count_types":records(count_types,50),
        "dimension_count_combinations":records(dimensions,500),
        "national_headline_candidates":records(headline_candidates,400),
        "national_simple_dimension_candidates":records(simple_dimension_candidates,400),
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(frame)} rows")


if __name__ == "__main__":
    main()
