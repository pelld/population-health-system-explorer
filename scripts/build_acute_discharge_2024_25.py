# ============================================================
# 00. ACUTE DISCHARGE SITREP — 2024-25
# ============================================================
# England uses the latest published national time-series workbook. ICB and provider
# comparisons use the twelve published organisation CSV files because the national
# workbook has no lower-geography rows. Any revision differences are retained in the
# output rather than silently forcing the organisation files to equal England.

from __future__ import annotations

import io
import json
import re
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
WEEKLY_COLUMNS = {
    "7_plus":"Number of additional bed days, patients with a length of stay of 7 days or over",
    "14_plus":"Number of additional bed days, patients with a length of stay of 14 days or over",
    "21_plus":"Number of additional bed days, patients with a length of stay of 21 days or over",
}


# ============================================================
# 01. GENERIC CLEANING HELPERS
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
    return re.sub(r"\s+"," ",value).strip().lower()


def additional_threshold(metric_name: str) -> str | None:
    value = canonical(metric_name)
    if "additional bed days" not in value:
        return None
    if "21" in value:
        return "21_plus"
    if "14" in value:
        return "14_plus"
    if "7" in value:
        return "7_plus"
    return None


def pathway_number(metric_name: str) -> str | None:
    match = re.match(r"pathway\s+([0-3])",canonical(metric_name))
    return match.group(1) if match else None


def metric(label: str,display: str,**values: Any) -> dict[str,Any]:
    return {"label":label,"display":display,**values}


# ============================================================
# 02. DOWNLOAD THE TWELVE ORGANISATION FILES
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
    frame = frame.loc[frame["Period"].between(pd.Timestamp(start),pd.Timestamp(end),inclusive="both")].copy()
    return frame


def download_all_months() -> pd.DataFrame:
    frame = pd.concat([download_month(*month) for month in MONTHS],ignore_index=True)
    return frame.loc[frame["Period"].between(START_DATE,END_DATE,inclusive="both")].copy()


# ============================================================
# 03. READ THE CURRENT REVISED NATIONAL TIME SERIES
# ============================================================
def workbook_rows(sheet,header_row: int) -> pd.DataFrame:
    headers = [cell.value for cell in sheet[header_row]]
    records = []
    for row in sheet.iter_rows(min_row=header_row + 1,values_only=True):
        if not any(value not in (None,"") for value in row):
            continue
        records.append({headers[index]:value for index,value in enumerate(row) if index < len(headers) and headers[index] not in (None,"")})
    return pd.DataFrame(records)


def read_national_series() -> tuple[pd.DataFrame,pd.DataFrame]:
    response = requests.get(TIMESERIES_URL,timeout=300)
    response.raise_for_status()
    workbook = openpyxl.load_workbook(io.BytesIO(response.content),read_only=True,data_only=True)

    daily = workbook_rows(workbook["Daily Series"],5)
    weekly = workbook_rows(workbook["Weekly Series"],7)
    daily["Date"] = pd.to_datetime(daily["Date"],errors="coerce")
    weekly["Week commencing"] = pd.to_datetime(weekly["Week commencing"],errors="coerce")
    daily = daily.loc[daily["Date"].between(START_DATE,END_DATE,inclusive="both")].copy()
    weekly = weekly.loc[weekly["Week commencing"].between(START_DATE,END_DATE,inclusive="both")].copy()

    for column in CORE_METRICS:
        daily[column] = daily[column].map(safe_number)
    for column in WEEKLY_COLUMNS.values():
        weekly[column] = weekly[column].map(safe_number)
    return daily,weekly


