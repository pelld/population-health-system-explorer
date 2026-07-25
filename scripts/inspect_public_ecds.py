# ============================================================
# 00. PUBLIC ECDS DATA BUILD
# ============================================================
# Downloads only the publicly available NHS England 2024-25 annual ECDS
# publication files. It creates concise inspection files and a small route-metric
# JSON file used directly by the public website.

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
PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/hospital-accident--emergency-activity/2024-25"
OUTPUT_DIR = Path("public-data/inspection")
ROUTE_METRICS_PATH = Path("public-data/ecds-2024-25-route-metrics.json")
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
        row_matches = text.apply(lambda row: any(KEYWORD_PATTERN.search(value) for value in row), axis=1)
        matching_rows = frame.index[row_matches].tolist()
        if not matching_rows:
            continue

        result["matching_sheets"].append({
            "sheet": sheet_name,
            "matching_rows_zero_based": matching_rows[:30],
        })

        candidate = frame.iloc[:250, :40].copy()
        candidate.to_csv(OUTPUT_DIR / f"workbook-{slugify(sheet_name)}.csv", index=False, header=False)

    return result


def inspect_provider_csv(path: Path) -> dict[str, Any]:
    header = pd.read_csv(path, nrows=0)
    matching_rows: list[dict[str, Any]] = []

    for chunk in pd.read_csv(path, chunksize=50000, low_memory=False):
        text = chunk.fillna("").astype(str)
        row_matches = text.apply(lambda row: any(KEYWORD_PATTERN.search(value) for value in row), axis=1)
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


def build_route_metrics(path: Path) -> dict[str, Any]:
    # The public workbook's table header is on Excel row 13 (zero-based row 12).
    frame = pd.read_excel(path, sheet_name="Source, arrival, discharge", header=12)
    annual = frame.loc[frame["Reporting Period"].astype(str).eq("2024/25")].copy()
    annual["Attendances"] = pd.to_numeric(annual["Attendances"], errors="coerce")
    annual["% of total attendances"] = pd.to_numeric(annual["% of total attendances"], errors="coerce")

    def row(measure_type: str, measure: str) -> pd.Series:
        matches = annual.loc[(annual["Measure Type"] == measure_type) & (annual["Measure"] == measure)]
        if len(matches) != 1:
            raise ValueError(f"Expected one row for {measure_type!r} / {measure!r}; found {len(matches)}")
        return matches.iloc[0]

    total = int(row("Attendance Source", "Attendance Source Total")["Attendances"])

    self_measures = [
        "Referred by self (finding)",
        "Self-referral to accident and emergency department (procedure)",
    ]
    self_count = int(sum(int(row("Attendance Source", measure)["Attendances"]) for measure in self_measures))
    nhs111_count = int(row("Attendance Source", "Referred by National Health Service 111 service (finding)")["Attendances"])
    primary_count = int(row("Attendance Source", "Referred by member of Primary Health Care Team (finding)")["Attendances"])
    ambulance_referral_count = int(row("Attendance Source", "Referred by ambulance service (finding)")["Attendances"])
    unknown_count = int(row("Attendance Source", "Not Known")["Attendances"])
    other_count = total - self_count - nhs111_count - primary_count - ambulance_referral_count - unknown_count

    ambulance_arrival = row("Arrival Mode", "Brought in by ambulance (including helicopter / Air Ambulance)")

    def route_metric(count: int, label: str, definition: str, derived: bool = False) -> dict[str, Any]:
        return {
            "count": count,
            "percent": round((count / total) * 100, 2),
            "label": label,
            "definition": definition,
            "derived": derived,
        }

    metrics = {
        "publication": "Hospital Accident and Emergency Activity, 2024-25",
        "period": "2024-25",
        "geography": "England",
        "source_url": PUBLICATION_URL,
        "source_file_url": NATIONAL_XLSX_URL,
        "denominator": {
            "count": total,
            "definition": "Unplanned ECDS attendances in the annual national attendance-source table.",
        },
        "routes": {
            "ae-attendance": route_metric(total, "All ECDS attendances in the route table", "Attendance Source Total."),
            "self-presentation": route_metric(self_count, "Self-referral", "Combined from the two published self-referral SNOMED categories.", True),
            "nhs111-ae-route": route_metric(nhs111_count, "NHS 111 referral", "Referred by National Health Service 111 service."),
            "gp-ae-route": route_metric(primary_count, "Primary health care team referral", "Referred by a member of the Primary Health Care Team; this is broader than GP referral alone."),
            "ambulance-ae-route": {
                **route_metric(ambulance_referral_count, "Ambulance service referral", "Attendance source recorded as referral by the ambulance service."),
                "secondary": {
                    "count": int(ambulance_arrival["Attendances"]),
                    "percent": float(ambulance_arrival["% of total attendances"]),
                    "label": "Arrived by ambulance",
                    "definition": "Arrival mode, which is separate from attendance source.",
                },
            },
            "other-professional-route": route_metric(other_count, "Other recorded attendance sources", "All recorded attendance-source categories other than self-referral, NHS 111, primary health care team, ambulance service and Not Known.", True),
            "unknown-route": route_metric(unknown_count, "Attendance source not known", "Published Not Known attendance-source category."),
        },
        "published_attendance_source_rows": [
            {
                "measure": str(record["Measure"]),
                "count": int(record["Attendances"]),
                "percent": float(record["% of total attendances"]),
            }
            for _, record in annual.loc[annual["Measure Type"].eq("Attendance Source")].iterrows()
            if record["Measure"] != "Attendance Source Total"
        ],
    }
    return metrics


def main() -> None:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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

    (OUTPUT_DIR / "summary.json").write_text(json.dumps(inspection, indent=2, ensure_ascii=False), encoding="utf-8")
    ROUTE_METRICS_PATH.write_text(json.dumps(build_route_metrics(national_path), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote public inspection files to {OUTPUT_DIR}")
    print(f"Wrote route metrics to {ROUTE_METRICS_PATH}")


if __name__ == "__main__":
    main()
