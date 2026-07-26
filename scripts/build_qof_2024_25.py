# ============================================================
# 00. QOF 2024-25 PUBLIC DATA BUILD
# ============================================================
# Downloads the official raw CSV ZIP, aggregates direct practice records to ICB
# and England, validates published headline totals, and writes compact JSON for
# prevalence, points achievement, indicator achievement and PCA comparisons.

from __future__ import annotations

import io
import json
import math
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/95/4708D7/QOF2425.zip"
PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/quality-and-outcomes-framework-achievement-prevalence-and-exceptions-data/2024-25"
TECHNICAL_URL = f"{PUBLICATION_URL}/technical-annex"
OUTPUT_MAIN = Path("public-data/qof-2024-25.json")
OUTPUT_PRACTICES = Path("public-data/qof-2024-25-practices.json")

EXPECTED = {
    "practice_count":6188,
    "icb_count":42,
    "indicator_count":76,
    "included_list_size":63766671,
    "practices_over_90_percent":5149,
    "new_depression_diagnoses":714592,
    "headline_prevalence":{"HYP":15.2,"DEP":14.3,"OB":13.9},
    "headline_pca":{"COPD":29.9,"SMOK":1.8},
}


# ============================================================
# 01. DOWNLOAD AND CLEANING HELPERS
# ============================================================
def read_csv(archive: zipfile.ZipFile, name: str) -> pd.DataFrame:
    return pd.read_csv(archive.open(name), dtype=str, low_memory=False, encoding="utf-8-sig")


def numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0.0)


def clean_name(value: Any) -> str:
    text = "" if value is None else str(value).strip()
    text = text.removeprefix("NHS ").replace(" Integrated Care Board", "")
    return text


def rounded(value: float | None, digits: int = 2) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return round(float(value), digits)


def percentage(numerator: float, denominator: float) -> float | None:
    return None if denominator <= 0 else rounded(100.0 * numerator / denominator)


# ============================================================
# 02. LOAD AND NORMALISE OFFICIAL FILES
# ============================================================
def load_source() -> dict[str, pd.DataFrame]:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        names = set(archive.namelist())
        achievement_names = sorted(name for name in names if name.startswith("ACHIEVEMENT_") and name.endswith("_2425.csv"))
        achievement = pd.concat((read_csv(archive, name) for name in achievement_names), ignore_index=True)
        return {
            "achievement":achievement,
            "indicators":read_csv(archive, "MAPPING_INDICATORS_2425.csv"),
            "geographies":read_csv(archive, "MAPPING_NHS_GEOGRAPHIES_2425.csv"),
            "organisations":read_csv(archive, "ORGANISATION_REFERENCE_2425.csv"),
            "prevalence":read_csv(archive, "PREVALENCE_2425.csv"),
            "validation":read_csv(archive, "PRACTICE_VALIDATION_OUTCOMES_2425.csv"),
        }


# ============================================================
# 03. BUILD PREVALENCE AND ACHIEVEMENT TABLES
# ============================================================
def prepare_tables(source: dict[str, pd.DataFrame]) -> dict[str, Any]:
    achievement = source["achievement"].copy()
    achievement["VALUE"] = numeric(achievement["VALUE"])
    achievement_wide = achievement.pivot_table(index=["PRACTICE_CODE","INDICATOR_CODE"], columns="MEASURE", values="VALUE", aggfunc="sum", fill_value=0).reset_index()

    for column in ("ACHIEVED_POINTS","NUMERATOR","DENOMINATOR","PCAS","REGISTER","NEWLY_DIAGNOSED"):
        if column not in achievement_wide:
            achievement_wide[column] = 0.0

    prevalence = source["prevalence"].copy()
    prevalence["REGISTER"] = numeric(prevalence["REGISTER"])
    prevalence["PRACTICE_LIST_SIZE"] = numeric(prevalence["PRACTICE_LIST_SIZE"])

    geographies = source["geographies"].drop_duplicates("PRACTICE_CODE").copy()
    organisations = source["organisations"].drop_duplicates("PRACTICE_CODE").copy()
    organisations["REVISED_MAX_POINTS"] = numeric(organisations["REVISED_MAX_POINTS"])

    indicators = source["indicators"].drop_duplicates("INDICATOR_CODE").copy()
    indicator_to_group = dict(zip(indicators["INDICATOR_CODE"], indicators["GROUP_CODE"]))
    achievement_wide["GROUP_CODE"] = achievement_wide["INDICATOR_CODE"].map(indicator_to_group)

    practice_points = achievement_wide.groupby("PRACTICE_CODE", as_index=False)["ACHIEVED_POINTS"].sum().merge(organisations, on="PRACTICE_CODE", how="left")
    practice_points["ACHIEVEMENT_PERCENT"] = practice_points.apply(lambda row: percentage(row["ACHIEVED_POINTS"], row["REVISED_MAX_POINTS"]), axis=1)

    return {
        "achievement":achievement_wide,
        "prevalence":prevalence,
        "geographies":geographies,
        "organisations":organisations,
        "indicators":indicators,
        "practice_points":practice_points,
        "validation_flags":source["validation"],
    }