def validate_revised_national_series(daily: pd.DataFrame,weekly: pd.DataFrame) -> None:
    if len(daily) != 365:
        raise RuntimeError(f"Expected 365 revised national daily rows; found {len(daily)}")
    if daily[list(CORE_METRICS)].isna().any().any():
        raise RuntimeError("The revised national daily series has missing core values in 2024-25.")

    arithmetic_gap = (daily[NCTR] - daily[DISCHARGED] - daily[REMAINING]).abs()
    if (arithmetic_gap > 0.000001).any():
        row = daily.loc[arithmetic_gap.idxmax()]
        raise RuntimeError(f"National NCTR arithmetic did not reconcile on {row['Date']}: {row[NCTR]} != {row[DISCHARGED]} + {row[REMAINING]}")

    if len(weekly) < 45:
        raise RuntimeError(f"Expected at least 45 revised national weekly rows; found {len(weekly)}")
    if weekly[list(WEEKLY_COLUMNS.values())].isna().any().any():
        raise RuntimeError("The revised national weekly series has missing additional-bed-day values in 2024-25.")


def synthetic_england_rows(national_csv: pd.DataFrame,daily: pd.DataFrame,weekly: pd.DataFrame) -> pd.DataFrame:
    records = []
    common = {
        "Level":"National","Region":"[z]","ICB":"[z]","Org Code":"ENG",
        "Org Name":"ENGLAND (Type 1 Trusts)","Source month":"Revised national time series","Source URL":TIMESERIES_URL,
    }

    for _,row in daily.iterrows():
        for metric_name in CORE_METRICS:
            records.append({
                **common,"Period":row["Date"],"Metric":metric_name,"Metric Type":"Daily metric",
                "Metric Group":{NCTR:"NCTR",DISCHARGED:"Discharges",REMAINING:"NCTR not discharged"}[metric_name],
                "Value":row[metric_name],"Value numeric":row[metric_name],
            })

    for _,row in weekly.iterrows():
        for threshold,column in WEEKLY_COLUMNS.items():
            records.append({
                **common,"Period":row["Week commencing"],"Metric":column,"Metric Type":"Weekly snapshot metric",
                "Metric Group":"Additional bed days lost","Value":row[column],"Value numeric":row[column],
            })

    detailed = national_csv.loc[
        national_csv["Period"].ge(POST_CHANGE_START)
        & national_csv["Metric Group"].isin(["Discharge destination","Delay reason"])
    ].copy()
    return pd.concat([pd.DataFrame(records),detailed],ignore_index=True,sort=False)


def compare_national_sources(national_csv: pd.DataFrame,daily: pd.DataFrame,weekly: pd.DataFrame) -> dict[str,Any]:
    output: dict[str,Any] = {"daily":{},"weekly":{}}

    csv_daily = national_csv.loc[national_csv["Metric"].isin(CORE_METRICS)].pivot_table(
        index="Period",columns="Metric",values="Value numeric",aggfunc="sum"
    ).sort_index()
    revised_daily = daily.set_index("Date")[[*CORE_METRICS]].sort_index()
    dates = csv_daily.index.intersection(revised_daily.index)

    for metric_name in CORE_METRICS:
        difference = csv_daily.loc[dates,metric_name].astype(float) - revised_daily.loc[dates,metric_name].astype(float)
        output["daily"][metric_name] = {
            "dates_compared":len(dates),
            "dates_different":int((difference.abs() > 0.000001).sum()),
            "organisation_csv_minus_revised_total":rounded(float(difference.sum())),
        }

    csv_additional = national_csv.loc[national_csv["Metric"].map(lambda value: additional_threshold(str(value)) is not None)].copy()
    csv_additional["Threshold"] = csv_additional["Metric"].map(lambda value: additional_threshold(str(value)))
    csv_weekly = csv_additional.pivot_table(index="Period",columns="Threshold",values="Value numeric",aggfunc="sum").sort_index()
    revised_weekly = pd.DataFrame(index=weekly["Week commencing"])
    for threshold,column in WEEKLY_COLUMNS.items():
        revised_weekly[threshold] = weekly[column].values
    weeks = csv_weekly.index.intersection(revised_weekly.index)

    for threshold in WEEKLY_COLUMNS:
        difference = csv_weekly.loc[weeks,threshold].astype(float) - revised_weekly.loc[weeks,threshold].astype(float)
        output["weekly"][threshold] = {
            "snapshots_compared":len(weeks),
            "snapshots_different":int((difference.abs() > 0.000001).sum()),
            "organisation_csv_minus_revised_total":rounded(float(difference.sum())),
        }
    return output


