# ============================================================
# 00. PUBLIC GPAD 2024-25 ICB PROFILE
# ============================================================
# Downloads the official April 2025 GPAD regional archive, extracts April 2024
# to March 2025 and creates a small England/ICB comparison file for the map.
# The source rows are a joint cross-tab of status, clinician type, mode and
# booking delay, so each row contributes once to the total appointment count.

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://files.digital.nhs.uk/34/684B0F/Appointments_GP_Regional_CSV_Apr_25.zip"
PUBLICATION_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice/april-2025"
SUPPORTING_URL = "https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice/appointments-in-general-practice-supporting-information"
OUTPUT_PATH = Path("public-data/gpad-2024-25-icb.json")

PERIOD_LABEL = "2024-25"
PERIOD_MONTHS = {
    "APR2024", "MAY2024", "JUN2024", "JUL2024", "AUG2024", "SEP2024",
    "OCT2024", "NOV2024", "DEC2024", "JAN2025", "FEB2025", "MAR2025",
}

REQUIRED_COLUMNS = {
    "ICB_ONS_CODE", "ICB_NAME", "REGION_NAME", "APPOINTMENT_MONTH",
    "APPT_STATUS", "HCP_TYPE", "APPT_MODE", "TIME_BETWEEN_BOOK_AND_APPT",
    "COUNT_OF_APPOINTMENTS",
}

BOOKING_LABELS = {
    "same_day": "Same Day",
    "one_day": "1 Day",
    "two_to_seven": "2 to 7 Days",
    "eight_to_fourteen": "8  to 14 Days",
    "fifteen_to_twenty_one": "15  to 21 Days",
    "twenty_two_to_twenty_eight": "22  to 28 Days",
    "over_twenty_eight": "More than 28 Days",
    "unknown": "Unknown / Data Quality",
}

MODE_LABELS = {
    "face_to_face": "Face-to-Face",
    "telephone": "Telephone",
    "home_visit": "Home Visit",
    "video_online": "Video/Online",
    "unknown": "Unknown",
}

HCP_LABELS = {
    "gp": "GP",
    "other_practice_staff": "Other Practice staff",
    "unknown": "Unknown",
}

STATUS_LABELS = {
    "attended": "Attended",
    "dna": "DNA",
    "unknown": "Unknown",
}


def read_csv(content: bytes) -> pd.DataFrame:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            frame = pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False, encoding=encoding)
            frame.columns = frame.columns.astype(str).str.strip()
            return frame
        except Exception as error:
            errors.append(f"{encoding}: {type(error).__name__}: {error}")
    raise RuntimeError("Could not read GPAD CSV. " + " | ".join(errors))


def percent(count: int | None, denominator: int | None) -> float | None:
    if count is None or denominator is None or denominator <= 0:
        return None
    return round((count / denominator) * 100, 2)


def category_breakdown(frame: pd.DataFrame, column: str, labels: dict[str, str], total: int) -> dict[str, dict[str, Any]]:
    grouped = frame.groupby(column, dropna=False)["COUNT"].sum()
    output: dict[str, dict[str, Any]] = {}

    for key, label in labels.items():
        count = int(grouped.get(label, 0))
        output[key] = {"label": label, "count": count, "percent": percent(count, total)}

    return output


