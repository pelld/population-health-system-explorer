# ============================================================
# 00. PUBLIC MARCH 2025 COMMUNITY SERVICES STATISTICS
# ============================================================
# Downloads the official CSDS core-data ZIP and extracts only the published total
# rows for referrals, people needing care, care contacts, people contacted and
# care activities. No overlapping dimensions are summed.

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/39/AF1D09/csds-mar25-exp-core-data.zip"
PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/community-services-statistics-for-children-young-people-and-adults/march-2025"
DATASETS_URL = f"{PUBLICATION_URL}/datasets"
OUTPUT_PATH = Path("public-data/csds-mar-2025.json")
PERIOD = "March 2025"

TOTAL_DIMENSIONS = {
    "Referrals":"TotalReferrals",
    "PatientWithReferral":"TotalPatientWithReferral",
    "CareContacts":"TotalCareContacts",
    "PatientWithCareContact":"TotalPatientWithCareContact",
    "CareActivities":"TotalCareActivities",
    "Organisation":"TotalOrganisation",
}

NODE_METRICS = {
    "csds-referrals":("Referrals","Community-service referrals received"),
    "csds-people-referred":("PatientWithReferral","People with a community-service referral"),
    "csds-care-contacts":("CareContacts","Community-service care contacts"),
    "csds-people-contacted":("PatientWithCareContact","People receiving a community-service care contact"),
    "csds-care-activities":("CareActivities","Care activities delivered during community contacts"),
}

VALUE_COLUMNS = ["MEASURE_VALUE","MEASURE_VALUE_0_18","MEASURE_VALUE_19_64","MEASURE_VALUE_65_PLUS"]


def safe_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    return int(round(float(value)))


def safe_float(value: Any,digits: int = 2) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value),digits)


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
        " Foundation Trust":" Foundation Trust",
    }
    for old,new in replacements.items():
        text = text.replace(old,new)
    return text