# ============================================================
# 04. BUILD ONE PUBLISHED GEOGRAPHY
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
            "month":month_start.strftime("%Y-%m"),"label":month_start.strftime("%b %Y"),
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
    for threshold in WEEKLY_COLUMNS:
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
        if not pd.isna(total):
            destination_details.append({"destination":str(destination),"count":int(round(float(total)))})
    destination_details.sort(key=lambda item:item["count"],reverse=True)

    delay_details = []
    delays = post_change.loc[post_change["Metric Group"].eq("Delay reason")].copy()
    for reason,values in delays.groupby("Metric",dropna=False):
        numeric = values["Value numeric"].dropna().astype(float)
        if not numeric.empty:
            delay_details.append({
                "reason":str(reason),"mean_published_monthly_average":rounded(safe_number(numeric.mean())),"months":int(len(numeric)),
            })
    delay_details.sort(key=lambda item:item["mean_published_monthly_average"] or 0,reverse=True)

    return {
        "code":code,"name":name,"type":geography_type,"region":region,"period":PERIOD,
        "metrics":{
            "discharge-ready":metric("Average daily patients no longer meeting the criteria to reside","average",average=rounded(nctr_average),patient_days=None if nctr_sum is None else int(round(nctr_sum))),
            "actual-discharge":metric("Patients discharged after no longer meeting the criteria to reside","count",count=None if discharged_sum is None else int(round(discharged_sum)),average_daily=rounded(discharged_average)),
            "delayed-discharge":metric("Average daily patients remaining in hospital after no longer meeting the criteria to reside","percent",percent=percentage(remaining_sum,nctr_sum),average=rounded(remaining_average),denominator_average=rounded(nctr_average),patient_days=None if remaining_sum is None else int(round(remaining_sum))),
            "acute-additional-bed-days":metric("Average weekly additional bed days for patients with a length of stay of 7 days or over","days",days=additional_summary["7_plus"]["average_weekly_snapshot"],snapshots=additional_summary["7_plus"]["snapshots"]),
        },
        "daily":{
            "nctr_average":rounded(nctr_average),"nctr_patient_days":None if nctr_sum is None else int(round(nctr_sum)),
            "discharged_total":None if discharged_sum is None else int(round(discharged_sum)),"discharged_average":rounded(discharged_average),
            "remaining_average":rounded(remaining_average),"remaining_patient_days":None if remaining_sum is None else int(round(remaining_sum)),
            "remaining_percent":percentage(remaining_sum,nctr_sum),
        },
        "additional_bed_days":additional_summary,
        "post_change_destinations":{"period":"June 2024 to March 2025","pathway_totals":pathway_totals,"details":destination_details},
        "post_change_delay_reasons":{"period":"June 2024 to March 2025","details":delay_details},
        "monthly":monthly,
        "coverage":{
            "nctr_days":int(daily_pivot[NCTR].notna().sum()),"discharge_days":int(daily_pivot[DISCHARGED].notna().sum()),
            "remaining_days":int(daily_pivot[REMAINING].notna().sum()),"additional_bed_day_snapshots":additional_summary["7_plus"]["snapshots"],
        },
    }


