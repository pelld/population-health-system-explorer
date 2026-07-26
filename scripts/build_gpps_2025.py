# ============================================================
# 00. GP PATIENT SURVEY — 2025 SELECTED EXPERIENCE MEASURES
# ============================================================
# Downloads the official weighted national, ICS and practice CSV files. Results
# remain direct published survey estimates; lower geographies are never summed to
# recreate England because each level is separately weighted.

from __future__ import annotations

import io
import json
import math
from pathlib import Path
from typing import Any
from urllib.parse import quote

import pandas as pd
import requests


PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/nhse-gp-patient-survey-results/2025"
TECHNICAL_URL = "https://www.gp-patient.co.uk/reporting-2025"
DOWNLOAD_BASE = "https://www.gp-patient.co.uk/FileDownload/Download?fileRedirect="
SOURCE_PATHS = {
    "national":"2025/survey-results/national-results/national-data-csv/GPPS_2025_National_data_(weighted)_(csv)_PUBLIC.csv",
    "ics":"2025/survey-results/ics-results/ics-data-csv/GPPS_2025_ICS_data_(weighted)_(csv)_PUBLIC.csv",
    "practice":"2025/survey-results/practice-results/practice-data-csv/GPPS_2025_Practice_data_(weighted)_(csv)_PUBLIC.csv",
}
OUTPUT_MAIN = Path("public-data/gpps-2025.json")
OUTPUT_PRACTICES = Path("public-data/gpps-2025-practices.json")

MEASURES = {
    "gpps-phone-access": {
        "stem":"localgpservicesphone",
        "label":"Easy to contact the GP practice by phone",
        "question":"Generally, how easy or difficult is it to contact your GP practice on the phone?",
        "summary":"Very easy or fairly easy among respondents who had tried.",
    },
    "gpps-website-access": {
        "stem":"localgpserviceswebsite",
        "label":"Easy to contact the GP practice using its website",
        "question":"Generally, how easy or difficult is it to contact your GP practice using their website?",
        "summary":"Very easy or fairly easy among respondents who had tried.",
    },
    "gpps-app-access": {
        "stem":"localgpservicesapp",
        "label":"Easy to contact the GP practice using the NHS App",
        "question":"Generally, how easy or difficult is it to contact your GP practice using the NHS App?",
        "summary":"Very easy or fairly easy among respondents who had tried.",
    },
    "gpps-reception-helpfulness": {
        "stem":"localgpservicesreception",
        "label":"Reception and administrative team were helpful",
        "question":"How helpful do you find the reception and administrative team at your GP practice?",
        "summary":"Very helpful or fairly helpful.",
    },
    "gpps-continuity": {
        "stem":"localgpservicesprefhpsee",
        "label":"Usually or always sees or speaks to preferred healthcare professional",
        "question":"How often do you get to see or speak to your preferred healthcare professional when you ask to?",
        "summary":"Always or almost always, or a lot of the time, among those with a preferred professional who had tried.",
    },
    "gpps-contact-experience": {
        "stem":"gpcontactoverall",
        "label":"Good overall experience of contacting the GP practice",
        "question":"Overall, how would you describe your experience of contacting your GP practice on this occasion?",
        "summary":"Very good or fairly good.",
    },
    "gpps-listened": {
        "stem":"lastgpapptlisten",
        "label":"Healthcare professional was good at listening",
        "question":"How good was the healthcare professional at listening to you?",
        "summary":"Very good or good.",
    },
    "gpps-care-concern": {
        "stem":"lastgpapptcare",
        "label":"Healthcare professional treated patient with care and concern",
        "question":"How good was the healthcare professional at treating you with care and concern?",
        "summary":"Very good or good.",
    },
}

EXPECTED = {
    "distributed":2721415,
    "received":702837,
    "response_rate":0.258261603,
    "icb_count":42,
    "practice_count":6215,
    "percentages":{
        "gpps-phone-access":0.529358519,
        "gpps-website-access":0.51247336,
        "gpps-app-access":0.490382879,
        "gpps-reception-helpfulness":0.83296691,
        "gpps-continuity":0.399515027,
        "gpps-contact-experience":0.696070511,
        "gpps-listened":0.868947638,
        "gpps-care-concern":0.855830288,
    },
}


