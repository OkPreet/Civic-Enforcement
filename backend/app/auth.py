import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .models import RefreshToken, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return salt.hex() + ":" + digest.hex()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)


def create_refresh_token(user: User, db: Session) -> str:
    token = secrets.token_hex(32)
    db.add(
        RefreshToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()
    return token


def validate_refresh_token(token: str, db: Session) -> User:
    """Return the user for a valid, unrevoked, unexpired refresh token."""
    row = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if not row or row.revoked:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired")
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def revoke_refresh_token(token: str, db: Session) -> None:
    row = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if row:
        row.revoked = True
        db.commit()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise credentials_error

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_authority(user: User = Depends(get_current_user)) -> User:
    if user.role != "authority":
        raise HTTPException(status_code=403, detail="Authority privileges required")
    return user
