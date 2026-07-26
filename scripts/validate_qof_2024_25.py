# ============================================================
# 00. HARD VALIDATION OF GENERATED QOF 2024-25 DATA
# ============================================================
# Confirms fixed published headlines and requires every displayed condition-group
# and indicator count to reconcile exactly from the 42 ICB records to England.
# Practice prevalence and points must also reconcile to the same England totals.

from __future__ import annotations

import json
import math
from pathlib import Path


MAIN_PATH = Path("public-data/qof-2024-25.json")
PRACTICE_PATH = Path("public-data/qof-2024-25-practices.json")

EXPECTED = {
    "practice_count":6188,
    "icb_count":42,
    "indicator_count":76,
    "included_list_size":63766671,
    "practices_over_90_percent":5149,
    "new_depression_diagnoses":714592,
    "headline_prevalence":{"HYP":15.2,"DEP":14.3,"OB":13.9},
}


# ============================================================
# 01. NUMERIC COMPARISON HELPERS
# ============================================================
def close(actual: float, expected: float, tolerance: float = 0.011) -> bool:
    return math.isclose(float(actual),float(expected),abs_tol=tolerance,rel_tol=0.0)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def sum_field(records: list[dict], section: str, key: str, field: str) -> float:
    return sum(float(record.get(section,{}).get(key,{}).get(field,0) or 0) for record in records)


# ============================================================
# 02. VALIDATE FIXED PUBLISHED HEADLINES
# ============================================================
def validate_headlines(main: dict, practices: dict) -> None:
    validation = main["validation"]
    england = main["england"]

    require(len(main["icbs"]) == EXPECTED["icb_count"],"Expected 42 ICB records.")
    require(len(practices["practices"]) == EXPECTED["practice_count"],"Expected 6,188 practice records.")
    require(len(main["indicators"]) == EXPECTED["indicator_count"],"Expected 76 QOF indicators.")
    require(validation["included_list_size"] == EXPECTED["included_list_size"],"Included list size no longer matches the publication.")
    require(england["overall_points"]["practices_over_90_percent"] == EXPECTED["practices_over_90_percent"],"Practices above 90% no longer match the publication.")
    require(england["indicators"]["DEP004"]["newly_diagnosed"] == EXPECTED["new_depression_diagnoses"],"New depression diagnoses no longer match the publication.")

    for group_code,expected in EXPECTED["headline_prevalence"].items():
        actual = england["prevalence"][group_code]["percent"]
        require(round(float(actual),1) == expected,f"Published prevalence changed for {group_code}: {actual}")


# ============================================================
# 03. RECONCILE EVERY CONDITION GROUP
# ============================================================
def validate_prevalence(main: dict, practices: dict) -> int:
    england = main["england"]
    icbs = main["icbs"]
    practice_records = practices["practices"]
    count = 0

    for group_code,metric in england["prevalence"].items():
        england_register = int(metric["register"])
        england_denominator = int(metric["denominator"])
        icb_register = round(sum_field(icbs,"prevalence",group_code,"register"))
        icb_denominator = round(sum_field(icbs,"prevalence",group_code,"denominator"))
        practice_register = round(sum_field(practice_records,"prevalence",group_code,"register"))
        practice_denominator = round(sum_field(practice_records,"prevalence",group_code,"denominator"))

        require(icb_register == england_register,f"ICB register total does not reconcile for {group_code}.")
        require(icb_denominator == england_denominator,f"ICB denominator does not reconcile for {group_code}.")
        require(practice_register == england_register,f"Practice register total does not reconcile for {group_code}.")
        require(practice_denominator == england_denominator,f"Practice denominator does not reconcile for {group_code}.")

        recalculated = None if england_denominator == 0 else round(100 * england_register / england_denominator,2)
        require(recalculated == metric["percent"],f"England prevalence percentage does not recalculate for {group_code}.")
        count += 1

    return count


# ============================================================
# 04. RECONCILE ALL 76 INDICATORS
# ============================================================
def validate_indicators(main: dict) -> int:
    england = main["england"]
    icbs = main["icbs"]
    count = 0
    count_fields = ("numerator","denominator","pcas","register","newly_diagnosed")

    for indicator_code,metric in england["indicators"].items():
        for field in count_fields:
            icb_total = round(sum_field(icbs,"indicators",indicator_code,field))
            require(icb_total == int(metric[field]),f"ICB {field} does not reconcile for {indicator_code}.")

        icb_points = sum_field(icbs,"indicators",indicator_code,"achieved_points")
        require(close(icb_points,metric["achieved_points"]),f"ICB achieved points do not reconcile for {indicator_code}.")

        numerator = int(metric["numerator"])
        denominator = int(metric["denominator"])
        pcas = int(metric["pcas"])
        full_denominator = denominator + pcas
        underlying = None if denominator == 0 else round(100 * numerator / denominator,2)
        pca_rate = None if full_denominator == 0 else round(100 * pcas / full_denominator,2)
        intervention = None if full_denominator == 0 else round(100 * numerator / full_denominator,2)

        require(underlying == metric["underlying_achievement_percent"],f"Underlying achievement does not recalculate for {indicator_code}.")
        require(pca_rate == metric["pca_percent"],f"PCA rate does not recalculate for {indicator_code}.")
        require(intervention == metric["intervention_percent"],f"Intervention rate does not recalculate for {indicator_code}.")
        count += 1

    require(count == EXPECTED["indicator_count"],f"Expected 76 reconciled indicators; found {count}.")
    return count


# ============================================================
# 05. RECONCILE OVERALL POINTS
# ============================================================
def validate_points(main: dict, practices: dict) -> None:
    england = main["england"]["overall_points"]
    icbs = main["icbs"]
    practice_records = practices["practices"]

    icb_achieved = sum(float(record["overall_points"]["achieved"]) for record in icbs)
    icb_available = sum(float(record["overall_points"]["available"]) for record in icbs)
    practice_achieved = sum(float(record["overall_points"]["achieved"]) for record in practice_records)
    practice_available = sum(float(record["overall_points"]["available"]) for record in practice_records)

    require(close(icb_achieved,england["achieved"]),"ICB achieved points do not reconcile to England.")
    require(close(icb_available,england["available"]),"ICB available points do not reconcile to England.")
    require(close(practice_achieved,england["achieved"]),"Practice achieved points do not reconcile to England.")
    require(close(practice_available,england["available"]),"Practice available points do not reconcile to England.")

    recalculated = round(100 * float(england["achieved"]) / float(england["available"]),2)
    require(recalculated == england["percent"],"England overall points percentage does not recalculate.")


# ============================================================
# 06. RUN ALL CHECKS
# ============================================================
def main() -> None:
    main_data = json.loads(MAIN_PATH.read_text(encoding="utf-8"))
    practice_data = json.loads(PRACTICE_PATH.read_text(encoding="utf-8"))

    validate_headlines(main_data,practice_data)
    prevalence_count = validate_prevalence(main_data,practice_data)
    indicator_count = validate_indicators(main_data)
    validate_points(main_data,practice_data)

    print(
        f"Validated all QOF totals: {prevalence_count} condition groups, "
        f"{indicator_count} indicators, 42 ICBs and 6,188 practices."
    )


if __name__ == "__main__":
    main()