# ============================================================
# 04. AGGREGATE A SET OF PRACTICES
# ============================================================
def prevalence_metrics(prevalence: pd.DataFrame) -> dict[str, dict[str, Any]]:
    grouped = prevalence.groupby("GROUP_CODE", as_index=False).agg(register=("REGISTER","sum"), denominator=("PRACTICE_LIST_SIZE","sum"))
    return {
        row.GROUP_CODE:{
            "register":int(round(row.register)),
            "denominator":int(round(row.denominator)),
            "percent":percentage(row.register, row.denominator),
        }
        for row in grouped.itertuples(index=False)
    }


def indicator_metrics(achievement: pd.DataFrame) -> dict[str, dict[str, Any]]:
    grouped = achievement.groupby("INDICATOR_CODE", as_index=False).agg(
        achieved_points=("ACHIEVED_POINTS","sum"),
        numerator=("NUMERATOR","sum"),
        denominator=("DENOMINATOR","sum"),
        pcas=("PCAS","sum"),
        register=("REGISTER","sum"),
        newly_diagnosed=("NEWLY_DIAGNOSED","sum"),
    )
    output = {}
    for row in grouped.itertuples(index=False):
        denominator_plus_pcas = row.denominator + row.pcas
        output[row.INDICATOR_CODE] = {
            "achieved_points":rounded(row.achieved_points),
            "numerator":int(round(row.numerator)),
            "denominator":int(round(row.denominator)),
            "pcas":int(round(row.pcas)),
            "register":int(round(row.register)),
            "newly_diagnosed":int(round(row.newly_diagnosed)),
            "underlying_achievement_percent":percentage(row.numerator, row.denominator),
            "pca_percent":percentage(row.pcas, denominator_plus_pcas),
            "intervention_percent":percentage(row.numerator, denominator_plus_pcas),
        }
    return output


def build_geography(code: str, name: str, geography_type: str, practice_codes: set[str], tables: dict[str, Any]) -> dict[str, Any]:
    prevalence = tables["prevalence"][tables["prevalence"]["PRACTICE_CODE"].isin(practice_codes)]
    achievement = tables["achievement"][tables["achievement"]["PRACTICE_CODE"].isin(practice_codes)]
    points = tables["practice_points"][tables["practice_points"]["PRACTICE_CODE"].isin(practice_codes)]
    achieved_points = float(points["ACHIEVED_POINTS"].sum())
    maximum_points = float(points["REVISED_MAX_POINTS"].sum())

    return {
        "code":code,
        "name":name,
        "type":geography_type,
        "practice_count":len(practice_codes),
        "overall_points":{
            "achieved":rounded(achieved_points),
            "available":rounded(maximum_points),
            "percent":percentage(achieved_points, maximum_points),
            "practices_over_90_percent":int((points["ACHIEVEMENT_PERCENT"] > 90).sum()),
        },
        "prevalence":prevalence_metrics(prevalence),
        "indicators":indicator_metrics(achievement),
    }