# ============================================================
# 01. DOWNLOAD AND CLEANING HELPERS
# ============================================================
def source_url(path: str) -> str:
    return DOWNLOAD_BASE + quote(path,safe="")


def download_csv(path: str) -> pd.DataFrame:
    response = requests.get(source_url(path),timeout=300)
    response.raise_for_status()
    return pd.read_csv(io.BytesIO(response.content),dtype=str,low_memory=False,encoding="utf-8-sig")


def safe_number(value: Any) -> float | None:
    if value is None or (isinstance(value,float) and math.isnan(value)):
        return None
    text = str(value).strip()
    if text in ("","-","*",":","-98","-99"):
        return None
    try:
        number = float(text.replace(",",""))
    except ValueError:
        return None
    return None if number < 0 else number


def integer(value: Any) -> int | None:
    number = safe_number(value)
    return None if number is None else int(round(number))


def percent(value: Any) -> float | None:
    number = safe_number(value)
    return None if number is None else round(number * 100,2)


def clean_name(value: Any,suffix: str = "") -> str:
    text = "" if value is None else str(value).strip()
    if suffix and text.upper().endswith(suffix.upper()):
        text = text[: -len(suffix)].strip()
    words = text.title().split()
    replacements = {"Nhs":"NHS","Ics":"ICS","Pcn":"PCN","Gp":"GP","Cic":"CIC"}
    lower_words = {"And","Of","The","On","In","For","At","To"}
    output = []
    for index,word in enumerate(words):
        word = replacements.get(word,word)
        if index and word in lower_words:
            word = word.lower()
        output.append(word)
    return " ".join(output)


# ============================================================
# 02. BUILD DIRECT PUBLISHED SURVEY ESTIMATES
# ============================================================
def metric_from_row(row: pd.Series,node_id: str) -> dict[str,Any]:
    definition = MEASURES[node_id]
    stem = definition["stem"]
    estimate = percent(row.get(f"{stem}.pcteval"))
    lower = percent(row.get(f"{stem}.lowileval"))
    upper = percent(row.get(f"{stem}.hiwileval"))
    base = integer(row.get(f"{stem}.baseevaluw"))
    weighted_positive = safe_number(row.get(f"{stem}.counteval"))

    return {
        "label":definition["label"],
        "question":definition["question"],
        "summary_definition":definition["summary"],
        "display":"percent",
        "percent":estimate,
        "lower_95":lower,
        "upper_95":upper,
        "unweighted_base":base,
        "weighted_positive_count":None if weighted_positive is None else round(weighted_positive,2),
    }


def metrics_from_row(row: pd.Series) -> dict[str,dict[str,Any]]:
    return {node_id:metric_from_row(row,node_id) for node_id in MEASURES}


def build_england(row: pd.Series) -> dict[str,Any]:
    return {
        "code":"ENGLAND",
        "name":"England",
        "type":"National",
        "distributed":integer(row.get("distributed")),
        "received":integer(row.get("received")),
        "response_rate_percent":percent(row.get("resprate")),
        "metrics":metrics_from_row(row),
    }


def build_icb(row: pd.Series) -> dict[str,Any]:
    return {
        "code":str(row.get("ad_icscode") or "").strip(),
        "name":clean_name(row.get("ad_icsname")," INTEGRATED CARE SYSTEM"),
        "type":"ICB",
        "region":clean_name(row.get("ad_commissioningregionname")," COMMISSIONING REGION"),
        "distributed":integer(row.get("distributed")),
        "received":integer(row.get("received")),
        "response_rate_percent":percent(row.get("resprate")),
        "metrics":metrics_from_row(row),
    }


def build_practice(row: pd.Series) -> dict[str,Any]:
    return {
        "code":str(row.get("ad_practicecode") or "").strip(),
        "name":clean_name(row.get("ad_practicename")),
        "type":"Practice",
        "icb_code":str(row.get("ad_icscode") or "").strip(),
        "icb_name":clean_name(row.get("ad_icsname")," INTEGRATED CARE SYSTEM"),
        "pcn_code":str(row.get("ad_pcncode") or "").strip(),
        "pcn_name":clean_name(row.get("ad_pcnname")),
        "region":clean_name(row.get("ad_commissioningregionname")," COMMISSIONING REGION"),
        "distributed":integer(row.get("distributed")),
        "received":integer(row.get("received")),
        "response_rate_percent":percent(row.get("resprate")),
        "metrics":metrics_from_row(row),
    }


