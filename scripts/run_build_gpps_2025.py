# ============================================================
# 00. EXACT-SOURCE VALIDATION THEN DISPLAY-ROUNDING BUILD
# ============================================================
# The public JSON displays percentages to two decimal places. This wrapper first
# checks the unrounded national CSV values exactly, then lets the main builder
# validate the rounded display values and every confidence interval.

from __future__ import annotations

import build_gpps_2025 as build


def main() -> None:
    national = build.download_csv(build.SOURCE_PATHS["national"]).iloc[0]

    if build.integer(national.get("distributed")) != build.EXPECTED["distributed"]:
        raise RuntimeError("Published GPPS questionnaires-distributed total changed.")
    if build.integer(national.get("received")) != build.EXPECTED["received"]:
        raise RuntimeError("Published GPPS questionnaires-received total changed.")

    raw_response_rate = build.safe_number(national.get("resprate"))
    if raw_response_rate is None or abs(raw_response_rate - build.EXPECTED["response_rate"]) > 0.0000000001:
        raise RuntimeError(f"Published GPPS response rate changed: {raw_response_rate}")

    for node_id,expected in build.EXPECTED["percentages"].items():
        stem = build.MEASURES[node_id]["stem"]
        raw_value = build.safe_number(national.get(f"{stem}.pcteval"))
        if raw_value is None or abs(raw_value - expected) > 0.0000000001:
            raise RuntimeError(f"Published GPPS national value changed for {node_id}: {raw_value}")

    # The main builder stores two-decimal percentages. Align its second validation
    # pass with those display values only after the exact source checks above pass.
    build.EXPECTED["response_rate"] = round(raw_response_rate * 100,2) / 100
    build.EXPECTED["percentages"] = {
        node_id:round(value * 100,2) / 100
        for node_id,value in build.EXPECTED["percentages"].items()
    }
    build.main()


if __name__ == "__main__":
    main()
