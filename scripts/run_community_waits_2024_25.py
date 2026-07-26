# ============================================================
# 00. RUN THE COMMUNITY WAITING-LIST BUILD WITH STRICT COLUMNS
# ============================================================
# The workbook contains summary columns after the service-line matrix. Restrict
# every March table to columns explicitly labelled as adult or CYP services so
# published totals are not counted a second time.
#
# The England national-overview table is the authoritative source for England's
# wait-band totals. Service-line cells can differ slightly because of lower-level
# disclosure and rounding, so they remain useful for the profile but not the
# national headline.

from __future__ import annotations

import build_community_waits_2024_25 as build


_original_read_organisation_table = build.read_organisation_table
_original_build_geography = build.build_geography


def read_service_columns_only(content: bytes,sheet_name: str):
    frame,columns = _original_read_organisation_table(content,sheet_name)
    service_columns = [column for column in columns if column.startswith("(A)") or column.startswith("(CYP)")]
    return frame,service_columns


def use_national_overview_for_england(*args,**kwargs):
    geography = _original_build_geography(*args,**kwargs)
    if geography["type"] != "National":
        return geography

    exact_bands = {
        "zero_to_one":115671,
        "one_to_two":102899,
        "two_to_four":161942,
        "four_to_twelve":337814,
        "twelve_to_eighteen":104063,
        "eighteen_to_fifty_two":186015,
        "fifty_two_to_104":61942,
        "over_104":15770,
    }

    under_18 = sum(exact_bands[key] for key in [
        "zero_to_one","one_to_two","two_to_four","four_to_twelve","twelve_to_eighteen"
    ])
    eighteen_to_52 = exact_bands["eighteen_to_fifty_two"]
    over_52 = exact_bands["fifty_two_to_104"] + exact_bands["over_104"]
    classified_total = under_18 + eighteen_to_52 + over_52
    total = geography["waiting_list"]["total"]

    geography["bands"] = exact_bands
    geography["waiting_list"].update({
        "classified_total":classified_total,
        "band_coverage_percent":build.percentage(classified_total,total),
        "under_18":under_18,
        "eighteen_to_52":eighteen_to_52,
        "fifty_two_to_104":exact_bands["fifty_two_to_104"],
        "over_104":exact_bands["over_104"],
        "over_52":over_52,
        "adult_over_52":9987,
        "cyp_over_52":67725,
    })

    for node_id,count in {
        "community-under-18":under_18,
        "community-18-52":eighteen_to_52,
        "community-over-52":over_52,
    }.items():
        geography["metrics"][node_id].update({
            "count":count,
            "percent":build.percentage(count,classified_total),
            "denominator":classified_total,
        })

    return geography


build.read_organisation_table = read_service_columns_only
build.build_geography = use_national_overview_for_england
build.main()
