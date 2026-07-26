# ============================================================
# 00. ACUTE DISCHARGE SITREP — 2024-25
# ============================================================
# Downloads all twelve official monthly organisation CSV files and the independent
# national time-series workbook. Stable daily and weekly measures cover April 2024
# to March 2025. Discharge-destination and delay-reason definitions changed on
# 27 May 2024, so those profiles cover June 2024 to March 2025 only.

from __future__ import annotations

import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import openpyxl
import pandas as pd
import requests


PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/discharge-delays/acute-discharge-situation-report/"
TIMESERIES_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-timeseries-data-webfile-April2021-June2026.xlsx"
OUTPUT_PATH = Path("public-data/acute-discharge-2024-25.json")
PERIOD = "2024-25"
START_DATE = pd.Timestamp("2024-04-01")
END_DATE = pd.Timestamp("2025-03-31")
POST_CHANGE_START = pd.Timestamp("2024-06-01")

MONTHS = [
    ("Apr 2024","2024-04-01","2024-04-30","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-1-CSV-apr24.csv"),
    ("May 2024","2024-05-01","2024-05-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-2-CSV-may24.csv"),
    ("Jun 2024","2024-06-01","2024-06-30","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-3-CSV-jun24.csv"),
    ("Jul 2024","2024-07-01","2024-07-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-4-CSV-jul24.csv"),
    ("Aug 2024","2024-08-01","2024-08-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-5-CSV-aug24.csv"),
    ("Sep 2024","2024-09-01","2024-09-30","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-6-CSV-sep24.csv"),
    ("Oct 2024","2024-10-01","2024-10-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-7-CSV-oct24.csv"),
    ("Nov 2024","2024-11-01","2024-11-30","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-8-CSV-nov24.csv"),
    ("Dec 2024","2024-12-01","2024-12-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-9-CSV-dec24.csv"),
    ("Jan 2025","2025-01-01","2025-01-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-10-CSV-jan25.csv"),
    ("Feb 2025","2025-02-01","2025-02-28","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-11-CSV-feb25.csv"),
    ("Mar 2025","2025-03-01","2025-03-31","https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Daily-discharge-sitrep-monthly-data-webfile-12-CSV-mar25.csv"),
]

NCTR = "Number of patients who no longer meet the criteria to reside"
DISCHARGED = "Number of patients discharged"
REMAINING = "Number of patients remaining in hospital who no longer meet the criteria to reside"
CORE_METRICS = (NCTR,DISCHARGED,REMAINING)


# ============================================================
# 01. CLEANING HELPERS
# ============================================================
def safe_number(value: Any) -> float | None:
    if value in (None,"","-","*",":","[x]","[z]"):
        return None
    try:
        return float(str(value).replace(",","").strip())
    except (TypeError,ValueError):
        return None


def rounded(value: float | None,digits: int = 2) -> float | None:
    return None if value is None else round(float(value),digits)


