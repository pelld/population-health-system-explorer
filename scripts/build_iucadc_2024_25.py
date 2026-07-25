# ============================================================
# 00. PUBLIC NHS 111 / IUC PATHWAY METRICS
# ============================================================
# Downloads the revised official IUC ADC CSV and reduces April 2024-March 2025
# to a small JSON file for the website. The output contains an England total and
# contract-area comparisons. All figures are public and aggregated.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/08/IUCADC-Apr23-to-Mar25-Revised-1.csv"
PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/iucadc-new-from-april-2021/integrated-urgent-care-aggregate-data-collection-iucadc-including-nhs111-statistics-apr-2024-mar-2025/"
FLOWCHART_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/08/IUC-flow-chart-2024-25-Revised-Aug-2025-1.pdf"
SPECIFICATION_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2023/05/IUC-ADC-Specification-2023-24-v1.0.pdf"
OUTPUT_PATH = Path("public-data/iucadc-2024-25.json")

PERIODS = {
    "IUCADC-MONTHLY-APR-2024",
    "IUCADC-MONTHLY-MAY-2024",
    "IUCADC-MONTHLY-JUN-2024",
    "IUCADC-MONTHLY-JUL-2024",
    "IUCADC-MONTHLY-AUG-2024",
    "IUCADC-MONTHLY-SEP-2024",
    "IUCADC-MONTHLY-OCT-2024",
    "IUCADC-MONTHLY-NOV-2024",
    "IUCADC-MONTHLY-DEC-2024",
    "IUCADC-MONTHLY-JAN-2025",
    "IUCADC-MONTHLY-FEB-2025",
    "IUCADC-MONTHLY-MAR-2025",
}

ITEMS = {
    "calls_received":"A01",
    "calls_answered":"A03",
    "calls_abandoned":"B02",
    "calls_triaged":"C01",
    "clinical_assessment":"D01",
    "final_dispositions":"E01",
    "ambulance_disposition":"E02",
    "ed_disposition":"E04",
    "primary_contact_bookable":"E07",
    "primary_contact_nonbookable":"E08",
    "primary_speak_bookable":"E10",
    "primary_speak_nonbookable":"E11",
    "dental_disposition":"E12",
    "self_care":"E16",
    "appointments_total":"G01",
    "booked_gp":"G03",
    "booked_iuc":"G05",
    "booked_utc":"G07",
    "booked_ed":"G09",
    "booked_sdec":"G11",
    "booked_other":"G14",
}


def read_csv(content: bytes) -> pd.DataFrame:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            frame = pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False, encoding=encoding)
            frame.columns = frame.columns.astype(str).str.strip()
            return frame
        except Exception as error:  # pragma: no cover - fallback for source changes
            errors.append(f"{encoding}: {type(error).__name__}: {error}")
    raise RuntimeError("Could not read revised IUC ADC CSV. " + " | ".join(errors))


