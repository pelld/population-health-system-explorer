# ============================================================
# 00. COMPACT VALIDATION SUMMARY FOR DISCHARGE READY DATE DATA
# ============================================================

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/drd-2024-25.json")
OUTPUT = Path("public-data/drd-2024-25-summary.json")


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    england = data["england"]
    output = {
        "publication":data["publication"],
        "period":data["period"],
        "icb_count":data["icb_count"],
        "provider_count":data["provider_count"],
        "utla_count":data["utla_count"],
        "england_metrics":england["metrics"],
        "england_thresholds":england["thresholds"],
        "england_coverage":england["coverage"],
        "validation":data["validation"],
    }
    OUTPUT.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(output,indent=2))


if __name__ == "__main__":
    main()
