# ============================================================
# 00. PROVIDER-LEVEL PUBLIC ECDS ROUTE METRICS
# ============================================================
# Downloads the public 2024-25 Provider Level Analysis CSV and reduces the
# 51 MB source file to a small, auditable JSON file containing only the route
# counts needed by the website. Suppressed values remain flagged; no private
# or record-level data are used.

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


PROVIDER_CSV_URL = "https://files.digital.nhs.uk/45/16564D/AE_2425_ECDS_pla_output.csv"
PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/hospital-accident--emergency-activity/2024-25"
DOWNLOAD_PATH = Path(".public-data-downloads/AE_2425_ECDS_pla_output.csv")
OUTPUT_PATH = Path("public-data/ecds-2024-25-provider-routes.json")

SOURCE_TOTAL = "Attendance Source Total"
SELF_MEASURES = (
    "Referred by self (finding)",
    "Self-referral to accident and emergency department (procedure)",
)
NHS111_MEASURE = "Referred by National Health Service 111 service (finding)"
PRIMARY_MEASURE = "Referred by member of Primary Health Care Team (finding)"
AMBULANCE_REFERRAL_MEASURE = "Referred by ambulance service (finding)"
UNKNOWN_MEASURE = "Not Known"
AMBULANCE_ARRIVAL_MEASURE = "Brought in by ambulance (including helicopter / Air Ambulance)"


def download() -> None:
    DOWNLOAD_PATH.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(PROVIDER_CSV_URL, stream=True, timeout=300) as response:
        response.raise_for_status()
        with DOWNLOAD_PATH.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    output.write(chunk)


def numeric_value(value: Any) -> float | None:
    if pd.isna(value):
        return None
    text = str(value).strip().replace(",", "")
    if not text or text == "*":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def measure_value(frame: pd.DataFrame, measure_type: str, measure: str) -> tuple[int | None, bool]:
    matches = frame.loc[(frame["MEASURE_TYPE"] == measure_type) & (frame["MEASURE"] == measure), "MEASURE_VALUE"]
    if matches.empty:
        return None, False

    values = [numeric_value(value) for value in matches]
    observed = [value for value in values if value is not None]
    suppressed = any(str(value).strip() == "*" for value in matches)
    if not observed:
        return None, suppressed
    return int(round(sum(observed))), suppressed


def route(count: int, total: int, suppressed: bool = False) -> dict[str, Any]:
    return {
        "count": count,
        "percent": round((count / total) * 100, 2) if total else None,
        "suppressed_component": suppressed,
    }


def build_provider(provider_frame: pd.DataFrame) -> dict[str, Any] | None:
    source_total, total_suppressed = measure_value(provider_frame, "Attendance Source", SOURCE_TOTAL)
    if not source_total or source_total <= 0:
        return None

    self_values = [measure_value(provider_frame, "Attendance Source", measure) for measure in SELF_MEASURES]
    self_count = sum(value or 0 for value, _ in self_values)
    self_suppressed = any(suppressed for _, suppressed in self_values)

    nhs111_count, nhs111_suppressed = measure_value(provider_frame, "Attendance Source", NHS111_MEASURE)
    primary_count, primary_suppressed = measure_value(provider_frame, "Attendance Source", PRIMARY_MEASURE)
    ambulance_count, ambulance_suppressed = measure_value(provider_frame, "Attendance Source", AMBULANCE_REFERRAL_MEASURE)
    unknown_count, unknown_suppressed = measure_value(provider_frame, "Attendance Source", UNKNOWN_MEASURE)
    ambulance_arrival_count, arrival_suppressed = measure_value(provider_frame, "Arrival Mode", AMBULANCE_ARRIVAL_MEASURE)

    nhs111_count = nhs111_count or 0
    primary_count = primary_count or 0
    ambulance_count = ambulance_count or 0
    unknown_count = unknown_count or 0
    other_count = max(0,source_total - self_count - nhs111_count - primary_count - ambulance_count - unknown_count)

    first = provider_frame.iloc[0]
    routes = {
        "ae-attendance": route(source_total,source_total,total_suppressed),
        "self-presentation": route(self_count,source_total,self_suppressed),
        "nhs111-ae-route": route(nhs111_count,source_total,nhs111_suppressed),
        "gp-ae-route": route(primary_count,source_total,primary_suppressed),
        "ambulance-ae-route": route(ambulance_count,source_total,ambulance_suppressed),
        "other-professional-route": route(other_count,source_total,False),
        "unknown-route": route(unknown_count,source_total,unknown_suppressed),
    }

    if ambulance_arrival_count is not None:
        routes["ambulance-ae-route"]["secondary"] = {
            **route(ambulance_arrival_count,source_total,arrival_suppressed),
            "label":"Arrived by ambulance",
        }

    return {
        "code":str(first["ORG_CODE"]).strip(),
        "name":str(first["ORG_DESCRIPTION"]).strip(),
        "total":source_total,
        "routes":routes,
    }


def main() -> None:
    download()

    use_columns = [
        "REPORTING_PERIOD",
        "GEOGRAPHY_LEVEL",
        "ORG_CODE",
        "ORG_DESCRIPTION",
        "MEASURE_TYPE",
        "MEASURE",
        "MEASURE_VALUE",
    ]
    frame = pd.read_csv(DOWNLOAD_PATH,usecols=use_columns,low_memory=False,dtype=str)
    frame.columns = frame.columns.str.strip()
    for column in ["REPORTING_PERIOD","GEOGRAPHY_LEVEL","ORG_CODE","ORG_DESCRIPTION","MEASURE_TYPE","MEASURE"]:
        frame[column] = frame[column].fillna("").astype(str).str.strip()

    frame = frame.loc[
        frame["REPORTING_PERIOD"].isin(["2425","2024/25","2024-25"])
        & frame["GEOGRAPHY_LEVEL"].eq("Provider")
        & frame["MEASURE_TYPE"].isin(["Attendance Source","Arrival Mode"])
    ].copy()

    providers = []
    for _, provider_frame in frame.groupby(["ORG_CODE","ORG_DESCRIPTION"],dropna=False,sort=False):
        provider = build_provider(provider_frame)
        if provider:
            providers.append(provider)

    providers.sort(key=lambda provider: provider["name"])
    output = {
        "publication":"Hospital Accident and Emergency Activity, 2024-25",
        "period":"2024-25",
        "geography":"Provider",
        "source_url":PUBLICATION_URL,
        "source_file_url":PROVIDER_CSV_URL,
        "provider_count":len(providers),
        "providers":providers,
        "notes":[
            "Provider figures describe activity submitted by the provider, not the resident population of an ICB.",
            "Published values below five may be suppressed with an asterisk.",
            "Primary health care team referral is broader than referral by a GP alone.",
            "Ambulance source of referral and arrival by ambulance are separate fields.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(providers)} providers")


if __name__ == "__main__":
    main()
