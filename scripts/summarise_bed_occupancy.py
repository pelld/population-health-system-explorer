# ============================================================
# 00. SMALL VALIDATION SUMMARY FOR THE GENERATED BED DATA
# ============================================================

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/bed-occupancy-2024-25.json")
OUTPUT = Path("public-data/bed-occupancy-2024-25-summary.json")


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    summary = {
        "publication":data["publication"],
        "provider_count":data["provider_count"],
        "england_metrics":data["england"]["metrics"],
        "england_sectors":data["england"]["sectors"],
        "england_quarters":data["england"]["quarters"],
    }
    OUTPUT.write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(summary,indent=2))


if __name__ == "__main__":
    main()