# ============================================================
# 03. HARD VALIDATION
# ============================================================
def validate(england: dict[str,Any],icbs: list[dict[str,Any]],practices: list[dict[str,Any]]) -> dict[str,Any]:
    if england["distributed"] != EXPECTED["distributed"] or england["received"] != EXPECTED["received"]:
        raise RuntimeError(f"Published England survey totals changed: {england['distributed']}, {england['received']}")
    if abs((england["response_rate_percent"] / 100) - EXPECTED["response_rate"]) > 0.00000001:
        raise RuntimeError(f"Published England response rate changed: {england['response_rate_percent']}")
    if len(icbs) != EXPECTED["icb_count"]:
        raise RuntimeError(f"Expected 42 2025 ICS/ICB rows; found {len(icbs)}")
    if len(practices) != EXPECTED["practice_count"]:
        raise RuntimeError(f"Expected 6,215 practice rows; found {len(practices)}")

    for node_id,expected in EXPECTED["percentages"].items():
        actual = england["metrics"][node_id]["percent"]
        if actual is None or abs((actual / 100) - expected) > 0.00000001:
            raise RuntimeError(f"Published England value changed for {node_id}: {actual}")

    invalid_intervals = 0
    for geography in [england,*icbs,*practices]:
        for metric in geography["metrics"].values():
            value,lower,upper = metric["percent"],metric["lower_95"],metric["upper_95"]
            if value is None:
                continue
            if not 0 <= value <= 100:
                raise RuntimeError(f"Invalid GPPS percentage {value} for {geography['code']}")
            if lower is not None and upper is not None and not lower <= value <= upper:
                invalid_intervals += 1
    if invalid_intervals:
        raise RuntimeError(f"Found {invalid_intervals} estimates outside their published confidence intervals")

    return {
        "england_direct_file_validated":True,
        "national_values_reconciled":len(EXPECTED["percentages"]),
        "icb_count":len(icbs),
        "practice_count":len(practices),
        "lower_geographies_summed_to_england":False,
    }


# ============================================================
# 04. WRITE COMPACT PUBLIC FILES
# ============================================================
def main() -> None:
    national_frame = download_csv(SOURCE_PATHS["national"])
    icb_frame = download_csv(SOURCE_PATHS["ics"])
    practice_frame = download_csv(SOURCE_PATHS["practice"])

    england = build_england(national_frame.iloc[0])
    icbs = sorted((build_icb(row) for _,row in icb_frame.iterrows()),key=lambda item:item["name"])
    practices = sorted((build_practice(row) for _,row in practice_frame.iterrows()),key=lambda item:(item["name"],item["code"]))
    validation = validate(england,icbs,practices)

    shared = {
        "publication":"GP Patient Survey 2025",
        "period":"2025 survey",
        "publisher":"NHS England / Ipsos",
        "source_url":PUBLICATION_URL,
        "technical_url":TECHNICAL_URL,
        "native_geographies":["National","ICS/ICB","GP practice"],
        "method_notes":[
            "All percentages are direct published weighted survey estimates.",
            "The national result is not reconstructed by summing or averaging ICBs or practices.",
            "The displayed base is the published unweighted number answering the evaluative question.",
            "Results based on fewer than 10 unweighted responses are suppressed in the source data.",
            "Practice and ICB results include 95% confidence intervals and should not be used as league tables.",
            "Practices are mapped to the commissioning ICS/ICB at the end of fieldwork; this is not necessarily patient residence.",
            "The 2025 survey belongs to the new time series beginning in 2024.",
        ],
    }

    main_output = {
        **shared,
        "icb_count":len(icbs),
        "practice_count":len(practices),
        "england":england,
        "icbs":icbs,
        "validation":validation,
    }
    practice_output = {
        **shared,
        "practice_count":len(practices),
        "practices":practices,
    }

    OUTPUT_MAIN.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_MAIN.write_text(json.dumps(main_output,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
    OUTPUT_PRACTICES.write_text(json.dumps(practice_output,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_MAIN}: {len(icbs)} ICBs")
    print(f"Wrote {OUTPUT_PRACTICES}: {len(practices)} practices")
    print(json.dumps({"england":england,"validation":validation},indent=2))


if __name__ == "__main__":
    main()
