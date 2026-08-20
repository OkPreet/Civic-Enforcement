from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_refresh_token,
    validate_refresh_token,
    verify_password,
)
from ..database import get_db
from ..models import User
from ..ratelimit import client_ip, login_limiter
from ..schemas import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token_response(user: User, db: Session) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user, db),
        role=user.role,
        username=user.username,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Self-service account creation. New accounts get the citizen role; an
    authority can promote them later from the admin panel."""
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if db.query(User).filter(User.username == username).count() > 0:
        raise HTTPException(status_code=409, detail="Username already exists")
    if payload.email and db.query(User).filter(User.email == payload.email).count() > 0:
        raise HTTPException(status_code=409, detail="Email already in use")
    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        email=payload.email,
        role="citizen",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user, db)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    login_limiter.hit(client_ip(request))
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return _token_response(user, db)


@router.post("/login/form", response_model=TokenResponse)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    login_limiter.hit(client_ip(request))
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return _token_response(user, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    user = validate_refresh_token(payload.refresh_token, db)
    revoke_refresh_token(payload.refresh_token, db)  # rotate: old token dies
    return _token_response(user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(payload.refresh_token, db)
    return None


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
