# ============================================================
# 00. HARD VALIDATION OF PUBLISHED 2024-25 ENGLAND BED FIGURES
# ============================================================
# Fails the production workflow if any direct quarterly England value or the
# day-weighted annual calculation differs from the validated publication.

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("public-data/bed-occupancy-2024-25.json")

EXPECTED = {
    "Q1":{"total":(131874.68131868137,117314.96703296708),"general_acute":(105644.79120879123,96361.15384615384)},
    "Q2":{"total":(129759.75,114639.68478260872),"general_acute":(103656.22826086955,93664.40217391304)},
    "Q3":{"total":(132886.17391304346,116856.71739130432),"general_acute":(106431.55434782614,96109.02173913045)},
    "Q4":{"total":(132177.929059829,119189.6536019536),"general_acute":(106068.13663003662,98145.94175824178)},
}


def close(actual: float,expected: float,tolerance: float = 0.000001) -> bool:
    return abs(float(actual) - float(expected)) <= tolerance


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    quarters = data["england"]["quarters"]

    for quarter,sectors in EXPECTED.items():
        for sector,(expected_available,expected_occupied) in sectors.items():
            actual = quarters[quarter]["sectors"][sector]
            if not close(actual["available"],expected_available):
                raise RuntimeError(f"{quarter} {sector} available beds changed: {actual['available']} != {expected_available}")
            if not close(actual["occupied"],expected_occupied):
                raise RuntimeError(f"{quarter} {sector} occupied beds changed: {actual['occupied']} != {expected_occupied}")

    annual = data["england"]["sectors"]["general_acute"]
    if annual != {"available":105446.26,"occupied":96057.96,"occupancy_percent":91.1}:
        raise RuntimeError(f"Annual day-weighted general and acute values changed: {annual}")
    if data["provider_count"] != 187:
        raise RuntimeError(f"Expected 187 providers with overnight beds; found {data['provider_count']}")

    print("Validated all four published England quarters and the annual weighted view.")


if __name__ == "__main__":
    main()
