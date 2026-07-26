# ============================================================
# 00. PUBLIC 2024-25 COMMUNITY HEALTH-SERVICE WAITING LISTS
# ============================================================
# Uses the corrected March 2025 publication. The March sheets provide a stock
# position by England, ICB and provider; the national time-series sheet provides
# the corrected April 2024 to March 2025 trend. Monthly stocks are never summed.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/05/Community-health-services-waiting-lists-2024-25-March.xlsx"
PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/community-health-services-waiting-lists/"
OUTPUT_PATH = Path("public-data/community-waits-2024-25.json")
PERIOD = "2024-25"
SNAPSHOT = "March 2025"

MONTH_COLUMNS = [
    "Apr-24","May-24","Jun-24","Jul-24","Aug-24","Sep-24",
    "Oct-24","Nov-24","Dec-24","Jan-25","Feb-25","Mar-25",
]

BAND_SHEETS = {
    "zero_to_one":"Table 4a",
    "one_to_two":"Table 4b",
    "two_to_four":"Table 4c",
    "four_to_twelve":"Table 4d",
    "twelve_to_eighteen":"Table 4e",
    "eighteen_to_fifty_two":"Table 4f",
    "fifty_two_to_104":"Table 4g",
    "over_104":"Table 4h",
}


# ============================================================
# 01. GENERIC CLEANING HELPERS
# ============================================================
def safe_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(round(float(value)))


def safe_float(value: Any,digits: int = 2) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value),digits)