def percentage(numerator: float | None,denominator: float | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return rounded((numerator / denominator) * 100,2)


def clean_name(value: Any,geography_type: str) -> str:
    text = "" if value is None else str(value).strip()
    if geography_type == "ICB":
        text = text.removeprefix("NHS ").removesuffix(" INTEGRATED CARE BOARD")
    words = text.title().split()
    replacements = {"Nhs":"NHS","Icb":"ICB","Cic":"CIC","Chc":"CHC"}
    lower_words = {"And","Of","The","On","In","For","At","To"}
    output = []
    for index,word in enumerate(words):
        word = replacements.get(word,word)
        if index and word in lower_words:
            word = word.lower()
        output.append(word)
    return " ".join(output)


def canonical(text: Any) -> str:
    value = "" if text is None else str(text)
    value = value.replace("–","-").replace("—","-").replace(" "," ").replace(" "," ")
    value = value.replace("persons","person's")
    return re.sub(r"\s+"," ",value).strip().lower()


def additional_threshold(metric: str) -> str | None:
    value = canonical(metric)
    if "additional bed days" not in value:
        return None
    if "21" in value:
        return "21_plus"
    if "14" in value:
        return "14_plus"
    if "7" in value:
        return "7_plus"
    return None


def pathway_number(metric: str) -> str | None:
    match = re.match(r"pathway\s+([0-3])",canonical(metric))
    return match.group(1) if match else None


def metric(label: str,display: str,**values: Any) -> dict[str,Any]:
    return {"label":label,"display":display,**values}


# ============================================================
# 02. DOWNLOAD AND STANDARDISE THE TWELVE MONTHLY FILES
# ============================================================
def download_month(label: str,start: str,end: str,url: str) -> pd.DataFrame:
    response = requests.get(url,timeout=300)
    response.raise_for_status()
    frame = pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")

    for column in ("Metric Type","Metric Group"):
        if column not in frame:
            frame[column] = None

    frame["Period"] = pd.to_datetime(frame["Period"],dayfirst=True,errors="coerce")
    frame["Value numeric"] = frame["Value"].map(safe_number)
    frame["Source month"] = label
    frame["Source URL"] = url

    start_date = pd.Timestamp(start)
    end_date = pd.Timestamp(end)
    frame = frame.loc[frame["Period"].between(start_date,end_date,inclusive="both")].copy()
    return frame


def download_all_months() -> pd.DataFrame:
    frames = [download_month(label,start,end,url) for label,start,end,url in MONTHS]
    frame = pd.concat(frames,ignore_index=True)
    frame = frame.loc[frame["Period"].between(START_DATE,END_DATE,inclusive="both")].copy()
    return frame


# ============================================================
# 03. INDEPENDENT NATIONAL TIME-SERIES VALIDATION
# ============================================================
def workbook_rows(sheet,header_row: int) -> pd.DataFrame:
    headers = [cell.value for cell in sheet[header_row]]
    records = []
    for row in sheet.iter_rows(min_row=header_row + 1,values_only=True):
        if not any(value not in (None,"") for value in row):
            continue
        records.append({headers[index]:value for index,value in enumerate(row) if index < len(headers) and headers[index] not in (None,"")})
    return pd.DataFrame(records)


def national_time_series() -> tuple[pd.DataFrame,pd.DataFrame]:
    response = requests.get(TIMESERIES_URL,timeout=300)
    response.raise_for_status()
    workbook = openpyxl.load_workbook(io.BytesIO(response.content),read_only=True,data_only=True)

    daily = workbook_rows(workbook["Daily Series"],5)
    weekly = workbook_rows(workbook["Weekly Series"],7)

    daily["Date"] = pd.to_datetime(daily["Date"],errors="coerce")
    weekly["Week commencing"] = pd.to_datetime(weekly["Week commencing"],errors="coerce")
    daily = daily.loc[daily["Date"].between(START_DATE,END_DATE,inclusive="both")].copy()
    weekly = weekly.loc[weekly["Week commencing"].between(START_DATE,END_DATE,inclusive="both")].copy()
    return daily,weekly


def validate_national(monthly_frame: pd.DataFrame,daily_workbook: pd.DataFrame,weekly_workbook: pd.DataFrame) -> dict[str,Any]:
    national = monthly_frame.loc[monthly_frame["Level"].eq("National")].copy()

    # Daily stock and flow values must match the independently published national
    # workbook for every date, not only at annual total level.
    csv_daily = national.loc[national["Metric"].isin(CORE_METRICS)].pivot_table(
        index="Period",columns="Metric",values="Value numeric",aggfunc="sum",dropna=False
    ).sort_index()
    workbook_daily = daily_workbook.set_index("Date")[[NCTR,DISCHARGED,REMAINING]].applymap(safe_number).sort_index()

    common_dates = csv_daily.index.intersection(workbook_daily.index)
    if len(common_dates) != 365:
        raise RuntimeError(f"Expected 365 shared national daily dates; found {len(common_dates)}")
    for name in CORE_METRICS:
        left = csv_daily.loc[common_dates,name].astype(float)
        right = workbook_daily.loc[common_dates,name].astype(float)
        mismatch = (left - right).abs() > 0.000001
        if mismatch.any():
            date = mismatch[mismatch].index[0]
            raise RuntimeError(f"National daily validation failed for {name} on {date.date()}: CSV {left.loc[date]} vs workbook {right.loc[date]}")

    # Weekly additional-bed-day snapshots must also match by date and threshold.
    csv_additional = national.loc[national["Metric"].map(lambda value: additional_threshold(str(value)) is not None)].copy()
    csv_additional["Threshold"] = csv_additional["Metric"].map(lambda value: additional_threshold(str(value)))
    csv_weekly = csv_additional.pivot_table(index="Period",columns="Threshold",values="Value numeric",aggfunc="sum").sort_index()

    weekly_columns = {
        "7_plus":"Number of additional bed days, patients with a length of stay of 7 days or over",
        "14_plus":"Number of additional bed days, patients with a length of stay of 14 days or over",
        "21_plus":"Number of additional bed days, patients with a length of stay of 21 days or over",
    }
    workbook_weekly = pd.DataFrame(index=weekly_workbook["Week commencing"])
    for threshold,column in weekly_columns.items():
        workbook_weekly[threshold] = weekly_workbook[column].map(safe_number).values
    workbook_weekly = workbook_weekly.sort_index()

    common_weeks = csv_weekly.index.intersection(workbook_weekly.index)
    if len(common_weeks) < 45:
        raise RuntimeError(f"Expected at least 45 shared national weekly snapshots; found {len(common_weeks)}")
    for threshold in weekly_columns:
        left = csv_weekly.loc[common_weeks,threshold].astype(float)
        right = workbook_weekly.loc[common_weeks,threshold].astype(float)
        mismatch = (left - right).abs() > 0.000001
        if mismatch.any():
            date = mismatch[mismatch].index[0]
            raise RuntimeError(f"National weekly validation failed for {threshold} on {date.date()}: CSV {left.loc[date]} vs workbook {right.loc[date]}")

    return {
        "daily_dates_validated":len(common_dates),
        "weekly_snapshots_validated":len(common_weeks),
        "nctr_patient_days":int(round(csv_daily[NCTR].sum())),
        "discharges":int(round(csv_daily[DISCHARGED].sum())),
        "remaining_patient_days":int(round(csv_daily[REMAINING].sum())),
    }


# ============================================================
# 04. BUILD ONE NATIVE PUBLISHED GEOGRAPHY
# ============================================================
def build_geography(rows: pd.DataFrame,code: str,name: str,geography_type: str,region: str) -> dict[str,Any]:
    daily = rows.loc[rows["Metric"].isin(CORE_METRICS)].copy()
    daily_pivot = daily.pivot_table(index="Period",columns="Metric",values="Value numeric",aggfunc="sum").sort_index()

    for column in CORE_METRICS:
        if column not in daily_pivot:
            daily_pivot[column] = pd.NA

    nctr_sum = safe_number(daily_pivot[NCTR].sum(min_count=1))
    discharged_sum = safe_number(daily_pivot[DISCHARGED].sum(min_count=1))
    remaining_sum = safe_number(daily_pivot[REMAINING].sum(min_count=1))
    nctr_average = safe_number(daily_pivot[NCTR].mean())
    discharged_average = safe_number(daily_pivot[DISCHARGED].mean())
    remaining_average = safe_number(daily_pivot[REMAINING].mean())

    monthly = []
    for month_start in pd.date_range(START_DATE,END_DATE,freq="MS"):
        month_end = month_start + pd.offsets.MonthEnd(0)
        month_rows = daily_pivot.loc[daily_pivot.index.to_series().between(month_start,month_end)]
        monthly.append({
            "month":month_start.strftime("%Y-%m"),
            "label":month_start.strftime("%b %Y"),
            "nctr_average":rounded(safe_number(month_rows[NCTR].mean())),
            "discharged_total":None if month_rows[DISCHARGED].dropna().empty else int(round(month_rows[DISCHARGED].sum())),
            "discharged_average":rounded(safe_number(month_rows[DISCHARGED].mean())),
            "remaining_average":rounded(safe_number(month_rows[REMAINING].mean())),
            "remaining_percent":percentage(safe_number(month_rows[REMAINING].sum(min_count=1)),safe_number(month_rows[NCTR].sum(min_count=1))),
            "days_recorded":int(month_rows[NCTR].notna().sum()),
        })

    additional = rows.loc[rows["Metric"].map(lambda value: additional_threshold(str(value)) is not None)].copy()
    additional["Threshold"] = additional["Metric"].map(lambda value: additional_threshold(str(value)))
    additional_summary = {}
    for threshold in ("7_plus","14_plus","21_plus"):
        values = additional.loc[additional["Threshold"].eq(threshold),"Value numeric"].dropna().astype(float)
        additional_summary[threshold] = {
            "average_weekly_snapshot":rounded(safe_number(values.mean())),
            "latest_snapshot":rounded(safe_number(values.iloc[-1])) if len(values) else None,
            "snapshots":int(len(values)),
        }

    post_change = rows.loc[rows["Period"].ge(POST_CHANGE_START)].copy()
    destinations = post_change.loc[post_change["Metric Group"].eq("Discharge destination")].copy()
    destinations["Pathway"] = destinations["Metric"].map(lambda value: pathway_number(str(value)))
    pathway_totals = {}
    for pathway in ("0","1","2","3"):
        value = destinations.loc[destinations["Pathway"].eq(pathway),"Value numeric"].sum(min_count=1)
        pathway_totals[f"pathway_{pathway}"] = None if pd.isna(value) else int(round(float(value)))

    destination_details = []
    for destination,values in destinations.groupby("Metric",dropna=False):
        total = values["Value numeric"].sum(min_count=1)
        if pd.isna(total):
            continue
        destination_details.append({"destination":str(destination),"count":int(round(float(total)))})
    destination_details.sort(key=lambda item:item["count"],reverse=True)

    delays = post_change.loc[post_change["Metric Group"].eq("Delay reason")].copy()
    delay_details = []
    for reason,values in delays.groupby("Metric",dropna=False):
        numeric = values["Value numeric"].dropna().astype(float)
        if numeric.empty:
            continue
        delay_details.append({
            "reason":str(reason),
            "mean_published_monthly_average":rounded(safe_number(numeric.mean())),
            "months":int(len(numeric)),
        })
    delay_details.sort(key=lambda item:item["mean_published_monthly_average"] or 0,reverse=True)

    return {
        "code":code,
        "name":name,
        "type":geography_type,
        "region":region,
        "period":PERIOD,
        "metrics":{
            "discharge-ready":metric(
                "Average daily patients no longer meeting the criteria to reside",
                "average",
                average=rounded(nctr_average),
                patient_days=None if nctr_sum is None else int(round(nctr_sum)),
            ),
            "actual-discharge":metric(
                "Patients discharged after no longer meeting the criteria to reside",
                "count",
                count=None if discharged_sum is None else int(round(discharged_sum)),
                average_daily=rounded(discharged_average),
            ),
            "delayed-discharge":metric(
                "Average daily patients remaining in hospital after no longer meeting the criteria to reside",
                "percent",
                percent=percentage(remaining_sum,nctr_sum),
                average=rounded(remaining_average),
                denominator_average=rounded(nctr_average),
                patient_days=None if remaining_sum is None else int(round(remaining_sum)),
            ),
            "acute-additional-bed-days":metric(
                "Average weekly additional bed days for patients with a length of stay of 7 days or over",
                "days",
                days=additional_summary["7_plus"]["average_weekly_snapshot"],
                snapshots=additional_summary["7_plus"]["snapshots"],
            ),
        },
        "daily":{
            "nctr_average":rounded(nctr_average),
            "nctr_patient_days":None if nctr_sum is None else int(round(nctr_sum)),
            "discharged_total":None if discharged_sum is None else int(round(discharged_sum)),
            "discharged_average":rounded(discharged_average),
            "remaining_average":rounded(remaining_average),
            "remaining_patient_days":None if remaining_sum is None else int(round(remaining_sum)),
            "remaining_percent":percentage(remaining_sum,nctr_sum),
        },
        "additional_bed_days":additional_summary,
        "post_change_destinations":{
            "period":"June 2024 to March 2025",
            "pathway_totals":pathway_totals,
            "details":destination_details,
        },
        "post_change_delay_reasons":{
            "period":"June 2024 to March 2025",
            "details":delay_details,
        },
        "monthly":monthly,
        "coverage":{
            "nctr_days":int(daily_pivot[NCTR].notna().sum()),
            "discharge_days":int(daily_pivot[DISCHARGED].notna().sum()),
            "remaining_days":int(daily_pivot[REMAINING].notna().sum()),
            "additional_bed_day_snapshots":additional_summary["7_plus"]["snapshots"],
        },
    }


# ============================================================
# 05. BUILD, VALIDATE AND WRITE THE COMPACT PUBLIC FILE
# ============================================================
def main() -> None:
    frame = download_all_months()
    daily_workbook,weekly_workbook = national_time_series()
    national_validation = validate_national(frame,daily_workbook,weekly_workbook)

    national_rows = frame.loc[frame["Level"].eq("National")].copy()
    england = build_geography(national_rows,"ENGLAND","England","National","England")

    icbs = []
    icb_rows = frame.loc[frame["Level"].eq("ICB")].copy()
    for code,rows in icb_rows.groupby("Org Code",dropna=False):
        code = str(code).strip()
        if not code or code in ("nan","[z]"):
            continue
        name = clean_name(rows["Org Name"].dropna().iloc[0],"ICB")
        region = clean_name(rows["Region"].dropna().iloc[0],"Region")
        icbs.append(build_geography(rows,code,name,"ICB",region))
    icbs.sort(key=lambda item:item["name"])

    providers = []
    provider_rows = frame.loc[frame["Level"].str.upper().eq("PROVIDER")].copy()
    for code,rows in provider_rows.groupby("Org Code",dropna=False):
        code = str(code).strip()
        if not code or code in ("nan","[z]"):
            continue
        name = clean_name(rows["Org Name"].dropna().iloc[0],"Provider")
        region = clean_name(rows["Region"].dropna().iloc[0],"Region")
        record = build_geography(rows,code,name,"Provider",region)
        if record["daily"]["nctr_average"] is not None:
            providers.append(record)
    providers.sort(key=lambda item:item["name"])

    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 ICBs; found {len(icbs)}")
    if len(providers) < 100:
        raise RuntimeError(f"Expected at least 100 acute providers; found {len(providers)}")
    if england["coverage"]["nctr_days"] != 365 or england["coverage"]["discharge_days"] != 365 or england["coverage"]["remaining_days"] != 365:
        raise RuntimeError(f"England daily coverage was incomplete: {england['coverage']}")
    if england["daily"]["nctr_patient_days"] != national_validation["nctr_patient_days"]:
        raise RuntimeError("England NCTR patient-days did not reconcile to the independently validated daily series.")
    if england["daily"]["discharged_total"] != national_validation["discharges"]:
        raise RuntimeError("England discharge total did not reconcile to the independently validated daily series.")
    if england["daily"]["remaining_patient_days"] != national_validation["remaining_patient_days"]:
        raise RuntimeError("England remaining patient-days did not reconcile to the independently validated daily series.")

    output = {
        "publication":"Acute Discharge Situation Report, 2024-25",
        "period":PERIOD,
        "source":"NHS England Acute Discharge Situation Report",
        "source_url":PUBLICATION_URL,
        "source_files":{label:url for label,_,_,url in MONTHS},
        "national_timeseries_url":TIMESERIES_URL,
        "icb_count":len(icbs),
        "provider_count":len(providers),
        "england":england,
        "icbs":icbs,
        "providers":providers,
        "validation":national_validation,
        "method":{
            "daily":"Direct published daily values. NCTR and remaining are daily stocks and are shown as annual daily averages; discharges are events and are summed across the year.",
            "weekly":"Additional bed days are weekly snapshot stocks and are averaged across published snapshots, not summed.",
            "changed_definitions":"Discharge destinations and delay reasons use June 2024 to March 2025 only because definitions changed on 27 May 2024.",
            "validation":"Every England daily core value and every available weekly additional-bed-day value is matched date-by-date to the independent national time-series workbook.",
            "geography":"Direct published England, ICB and acute-provider rows; no provider-to-ICB attribution is inferred.",
        },
        "notes":[
            "Management information collected rapidly with minimal validation.",
            "The collection covers adult inpatients in acute trusts with a type 1 A&E department and excludes paediatrics, maternity, deceased patients, mental-health trusts and specialised trusts outside scope.",
            "Daily NCTR and not-discharged values count occupied daily positions, not unique patients; their annual sums are patient-days.",
            "Delay reasons are means of the ten published monthly average values from June 2024 to March 2025.",
            "A lower remaining percentage is not automatically better without considering case mix, discharge safety and reporting completeness.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs and {len(providers)} providers")
    print(json.dumps({"england":england["daily"],"validation":national_validation},indent=2))


if __name__ == "__main__":
    main()
