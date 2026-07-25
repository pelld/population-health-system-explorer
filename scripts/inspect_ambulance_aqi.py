# ============================================================
# 00. INSPECT THE PUBLIC AMBULANCE SYSTEM INDICATORS CSV
# ============================================================
# This temporary inspection step records the actual column structure of the
# official NHS England AmbSYS time-series CSV. It prevents the production build
# from relying on guessed column names or data formats.

from __future__ import annotations

import io
import json
import re
from pathlib import Path
from typing import Any

import pandas as pd
import requests


SOURCE_URL = "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/AmbSYS-to-Jun-2026-b4Uah.csv"
OUTPUT_PATH = Path("public-data/ambulance-aqi-inspection.json")
INDICATORS = {"A1", "A7", "A17", "A53", "A54", "A55", "A56"}


def json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    return str(value)


def read_csv(content: bytes) -> tuple[pd.DataFrame, str]:
    errors: list[str] = []
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            frame = pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False, encoding=encoding)
            return frame, encoding
        except Exception as error:  # pragma: no cover - diagnostic fallback
            errors.append(f"{encoding}: {type(error).__name__}: {error}")
    raise RuntimeError("Could not read AmbSYS CSV. " + " | ".join(errors))


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()

    frame, encoding = read_csv(response.content)
    frame.columns = [str(column).strip() for column in frame.columns]

    columns = []
    for column in frame.columns:
        series = frame[column].dropna().astype(str).str.strip()
        samples = series.drop_duplicates().head(30).tolist()
        indicator_hits = int(series.str.upper().isin(INDICATORS).sum())
        code_like_hits = int(series.str.upper().str.fullmatch(r"A\d+").fillna(False).sum())
        numeric_hits = int(pd.to_numeric(series.str.replace(",", "", regex=False), errors="coerce").notna().sum())
        columns.append({
            "name": column,
            "non_null": int(series.size),
            "unique": int(series.nunique()),
            "indicator_hits": indicator_hits,
            "code_like_hits": code_like_hits,
            "numeric_hits": numeric_hits,
            "samples": samples,
        })

    indicator_columns = [column["name"] for column in columns if column["indicator_hits"] > 0]
    wide_indicator_columns = [column for column in frame.columns if re.match(r"^A\d+\b", str(column).strip(), flags=re.I)]

    output = {
        "source_url": SOURCE_URL,
        "bytes": len(response.content),
        "encoding": encoding,
        "rows": int(len(frame)),
        "column_count": int(len(frame.columns)),
        "columns": columns,
        "indicator_value_columns": indicator_columns,
        "wide_indicator_columns": wide_indicator_columns,
        "first_rows": [
            {column: json_value(value) for column, value in row.items()}
            for row in frame.head(12).to_dict(orient="records")
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(frame):,} rows and {len(frame.columns)} columns")


if __name__ == "__main__":
    main()
