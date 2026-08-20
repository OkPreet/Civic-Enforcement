import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import config
from ..auth import get_current_user, require_authority
from ..database import get_db
from ..export import reports_to_csv, reports_to_pdf
from ..models import Challan, Report, ReviewAction, User
from ..events import hub
from ..notifications import notify
from ..ratelimit import client_ip, report_limiter
from ..storage import storage
from ..schemas import (
    GeoPoint,
    HourlyTrendPoint,
    ReportIn,
    ReportOut,
    ReviewIn,
    TopZone,
    TypeCount,
    ViolationStats,
)
from ..utils import generate_public_id

router = APIRouter(prefix="/api", tags=["reports"])

STATUSES = {
    "submitted",
    "under-review",
    "verified",
    "challan-issued",
    "rejected",
    "auto-detected",
}


def _save_upload(file: UploadFile) -> str:
    if file.content_type not in config.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = file.file.read()
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {config.MAX_UPLOAD_MB}MB limit")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    return storage.save(data, ext, file.content_type)


def _evidence_list(report: Report) -> List[str]:
    if not report.evidence:
        return []
    return [p for p in report.evidence.split(",") if p]


@router.post("/reports", response_model=ReportOut)
def create_report(
    request: Request,
    plate: str = Form(...),
    vehicle_type: Optional[str] = Form(None),
    vehicle_color: Optional[str] = Form(None),
    violation_type: str = Form(...),
    location: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    evidence_files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report_limiter.hit(f"user:{user.id}")
    report = Report(
        public_id=generate_public_id("RPT"),
        user_id=user.id,
        plate=plate.strip().upper(),
        vehicle_type=vehicle_type,
        vehicle_color=vehicle_color,
        violation_type=violation_type,
        status="submitted",
        location=location.strip(),
        lat=lat,
        lng=lng,
        description=description,
        source="citizen",
        reported_at=datetime.utcnow(),
    )

    paths: List[str] = []
    if evidence_files:
        for f in evidence_files:
            if f.filename:
                paths.append(_save_upload(f))
    report.evidence = ",".join(paths)

    db.add(report)
    db.commit()
    db.refresh(report)
    hub.publish(
        "violations",
        "report.created",
        {
            "public_id": report.public_id,
            "plate": report.plate,
            "violation_type": report.violation_type,
            "location": report.location,
            "status": report.status,
            "source": report.source,
        },
    )
    return report


@router.get("/reports", response_model=List[ReportOut])
def list_reports(
    status_filter: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Report)
    if user.role != "authority":
        query = query.filter(Report.user_id == user.id)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    if source:
        query = query.filter(Report.source == source)
    return query.order_by(Report.reported_at.desc()).limit(100).all()


@router.get("/reports/mine", response_model=List[ReportOut])
def my_reports(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Report)
        .filter(Report.user_id == user.id)
        .order_by(Report.reported_at.desc())
        .limit(100)
        .all()
    )


