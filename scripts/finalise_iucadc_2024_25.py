# ============================================================
# 00. ALIGN ENGLAND TOTALS WITH THE REVISED NHS FLOWCHART
# ============================================================
# Contract-area figures are calculated directly from the revised CSV. NHS England's
# national flowchart applies adjustments where suppliers could not provide matching
# numerator/denominator months. These published national values therefore replace
# the simple contract-area sum for the England view.

from __future__ import annotations

import json
from pathlib import Path


PATH = Path("public-data/iucadc-2024-25.json")


def pct(numerator: int, denominator: int) -> float:
    return round((numerator / denominator) * 100, 2)


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    england = data["england"]

    calls_received = 19_968_400
    calls_answered = 18_768_100
    calls_abandoned = 658_000
    clinical_assessment = 7_835_400
    final_dispositions = 17_593_300
    appointments_total = 3_342_100

    england["calls"].update({
        "received":calls_received,
        "answered":calls_answered,
        "answered_percent":pct(calls_answered,calls_received),
        "abandoned":calls_abandoned,
        "abandoned_percent":3.0,
        "final_dispositions":final_dispositions,
    })

    england["metrics"]["nhs111-contacts"].update({"count":calls_received})
    england["metrics"]["nhs111-triage"].update({
        "count":clinical_assessment,
        "percent":45.0,
        "published_adjusted_percent":True,
    })
    england["metrics"]["nhs111-ae-disposition"].update({
        "count":1_213_100,
        "denominator":final_dispositions,
        "percent":7.0,
        "published_adjusted_percent":True,
    })
    england["metrics"]["nhs111-direct-booking"].update({
        "count":appointments_total,
        "denominator":final_dispositions,
        "percent":19.0,
        "published_adjusted_percent":True,
    })

    published_dispositions = {
        "ambulance":(2_097_900,12.0),
        "emergency_department":(1_213_100,7.0),
        "primary_care":(7_661_600,44.0),
        "dental":(1_009_600,6.0),
        "self_care":(1_484_800,8.0),
    }
    for key,(count,percent) in published_dispositions.items():
        england["dispositions"][key].update({
            "count":count,
            "percent":percent,
            "published_adjusted_percent":True,
        })

    england["bookings"].update({
        "total":appointments_total,
        "percent_of_dispositions":19.0,
        "published_adjusted_percent":True,
    })
    published_bookings = {
        "gp":1_300_000,
        "iuc":818_000,
        "utc":466_600,
        "ed":345_900,
    }
    for key,count in published_bookings.items():
        england["bookings"]["breakdown"][key]["count"] = count

    england["national_method"] = "Revised NHS England 2024-25 flowchart; percentages adjusted for missing numerator/denominator months where stated."
    PATH.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
    print("Aligned England IUC figures with revised NHS England flowchart")


if __name__ == "__main__":
    main()
