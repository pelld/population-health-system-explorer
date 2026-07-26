# ============================================================
# 00. COMPACT QOF PRACTICE BUILD WRAPPER
# ============================================================
# England and ICB outputs retain all 76 indicator measures. The practice file
# retains all condition prevalence groups and overall points, while omitting the
# repeated indicator-level dictionaries that would exceed a practical static-file
# size. Indicator and PCA comparisons therefore remain England/ICB measures.

from __future__ import annotations

import json

import build_qof_2024_25 as build


# ============================================================
# 01. APPLY THE PUBLISHED ALL-DOMAIN POINTS DENOMINATOR
# ============================================================
# The official practice achievement workbook reports each practice's 2024-25
# overall achievement against 635 available points. This differs from the raw
# ORGANISATION_REFERENCE revised maximum used for payment calculations.
base_prepare_tables = build.prepare_tables


def prepare_tables_with_published_denominator(source):
    tables = base_prepare_tables(source)
    tables["practice_points"]["REVISED_MAX_POINTS"] = 635.0
    tables["practice_points"]["ACHIEVEMENT_PERCENT"] = (
        tables["practice_points"]["ACHIEVED_POINTS"] / 635.0 * 100.0
    )
    return tables


# ============================================================
# 02. BUILD PRACTICE PREVALENCE AND OVERALL POINTS ONLY
# ============================================================
def build_compact_practices(tables):
    geographies = tables["geographies"].set_index("PRACTICE_CODE")
    points = tables["practice_points"].set_index("PRACTICE_CODE")
    flagged = set(tables["validation_flags"]["PRACTICE_CODE"].dropna().astype(str))
    prevalence_by_practice = {
        code:build.prevalence_metrics(frame)
        for code,frame in tables["prevalence"].groupby("PRACTICE_CODE")
    }
    practices = []

    for practice_code,row in geographies.iterrows():
        point_row = points.loc[practice_code]
        practices.append({
            "code":practice_code,
            "name":str(row["PRACTICE_NAME"]),
            "type":"Practice",
            "icb_code":str(row["ICB_ODS_CODE"]),
            "icb_name":build.clean_name(row["ICB_NAME"]),
            "pcn_code":str(row["PCN_ODS_CODE"]),
            "pcn_name":str(row["PCN_NAME"]),
            "validation_flag":practice_code in flagged,
            "overall_points":{
                "achieved":build.rounded(float(point_row["ACHIEVED_POINTS"])),
                "available":635.0,
                "percent":build.rounded(float(point_row["ACHIEVEMENT_PERCENT"])),
            },
            "prevalence":prevalence_by_practice.get(practice_code,{}),
            "indicators":{},
        })

    return sorted(practices, key=lambda item:(item["name"],item["code"]))


# ============================================================
# 03. RUN THE VALIDATED BUILD AND DOCUMENT THE STATIC-FILE SCOPE
# ============================================================
def main() -> None:
    build.prepare_tables = prepare_tables_with_published_denominator
    build.build_practices = build_compact_practices
    build.main()

    practice_data = json.loads(build.OUTPUT_PRACTICES.read_text(encoding="utf-8"))
    practice_data["method_notes"].extend([
        "Overall QOF achievement follows the published all-domain workbook: achieved points divided by 635 available points per included practice.",
        "The compact practice file includes all published condition prevalence groups and overall points; indicator achievement and PCA detail are shown at England and ICB level to keep the static public download manageable.",
    ])
    build.OUTPUT_PRACTICES.write_text(
        json.dumps(practice_data,separators=(",",":"),ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Compacted {build.OUTPUT_PRACTICES}")


if __name__ == "__main__":
    main()
