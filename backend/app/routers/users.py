from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_authority
from ..database import get_db
from ..models import User, Zone
from ..schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _validate_role(role: str) -> str:
    if role not in {"citizen", "authority"}:
        raise HTTPException(status_code=400, detail="role must be 'citizen' or 'authority'")
    return role


def _validate_zone(db: Session, zone_id: int) -> None:
    if zone_id is not None and db.get(Zone, zone_id) is None:
        raise HTTPException(status_code=400, detail="assigned_zone_id does not exist")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("", response_model=List[UserOut])
def list_users(
    role: str = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(require_authority),
):
    query = db.query(User)
    if role:
        _validate_role(role)
        query = query.filter(User.role == role)
    if active_only:
        query = query.filter(User.is_active.is_(True))
    return query.order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_authority),
):
    if db.query(User).filter(User.username == payload.username).count() > 0:
        raise HTTPException(status_code=409, detail="Username already exists")
    _validate_role(payload.role)
    if payload.badge_id and db.query(User).filter(User.badge_id == payload.badge_id).count() > 0:
        raise HTTPException(status_code=409, detail="Badge ID already in use")
    _validate_zone(db, payload.assigned_zone_id)

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        badge_id=payload.badge_id,
        assigned_zone_id=payload.assigned_zone_id,
        area=payload.area,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_authority),
):
    user = _get_user_or_404(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        data["role"] = _validate_role(data["role"])
    if "badge_id" in data and data["badge_id"]:
        dup = (
            db.query(User)
            .filter(User.badge_id == data["badge_id"], User.id != user_id)
            .first()
        )
        if dup:
            raise HTTPException(status_code=409, detail="Badge ID already in use")
    if "assigned_zone_id" in data:
        _validate_zone(db, data["assigned_zone_id"])
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_authority),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = _get_user_or_404(db, user_id)
    user.is_active = False  # soft delete: keep reports/challans FK references intact
    db.commit()
    return None