@router.get("/reports/export")
def export_reports(
    format: str = "csv",
    zone: Optional[str] = None,
    status_filter: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    """Export reports as CSV or PDF with optional filters.

    date_from / date_to are ISO dates (YYYY-MM-DD) on `reported_at`.
    """
    if format not in {"csv", "pdf"}:
        raise HTTPException(status_code=400, detail="format must be 'csv' or 'pdf'")

    query = db.query(Report)
    if zone:
        query = query.filter(Report.location == zone)
    if status_filter:
        if status_filter not in STATUSES:
            raise HTTPException(status_code=400, detail=f"unknown status '{status_filter}'")
        query = query.filter(Report.status == status_filter)
    if source:
        if source not in {"citizen", "camera"}:
            raise HTTPException(status_code=400, detail="source must be 'citizen' or 'camera'")
        query = query.filter(Report.source == source)
    if date_from:
        try:
            parsed = datetime.strptime(date_from, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from must be YYYY-MM-DD")
        query = query.filter(Report.reported_at >= parsed)
    if date_to:
        try:
            parsed = datetime.strptime(date_to, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to must be YYYY-MM-DD")
        query = query.filter(Report.reported_at <= parsed.replace(hour=23, minute=59, second=59))

    reports = query.order_by(Report.reported_at.desc()).limit(5000).all()

    stamp = datetime.utcnow().strftime("%Y%m%d")
    if format == "csv":
        content = reports_to_csv(reports)
        media_type = "text/csv"
        filename = f"reports-{stamp}.csv"
    else:
        content = reports_to_pdf(reports)
        media_type = "application/pdf"
        filename = f"reports-{stamp}.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/{public_id}", response_model=ReportOut)
def get_report(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.public_id == public_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if user.role != "authority" and report.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your report")
    return report


@router.post("/reports/{public_id}/review", response_model=ReportOut)
def review_report(
    public_id: str,
    payload: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    if payload.action not in {"confirmed", "rejected"}:
        raise HTTPException(status_code=400, detail="action must be 'confirmed' or 'rejected'")

    report = db.query(Report).filter(Report.public_id == public_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.action == "confirmed":
        report.status = "challan-issued"
        report.fine_amount = report.fine_amount or 500
        challan = Challan(
            public_id=generate_public_id("CHL"),
            report_id=report.id,
            amount=report.fine_amount,
            vehicle_plate=report.plate,
            status="pending",
        )
        db.add(challan)
    else:
        report.status = "rejected"

    report.reviewer_notes = payload.notes
    report.reviewed_by = user.id
    report.reviewed_at = datetime.utcnow()

    # Log the officer decision — this is the labeled data for the future GBM
    db.add(
        ReviewAction(
            report_id=report.id,
            reviewer_id=user.id,
            action=payload.action,
            notes=payload.notes,
        )
    )

    # Notify the reporter
    if report.user_id:
        title = "Report confirmed" if payload.action == "confirmed" else "Report rejected"
        body = (
            f"Your report {report.public_id} for {report.plate} was confirmed "
            f"and a challan of ₹{report.fine_amount} was issued."
            if payload.action == "confirmed"
            else f"Your report {report.public_id} for {report.plate} was rejected: {payload.notes or 'insufficient evidence'}."
        )
        notify(db, report.user_id, title, body, ntype="report", ref_id=report.public_id)

    db.commit()
    db.refresh(report)
    hub.publish(
        "violations",
        "report.reviewed",
        {"public_id": report.public_id, "plate": report.plate, "status": report.status},
    )
    return report


@router.get("/violations/stats", response_model=ViolationStats)
def violation_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    def count(status_filter: Optional[str] = None) -> int:
        q = db.query(Report)
        if status_filter:
            q = q.filter(Report.status == status_filter)
        return q.count()

    return ViolationStats(
        total=count(),
        pending_review=count("submitted") + count("under-review"),
        verified=count("verified"),
        challan_issued=count("challan-issued"),
        rejected=count("rejected"),
    )


@router.get("/violations/geo", response_model=List[GeoPoint])
def violations_geo(
    cluster: bool = True,
    radius: int = 3,  # decimal places when clustering (~110m at the equator)
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Raw lat/lng points for the GIS heatmap.

    cluster=True groups nearby reports (rounded to `radius` decimals) so the
    frontend can draw an intensity heat layer. Returns citizen + camera points.
    """
    if not 0 <= radius <= 6:
        raise HTTPException(status_code=400, detail="radius must be between 0 and 6")
    rows = db.query(Report.lat, Report.lng, Report.violation_type, Report.source).filter(
        Report.lat.isnot(None), Report.lng.isnot(None)
    ).all()
    if not rows:
        return []

    if cluster:
        buckets: dict = {}
        for lat, lng, vtype, source in rows:
            key = (round(lat, radius), round(lng, radius), vtype)
            buckets.setdefault(key, [lat, lng, vtype, source, 0])[4] += 1
        return [
            GeoPoint(lat=b[0], lng=b[1], violation_type=b[2], source=b[3], count=b[4])
            for b in buckets.values()
        ]

    return [GeoPoint(lat=lat, lng=lng, violation_type=vtype, source=source, count=1) for lat, lng, vtype, source in rows]


@router.get("/violations/trend", response_model=List[HourlyTrendPoint])
def violation_trend(
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    from collections import Counter

    reports = db.query(Report).all()
    buckets = Counter(datetime.fromisoformat(r.reported_at.isoformat()).hour for r in reports)

    points = []
    counts = []
    for hour in range(24):
        count = buckets.get(hour, 0)
        counts.append(count)
        points.append({"hour": f"{hour:02d}:00", "count": count, "predicted": count})

    # simple 3-hour centered moving average as the "predicted" baseline
    n = len(counts)
    for i, p in enumerate(points):
        window = counts[max(0, i - 1) : i + 2]
        p["predicted"] = round(sum(window) / len(window)) if window else 0

    return points


@router.get("/violations/by-type", response_model=List[TypeCount])
def violations_by_type(
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    rows = (
        db.query(Report.violation_type, func.count(Report.id))
        .group_by(Report.violation_type)
        .order_by(func.count(Report.id).desc())
        .all()
    )
    return [{"type": t, "count": c} for t, c in rows]


@router.get("/violations/top-zones", response_model=List[TopZone])
def top_zones(
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    from collections import defaultdict
    from datetime import timedelta

    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(Report.location, func.count(Report.id))
        .group_by(Report.location)
        .order_by(func.count(Report.id).desc())
        .limit(5)
        .all()
    )

    prev = db.query(Report.location, func.count(Report.id)).filter(
        Report.reported_at < today
    ).group_by(Report.location).all()
    prev_counts = defaultdict(int)
    for loc, c in prev:
        prev_counts[loc] = c

    result = []
    for loc, c in rows:
        prev_c = prev_counts.get(loc, 0)
        trend = round(((c - prev_c) / prev_c) * 100) if prev_c > 0 else 0
        result.append({"name": loc or "Unknown", "count": c, "trend": trend})
    return result