# ============================================================
# 05. BUILD, VALIDATE AND WRITE THE PUBLIC FILE
# ============================================================
def main() -> None:
    organisation_frame = download_all_months()
    national_daily,national_weekly = read_national_series()
    validate_revised_national_series(national_daily,national_weekly)

    national_csv = organisation_frame.loc[organisation_frame["Level"].eq("National")].copy()
    england_rows = synthetic_england_rows(national_csv,national_daily,national_weekly)
    england = build_geography(england_rows,"ENGLAND","England","National","England")
    source_comparison = compare_national_sources(national_csv,national_daily,national_weekly)

    icbs = []
    for code,rows in organisation_frame.loc[organisation_frame["Level"].eq("ICB")].groupby("Org Code",dropna=False):
        code = str(code).strip()
        if code and code not in ("nan","[z]"):
            icbs.append(build_geography(rows,code,clean_name(rows["Org Name"].dropna().iloc[0],"ICB"),"ICB",clean_name(rows["Region"].dropna().iloc[0],"Region")))
    icbs.sort(key=lambda item:item["name"])

    providers = []
    provider_frame = organisation_frame.loc[organisation_frame["Level"].str.upper().eq("PROVIDER")]
    for code,rows in provider_frame.groupby("Org Code",dropna=False):
        code = str(code).strip()
        if not code or code in ("nan","[z]"):
            continue
        record = build_geography(rows,code,clean_name(rows["Org Name"].dropna().iloc[0],"Provider"),"Provider",clean_name(rows["Region"].dropna().iloc[0],"Region"))
        if record["daily"]["nctr_average"] is not None:
            providers.append(record)
    providers.sort(key=lambda item:item["name"])

    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 ICBs; found {len(icbs)}")
    if len(providers) < 100:
        raise RuntimeError(f"Expected at least 100 acute providers; found {len(providers)}")
    if england["coverage"]["nctr_days"] != 365 or england["coverage"]["discharge_days"] != 365 or england["coverage"]["remaining_days"] != 365:
        raise RuntimeError(f"Revised England daily coverage was incomplete: {england['coverage']}")
    if england["daily"]["nctr_patient_days"] != int(round(national_daily[NCTR].sum())):
        raise RuntimeError("England NCTR patient-days did not reconcile to the revised national series.")
    if england["daily"]["discharged_total"] != int(round(national_daily[DISCHARGED].sum())):
        raise RuntimeError("England discharges did not reconcile to the revised national series.")
    if england["daily"]["remaining_patient_days"] != int(round(national_daily[REMAINING].sum())):
        raise RuntimeError("England remaining patient-days did not reconcile to the revised national series.")

    output = {
        "publication":"Acute Discharge Situation Report, 2024-25","period":PERIOD,
        "source":"NHS England Acute Discharge Situation Report","source_url":PUBLICATION_URL,
        "source_files":{label:url for label,_,_,url in MONTHS},"national_timeseries_url":TIMESERIES_URL,
        "icb_count":len(icbs),"provider_count":len(providers),"england":england,"icbs":icbs,"providers":providers,
        "source_comparison":source_comparison,
        "validation":{
            "revised_national_daily_rows":len(national_daily),"revised_national_weekly_rows":len(national_weekly),
            "nctr_arithmetic_reconciled":True,"england_totals_use_latest_revised_national_series":True,
        },
        "method":{
            "england":"Latest revised national time-series workbook published 9 July 2026.",
            "icb_provider":"Direct rows from the twelve published 2024-25 organisation CSV files.",
            "daily":"NCTR and remaining are daily stocks shown as daily averages; discharges are events summed across the year.",
            "weekly":"Additional bed days are weekly snapshot stocks and are averaged, never summed.",
            "changed_definitions":"Destinations and delay reasons use June 2024 to March 2025 because definitions changed on 27 May 2024.",
            "geography":"Direct England, ICB and provider records; no provider-to-ICB attribution is inferred.",
        },
        "notes":[
            "The current revised national time series differs from some original monthly organisation-file values. England therefore uses the revised series; local comparisons retain their published organisation files and the differences are quantified in source_comparison.",
            "This is rapidly collected management information with minimal validation.",
            "Daily NCTR and remaining figures are occupied daily positions, not unique patients; their sums are patient-days.",
            "The collection covers adult inpatients in acute trusts with a type 1 A&E department and excludes paediatrics, maternity and organisations outside the published scope.",
            "A lower remaining percentage is not automatically safer or better without case-mix, discharge-safety and completeness checks.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs and {len(providers)} providers")
    print(json.dumps({"england":england["daily"],"source_comparison":source_comparison},indent=2))


if __name__ == "__main__":
    main()
