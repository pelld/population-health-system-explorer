# ============================================================
# 00. COMPACT GP PATIENT SURVEY INSPECTION SUMMARY
# ============================================================

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/gpps-2025-inspection.json")
OUTPUT = Path("public-data/gpps-2025-inspection-summary.json")


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    files = []
    for item in data["files"]:
        files.append({
            "label":item["label"],
            "url":item["url"],
            "bytes":item["bytes"],
            "rows":item["rows"],
            "columns":item["columns"],
            "dimensions":{
                key:{"count":len(values),"values":values[:30]}
                for key,values in item.get("dimensions",{}).items()
            },
            "sample_rows":item.get("sample_rows",[])[:5],
        })
    OUTPUT.write_text(json.dumps({"files":files},indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
