# ============================================================
# 00. PUBLIC AMBULANCE QUALITY INDICATOR PATHWAY METRICS
# ============================================================
# Downloads the official NHS England AmbSYS time-series CSV and creates a small
# 2024-25 JSON file for the operational map. All figures are public, aggregated
# and reproducible. The source CSV is wide: one row per month/geography and one
# column per AQI indicator.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/AmbSYS-to-Jun-2026-b4Uah.csv"
PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/"
SPECIFICATION_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2022/07/20220725-AmbSYS-specification.pdf"
OUTPUT_PATH = Path("public-data/ambulance-aqi-2024-25.json")

PERIOD_LABEL = "2024-25"
START_YEAR = 2024
START_MONTH = 4
END_YEAR = 2025
END_MONTH = 3

INDICATORS = {
    "ambulance-calls": {
        "code":"A1",
        "label":"Emergency calls",
        "definition":"Emergency calls recorded by the ambulance service.",
        "display":"count",
        "denominator_code":None,
        "denominator_label":None,
    },
    "ambulance-incidents": {
        "code":"A7",
        "label":"Ambulance incidents",
        "definition":"Incidents created from ambulance-service contacts and referrals.",
        "display":"count",
        "denominator_code":"A1",
        "denominator_label":"emergency calls",
    },
    "ambulance-hear-treat": {
        "code":"A17",
        "label":"Resolved remotely (Hear & Treat)",
        "definition":"Incidents with no face-to-face ambulance response.",
        "display":"percent",
        "denominator_code":"A7",
        "denominator_label":"ambulance incidents",
    },
    "ambulance-response": {
        "code":"A56",
        "label":"Face-to-face ambulance response",
        "definition":"Incidents with a face-to-face response. A56 is defined as A53 + A54 + A55.",
        "display":"percent",
        "denominator_code":"A7",
        "denominator_label":"ambulance incidents",
    },
    "ambulance-alternative": {
        "code":"A55",
        "label":"Treated or referred without conveyance (See & Treat)",
        "definition":"Face-to-face incidents where no patient was transported.",
        "display":"percent",
        "denominator_code":"A56",
        "denominator_label":"face-to-face responses",
    },
    "ambulance-conveyed-ae": {
        "code":"A53",
        "label":"Conveyed to A&E by ambulance",
        "definition":"Face-to-face incidents where one or more patients were transported to an emergency department.",
        "display":"percent",
        "denominator_code":"A56",
        "denominator_label":"face-to-face responses",
    },
    "ambulance-other-conveyance": {
        "code":"A54",
        "label":"Conveyed somewhere other than A&E",
        "definition":"Face-to-face incidents where patients were transported to a facility other than an emergency department.",
        "display":"percent",
        "denominator_code":"A56",
        "denominator_label":"face-to-face responses",
    },
}

REQUIRED_COLUMNS = {"Year", "Month", "Region", "Org Code", "Org Name", "A1", "A7", "A17", "A53", "A54", "A55", "A56"}


def read_public_csv(content: bytes) -> pd.DataFrame:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            frame = pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False, encoding=encoding)
            frame.columns = frame.columns.astype(str).str.strip()
            return frame
        except Exception as error:  # pragma: no cover - source fallback
            errors.append(f"{encoding}: {type(error).__name__}: {error}")
    raise RuntimeError("Could not read AmbSYS CSV. " + " | ".join(errors))


def numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str).str.strip().replace({".":None, "":None, "nan":None}).str.replace(",", "", regex=False),
        errors="coerce",
    )


def percentage(numerator: int | None, denominator: int | None) -> float | None:
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return round((numerator / denominator) * 100, 2)


def clean_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(round(float(value)))