def percentage(numerator: int | None,denominator: int | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return safe_float((numerator / denominator) * 100)


def ratio(numerator: int | None,denominator: int | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return safe_float(numerator / denominator)


def metric_from_row(row: pd.Series | None,label: str) -> dict[str,Any]:
    count = safe_int(row.get("MEASURE_VALUE")) if row is not None else None
    age = {
        "age_0_18":safe_int(row.get("MEASURE_VALUE_0_18")) if row is not None else None,
        "age_19_64":safe_int(row.get("MEASURE_VALUE_19_64")) if row is not None else None,
        "age_65_plus":safe_int(row.get("MEASURE_VALUE_65_PLUS")) if row is not None else None,
    }
    return {
        "label":label,
        "display":"count",
        "count":count,
        "percent":None,
        "age":{
            **age,
            "age_0_18_percent":percentage(age["age_0_18"],count),
            "age_19_64_percent":percentage(age["age_19_64"],count),
            "age_65_plus_percent":percentage(age["age_65_plus"],count),
            "classified_total":sum(value for value in age.values() if value is not None),
        },
    }


def build_geography(organisation_type: str,code: str,name: str,rows: dict[str,pd.Series]) -> dict[str,Any]:
    metrics = {
        node_id:metric_from_row(rows.get(count_of),label)
        for node_id,(count_of,label) in NODE_METRICS.items()
    }

    referrals = metrics["csds-referrals"]["count"]
    people_referred = metrics["csds-people-referred"]["count"]
    contacts = metrics["csds-care-contacts"]["count"]
    people_contacted = metrics["csds-people-contacted"]["count"]
    activities = metrics["csds-care-activities"]["count"]

    return {
        "code":code,
        "name":clean_name(name,organisation_type),
        "type":organisation_type,
        "period":PERIOD,
        "metrics":metrics,
        "relationships":{
            "referrals_per_person_referred":ratio(referrals,people_referred),
            "contacts_per_person_contacted":ratio(contacts,people_contacted),
            "activities_per_contact":ratio(activities,contacts),
        },
        "data_quality":{
            "has_referrals":referrals is not None,
            "has_people_referred":people_referred is not None,
            "has_care_contacts":contacts is not None,
            "has_people_contacted":people_contacted is not None,
            "has_care_activities":activities is not None,
        },
    }


def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        frame = pd.read_csv(
            archive.open(csv_name),
            dtype=str,
            low_memory=False,
            encoding="utf-8-sig",
            usecols=["ORG_CODE","ORG_NAME","ORG_LEVEL","DIMENSION","COUNT_OF",*VALUE_COLUMNS],
        )

    expected_dimensions = set(TOTAL_DIMENSIONS.values())
    totals = frame.loc[frame["DIMENSION"].isin(expected_dimensions)].copy()
    for column in VALUE_COLUMNS:
        totals[column] = pd.to_numeric(totals[column],errors="coerce")

    # Keep one direct published total row per organisation and count type.
    rows_by_organisation: dict[tuple[str,str,str],dict[str,pd.Series]] = {}
    for _,row in totals.iterrows():
        key = (str(row["ORG_LEVEL"]),str(row["ORG_CODE"]),str(row["ORG_NAME"]))
        rows_by_organisation.setdefault(key,{})[str(row["COUNT_OF"])] = row

    england_key = next(key for key in rows_by_organisation if key[0] == "All Submitters")
    england = build_geography("National","ALL","England",rows_by_organisation[england_key])

    icbs = []
    providers = []
    for (level,code,name),rows in rows_by_organisation.items():
        if level == "ICB" and code.lower() != "unknown" and "unknown" not in name.lower():
            icbs.append(build_geography("ICB",code,name,rows))
        elif level == "Provider" and "Organisation" in rows:
            providers.append(build_geography("Provider",code,name,rows))

    icbs.sort(key=lambda item:item["name"])
    providers.sort(key=lambda item:item["name"])

    expected_england = {
        "csds-referrals":1701045,
        "csds-people-referred":1194845,
        "csds-care-contacts":8581110,
        "csds-people-contacted":2403315,
        "csds-care-activities":11526355,
    }
    for node_id,expected in expected_england.items():
        actual = england["metrics"][node_id]["count"]
        if actual != expected:
            raise RuntimeError(f"England {node_id} does not match publication: expected {expected}, found {actual}")

    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 named ICBs; found {len(icbs)}")
    if len(providers) != 212:
        raise RuntimeError(f"Expected 212 submitted providers; found {len(providers)}")

    provider_coverage = {
        "submitted":len(providers),
        "with_referrals":sum(item["data_quality"]["has_referrals"] for item in providers),
        "with_care_contacts":sum(item["data_quality"]["has_care_contacts"] for item in providers),
        "with_care_activities":sum(item["data_quality"]["has_care_activities"] for item in providers),
    }
    if provider_coverage["with_referrals"] != 204 or provider_coverage["with_care_contacts"] != 198:
        raise RuntimeError(f"Provider coverage does not match publication: {provider_coverage}")

    output = {
        "publication":"Community Services Statistics, March 2025",
        "period":PERIOD,
        "source":"Community Services Data Set (CSDS)",
        "source_url":PUBLICATION_URL,
        "datasets_url":DATASETS_URL,
        "source_file_url":SOURCE_URL,
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "provider_coverage":provider_coverage,
        "england":england,
        "icbs":icbs,
        "providers":providers,
        "method":{
            "totals":"Direct published Total* records from the official long-format core-data CSV. Overlapping dimensions are not summed.",
            "age":"Published age-specific values attached to each total record. Age components may not sum exactly to the headline where age is unknown or suppressed.",
            "geography":"ICB and provider are separate published aggregations. Providers are not assigned to an ICB by this layer.",
        },
        "notes":[
            "Official statistics in development and dependent on provider submission completeness.",
            "Activity describes recorded publicly funded community services, not all community need, capacity or outcomes.",
            "Counts of referrals, people and contacts are different units and do not describe linked individual pathways in this aggregated file.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs and {len(providers)} providers")


if __name__ == "__main__":
    main()
