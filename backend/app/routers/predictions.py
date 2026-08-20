from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_authority
from ..database import get_db
from ..models import Report, User
from ..predict import risk
from ..schemas import HotspotOut

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

RISK_BINS = {0: "low", 1: "medium", 2: "high"}


@router.get("/hotspots", response_model=List[HotspotOut])
def hotspots(
    top: int = 10,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Zone x hour x day-of-week risk ranking from historical reports."""
    rows = (
        db.query(
            Report.location,
            func.strftime("%H", Report.reported_at),
            func.strftime("%w", Report.reported_at),
            func.count(Report.id),
            func.max(Report.fine_amount),
        )
        .group_by(Report.location, func.strftime("%H", Report.reported_at), func.strftime("%w", Report.reported_at))
        .all()
    )

    if not rows:
        return []

    counts = [r[3] for r in rows]
    max_count = max(counts) or 1

    result = []
    for location, hour, dow, count, fine in rows:
        result.append(
            HotspotOut(
                zone=location or "Unknown",
                hour=int(hour),
                day_of_week=int(dow) % 7,  # strftime %w: 0=Sun -> shift to 0=Mon
                count=count,
                risk=round(count / max_count, 3),
                fine_amount=fine or 500,
            )
        )

    result.sort(key=lambda h: (h.risk, h.count), reverse=True)
    return result[:top]


@router.get("/risk/{public_id}")
def report_risk(
    public_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    report = db.query(Report).filter(Report.public_id == public_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    score = risk.risk_score(report, db)
    band = "high" if score >= 0.7 else ("medium" if score >= 0.4 else "low")
    return {
        "public_id": report.public_id,
        "score": score,
        "band": band,
        "model": "gbm" if risk.gbm_risk(report, db) is not None else "heuristic",
    }