def build_geography(code: str, frame: pd.DataFrame) -> dict[str, Any]:
    frame = frame.sort_values(["Year", "Month"])
    name = frame["Org Name"].dropna().astype(str).str.strip().iloc[-1]
    values = {indicator:clean_int(numeric(frame[indicator]).sum(min_count=1)) for indicator in {item["code"] for item in INDICATORS.values()}}

    metrics: dict[str, Any] = {}
    for node_id, definition in INDICATORS.items():
        count = values.get(definition["code"])
        denominator_count = values.get(definition["denominator_code"]) if definition["denominator_code"] else None
        metrics[node_id] = {
            "indicator":definition["code"],
            "label":definition["label"],
            "definition":definition["definition"],
            "display":definition["display"],
            "count":count,
            "percent":percentage(count,denominator_count),
            "denominator_indicator":definition["denominator_code"],
            "denominator_label":definition["denominator_label"],
            "denominator_count":denominator_count,
        }

    incidents = values.get("A7")
    hear_treat = values.get("A17")
    face_to_face = values.get("A56")
    outcome_total = sum(value or 0 for value in (hear_treat,face_to_face))
    face_to_face_components = sum(values.get(code) or 0 for code in ("A53","A54","A55"))

    return {
        "code":code,
        "name":name,
        "months":int(frame[["Year","Month"]].drop_duplicates().shape[0]),
        "metrics":metrics,
        "validation":{
            "incident_outcome_gap":None if incidents is None else incidents - outcome_total,
            "face_to_face_component_gap":None if face_to_face is None else face_to_face - face_to_face_components,
        },
    }


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    frame = read_public_csv(response.content)

    missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
    if missing:
        raise RuntimeError(f"AmbSYS source structure changed; missing columns: {missing}")

    frame["Year"] = pd.to_numeric(frame["Year"], errors="coerce")
    frame["Month"] = pd.to_numeric(frame["Month"], errors="coerce")
    frame["Org Code"] = frame["Org Code"].fillna("").astype(str).str.strip()
    frame["Org Name"] = frame["Org Name"].fillna("").astype(str).str.strip()

    in_period = ((frame["Year"] == START_YEAR) & (frame["Month"] >= START_MONTH)) | ((frame["Year"] == END_YEAR) & (frame["Month"] <= END_MONTH))
    is_england = frame["Org Code"].str.casefold().eq("eng")
    is_ambulance_service = frame["Org Name"].str.contains("AMBULANCE SERVICE", case=False, na=False) | frame["Org Name"].str.casefold().eq("isle of wight nhs trust")
    frame = frame.loc[in_period & (is_england | is_ambulance_service)].copy()

    if frame.empty:
        raise RuntimeError("No 2024-25 ambulance-service rows found in AmbSYS source.")

    geographies = [build_geography(code,group) for code,group in frame.groupby("Org Code",sort=False)]
    england = next((item for item in geographies if item["code"].casefold() == "eng"),None)
    trusts = sorted((item for item in geographies if item["code"].casefold() != "eng"),key=lambda item:item["name"])

    if england is None:
        raise RuntimeError("England aggregate was not found in AmbSYS source.")
    if len(trusts) < 10:
        raise RuntimeError(f"Expected around 11 ambulance services; found {len(trusts)}")

    output = {
        "publication":"Ambulance Quality Indicators — Ambulance Systems Indicators",
        "period":PERIOD_LABEL,
        "geography":"Ambulance service",
        "source_url":PUBLICATION_URL,
        "source_file_url":SOURCE_URL,
        "specification_url":SPECIFICATION_URL,
        "trust_count":len(trusts),
        "definitions":INDICATORS,
        "england":england,
        "trusts":trusts,
        "notes":[
            "The figures are annual sums of the twelve monthly AmbSYS returns from April 2024 to March 2025.",
            "Hear & Treat is shown as a percentage of incidents; face-to-face response is also shown as a percentage of incidents.",
            "See & Treat, conveyance to A&E and conveyance elsewhere are shown as percentages of face-to-face responses so that they form a meaningful operational split.",
            "Ambulance-service geographies are much larger than ICBs and do not align directly with ECDS provider geographies.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with England and {len(trusts)} ambulance services")


if __name__ == "__main__":
    main()
