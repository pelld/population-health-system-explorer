# ============================================================
# 00. INSPECT THE OFFICIAL MARCH 2025 CSDS CORE-DATA ZIP
# ============================================================
# Downloads the published ZIP and records file names, dimensions, columns,
# distinct organisation types and representative rows. The output is temporary
# development evidence used to write a validated production extractor.

from __future__ import annotations

import csv
import io
import json
import zipfile
from pathlib import Path

import requests


SOURCE_URL = "https://files.digital.nhs.uk/39/AF1D09/csds-mar25-exp-core-data.zip"
OUTPUT_PATH = Path("public-data/csds-mar25-inspection.json")


def sniff_encoding(data: bytes) -> str:
    for encoding in ("utf-8-sig","utf-8","cp1252"):
        try:
            data.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    return "latin-1"


def inspect_csv(name: str,data: bytes) -> dict:
    encoding = sniff_encoding(data)
    text = data.decode(encoding,errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = []
    header = []
    count = 0

    for index,row in enumerate(reader):
        if index == 0:
            header = row
        elif len(rows) < 5:
            rows.append(row)
        count += 1

    return {
        "name":name,
        "bytes":len(data),
        "encoding":encoding,
        "row_count_including_header":count,
        "column_count":len(header),
        "columns":header,
        "sample_rows":rows,
    }


def main() -> None:
    response = requests.get(SOURCE_URL,timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        files = []
        for name in archive.namelist():
            if name.lower().endswith(".csv"):
                files.append(inspect_csv(name,archive.read(name)))
            else:
                files.append({"name":name,"bytes":archive.getinfo(name).file_size})

    output = {
        "source_url":SOURCE_URL,
        "zip_bytes":len(response.content),
        "file_count":len(files),
        "files":files,
    }

    OUTPUT_PATH.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}: {len(files)} files")


if __name__ == "__main__":
    main()
