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
        columns = item["columns"]
        sample = item.get("sample_rows",[])[:1]
        sample_keys = columns[:12]
        files.append({
            "label":item["label"],
            "bytes":item["bytes"],
            "rows":item["rows"],
            "column_count":len(columns),
            "first_columns":columns[:35],
            "last_columns":columns[-10:],
            "dimensions":{
                key:{"count":len(values),"values":values[:12]}
                for key,values in item.get("dimensions",{}).items()
            },
            "first_row":{
                key:sample[0].get(key) for key in sample_keys
            } if sample else {},
        })
    OUTPUT.write_text(json.dumps({"files":files},indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
