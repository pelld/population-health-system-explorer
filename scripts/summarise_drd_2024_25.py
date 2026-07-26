# ============================================================
# 00. COMPACT VALIDATION SUMMARY FOR DISCHARGE READY DATE DATA
# ============================================================

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/drd-2024-25.json")
OUTPUT = Path("public-data/drd-2024-25-summary.json")
NODE_IDS = ("drd-discharges","drd-same-day","drd-delayed","drd-bed-days")


def count(record: dict,node_id: str) -> int:
    return int(record["metrics"][node_id].get("count",0))


def sums(records: list[dict]) -> dict[str,int]:
    return {node_id:sum(count(record,node_id) for record in records) for node_id in NODE_IDS}


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    england = data["england"]
    england_counts = {node_id:count(england,node_id) for node_id in NODE_IDS}
    icb_counts = sums(data["icbs"])
    provider_counts = sums(data["providers"])

    if icb_counts != england_counts:
        raise RuntimeError(f"ICB totals do not reconcile: {icb_counts} != {england_counts}")
    if provider_counts != england_counts:
        raise RuntimeError(f"Provider totals do not reconcile: {provider_counts} != {england_counts}")

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
        "reconciliation":{
            "england":england_counts,
            "icb_sum":icb_counts,
            "provider_sum":provider_counts,
            "icb_gap":{node_id:icb_counts[node_id] - england_counts[node_id] for node_id in NODE_IDS},
            "provider_gap":{node_id:provider_counts[node_id] - england_counts[node_id] for node_id in NODE_IDS},
        },
    }
    OUTPUT.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(output,indent=2))


if __name__ == "__main__":
    main()
