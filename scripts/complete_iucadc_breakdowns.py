# ============================================================
# 00. RECONCILE THE PUBLISHED BOOKING BREAKDOWN
# ============================================================
# G01 includes every appointment made before the call ended. The website shows the
# main published categories plus an explicit remainder, rather than implying that
# the named categories exhaust the total when dental, suppressed or other bookings
# are also present.

from __future__ import annotations

import json
from pathlib import Path


PATH = Path("public-data/iucadc-2024-25.json")


def complete(geography: dict) -> None:
    bookings = geography.get("bookings",{})
    total = bookings.get("total")
    breakdown = bookings.get("breakdown",{})
    if total is None or not breakdown:
        return

    shown = sum((item.get("count") or 0) for item in breakdown.values())
    remainder = max(0,int(total) - int(shown))
    breakdown["remaining"] = {
        "label":"Dental and remaining booked appointments",
        "count":remainder,
        "indicator":"G01 less displayed G03/G05/G07/G09/G11/G14 categories",
        "derived":True,
    }


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    complete(data["england"])
    for area in data.get("areas",[]):
        complete(area)

    PATH.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
    print("Reconciled IUC booking breakdowns to G01 totals")


if __name__ == "__main__":
    main()
