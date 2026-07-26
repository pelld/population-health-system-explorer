# ============================================================
# 00. RUN THE COMMUNITY WAITING-LIST BUILD WITH STRICT COLUMNS
# ============================================================
# The workbook contains summary columns after the service-line matrix. Restrict
# every March table to columns explicitly labelled as adult or CYP services so
# published totals are not counted a second time.

from __future__ import annotations

import scripts.build_community_waits_2024_25 as build


_original_read_organisation_table = build.read_organisation_table


def read_service_columns_only(content: bytes,sheet_name: str):
    frame,columns = _original_read_organisation_table(content,sheet_name)
    service_columns = [column for column in columns if column.startswith("(A)") or column.startswith("(CYP)")]
    return frame,service_columns


build.read_organisation_table = read_service_columns_only
build.main()
