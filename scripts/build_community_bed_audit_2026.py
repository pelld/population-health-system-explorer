# ============================================================
# 00. PUBLIC COMMUNITY BED AUDIT — 4 MARCH 2026
# ============================================================
# Downloads the official NHS England workbook and extracts the published England
# and ICB summary rows. The build stops unless the national totals reconcile to
# the figures printed in the workbook.

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import openpyxl
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/06/Community-Bed-Audit-4th-March-2026-v2.xlsx"
PUBLICATION_URL = "https://www.england.nhs.uk/statistics/statistical-work-areas/community-bed-audit/"
OUTPUT_PATH = Path("public-data/community-bed-audit-2026.json")
SNAPSHOT = "4 March 2026"


# ============================================================
# 01. GENERIC CLEANING HELPERS
# ============================================================
def safe_int(value: Any) -> int | None:
    if value in (None,""):
        return None
    return int(round(float(value)))


def safe_float(value: Any,digits: int = 2) -> float | None:
    if value in (None,""):
        return None
    return round(float(value),digits)


def percentage(numerator: int | None,denominator: int | None) -> float | None:
    if numerator is None or denominator in (None,0):
        return None
    return safe_float((numerator / denominator) * 100)


def clean_name(value: Any) -> str:
    text = "" if value is None else str(value).strip()
    text = text.removeprefix("NHS ").removesuffix(" INTEGRATED CARE BOARD")
    words = text.title().split()
    lower_words = {"And","Of","The","On","In"}
    return " ".join(word.lower() if index and word in lower_words else word for index,word in enumerate(words))


def metric(label: str,display: str,**values: Any) -> dict[str,Any]:
    return {"label":label,"display":display,**values}


# ============================================================
# 02. READ THE PUBLISHED ENGLAND AND ICB ROWS
# ============================================================
def row_values(sheet,row_number: int) -> list[Any]:
    return [cell.value for cell in sheet[row_number]]


def rows_by_code(sheet) -> dict[str,list[Any]]:
    output: dict[str,list[Any]] = {}
    for row_number in range(17,59):
        values = row_values(sheet,row_number)
        code = str(values[2]).strip() if values[2] not in (None,"") else ""
        if code:
            output[code] = values
    return output


def build_geography(
    code: str,
    name: str,
    region: str,
    table_1: list[Any],
    table_2: list[Any],
    table_3: list[Any],
    table_4: list[Any],
    geography_type: str,
) -> dict[str,Any]:
    total = safe_int(table_1[4])

    purposes = {
        "step_up":safe_int(table_1[5]),
        "assessment":safe_int(table_1[6]),
        "homelessness_recovery":safe_int(table_1[7]),
        "post_hospital_rehab":safe_int(table_1[8]),
        "amputee_rehab":safe_int(table_1[9]),
        "bariatric_rehab":safe_int(table_1[10]),
        "complex_specialist_rehab":safe_int(table_1[11]),
        "confusion_delirium_dementia":safe_int(table_1[12]),
        "stroke_neuro_rehab":safe_int(table_1[13]),
        "other":safe_int(table_1[14]),
    }

    rehab = safe_int(table_3[5])
    block = safe_int(table_3[7])
    spot = safe_int(table_3[9])
    nhs_hosted = safe_int(table_4[5])
    non_nhs_hosted = safe_int(table_4[7])
    average_los = safe_float(table_2[4])

    return {
        "code":code,
        "name":name,
        "region":region,
        "type":geography_type,
        "snapshot":SNAPSHOT,
        "metrics":{
            "community-bed-capacity":metric(
                "Community beds available at the audit snapshot",
                "count",
                count=total,
                percent=None,
            ),
            "community-bed-rehab":metric(
                "Beds providing rehabilitation, reablement and recovery",
                "percent",
                count=rehab,
                percent=percentage(rehab,total),
                denominator=total,
            ),
            "community-bed-step-up":metric(
                "Acute admission-avoidance or step-up beds",
                "count",
                count=purposes["step_up"],
                percent=percentage(purposes["step_up"],total),
                denominator=total,
            ),
            "community-bed-assessment":metric(
                "Assessment or transition beds",
                "count",
                count=purposes["assessment"],
                percent=percentage(purposes["assessment"],total),
                denominator=total,
            ),
            "community-bed-los":metric(
                "Average length of stay in community beds",
                "days",
                days=average_los,
                count=None,
                percent=None,
            ),
        },
        "purposes":purposes,
        "commissioning":{
            "block_contract":block,
            "block_contract_percent":percentage(block,total),
            "spot_purchase":spot,
            "spot_purchase_percent":percentage(spot,total),
            "unclassified":None if total is None else total - sum(value or 0 for value in (block,spot)),
        },
        "hosting":{
            "nhs_trust":nhs_hosted,
            "nhs_trust_percent":percentage(nhs_hosted,total),
            "non_nhs":non_nhs_hosted,
            "non_nhs_percent":percentage(non_nhs_hosted,total),
        },
        "average_length_of_stay":{
            "overall":average_los,
            "step_up":safe_float(table_2[5]),
            "assessment":safe_float(table_2[6]),
            "homelessness_recovery":safe_float(table_2[7]),
            "post_hospital_rehab":safe_float(table_2[8]),
            "amputee_rehab":safe_float(table_2[9]),
            "bariatric_rehab":safe_float(table_2[10]),
            "complex_specialist_rehab":safe_float(table_2[11]),
            "confusion_delirium_dementia":safe_float(table_2[12]),
            "stroke_neuro_rehab":safe_float(table_2[13]),
            "other":safe_float(table_2[14]),
        },
    }