# ============================================================
# 05. BUILD COMPACT PRACTICE RECORDS
# ============================================================
def build_practices(tables: dict[str, Any]) -> list[dict[str, Any]]:
    geographies = tables["geographies"].set_index("PRACTICE_CODE")
    points = tables["practice_points"].set_index("PRACTICE_CODE")
    flagged = set(tables["validation_flags"]["PRACTICE_CODE"].dropna().astype(str))
    prevalence_by_practice = {code:prevalence_metrics(frame) for code,frame in tables["prevalence"].groupby("PRACTICE_CODE")}
    indicators_by_practice = {code:indicator_metrics(frame) for code,frame in tables["achievement"].groupby("PRACTICE_CODE")}
    practices = []

    for practice_code,row in geographies.iterrows():
        point_row = points.loc[practice_code]
        practices.append({
            "code":practice_code,
            "name":str(row["PRACTICE_NAME"]),
            "icb_code":str(row["ICB_ODS_CODE"]),
            "icb_name":clean_name(row["ICB_NAME"]),
            "pcn_code":str(row["PCN_ODS_CODE"]),
            "pcn_name":str(row["PCN_NAME"]),
            "validation_flag":practice_code in flagged,
            "overall_points":{
                "achieved":rounded(float(point_row["ACHIEVED_POINTS"])),
                "available":rounded(float(point_row["REVISED_MAX_POINTS"])),
                "percent":rounded(float(point_row["ACHIEVEMENT_PERCENT"])),
            },
            "prevalence":prevalence_by_practice.get(practice_code,{}),
            "indicators":indicators_by_practice.get(practice_code,{}),
        })

    return sorted(practices, key=lambda item:(item["name"],item["code"]))


# ============================================================
# 06. HARD VALIDATION AGAINST PUBLISHED HEADLINES
# ============================================================
def validate(england: dict[str, Any], icbs: list[dict[str, Any]], practices: list[dict[str, Any]], tables: dict[str, Any]) -> dict[str, Any]:
    if len(practices) != EXPECTED["practice_count"]:
        raise RuntimeError(f"Expected 6,188 practices; found {len(practices)}")
    if len(icbs) != EXPECTED["icb_count"]:
        raise RuntimeError(f"Expected 42 ICBs; found {len(icbs)}")
    if len(tables["indicators"]) != EXPECTED["indicator_count"]:
        raise RuntimeError(f"Expected 76 indicators; found {len(tables['indicators'])}")

    total_list_rows = tables["prevalence"][tables["prevalence"]["PATIENT_LIST_TYPE"].eq("TOTAL")]
    included_list_size = int(round(total_list_rows.groupby("PRACTICE_CODE")["PRACTICE_LIST_SIZE"].max().sum()))
    if included_list_size != EXPECTED["included_list_size"]:
        raise RuntimeError(f"Published included list size changed: {included_list_size}")

    over_90 = england["overall_points"]["practices_over_90_percent"]
    if over_90 != EXPECTED["practices_over_90_percent"]:
        raise RuntimeError(f"Published practices over 90% changed: {over_90}")

    depression_new = england["indicators"]["DEP004"]["newly_diagnosed"]
    if depression_new != EXPECTED["new_depression_diagnoses"]:
        raise RuntimeError(f"Published newly diagnosed depression count changed: {depression_new}")

    for group_code,expected in EXPECTED["headline_prevalence"].items():
        actual = england["prevalence"][group_code]["percent"]
        if round(actual,1) != expected:
            raise RuntimeError(f"Published prevalence changed for {group_code}: {actual}")

    group_pca = tables["achievement"].groupby("GROUP_CODE", as_index=False).agg(denominator=("DENOMINATOR","sum"),pcas=("PCAS","sum"))
    group_pca["percent"] = group_pca.apply(lambda row: percentage(row.pcas, row.denominator + row.pcas), axis=1)
    group_pca_lookup = dict(zip(group_pca["GROUP_CODE"], group_pca["percent"]))
    for group_code,expected in EXPECTED["headline_pca"].items():
        actual = group_pca_lookup[group_code]
        if round(actual,1) != expected:
            raise RuntimeError(f"Published PCA rate changed for {group_code}: {actual}")

    return {
        "practice_count":len(practices),
        "icb_count":len(icbs),
        "indicator_count":len(tables["indicators"]),
        "included_list_size":included_list_size,
        "practices_over_90_percent":over_90,
        "new_depression_diagnoses":depression_new,
        "headline_prevalence_reconciled":len(EXPECTED["headline_prevalence"]),
        "headline_pca_reconciled":len(EXPECTED["headline_pca"]),
    }


