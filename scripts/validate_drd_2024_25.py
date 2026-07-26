# ============================================================
# 00. HARD VALIDATION OF REVISED 2024-25 DISCHARGE READY DATE DATA
# ============================================================

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/drd-2024-25.json")

EXPECTED = {
    "drd-discharges":4035716,
    "drd-same-day":3489312,
    "drd-delayed":546404,
    "drd-bed-days":3329387,
}


def count(record: dict,node_id: str) -> int:
    metric = record["metrics"][node_id]
    return int(metric.get("count",0))


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    england = data["england"]

    actual = {
        "drd-discharges":count(england,"drd-discharges"),
        "drd-same-day":count(england,"drd-same-day"),
        "drd-delayed":count(england,"drd-delayed"),
        "drd-bed-days":count(england,"drd-bed-days"),
    }
    if actual != EXPECTED:
        raise RuntimeError(f"England revised annual totals changed: {actual} != {EXPECTED}")

    if data["validation"]["england_annual_discharge_gap"] != 0:
        raise RuntimeError("England discharge thresholds do not reconcile to the published total.")
    if data["validation"]["england_annual_bed_day_gap"] != 0:
        raise RuntimeError("England bed-day thresholds do not reconcile to the published total.")
    if len(data["icbs"]) != 42 or any(item["months_present"] != 12 for item in data["icbs"]):
        raise RuntimeError("Expected 42 ICBs with all twelve revised months.")
    if len(data["providers"]) != 134:
        raise RuntimeError(f"Expected 134 providers appearing in the revised year; found {len(data['providers'])}")
    if len(data["utlas"]) != 153:
        raise RuntimeError(f"Expected 153 resident UTLAs; found {len(data['utlas'])}")

    for collection_name in ("icbs","providers"):
        collection = data[collection_name]
        sums = {
            "drd-discharges":sum(count(item,"drd-discharges") for item in collection),
            "drd-same-day":sum(count(item,"drd-same-day") for item in collection),
            "drd-delayed":sum(count(item,"drd-delayed") for item in collection),
            "drd-bed-days":sum(count(item,"drd-bed-days") for item in collection),
        }
        if sums != EXPECTED:
            raise RuntimeError(f"{collection_name} do not reconcile to England: {sums} != {EXPECTED}")

    print("Validated revised England totals and exact ICB/provider reconciliation.")


if __name__ == "__main__":
    main()
