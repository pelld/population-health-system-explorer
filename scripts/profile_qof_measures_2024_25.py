# ============================================================
# 00. PROFILE QOF ACHIEVEMENT MEASURES
# ============================================================
# Lists the exact MEASURE values present in the seven regional achievement CSVs
# and the measures available for each indicator.

from __future__ import annotations

import csv
import io
import json
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import requests


SOURCE_URL = "https://files.digital.nhs.uk/95/4708D7/QOF2425.zip"
OUTPUT_PATH = Path("public-data/qof-2024-25-measure-profile.json")


def main() -> None:
    response = requests.get(SOURCE_URL, timeout=300)
    response.raise_for_status()
    measure_counts = Counter()
    indicator_measures = defaultdict(set)

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        for name in archive.namelist():
            if not name.startswith("ACHIEVEMENT_") or not name.endswith("_2425.csv"):
                continue
            text = archive.read(name).decode("utf-8-sig")
            for row in csv.DictReader(io.StringIO(text)):
                measure = row["MEASURE"].strip()
                indicator = row["INDICATOR_CODE"].strip()
                measure_counts[measure] += 1
                indicator_measures[indicator].add(measure)

    output = {
        "source_url":SOURCE_URL,
        "measure_counts":dict(sorted(measure_counts.items())),
        "indicator_measures":{indicator:sorted(measures) for indicator,measures in sorted(indicator_measures.items())},
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(measure_counts)} measures, {len(indicator_measures)} indicators")


if __name__ == "__main__":
    main()
