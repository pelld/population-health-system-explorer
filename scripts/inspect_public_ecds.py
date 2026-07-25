# ============================================================
# 00. PUBLIC ECDS FILE INSPECTION
# ============================================================
# Downloads only the publicly available NHS England 2024-25 annual ECDS
# publication files. It creates small, readable inspection files so the exact
# public tables can be mapped into the website without guessing the schema.

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any

import pandas as pd
import requests


NATIONAL_XLSX_URL = "https://files.digital.nhs.uk/C4/82ACBB/AE2425_ECDS_National_Data_Tables.xlsx"
PROVIDER_CSV_URL = "https://files.digital.nhs.uk/45/16564D/AE_2425_ECDS_pla_output.csv"
OUTPUT_DIR = Path("public-data/inspection")
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
KEYWORD_PATTERN = re.compile("|".join(re.escape(keyword) for keyword in KEYWORDS), re.IGNORECASE)


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=240) as response:
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


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "sheet"


def inspect_workbook(path: Path) -> dict[str, Any]:
    workbook = pd.ExcelFile(path)
    result: dict[str, Any] = {"sheet_names": workbook.sheet_names, "matching_sheets": []}

    for sheet_name in workbook.sheet_names:
        frame = pd.read_excel(path, sheet_name=sheet_name, header=None, dtype=object)
        text = frame.fillna("").astype(str)
        row_matches = text.apply(
            lambda row: any(KEYWORD_PATTERN.search(value) for value in row),
            axis=1,
        )
        matching_rows = frame.index[row_matches].tolist()
        if not matching_rows:
            continue

        result["matching_sheets"].append({
            "sheet": sheet_name,
            "matching_rows_zero_based": matching_rows[:30],
        })

        # Keep enough context to reconstruct the table, but avoid committing the
        # whole workbook. Each candidate sheet is capped at 250 rows and 40 cols.
        candidate = frame.iloc[:250, :40].copy()
        candidate.to_csv(OUTPUT_DIR / f"workbook-{slugify(sheet_name)}.csv", index=False, header=False)

    return result


def inspect_provider_csv(path: Path) -> dict[str, Any]:
    header = pd.read_csv(path, nrows=0)
    matching_rows: list[dict[str, Any]] = []

    for chunk in pd.read_csv(path, chunksize=50000, low_memory=False):
        text = chunk.fillna("").astype(str)
        row_matches = text.apply(
            lambda row: any(KEYWORD_PATTERN.search(value) for value in row),
            axis=1,
        )
        if row_matches.any():
            matching_rows.extend(chunk.loc[row_matches].head(100 - len(matching_rows)).to_dict(orient="records"))
        if len(matching_rows) >= 100:
            break

    if matching_rows:
        pd.DataFrame(matching_rows).to_csv(OUTPUT_DIR / "provider-keyword-hits.csv", index=False)

    return {
        "columns": header.columns.tolist(),
        "keyword_hit_count_saved": len(matching_rows),
    }


def main() -> None:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Remove the first, over-large inspection file generated during development.
    old_output = Path("public-data/ecds-2024-25-inspection.json")
    if old_output.exists():
        old_output.unlink()

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

    (OUTPUT_DIR / "summary.json").write_text(
        json.dumps(inspection, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote public inspection files to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