def build_geography(code: str, name: str, region: str, frame: pd.DataFrame) -> dict[str, Any]:
    total = int(frame["COUNT"].sum())
    booking = category_breakdown(frame, "TIME_BETWEEN_BOOK_AND_APPT", BOOKING_LABELS, total)
    mode = category_breakdown(frame, "APPT_MODE", MODE_LABELS, total)
    hcp = category_breakdown(frame, "HCP_TYPE", HCP_LABELS, total)
    status = category_breakdown(frame, "APPT_STATUS", STATUS_LABELS, total)

    validation = {
        "booking_gap": total - sum(item["count"] for item in booking.values()),
        "mode_gap": total - sum(item["count"] for item in mode.values()),
        "hcp_gap": total - sum(item["count"] for item in hcp.values()),
        "status_gap": total - sum(item["count"] for item in status.values()),
    }

    return {
        "code": code,
        "name": name,
        "region": region,
        "months": int(frame["APPOINTMENT_MONTH"].nunique()),
        "metrics": {
            "gpad-appointments": {
                "label": "Appointments recorded in GP practice appointment systems",
                "count": total,
                "display": "count",
                "percent": None,
                "denominator": None,
            },
            "same-day-capacity": {
                "label": "Appointments taking place on the same day they were booked",
                "count": booking["same_day"]["count"],
                "display": "percent",
                "percent": booking["same_day"]["percent"],
                "denominator": total,
                "denominator_label": "recorded appointments",
            },
            "gp-clinical-assessment": {
                "label": "Appointments recorded with a GP",
                "count": hcp["gp"]["count"],
                "display": "percent",
                "percent": hcp["gp"]["percent"],
                "denominator": total,
                "denominator_label": "recorded appointments",
            },
        },
        "booking_delay": booking,
        "mode": mode,
        "hcp": hcp,
        "status": status,
        "data_quality": {
            "unknown_booking_percent": booking["unknown"]["percent"],
            "unknown_mode_percent": mode["unknown"]["percent"],
            "unknown_hcp_percent": hcp["unknown"]["percent"],
            "unknown_status_percent": status["unknown"]["percent"],
        },
        "validation": validation,
    }


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    archive = zipfile.ZipFile(io.BytesIO(response.content))

    frames: list[pd.DataFrame] = []
    for name in archive.namelist():
        if not name.lower().endswith(".csv"):
            continue

        frame = read_csv(archive.read(name))
        missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
        if missing:
            raise RuntimeError(f"GPAD source structure changed in {name}; missing columns: {missing}")

        frame = frame.loc[frame["APPOINTMENT_MONTH"].isin(PERIOD_MONTHS), list(REQUIRED_COLUMNS)].copy()
        frame["COUNT"] = pd.to_numeric(frame["COUNT_OF_APPOINTMENTS"].astype(str).str.replace(",", "", regex=False), errors="coerce").fillna(0).astype("int64")
        frames.append(frame)

    if not frames:
        raise RuntimeError("No GPAD CSV files were found in the regional archive.")

    all_rows = pd.concat(frames, ignore_index=True)
    all_rows["ICB_ONS_CODE"] = all_rows["ICB_ONS_CODE"].fillna("").astype(str).str.strip()
    all_rows["ICB_NAME"] = all_rows["ICB_NAME"].fillna("").astype(str).str.strip()
    all_rows["REGION_NAME"] = all_rows["REGION_NAME"].fillna("").astype(str).str.strip()

    mapped = all_rows.loc[all_rows["ICB_ONS_CODE"].ne("") & all_rows["ICB_NAME"].ne("")].copy()
    if mapped.empty:
        raise RuntimeError("No mapped ICB rows were found in the GPAD archive.")

    icbs: list[dict[str, Any]] = []
    for (code, name), group in mapped.groupby(["ICB_ONS_CODE", "ICB_NAME"], sort=False):
        region_values = group["REGION_NAME"].loc[group["REGION_NAME"].ne("")]
        region = region_values.mode().iloc[0] if not region_values.empty else ""
        icbs.append(build_geography(code, name, region, group))

    icbs.sort(key=lambda item: item["name"])
    england = build_geography("ENG", "England", "England", mapped)

    incomplete_months = [item["name"] for item in icbs if item["months"] != 12]
    validation_failures = [item["name"] for item in [england, *icbs] if any(item["validation"].values())]

    output = {
        "publication": "Appointments in General Practice — April 2025 release",
        "period": PERIOD_LABEL,
        "geography": "Integrated Care Board",
        "source_url": PUBLICATION_URL,
        "source_file_url": SOURCE_URL,
        "supporting_information_url": SUPPORTING_URL,
        "icb_count": len(icbs),
        "england": england,
        "icbs": icbs,
        "quality_summary": {
            "icbs_with_fewer_than_12_months": incomplete_months,
            "category_reconciliation_failures": validation_failures,
        },
        "notes": [
            "Figures cover appointments recorded in GP practice appointment systems from April 2024 to March 2025.",
            "GPAD measures appointments recorded in appointment systems, not all requests for help, unmet demand or all primary-care workload.",
            "Same-day appointments, clinician type, mode and status are overlapping dimensions of the same appointments; they are not sequential pathway outcomes.",
            "ICB geography is taken directly from the published ICB fields in the source archive.",
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with England and {len(icbs)} ICBs")


if __name__ == "__main__":
    main()
