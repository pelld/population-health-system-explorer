# ============================================================
# 00. IDENTIFY USABLE HES APC HOSPITAL-FLOW MEASURES
# ============================================================
# The provider-level-analysis file contains many overlapping measures. This script
# records the exact measure names for admissions, emergency activity, length of
# stay, bed-days and discharge, together with the England summary rows.

from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/3C/145B13/hosp-epis-stat-admi-pla-2024-25.csv"
OUTPUT_PATH = Path("public-data/hes-apc-2024-25-measure-inspection.json")
TERMS = ("FAE","EMERG","BED","LOS","LENGTH","DISCH","DEATH","DAYCASE","ORDINARY")


# ============================================================
# 01. DOWNLOAD AND FILTER THE PUBLISHED MEASURE CATALOGUE
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")

    measure_text = frame["MEASURE"].fillna("").astype(str).str.upper()
    candidate_mask = measure_text.apply(lambda value:any(term in value for term in TERMS))
    candidates = frame.loc[candidate_mask,["MEASURE_TYPE","MEASURE"]].drop_duplicates().sort_values(["MEASURE_TYPE","MEASURE"])

    england = frame.loc[frame["ORG_LEVEL"].eq("ENGLAND")].copy()
    england_candidates = england.loc[
        england["MEASURE"].fillna("").astype(str).str.upper().apply(lambda value:any(term in value for term in TERMS)),
        ["MEASURE_TYPE","MEASURE","MEASURE_VALUE","Table_Order"],
    ].sort_values(["MEASURE_TYPE","MEASURE"])

    summary_rows = england.loc[
        england["MEASURE_TYPE"].eq("Summary"),
        ["MEASURE_TYPE","MEASURE","MEASURE_VALUE","Table_Order"],
    ].sort_values("MEASURE")

    output = {
        "source_url":SOURCE_URL,
        "candidate_measures":candidates.where(pd.notna(candidates),None).to_dict(orient="records"),
        "england_candidate_rows":england_candidates.where(pd.notna(england_candidates),None).to_dict(orient="records"),
        "england_summary_rows":summary_rows.where(pd.notna(summary_rows),None).to_dict(orient="records"),
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(candidates)} candidate measures")


if __name__ == "__main__":
    main()