def clean_code(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    return text[:-2] if text.endswith(".0") else text


def clean_name(value: Any,organisation_type: str) -> str:
    text = "" if value is None or pd.isna(value) else str(value).strip()
    if organisation_type == "National":
        return "England"
    if text.isupper():
        text = text.title()
    replacements = {
        "Nhs ":"NHS ",
        " Icb":" ICB",
        " Cic":" CIC",
        " Cio":" CIO",
        " Ltd":" Ltd",
    }
    for old,new in replacements.items():
        text = text.replace(old,new)
    return text


def add_values(*values: int | None) -> int | None:
    usable = [int(value) for value in values if value is not None]
    return sum(usable) if usable else None


def percentage(numerator: int | None,denominator: int | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return safe_float((numerator / denominator) * 100)


# ============================================================
# 02. READ THE MARCH ORGANISATION-BY-SERVICE TABLES
# ============================================================
def read_organisation_table(content: bytes,sheet_name: str) -> tuple[pd.DataFrame,list[str]]:
    frame = pd.read_excel(io.BytesIO(content),sheet_name=sheet_name,header=4,engine="openpyxl")
    frame.columns = [str(column).strip() for column in frame.columns]

    first_three = list(frame.columns[:3])
    frame = frame.rename(columns={
        first_three[0]:"type",
        first_three[1]:"code",
        first_three[2]:"name",
    })

    frame = frame.loc[frame["type"].isin(["National","ICB","Provider"])].copy()
    frame["type"] = frame["type"].astype(str).str.strip()
    frame["code"] = frame["code"].map(clean_code)
    frame["name"] = [clean_name(name,organisation_type) for name,organisation_type in zip(frame["name"],frame["type"])]

    service_columns = [
        column for column in frame.columns[3:]
        if column and not column.startswith("Unnamed")
    ]

    for column in service_columns:
        frame[column] = pd.to_numeric(frame[column],errors="coerce")

    return frame,service_columns


def keyed_rows(frame: pd.DataFrame) -> dict[tuple[str,str,str],pd.Series]:
    return {
        (str(row["type"]),str(row["code"]),str(row["name"])):row
        for _,row in frame.iterrows()
    }


def row_sum(row: pd.Series | None,columns: list[str]) -> int | None:
    if row is None:
        return None
    available = [column for column in columns if column in row.index]
    if not available:
        return None
    values = pd.to_numeric(row[available],errors="coerce").dropna()
    return safe_int(values.sum()) if not values.empty else None


def prefixed_columns(columns: list[str],prefix: str) -> list[str]:
    return [column for column in columns if column.startswith(prefix)]


# ============================================================
# 03. BUILD ONE ENGLAND / ICB / PROVIDER SNAPSHOT
# ============================================================
def build_geography(
    key: tuple[str,str,str],
    total_row: pd.Series,
    service_columns: list[str],
    band_rows: dict[str,pd.Series | None],
    band_columns: dict[str,list[str]],
) -> dict[str,Any]:
    organisation_type,code,name = key
    adult_columns = prefixed_columns(service_columns,"(A)")
    cyp_columns = prefixed_columns(service_columns,"(CYP)")

    total = row_sum(total_row,service_columns)
    adult_total = row_sum(total_row,adult_columns)
    cyp_total = row_sum(total_row,cyp_columns)

    bands = {
        band:row_sum(band_rows.get(band),band_columns.get(band,[]))
        for band in BAND_SHEETS
    }

    under_18 = add_values(
        bands["zero_to_one"],
        bands["one_to_two"],
        bands["two_to_four"],
        bands["four_to_twelve"],
        bands["twelve_to_eighteen"],
    )
    eighteen_to_52 = bands["eighteen_to_fifty_two"]
    over_52 = add_values(bands["fifty_two_to_104"],bands["over_104"])
    classified_total = add_values(under_18,eighteen_to_52,over_52)

    adult_over_52 = add_values(
        row_sum(band_rows.get("fifty_two_to_104"),prefixed_columns(band_columns.get("fifty_two_to_104",[]),"(A)")),
        row_sum(band_rows.get("over_104"),prefixed_columns(band_columns.get("over_104",[]),"(A)")),
    )
    cyp_over_52 = add_values(
        row_sum(band_rows.get("fifty_two_to_104"),prefixed_columns(band_columns.get("fifty_two_to_104",[]),"(CYP)")),
        row_sum(band_rows.get("over_104"),prefixed_columns(band_columns.get("over_104",[]),"(CYP)")),
    )

    # Keep only the largest service lines for the interactive panel. This avoids a
    # very large browser payload while retaining the operationally useful profile.
    service_profile = []
    for service in service_columns:
        service_total = safe_int(total_row.get(service))
        if service_total in (None,0):
            continue

        service_over_52 = add_values(
            safe_int(band_rows.get("fifty_two_to_104").get(service)) if band_rows.get("fifty_two_to_104") is not None and service in band_rows.get("fifty_two_to_104").index else None,
            safe_int(band_rows.get("over_104").get(service)) if band_rows.get("over_104") is not None and service in band_rows.get("over_104").index else None,
        )
        service_profile.append({
            "service":service,
            "total":service_total,
            "over_52":service_over_52,
            "over_52_percent":percentage(service_over_52,service_total),
        })

    service_profile.sort(key=lambda item:item["total"],reverse=True)

    return {
        "code":code,
        "name":name,
        "type":organisation_type,
        "snapshot":SNAPSHOT,
        "metrics":{
            "community-waiting-list":{
                "label":"Reported community health-service waiting list",
                "display":"count",
                "count":total,
                "percent":None,
                "denominator":None,
            },
            "community-under-18":{
                "label":"Classified waits under 18 weeks",
                "display":"percent",
                "count":under_18,
                "percent":percentage(under_18,classified_total),
                "denominator":classified_total,
                "denominator_label":"waits with a published waiting-time band",
            },
            "community-18-52":{
                "label":"Classified waits from 18 to 52 weeks",
                "display":"percent",
                "count":eighteen_to_52,
                "percent":percentage(eighteen_to_52,classified_total),
                "denominator":classified_total,
                "denominator_label":"waits with a published waiting-time band",
            },
            "community-over-52":{
                "label":"Classified waits over 52 weeks",
                "display":"percent",
                "count":over_52,
                "percent":percentage(over_52,classified_total),
                "denominator":classified_total,
                "denominator_label":"waits with a published waiting-time band",
            },
        },
        "waiting_list":{
            "total":total,
            "adult":adult_total,
            "cyp":cyp_total,
            "classified_total":classified_total,
            "band_coverage_percent":percentage(classified_total,total),
            "under_18":under_18,
            "eighteen_to_52":eighteen_to_52,
            "fifty_two_to_104":bands["fifty_two_to_104"],
            "over_104":bands["over_104"],
            "over_52":over_52,
            "adult_over_52":adult_over_52,
            "cyp_over_52":cyp_over_52,
        },
        "bands":bands,
        "top_services":service_profile[:12],
    }


# ============================================================
# 04. READ THE CORRECTED NATIONAL MONTHLY TREND AND NON-SUBMISSIONS
# ============================================================
def read_national_trend(content: bytes) -> dict[str,Any]:
    frame = pd.read_excel(io.BytesIO(content),sheet_name="Table 2",header=2,engine="openpyxl")
    frame.columns = [str(column).strip() for column in frame.columns]
    service_column = frame.columns[0]

    def series_for(label: str) -> list[dict[str,Any]]:
        matches = frame.loc[frame[service_column].astype(str).str.strip() == label]
        if matches.empty:
            return []
        row = matches.iloc[0]
        return [
            {"month":month,"value":safe_int(pd.to_numeric(row.get(month),errors="coerce"))}
            for month in MONTH_COLUMNS
        ]

    non_submitters = pd.read_excel(io.BytesIO(content),sheet_name="Table 1",header=2,engine="openpyxl")
    non_submitters.columns = [str(column).strip() for column in non_submitters.columns]
    name_column = non_submitters.columns[1]
    england_rows = non_submitters.loc[non_submitters[name_column].astype(str).str.strip() == "England"]
    england_row = england_rows.iloc[0] if not england_rows.empty else None

    return {
        "total":series_for("England"),
        "adult":series_for("Adult services"),
        "cyp":series_for("CYP services"),
        "non_submitters":[
            {"month":month,"value":safe_int(pd.to_numeric(england_row.get(month),errors="coerce")) if england_row is not None else None}
            for month in MONTH_COLUMNS
        ],
    }


# ============================================================
# 05. DOWNLOAD, VALIDATE AND WRITE THE COMPACT PUBLIC FILE
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()
    content = response.content

    total_frame,service_columns = read_organisation_table(content,"Table 4")
    total_rows = keyed_rows(total_frame)

    band_frames: dict[str,pd.DataFrame] = {}
    band_columns: dict[str,list[str]] = {}
    band_keyed_rows: dict[str,dict[tuple[str,str,str],pd.Series]] = {}

    for band,sheet_name in BAND_SHEETS.items():
        frame,columns = read_organisation_table(content,sheet_name)
        band_frames[band] = frame
        band_columns[band] = columns
        band_keyed_rows[band] = keyed_rows(frame)

    geographies = []
    for key,total_row in total_rows.items():
        rows = {band:band_keyed_rows[band].get(key) for band in BAND_SHEETS}
        geographies.append(build_geography(key,total_row,service_columns,rows,band_columns))

    england = next((item for item in geographies if item["type"] == "National"),None)
    icbs = sorted((item for item in geographies if item["type"] == "ICB" and item["name"].lower() != "unknown"),key=lambda item:item["name"])
    providers = sorted((item for item in geographies if item["type"] == "Provider" and item["name"].lower() != "unknown"),key=lambda item:item["name"])

    if england is None:
        raise RuntimeError("England waiting-list row was not found.")
    if england["waiting_list"]["total"] != 1090356:
        raise RuntimeError(f"Unexpected March England total: {england['waiting_list']['total']}")
    if england["waiting_list"]["over_52"] != 77712:
        raise RuntimeError(f"Unexpected March England over-52 total: {england['waiting_list']['over_52']}")
    if len(icbs) < 40:
        raise RuntimeError(f"Expected approximately 42 ICB rows; found {len(icbs)}")
    if len(providers) < 100:
        raise RuntimeError(f"Expected a substantial provider list; found {len(providers)}")

    output = {
        "publication":"Community Health Services Waiting Times",
        "period":PERIOD,
        "snapshot":SNAPSHOT,
        "source":"Community Health Services SitRep",
        "source_url":PUBLICATION_URL,
        "source_file_url":SOURCE_URL,
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "england":england,
        "icbs":icbs,
        "providers":providers,
        "national_trend":read_national_trend(content),
        "method":{
            "snapshot":"March 2025 stock position. Monthly waiting-list stocks are not summed.",
            "local_trend":"The March workbook contains a corrected England time series; ICB and provider comparisons are March 2025 snapshots.",
            "wait_band_percentages":"Calculated using waits with a published waiting-time band as the denominator. Coverage against the reported total is shown separately because the published bands may not sum to the total waiting list.",
        },
        "notes":[
            "Management information collected on a rapid turnaround basis with minimal validation.",
            "The collection may not cover every community service in every system.",
            "Providers submit aggregated service-line data irrespective of the number of ICBs they serve; provider and ICB rows are separate published views, not a mapping.",
            "Blanks indicate that no organisation submitted for the service line.",
            "Adult safeguarding and selected children's safeguarding service lines are restricted at lower geographies to reduce disclosure risk.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs and {len(providers)} providers")


if __name__ == "__main__":
    main()
