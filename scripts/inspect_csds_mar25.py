# ============================================================
# 00. INSPECT THE OFFICIAL MARCH 2025 CSDS CORE-DATA ZIP
# ============================================================
# Downloads the published long-format CSV and records organisation levels,
# count types, dimensions and exact published total rows. The production build
# will use these total records rather than sums across overlapping breakdowns.

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

    org_levels = frame.groupby(["ORG_LEVEL"],dropna=False).size().reset_index(name="rows").sort_values("rows",ascending=False)
    count_types = frame.groupby(["COUNT_OF"],dropna=False).size().reset_index(name="rows").sort_values("rows",ascending=False)
    dimensions = frame.groupby(["COUNT_OF","DIMENSION"],dropna=False).size().reset_index(name="rows").sort_values(["COUNT_OF","rows"],ascending=[True,False])

    total_rows = frame.loc[frame["DIMENSION"].fillna("").str.startswith("Total")].copy()
    total_rows = total_rows.sort_values(["COUNT_OF","ORG_LEVEL","ORG_NAME"])

    all_submitters = total_rows.loc[total_rows["ORG_LEVEL"].eq("All Submitters")].copy()
    icb_totals = total_rows.loc[total_rows["ORG_LEVEL"].eq("ICB")].copy()
    provider_totals = total_rows.loc[total_rows["ORG_LEVEL"].eq("Provider")].copy()

    output = {
        "source_url":SOURCE_URL,
        "zip_bytes":len(response.content),
        "csv_name":csv_name,
        "rows":int(len(frame)),
        "columns":list(frame.columns),
        "organisation_levels":records(org_levels,50),
        "count_types":records(count_types,50),
        "dimension_count_combinations":records(dimensions,500),
        "all_submitters_total_rows":records(all_submitters,100),
        "icb_total_row_counts":records(icb_totals.groupby(["COUNT_OF","DIMENSION"]).size().reset_index(name="rows"),100),
        "provider_total_row_counts":records(provider_totals.groupby(["COUNT_OF","DIMENSION"]).size().reset_index(name="rows"),100),
        "sample_icb_total_rows":records(icb_totals,100),
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(frame)} rows")


if __name__ == "__main__":
    main()