# ============================================================
# 03. DOWNLOAD, VALIDATE AND WRITE THE COMPACT PUBLIC FILE
# ============================================================
def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()
    workbook = openpyxl.load_workbook(io.BytesIO(response.content),data_only=True,read_only=True)

    table_1 = workbook["Table 1"]
    table_2 = workbook["Table 2"]
    table_3 = workbook["Table 3"]
    table_4 = workbook["Table 4"]

    england = build_geography(
        "ENGLAND",
        "England",
        "England",
        row_values(table_1,7),
        row_values(table_2,7),
        row_values(table_3,7),
        row_values(table_4,7),
        "National",
    )

    table_1_rows = rows_by_code(table_1)
    table_2_rows = rows_by_code(table_2)
    table_3_rows = rows_by_code(table_3)
    table_4_rows = rows_by_code(table_4)

    shared_codes = sorted(set(table_1_rows) & set(table_2_rows) & set(table_3_rows) & set(table_4_rows))
    icbs = []
    for code in shared_codes:
        row_1 = table_1_rows[code]
        icbs.append(build_geography(
            code=code,
            name=clean_name(row_1[3]),
            region=str(row_1[1]).title(),
            table_1=row_1,
            table_2=table_2_rows[code],
            table_3=table_3_rows[code],
            table_4=table_4_rows[code],
            geography_type="ICB",
        ))

    icbs.sort(key=lambda item:item["name"])

    # Exact published headline validation. A changed workbook structure or revised
    # headline must fail the build rather than silently publish a different total.
    expected = {
        "total":13439,
        "rehab":12366,
        "step_up":254,
        "assessment":1184,
        "post_hospital_rehab":9643,
        "nhs_hosted":8118,
        "non_nhs_hosted":5321,
    }
    actual = {
        "total":england["metrics"]["community-bed-capacity"]["count"],
        "rehab":england["metrics"]["community-bed-rehab"]["count"],
        "step_up":england["metrics"]["community-bed-step-up"]["count"],
        "assessment":england["metrics"]["community-bed-assessment"]["count"],
        "post_hospital_rehab":england["purposes"]["post_hospital_rehab"],
        "nhs_hosted":england["hosting"]["nhs_trust"],
        "non_nhs_hosted":england["hosting"]["non_nhs"],
    }

    if actual != expected:
        raise RuntimeError(f"Published England totals did not reconcile: expected {expected}; found {actual}")
    if len(icbs) != 42:
        raise RuntimeError(f"Expected 42 ICB rows; found {len(icbs)}")
    if sum(item["metrics"]["community-bed-capacity"]["count"] or 0 for item in icbs) != expected["total"]:
        raise RuntimeError("The 42 ICB bed totals do not sum to the published England total.")

    output = {
        "publication":"Community Bed Audit — 4 March 2026",
        "snapshot":SNAPSHOT,
        "source":"NHS England Community Bed Audit",
        "source_url":PUBLICATION_URL,
        "source_file_url":SOURCE_URL,
        "icb_count":len(icbs),
        "england":england,
        "icbs":icbs,
        "method":{
            "basis":"Direct published England and ICB rows from Tables 1 to 4.",
            "snapshot":"Point-in-time bed provision and usage close to midnight on 4 March 2026; not an annual total.",
            "length_of_stay":"Published average length of stay, not calculated from the bed count.",
        },
        "notes":[
            "The audit covers NHS, jointly commissioned and Better Care Fund beds used for intermediate care purposes.",
            "Bed capacity can change; the figures describe the published snapshot date only.",
            "Block-contract and spot-purchase counts do not necessarily sum to all beds because some beds were not assigned to either category.",
            "This ICB-based publication does not provide a community-provider selector.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(icbs)} ICBs; England total {expected['total']}")


if __name__ == "__main__":
    main()
