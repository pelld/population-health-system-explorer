# ============================================================
# 00. PUBLIC ECDS FILE INSPECTION
# ============================================================
# Downloads only the publicly available NHS England 2024-25 annual ECDS
# publication files. The output is a small JSON inspection file committed to
# the repository so the website can be built from transparent public sources.

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import requests


NATIONAL_XLSX_URL = "https://files.digital.nhs.uk/C4/82ACBB/AE2425_ECDS_National_Data_Tables.xlsx"
PROVIDER_CSV_URL = "https://files.digital.nhs.uk/45/16564D/AE_2425_ECDS_pla_output.csv"
OUTPUT_PATH = Path("public-data/ecds-2024-25-inspection.json")
DOWNLOAD_DIR = Path(".public-data-downloads")
KEYWORDS = (
    "attendance source",
    "source of referral",
    "self referral",
    "self-referral",
    "general practitioner",
    "nhs 111",
    "ambulance",
)


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=180) as response:
        response.raise_for_status()
        with destination.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    output.write(chunk)


def clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return str(value).strip() if not isinstance(value, (int, float, bool)) else value


def inspect_workbook(path: Path) -> dict[str, Any]:
    workbook = pd.ExcelFile(path)
    result: dict[str, Any] = {"sheet_names": workbook.sheet_names, "keyword_hits": []}

    for sheet_name in workbook.sheet_names:
        frame = pd.read_excel(path, sheet_name=sheet_name, header=None, dtype=object)
        text_frame = frame.fillna("").astype(str).apply(lambda column: column.str.lower())
        mask = text_frame.apply(lambda column: column.str.contains("|".join(KEYWORDS), regex=True, na=False))
        matching_rows = sorted(set(mask.index[mask.any(axis=1)].tolist()))

        for row_index in matching_rows:
            start = max(0, row_index - 4)
            end = min(len(frame), row_index + 18)
            excerpt = frame.iloc[start:end, : min(frame.shape[1], 18)]
            result["keyword_hits"].append({
                "sheet": sheet_name,
                "matched_row": row_index,
                "excerpt_start_row": start,
                "rows": [[clean_value(value) for value in row] for row in excerpt.to_numpy().tolist()],
            })

    return result


def inspect_provider_csv(path: Path) -> dict[str, Any]:
    sample = pd.read_csv(path, nrows=250, low_memory=False)
    result: dict[str, Any] = {
        "columns": sample.columns.tolist(),
        "sample_rows": [
            {column: clean_value(value) for column, value in row.items()}
            for row in sample.head(25).to_dict(orient="records")
        ],
        "low_cardinality_values": {},
    }

    for column in sample.columns:
        values = sample[column].dropna().astype(str).str.strip().unique().tolist()
        if len(values) <= 80:
            result["low_cardinality_values"][column] = sorted(values)[:80]

    return result


def main() -> None:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    national_path = DOWNLOAD_DIR / "AE2425_ECDS_National_Data_Tables.xlsx"
    provider_path = DOWNLOAD_DIR / "AE_2425_ECDS_pla_output.csv"

    download(NATIONAL_XLSX_URL, national_path)
    download(PROVIDER_CSV_URL, provider_path)

    inspection = {
        "publication": "Hospital Accident and Emergency Activity, 2024-25",
        "period": "2024-25",
        "public_sources": {
            "national_workbook": NATIONAL_XLSX_URL,
            "provider_csv": PROVIDER_CSV_URL,
        },
        "national_workbook": inspect_workbook(national_path),
        "provider_csv": inspect_provider_csv(provider_path),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(inspection, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
