# ============================================================
# 00. DISCHARGE READY DATE — REVISED 2024-25 PUBLICATION
# ============================================================
# Downloads all twelve revised monthly CSV files. Annual percentages and averages
# are rebuilt from the published monthly counts and bed-day numerators; published
# monthly percentages are retained only for quality checks and coverage context.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/discharge-delays/discharge-ready-date/"
BASE = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/07"
OUTPUT_PATH = Path("public-data/drd-2024-25.json")
PERIOD = "2024-25"

MONTHS = [
    ("Apr 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-April-2024-Revised.csv"),
    ("May 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-May-2024-Revised.csv"),
    ("Jun 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-June-2024-Revised.csv"),
    ("Jul 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-July-2024-Revised.csv"),
    ("Aug 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-August-2024-Revised.csv"),
    ("Sep 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-September-2024-Revised.csv"),
    ("Oct 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-October-2024-Revised.csv"),
    ("Nov 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-November-2024-Revised.csv"),
    ("Dec 2024",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-December-2024-Revised.csv"),
    ("Jan 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-January-2025-Revised.csv"),
    ("Feb 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-February-2025-Revised.csv"),
    ("Mar 2025",f"{BASE}/Discharge-Ready-Date-monthly-data-csv-March-2025-Revised.csv"),
]

TOTAL = "Number of patients discharged in total"
NO_DELAY = "Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is No delay"
COUNT_MEASURES = {
    "no_delay":NO_DELAY,
    "one_day":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a 1 day delay",
    "two_three":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a 2-3 day delay",
    "four_six":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a 4-6 day delay",
    "seven_thirteen":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a 7-13 day delay",
    "fourteen_twenty":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a 14-20 day delay",
    "twenty_one_plus":"Number of patients discharged where, between the Discharge Ready Date and Discharge Date, there is a delay of 21 days or more",
}
BED_DAY_MEASURES = {
    "one_day":"Total bed days after Discharge Ready Date for patients discharged within 1 day",
    "two_three":"Total bed days after Discharge Ready Date for patients discharged within 2-3 days",
    "four_six":"Total bed days after Discharge Ready Date for patients discharged within 4-6 days",
    "seven_thirteen":"Total bed days after Discharge Ready Date for patients discharged within 7-13 days",
    "fourteen_twenty":"Total bed days after Discharge Ready Date for patients discharged within 14-20 days",
    "twenty_one_plus":"Total bed days after Discharge Ready Date for patients discharged within 21 days or more",
}
TOTAL_BED_DAYS = "Total bed days lost due to delayed discharge"
ACCEPTABLE_COUNT = "Number of providers submitting acceptable data"
ACCEPTABLE_PERCENT = "% of providers submitting acceptable data"
UTLA_ACCEPTABLE_DISCHARGES = "Total Discharges for UTLA from acceptable trusts"
UTLA_COVERAGE_PERCENT = "% of all UTLA discharges that are from acceptable trusts"

KEEP_TYPES = {"National","ICB","Provider","UTLA Aggregate"}


# ============================================================
# 01. GENERIC HELPERS
# ============================================================
def number(value: Any) -> float | None:
    if value in (None,"","-","*",":","[x]","[z]"):
        return None
    try:
        return float(str(value).replace(",","").strip())
    except (TypeError,ValueError):
        return None


def rounded(value: float | None,digits: int = 2) -> float | None:
    return None if value is None else round(float(value),digits)


def percent(numerator: float | None,denominator: float | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return rounded((numerator / denominator) * 100,2)


def title_name(value: Any,geography_type: str) -> str:
    text = "" if value is None else str(value).strip()
    if geography_type == "ICB":
        text = text.removeprefix("NHS ").removesuffix(" INTEGRATED CARE BOARD")
    words = text.title().split()
    replacements = {"Nhs":"NHS","Icb":"ICB","Utla":"UTLA","Chc":"CHC"}
    lower_words = {"And","Of","The","On","In","For","At","To"}
    result = []
    for index,word in enumerate(words):
        word = replacements.get(word,word)
        if index and word in lower_words:
            word = word.lower()
        result.append(word)
    return " ".join(result)


def metric(label: str,display: str,**values: Any) -> dict[str,Any]:
    return {"label":label,"display":display,**values}


# ============================================================
# 02. DOWNLOAD ONLY THE PUBLISHED AGGREGATE ROWS WE NEED
# ============================================================
def download_month(label: str,url: str) -> pd.DataFrame:
    response = requests.get(url,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")
    frame = frame.loc[frame["Data Type"].isin(KEEP_TYPES)].copy()
    frame["Month"] = label
    frame["Value numeric"] = frame["Value"].map(number)
    return frame[[
        "Month","Data Type","Upper Tier Local Authority Code","Upper Tier Local Authority",
        "Region (of Provider)","ICB (of Provider)","Code","Organisation Name","Measure","Value numeric"
    ]]


def download_all() -> pd.DataFrame:
    return pd.concat([download_month(label,url) for label,url in MONTHS],ignore_index=True)


# ============================================================
# 03. BUILD ONE ANNUAL GEOGRAPHY FROM MONTHLY PUBLISHED COUNTS
# ============================================================
def monthly_value(rows: pd.DataFrame,month: str,measure_name: str) -> float | None:
    values = rows.loc[(rows["Month"] == month) & (rows["Measure"] == measure_name),"Value numeric"].dropna()
    if values.empty:
        return None
    if len(values) != 1:
        raise RuntimeError(f"Expected one {measure_name!r} row for {month}; found {len(values)}")
    return float(values.iloc[0])


def build_geography(rows: pd.DataFrame,code: str,name: str,geography_type: str,region: str | None) -> dict[str,Any]:
    monthly = []
    annual_counts = {key:0.0 for key in COUNT_MEASURES}
    annual_bed_days = {key:0.0 for key in BED_DAY_MEASURES}
    annual_total = 0.0
    annual_total_bed_days = 0.0
    months_present = 0
    monthly_provider_coverage = []
    monthly_utla_coverage = []

    for month,_ in MONTHS:
        total = monthly_value(rows,month,TOTAL)
        counts = {key:monthly_value(rows,month,label) for key,label in COUNT_MEASURES.items()}
        bed_days = {key:monthly_value(rows,month,label) for key,label in BED_DAY_MEASURES.items()}
        total_bed_days = monthly_value(rows,month,TOTAL_BED_DAYS)

        # UTLA aggregates publish the accepted-trust discharge total under a different label.
        if geography_type == "UTLA" and total is None:
            total = monthly_value(rows,month,UTLA_ACCEPTABLE_DISCHARGES)

        if total is None:
            continue

        months_present += 1
        count_sum = sum(value for value in counts.values() if value is not None)
        if all(value is not None for value in counts.values()) and abs(count_sum - total) > 0.000001:
            raise RuntimeError(f"{geography_type} {code} {month}: discharge buckets {count_sum} do not equal total {total}")

        bed_sum = sum(value for value in bed_days.values() if value is not None)
        if total_bed_days is not None and all(value is not None for value in bed_days.values()) and abs(bed_sum - total_bed_days) > 0.000001:
            raise RuntimeError(f"{geography_type} {code} {month}: bed-day buckets {bed_sum} do not equal total {total_bed_days}")

        delayed = sum(value or 0 for key,value in counts.items() if key != "no_delay")
        no_delay = counts.get("no_delay")
        annual_total += total
        annual_total_bed_days += total_bed_days or 0
        for key,value in counts.items():
            annual_counts[key] += value or 0
        for key,value in bed_days.items():
            annual_bed_days[key] += value or 0

        acceptable_count = monthly_value(rows,month,ACCEPTABLE_COUNT)
        acceptable_percent = monthly_value(rows,month,ACCEPTABLE_PERCENT)
        if acceptable_percent is not None:
            monthly_provider_coverage.append(acceptable_percent * 100)

        utla_coverage = monthly_value(rows,month,UTLA_COVERAGE_PERCENT)
        if utla_coverage is not None:
            monthly_utla_coverage.append(utla_coverage * 100)

        monthly.append({
            "month":month,
            "total_discharges":int(round(total)),
            "same_day_count":None if no_delay is None else int(round(no_delay)),
            "same_day_percent":percent(no_delay,total),
            "delayed_count":int(round(delayed)),
            "delayed_percent":percent(delayed,total),
            "bed_days_after_drd":None if total_bed_days is None else int(round(total_bed_days)),
            "average_days_after_drd_excluding_zero":rounded((total_bed_days / delayed) if total_bed_days is not None and delayed else None,2),
            "acceptable_provider_count":None if acceptable_count is None else int(round(acceptable_count)),
            "acceptable_provider_percent":None if acceptable_percent is None else rounded(acceptable_percent * 100,2),
            "utla_coverage_percent":None if utla_coverage is None else rounded(utla_coverage * 100,2),
        })

    delayed_total = sum(value for key,value in annual_counts.items() if key != "no_delay")
    threshold_labels = {
        "no_delay":"Same day / no delay",
        "one_day":"1 day",
        "two_three":"2–3 days",
        "four_six":"4–6 days",
        "seven_thirteen":"7–13 days",
        "fourteen_twenty":"14–20 days",
        "twenty_one_plus":"21 days or more",
    }
    thresholds = []
    for key,label in threshold_labels.items():
        count = annual_counts[key]
        bed_days = 0 if key == "no_delay" else annual_bed_days[key]
        thresholds.append({
            "key":key,
            "label":label,
            "count":int(round(count)),
            "percent_all":percent(count,annual_total),
            "percent_delayed":None if key == "no_delay" else percent(count,delayed_total),
            "bed_days":int(round(bed_days)),
        })

    coverage = {
        "months_with_published_data":months_present,
        "average_monthly_acceptable_provider_percent":rounded(sum(monthly_provider_coverage) / len(monthly_provider_coverage),2) if monthly_provider_coverage else None,
        "minimum_monthly_acceptable_provider_percent":rounded(min(monthly_provider_coverage),2) if monthly_provider_coverage else None,
        "average_monthly_utla_coverage_percent":rounded(sum(monthly_utla_coverage) / len(monthly_utla_coverage),2) if monthly_utla_coverage else None,
        "minimum_monthly_utla_coverage_percent":rounded(min(monthly_utla_coverage),2) if monthly_utla_coverage else None,
    }

    return {
        "code":code,
        "name":name,
        "type":geography_type,
        "region":region,
        "months_present":months_present,
        "metrics":{
            "drd-discharges":metric("Discharges included in the Discharge Ready Date publication","count",count=int(round(annual_total))),
            "drd-same-day":metric("Discharged on the discharge-ready date","percent",percent=percent(annual_counts["no_delay"],annual_total),count=int(round(annual_counts["no_delay"])),denominator=int(round(annual_total))),
            "drd-delayed":metric("Discharged one or more days after the discharge-ready date","percent",percent=percent(delayed_total,annual_total),count=int(round(delayed_total)),denominator=int(round(annual_total))),
            "drd-bed-days":metric("Bed-days after the discharge-ready date","count",count=int(round(annual_total_bed_days))),
            "drd-average-delay":metric("Average days after discharge-ready date among delayed discharges","days",days=rounded((annual_total_bed_days / delayed_total) if delayed_total else None,2),days_including_zero=rounded((annual_total_bed_days / annual_total) if annual_total else None,2)),
        },
        "thresholds":thresholds,
        "coverage":coverage,
        "monthly":monthly,
    }


# ============================================================
# 04. GROUP THE NATIVE PUBLISHED GEOGRAPHIES
# ============================================================
def geography_keys(frame: pd.DataFrame,data_type: str) -> list[tuple[str,str,str | None]]:
    rows = frame.loc[frame["Data Type"] == data_type].copy()
    if data_type == "UTLA Aggregate":
        keys = rows[["Upper Tier Local Authority Code","Upper Tier Local Authority"]].drop_duplicates()
        return [
            (str(row["Upper Tier Local Authority Code"]),title_name(row["Upper Tier Local Authority"],"UTLA"),None)
            for _,row in keys.iterrows()
            if str(row["Upper Tier Local Authority Code"]).strip() not in ("","[z]","nan")
        ]

    keys = rows[["Code","Organisation Name","Region (of Provider)"]].drop_duplicates()
    geography_type = "ICB" if data_type == "ICB" else "Provider" if data_type == "Provider" else "National"
    return [
        (str(row["Code"]),title_name(row["Organisation Name"],geography_type),None if str(row["Region (of Provider)"]) in ("[z]","nan") else title_name(row["Region (of Provider)"],"Region"))
        for _,row in keys.iterrows()
    ]


def rows_for(frame: pd.DataFrame,data_type: str,code: str) -> pd.DataFrame:
    if data_type == "UTLA Aggregate":
        return frame.loc[(frame["Data Type"] == data_type) & (frame["Upper Tier Local Authority Code"].astype(str) == code)].copy()
    return frame.loc[(frame["Data Type"] == data_type) & (frame["Code"].astype(str) == code)].copy()


# ============================================================
# 05. BUILD, RECONCILE AND WRITE THE PUBLIC FILE
# ============================================================
def main() -> None:
    frame = download_all()

    england = build_geography(rows_for(frame,"National","ENGLAND"),"ENGLAND","England","National",None)

    icbs = [build_geography(rows_for(frame,"ICB",code),code,name,"ICB",region) for code,name,region in geography_keys(frame,"ICB")]
    providers = [build_geography(rows_for(frame,"Provider",code),code,name,"Provider",region) for code,name,region in geography_keys(frame,"Provider")]
    utlas = [build_geography(rows_for(frame,"UTLA Aggregate",code),code,name,"UTLA",None) for code,name,_ in geography_keys(frame,"UTLA Aggregate")]

    icbs.sort(key=lambda item:item["name"])
    providers.sort(key=lambda item:item["name"])
    utlas.sort(key=lambda item:item["name"])

    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 ICBs; found {len(icbs)}")
    if len(providers) < 110:
        raise RuntimeError(f"Expected at least 110 acceptable providers; found {len(providers)}")
    if len(utlas) < 145:
        raise RuntimeError(f"Expected at least 145 UTLAs; found {len(utlas)}")
    if england["months_present"] != 12:
        raise RuntimeError(f"Expected 12 England months; found {england['months_present']}")

    # The England annual total must equal the sum of the seven published annual
    # discharge buckets, and bed days must equal the six published delay buckets.
    threshold_count = sum(item["count"] for item in england["thresholds"])
    england_total = england["metrics"]["drd-discharges"]["count"]
    if threshold_count != england_total:
        raise RuntimeError(f"England annual discharge buckets {threshold_count} do not equal published total {england_total}")
    threshold_bed_days = sum(item["bed_days"] for item in england["thresholds"])
    england_bed_days = england["metrics"]["drd-bed-days"]["count"]
    if threshold_bed_days != england_bed_days:
        raise RuntimeError(f"England annual bed-day buckets {threshold_bed_days} do not equal published total {england_bed_days}")

    validation = {
        "england_months_reconciled":12,
        "england_annual_discharge_gap":threshold_count - england_total,
        "england_annual_bed_day_gap":threshold_bed_days - england_bed_days,
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "utla_count":len(utlas),
    }

    output = {
        "publication":"Discharge Ready Date — revised monthly data, 2024-25",
        "period":PERIOD,
        "source":"NHS England Discharge Ready Date publication",
        "source_url":PUBLICATION_URL,
        "source_files":{label:url for label,url in MONTHS},
        "geography_note":"ICBs are based on the provider's ICB. UTLAs are resident geographies based on patient postcode. Providers are treatment organisations.",
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "utla_count":len(utlas),
        "england":england,
        "icbs":icbs,
        "providers":providers,
        "utlas":utlas,
        "validation":validation,
        "method":{
            "annual_counts":"Sum of the twelve direct revised monthly published counts.",
            "annual_percentages":"Recalculated from annual published count numerators and denominators; monthly percentages are not averaged.",
            "average_delay":"Total published bed-days after discharge-ready date divided by delayed discharges; the including-zero average divides by all discharges.",
            "data_quality":"Only trusts meeting the publication's monthly acceptance criteria contribute. Provider and geography coverage can therefore vary by month.",
        },
        "notes":[
            "The discharge-ready date is the start of the final period in which the patient no longer meets the criteria to reside for the episode.",
            "The publication excludes children under 16, zero-day stays, specified admission and discharge methods, deaths, transfers and non-specific-acute treatment functions.",
            "These are discharge cohorts, not a daily stock of people waiting in hospital; the Acute Discharge SitRep measures a different concept.",
            "A shorter delay is not a standalone judgement of discharge quality or safety.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs, {len(providers)} providers, {len(utlas)} UTLAs")
    print(json.dumps({"england":england["metrics"],"validation":validation},indent=2))


if __name__ == "__main__":
    main()