# ============================================================
# 07. BUILD AND WRITE PUBLIC FILES
# ============================================================
def main() -> None:
    tables = prepare_tables(load_source())
    geographies = tables["geographies"]
    all_codes = set(geographies["PRACTICE_CODE"])
    england = build_geography("ENG", "England", "National", all_codes, tables)
    icbs = []

    for (icb_code,icb_name),frame in geographies.groupby(["ICB_ODS_CODE","ICB_NAME"]):
        icbs.append(build_geography(str(icb_code), clean_name(icb_name), "ICB", set(frame["PRACTICE_CODE"]), tables))
    icbs.sort(key=lambda item:item["name"])

    practices = build_practices(tables)
    validation = validate(england, icbs, practices, tables)
    groups = (
        tables["indicators"][["GROUP_CODE","GROUP_DESCRIPTION"]]
        .drop_duplicates()
        .sort_values(["GROUP_DESCRIPTION","GROUP_CODE"])
        .rename(columns={"GROUP_CODE":"code","GROUP_DESCRIPTION":"name"})
        .to_dict("records")
    )
    indicators = (
        tables["indicators"][["INDICATOR_CODE","INDICATOR_DESCRIPTION","INDICATOR_POINT_VALUE","GROUP_CODE","GROUP_DESCRIPTION","PATIENT_LIST_TYPE"]]
        .rename(columns={"INDICATOR_CODE":"code","INDICATOR_DESCRIPTION":"description","INDICATOR_POINT_VALUE":"points","GROUP_CODE":"group_code","GROUP_DESCRIPTION":"group_name","PATIENT_LIST_TYPE":"patient_list_type"})
        .sort_values(["group_name","code"])
        .to_dict("records")
    )

    shared = {
        "publication":"Quality and Outcomes Framework 2024-25",
        "period":"2024-25",
        "publisher":"NHS England",
        "source_url":PUBLICATION_URL,
        "raw_data_url":SOURCE_URL,
        "technical_url":TECHNICAL_URL,
        "native_geographies":["National","ICB","GP practice"],
        "method_notes":[
            "Recorded prevalence is the published QOF register divided by the relevant published practice-list denominator.",
            "England and ICB values are aggregated from the 6,188 included practices and validated against published national headlines.",
            "Underlying indicator achievement is numerator divided by denominator after personalised care adjustments.",
            "PCA rate is PCAs divided by denominator plus PCAs; patients receiving intervention uses the same full eligible denominator.",
            "QOF is an incentive framework covering selected indicators, not a complete measure of practice quality or population morbidity.",
            "Payment protection applies to some 2024-25 indicators, so achievement may not represent activity delivered during the year.",
            "Practices are mapped to 1 April 2025 ICB geography; this is registered-practice geography, not patient residence.",
            "Practice results must not be used as a league table.",
        ],
    }

    OUTPUT_MAIN.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_MAIN.write_text(json.dumps({**shared,"groups":groups,"indicators":indicators,"england":england,"icbs":icbs,"validation":validation}, separators=(",",":"), ensure_ascii=False), encoding="utf-8")
    OUTPUT_PRACTICES.write_text(json.dumps({**shared,"groups":groups,"indicators":indicators,"practices":practices,"validation":validation}, separators=(",",":"), ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_MAIN}: {len(icbs)} ICBs")
    print(f"Wrote {OUTPUT_PRACTICES}: {len(practices)} practices")
    print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
