from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Notification, User
from ..schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        query = query.filter(Notification.read.is_(False))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/unread-count", response_model=int)
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read.is_(False))
        .count()
    )


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    db.refresh(n)
    return n


@router.post("/read-all", response_model=List[NotificationOut])
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.read.is_(False)
    ).all()
    for n in rows:
        n.read = True
    db.commit()
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