def number(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip().replace(",", "")
    if text in {"", "-", ".", "*", "nan"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def safe_int(value: float | None) -> int | None:
    return None if value is None or pd.isna(value) else int(round(float(value)))


def percent(numerator: int | None, denominator: int | None) -> float | None:
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return round((numerator / denominator) * 100, 2)


def build_area(code: str, name: str, frame: pd.DataFrame) -> dict[str, Any] | None:
    pivot = frame.groupby("ITEM_NUMBER", dropna=False)["NUMERIC_VALUE"].sum(min_count=1)
    values = {key:safe_int(pivot.get(item)) for key,item in ITEMS.items()}

    if not values["calls_received"]:
        return None

    primary_care = sum(values[key] or 0 for key in (
        "primary_contact_bookable",
        "primary_contact_nonbookable",
        "primary_speak_bookable",
        "primary_speak_nonbookable",
    ))

    calls_received = values["calls_received"]
    triaged = values["calls_triaged"]
    dispositions = values["final_dispositions"]

    metrics = {
        "nhs111-contacts":{
            "label":"Calls received by NHS 111",
            "count":calls_received,
            "display":"count",
            "denominator":None,
            "percent":None,
            "indicator":"A01",
        },
        "nhs111-triage":{
            "label":"Calls assessed by a clinician or Clinical Adviser",
            "count":values["clinical_assessment"],
            "display":"percent",
            "denominator":triaged,
            "denominator_label":"triaged calls",
            "percent":percent(values["clinical_assessment"],triaged),
            "indicator":"D01 / C01",
        },
        "nhs111-ae-disposition":{
            "label":"Final disposition to attend a Type 1 or 2 emergency department",
            "count":values["ed_disposition"],
            "display":"percent",
            "denominator":dispositions,
            "denominator_label":"final dispositions",
            "percent":percent(values["ed_disposition"],dispositions),
            "indicator":"E04 / E01",
        },
        "nhs111-direct-booking":{
            "label":"Calls resulting in an appointment booked before the call ended",
            "count":values["appointments_total"],
            "display":"percent",
            "denominator":dispositions,
            "denominator_label":"final dispositions",
            "percent":percent(values["appointments_total"],dispositions),
            "indicator":"G01 / E01",
        },
    }

    dispositions_breakdown = {
        "ambulance":{
            "label":"Ambulance disposition",
            "count":values["ambulance_disposition"],
            "percent":percent(values["ambulance_disposition"],dispositions),
            "indicator":"E02",
        },
        "emergency_department":{
            "label":"Attend Type 1 or 2 ED",
            "count":values["ed_disposition"],
            "percent":percent(values["ed_disposition"],dispositions),
            "indicator":"E04",
        },
        "primary_care":{
            "label":"Contact or speak to primary care",
            "count":primary_care,
            "percent":percent(primary_care,dispositions),
            "indicator":"E07 + E08 + E10 + E11",
        },
        "dental":{
            "label":"Contact or speak to dental practitioner",
            "count":values["dental_disposition"],
            "percent":percent(values["dental_disposition"],dispositions),
            "indicator":"E12",
        },
        "self_care":{
            "label":"Self-care",
            "count":values["self_care"],
            "percent":percent(values["self_care"],dispositions),
            "indicator":"E16",
        },
    }

    booking_breakdown = {
        "gp":{
            "label":"GP practice or GP access hub",
            "count":values["booked_gp"],
            "indicator":"G03",
        },
        "iuc":{
            "label":"IUC Treatment Service",
            "count":values["booked_iuc"],
            "indicator":"G05",
        },
        "utc":{
            "label":"Urgent Treatment Centre",
            "count":values["booked_utc"],
            "indicator":"G07",
        },
        "ed":{
            "label":"Type 1 or 2 ED booked time slot",
            "count":values["booked_ed"],
            "indicator":"G09",
        },
        "sdec":{
            "label":"Same Day Emergency Care",
            "count":values["booked_sdec"],
            "indicator":"G11",
        },
        "other":{
            "label":"Other appointment",
            "count":values["booked_other"],
            "indicator":"G14",
        },
    }

    return {
        "code":code,
        "name":name,
        "months":int(frame["REPORTING_PERIOD"].nunique()),
        "lead_suppliers":sorted(frame["ORG_NAME"].dropna().astype(str).str.strip().loc[lambda x:x.ne("")].unique().tolist()),
        "metrics":metrics,
        "calls":{
            "received":calls_received,
            "answered":values["calls_answered"],
            "answered_percent":percent(values["calls_answered"],calls_received),
            "abandoned":values["calls_abandoned"],
            "abandoned_percent":percent(values["calls_abandoned"],calls_received),
            "triaged":triaged,
            "final_dispositions":dispositions,
        },
        "dispositions":dispositions_breakdown,
        "bookings":{
            "total":values["appointments_total"],
            "percent_of_dispositions":percent(values["appointments_total"],dispositions),
            "breakdown":booking_breakdown,
        },
    }


def aggregate_england(areas: list[dict[str, Any]]) -> dict[str, Any]:
    keys = list(ITEMS)
    totals = {key:0 for key in keys}

    # Reconstruct the required source totals from each contract area. This avoids
    # double-counting supplier-level rows while retaining the published area totals.
    for area in areas:
        totals["calls_received"] += area["calls"]["received"] or 0
        totals["calls_answered"] += area["calls"]["answered"] or 0
        totals["calls_abandoned"] += area["calls"]["abandoned"] or 0
        totals["calls_triaged"] += area["calls"]["triaged"] or 0
        totals["final_dispositions"] += area["calls"]["final_dispositions"] or 0
        totals["clinical_assessment"] += area["metrics"]["nhs111-triage"]["count"] or 0
        totals["ed_disposition"] += area["metrics"]["nhs111-ae-disposition"]["count"] or 0
        totals["appointments_total"] += area["bookings"]["total"] or 0
        for key,source in (("ambulance_disposition","ambulance"),("dental_disposition","dental"),("self_care","self_care")):
            totals[key] += area["dispositions"][source]["count"] or 0
        for source in ("primary_contact_bookable","primary_contact_nonbookable","primary_speak_bookable","primary_speak_nonbookable"):
            totals[source] = 0
        totals["primary_contact_bookable"] += area["dispositions"]["primary_care"]["count"] or 0
        for key,source in (("booked_gp","gp"),("booked_iuc","iuc"),("booked_utc","utc"),("booked_ed","ed"),("booked_sdec","sdec"),("booked_other","other")):
            totals[key] += area["bookings"]["breakdown"][source]["count"] or 0

    # Build a small synthetic frame-shaped result using the same output contract.
    received = totals["calls_received"]
    triaged = totals["calls_triaged"]
    dispositions = totals["final_dispositions"]
    primary = totals["primary_contact_bookable"]

    england = {
        "code":"ENG",
        "name":"England",
        "months":12,
        "lead_suppliers":[],
        "metrics":{
            "nhs111-contacts":{"label":"Calls received by NHS 111","count":received,"display":"count","denominator":None,"percent":None,"indicator":"A01"},
            "nhs111-triage":{"label":"Calls assessed by a clinician or Clinical Adviser","count":totals["clinical_assessment"],"display":"percent","denominator":triaged,"denominator_label":"triaged calls","percent":percent(totals["clinical_assessment"],triaged),"indicator":"D01 / C01"},
            "nhs111-ae-disposition":{"label":"Final disposition to attend a Type 1 or 2 emergency department","count":totals["ed_disposition"],"display":"percent","denominator":dispositions,"denominator_label":"final dispositions","percent":percent(totals["ed_disposition"],dispositions),"indicator":"E04 / E01"},
            "nhs111-direct-booking":{"label":"Calls resulting in an appointment booked before the call ended","count":totals["appointments_total"],"display":"percent","denominator":dispositions,"denominator_label":"final dispositions","percent":percent(totals["appointments_total"],dispositions),"indicator":"G01 / E01"},
        },
        "calls":{"received":received,"answered":totals["calls_answered"],"answered_percent":percent(totals["calls_answered"],received),"abandoned":totals["calls_abandoned"],"abandoned_percent":percent(totals["calls_abandoned"],received),"triaged":triaged,"final_dispositions":dispositions},
        "dispositions":{
            "ambulance":{"label":"Ambulance disposition","count":totals["ambulance_disposition"],"percent":percent(totals["ambulance_disposition"],dispositions),"indicator":"E02"},
            "emergency_department":{"label":"Attend Type 1 or 2 ED","count":totals["ed_disposition"],"percent":percent(totals["ed_disposition"],dispositions),"indicator":"E04"},
            "primary_care":{"label":"Contact or speak to primary care","count":primary,"percent":percent(primary,dispositions),"indicator":"E07 + E08 + E10 + E11"},
            "dental":{"label":"Contact or speak to dental practitioner","count":totals["dental_disposition"],"percent":percent(totals["dental_disposition"],dispositions),"indicator":"E12"},
            "self_care":{"label":"Self-care","count":totals["self_care"],"percent":percent(totals["self_care"],dispositions),"indicator":"E16"},
        },
        "bookings":{
            "total":totals["appointments_total"],
            "percent_of_dispositions":percent(totals["appointments_total"],dispositions),
            "breakdown":{
                "gp":{"label":"GP practice or GP access hub","count":totals["booked_gp"],"indicator":"G03"},
                "iuc":{"label":"IUC Treatment Service","count":totals["booked_iuc"],"indicator":"G05"},
                "utc":{"label":"Urgent Treatment Centre","count":totals["booked_utc"],"indicator":"G07"},
                "ed":{"label":"Type 1 or 2 ED booked time slot","count":totals["booked_ed"],"indicator":"G09"},
                "sdec":{"label":"Same Day Emergency Care","count":totals["booked_sdec"],"indicator":"G11"},
                "other":{"label":"Other appointment","count":totals["booked_other"],"indicator":"G14"},
            },
        },
    }
    return england


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    frame = read_csv(response.content)

    required = {"REPORTING_PERIOD","ORG_CODE","ORG_NAME","CONTRACT_CODE","CONTRACT_NAME","ITEM_NUMBER","VALUE","REGION_CODE","REGION_NAME"}
    missing = sorted(required.difference(frame.columns))
    if missing:
        raise RuntimeError(f"IUC ADC source structure changed; missing columns: {missing}")

    frame = frame.loc[frame["REPORTING_PERIOD"].isin(PERIODS) & frame["ITEM_NUMBER"].isin(ITEMS.values())].copy()
    frame["NUMERIC_VALUE"] = frame["VALUE"].map(number)
    frame["CONTRACT_CODE"] = frame["CONTRACT_CODE"].fillna("").astype(str).str.strip()
    frame["CONTRACT_NAME"] = frame["CONTRACT_NAME"].fillna("").astype(str).str.strip()
    frame["ORG_NAME"] = frame["ORG_NAME"].fillna("").astype(str).str.strip()

    frame = frame.loc[frame["CONTRACT_CODE"].ne("") & frame["CONTRACT_NAME"].ne("")].copy()

    areas: list[dict[str, Any]] = []
    for (code,name),group in frame.groupby(["CONTRACT_CODE","CONTRACT_NAME"],dropna=False,sort=False):
        area = build_area(str(code),str(name),group)
        if area and area["months"] >= 10:
            areas.append(area)

    # A small number of renamed contract records may share a code. Keep the record
    # with the most months and then the highest call volume for the selector.
    deduplicated: dict[str, dict[str, Any]] = {}
    for area in areas:
        current = deduplicated.get(area["code"])
        candidate_key = (area["months"],area["calls"]["received"] or 0)
        current_key = (current["months"],current["calls"]["received"] or 0) if current else (-1,-1)
        if candidate_key > current_key:
            deduplicated[area["code"]] = area

    areas = sorted(deduplicated.values(),key=lambda area:area["name"])
    england = aggregate_england(areas)

    output = {
        "publication":"Integrated Urgent Care Aggregate Data Collection including NHS 111",
        "period":"2024-25",
        "geography":"IUC contract area",
        "source_url":PUBLICATION_URL,
        "source_file_url":SOURCE_URL,
        "flowchart_url":FLOWCHART_URL,
        "specification_url":SPECIFICATION_URL,
        "contract_area_count":len(areas),
        "england":england,
        "areas":areas,
        "notes":[
            "Figures use the revised April 2024 to March 2025 official IUC ADC publication released on 14 August 2025.",
            "Contract areas are reporting geographies coordinated by lead data suppliers; they do not align exactly with ICBs, ambulance trusts or acute providers.",
            "Primary-care dispositions combine E07, E08, E10 and E11 because the aggregate E06 and E09 items are weekly-only measures.",
            "Percentages are calculated from the published contract-area counts and may differ slightly from the adjusted national percentages in the NHS England flowchart where missing numerator or denominator months were excluded.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(areas)} IUC contract areas")


if __name__ == "__main__":
    main()
