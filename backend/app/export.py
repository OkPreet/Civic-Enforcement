"""Serialisation helpers for report exports (CSV + PDF)."""

import csv
import io
from datetime import datetime
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Report

CSV_HEADERS = [
    "Public ID",
    "Plate",
    "Vehicle Type",
    "Violation Type",
    "Location",
    "Status",
    "Source",
    "Fine (INR)",
    "Confidence",
    "Reported At",
    "Reviewed At",
]


def _report_row(r: Report) -> List[str]:
    return [
        r.public_id,
        r.plate,
        r.vehicle_type or "",
        r.violation_type,
        r.location,
        r.status,
        r.source,
        str(r.fine_amount or ""),
        f"{r.confidence:.2f}" if r.confidence is not None else "",
        r.reported_at.strftime("%Y-%m-%d %H:%M") if r.reported_at else "",
        r.reviewed_at.strftime("%Y-%m-%d %H:%M") if r.reviewed_at else "",
    ]


def reports_to_csv(reports: List[Report]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_HEADERS)
    for r in reports:
        writer.writerow(_report_row(r))
    return buf.getvalue().encode("utf-8")


def reports_to_pdf(reports: List[Report], title: str = "Violation Reports") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), rightMargin=12 * mm, leftMargin=12 * mm, topMargin=12 * mm, bottomMargin=12 * mm)
    styles = getSampleStyleSheet()

    story = [
        Paragraph(title, styles["Title"]),
        Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} · {len(reports)} report(s)", styles["Italic"]),
        Spacer(1, 6 * mm),
    ]

    data = [CSV_HEADERS] + [_report_row(r) for r in reports]
    table = Table(data, repeatRows=1, colWidths=[28 * mm, 26 * mm, 26 * mm, 34 * mm, 40 * mm, 24 * mm, 18 * mm, 20 * mm, 16 * mm, 30 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buf.getvalue()
