from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_authority
from ..database import get_db
from ..events import hub
from ..models import Challan, User
from ..notifications import notify
from ..schemas import ChallanOut, ChallanStatusIn

router = APIRouter(prefix="/api/challans", tags=["challans"])

VALID_TRANSITIONS = {"pending": {"paid", "disputed"}, "paid": set(), "disputed": {"paid"}}


def _can_transition(status: str, target: str) -> bool:
    allowed = VALID_TRANSITIONS.get(status, set())
    return target in allowed


@router.get("", response_model=List[ChallanOut])
def list_challans(
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    return db.query(Challan).order_by(Challan.issued_at.desc()).limit(100).all()


@router.post("/{public_id}/status", response_model=ChallanOut)
def update_challan_status(
    public_id: str,
    payload: ChallanStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    challan = db.query(Challan).filter(Challan.public_id == public_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")

    if payload.status not in {"paid", "disputed"}:
        raise HTTPException(status_code=400, detail="status must be 'paid' or 'disputed'")

    if not _can_transition(challan.status, payload.status):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition challan from '{challan.status}' to '{payload.status}'",
        )

    challan.status = payload.status
    if payload.status == "paid":
        from datetime import datetime

        challan.paid_at = datetime.utcnow()
    db.commit()

    # Notify the report owner (citizen) of challan status
    if challan.report and challan.report.user_id:
        label = "Paid" if payload.status == "paid" else "Disputed"
        notify(
            db,
            challan.report.user_id,
            f"Challan {challan.public_id} {label.lower()}",
            f"Challan for {challan.vehicle_plate} is now {payload.status}.",
            ntype="challan",
            ref_id=challan.public_id,
        )
        db.commit()

    db.refresh(challan)
    hub.publish(
        "violations",
        "challan.updated",
        {
            "public_id": challan.public_id,
            "plate": challan.vehicle_plate,
            "status": challan.status,
            "amount": challan.amount,
        },
    )
    return challan
