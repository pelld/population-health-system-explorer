# ============================================================
# 00. PUBLIC 2024-25 URGENT COMMUNITY RESPONSE METRICS
# ============================================================
# Downloads the official NHS England workbook and creates a compact JSON file for
# the system map. The workbook publishes monthly values for England, regions,
# ICBs and providers across three separate tables.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/06/2-hour-Urgent-Community-Response-Performance-Metrics_2024-25.xlsx"
PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/2-hour-urgent-community-response/"
GUIDANCE_URL = "https://www.england.nhs.uk/long-read/community-services-data-set-technical-guidance-for-the-two-hour-urgent-community-response-standard/"
OUTPUT_PATH = Path("public-data/ucr-2024-25.json")
PERIOD = "2024-25"

MONTH_COLUMNS = [
    "Apr-24","May-24","Jun-24","Jul-24","Aug-24","Sep-24",
    "Oct-24","Nov-24","Dec-24","Jan-25","Feb-25","Mar-25",
]


def read_table(content: bytes,sheet_name: str) -> pd.DataFrame:
    frame = pd.read_excel(
        io.BytesIO(content),
        sheet_name=sheet_name,
        header=5,
        usecols="A:O",
        engine="openpyxl",
    )
    frame.columns = [str(column).strip() for column in frame.columns]
    frame = frame.rename(columns={
        "ODS Code":"code",
        "Organisation Name":"name",
        "Organisation Type":"type",
    })
    frame = frame.loc[frame["type"].isin(["National","ICB","Provider"])].copy()
    frame["code"] = frame["code"].fillna("").astype(str).str.strip()
    frame["name"] = frame["name"].fillna("").astype(str).str.strip()
    frame["type"] = frame["type"].fillna("").astype(str).str.strip()

    # The workbook includes a published "Unknown" ICB bucket. Keep the national
    # total intact but do not present the unknown bucket as a named ICB choice.
    is_unknown_named_geography = frame["type"].isin(["ICB","Provider"]) & (
        frame["code"].str.casefold().eq("unknown") | frame["name"].str.casefold().eq("unknown")
    )
    frame = frame.loc[~is_unknown_named_geography].copy()

    for month in MONTH_COLUMNS:
        frame[month] = pd.to_numeric(frame[month],errors="coerce")

    return frame


def safe_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(round(float(value)))


def safe_float(value: Any,digits: int = 2) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value),digits)


def clean_name(name: str,organisation_type: str) -> str:
    if organisation_type == "National":
        return "England"

    cleaned = name.title() if name.isupper() else name
    replacements = {
        "Nhs ":"NHS ",
        " Icb":" ICB",
        " C.i.c.":" C.I.C.",
        " Cic":" CIC",
        " Nhs":" NHS",
    }
    for old,new in replacements.items():
        cleaned = cleaned.replace(old,new)
    return cleaned


def month_values(row: pd.Series,multiplier: float = 1.0) -> list[dict[str,Any]]:
    values = []
    for month in MONTH_COLUMNS:
        value = row.get(month)
        values.append({
            "month":month,
            "value":None if pd.isna(value) else safe_float(float(value) * multiplier),
        })
    return values


def build_geography(
    key: tuple[str,str,str],
    performance_row: pd.Series,
    referrals_row: pd.Series,
    contacts_row: pd.Series,
) -> dict[str,Any]:
    organisation_type,code,name = key

    performance_values = performance_row[MONTH_COLUMNS].dropna().astype(float)
    referral_values = referrals_row[MONTH_COLUMNS].dropna().astype(float)
    contact_values = contacts_row[MONTH_COLUMNS].dropna().astype(float)

    referrals = safe_int(referral_values.sum(min_count=1))
    contacts = safe_int(contact_values.sum(min_count=1))
    average_performance = safe_float(performance_values.mean() * 100)
    latest_performance = safe_float(performance_row.get("Mar-25") * 100) if pd.notna(performance_row.get("Mar-25")) else None
    contacts_per_referral = safe_float(contacts / referrals) if contacts is not None and referrals not in (None,0) else None

    return {
        "code":code,
        "name":clean_name(name,organisation_type),
        "type":organisation_type,
        "metrics":{
            "ucr-referrals":{
                "label":"Two-hour UCR referrals received",
                "display":"count",
                "count":referrals,
                "percent":None,
                "denominator":None,
            },
            "ucr-care-contacts":{
                "label":"Care contacts associated with two-hour UCR referrals",
                "display":"count",
                "count":contacts,
                "percent":None,
                "denominator":None,
            },
            "ucr-two-hour-achievement":{
                "label":"Average monthly achievement of the two-hour standard",
                "display":"percent",
                "count":None,
                "percent":average_performance,
                "latest_percent":latest_performance,
                "denominator":None,
                "method":"Arithmetic mean of the available published monthly percentages.",
            },
        },
        "activity":{
            "referrals":referrals,
            "contacts":contacts,
            "contacts_per_referral":contacts_per_referral,
        },
        "months":{
            "performance":month_values(performance_row,100),
            "referrals":month_values(referrals_row),
            "contacts":month_values(contacts_row),
        },
        "data_quality":{
            "performance_months":int(performance_values.shape[0]),
            "referral_months":int(referral_values.shape[0]),
            "contact_months":int(contact_values.shape[0]),
            "counts_rounded":True,
        },
    }


def keyed_rows(frame: pd.DataFrame) -> dict[tuple[str,str,str],pd.Series]:
    result: dict[tuple[str,str,str],pd.Series] = {}
    for _,row in frame.iterrows():
        key = (str(row["type"]),str(row["code"]),str(row["name"]))
        result[key] = row
    return result


def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()

    performance = keyed_rows(read_table(response.content,"Table 1"))
    referrals = keyed_rows(read_table(response.content,"Table 2"))
    contacts = keyed_rows(read_table(response.content,"Table 3"))

    common_keys = sorted(set(performance) & set(referrals) & set(contacts),key=lambda key:(key[0],key[2]))
    geographies = [build_geography(key,performance[key],referrals[key],contacts[key]) for key in common_keys]

    england = next((item for item in geographies if item["type"] == "National"),None)
    icbs = sorted((item for item in geographies if item["type"] == "ICB"),key=lambda item:item["name"])
    providers = sorted((item for item in geographies if item["type"] == "Provider"),key=lambda item:item["name"])

    if england is None:
        raise RuntimeError("National UCR row was not found in all three tables.")
    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 named ICB rows; found {len(icbs)}")
    if len(providers) < 80:
        raise RuntimeError(f"Expected a substantial provider list; found {len(providers)}")

    output = {
        "publication":"Two-hour Urgent Community Response Performance Metrics",
        "period":PERIOD,
        "source":"Community Services Data Set (CSDS)",
        "source_url":PUBLICATION_URL,
        "source_file_url":SOURCE_URL,
        "guidance_url":GUIDANCE_URL,
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "england":england,
        "icbs":icbs,
        "providers":providers,
        "method":{
            "counts":"Annual sums of the twelve published monthly counts. Published counts are rounded to the nearest five.",
            "performance":"Arithmetic mean of the available published monthly two-hour-performance percentages. This is not presented as a reconstructed annual numerator/denominator because the performance and referral-count tables use different event dates.",
        },
        "notes":[
            "UCR ICB and provider rows are separate published geographies; selecting one does not map a provider to an ICB.",
            "Care contacts are activity records and can exceed referrals because a referral may have more than one contact and contacts can fall in a different month.",
            "The measures describe recorded UCR activity and timeliness, not hospital admissions proven to have been avoided.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs and {len(providers)} providers")


if __name__ == "__main__":
    main()
