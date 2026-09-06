"""
auth.py
CRM Authentication router.

Endpoints:
  POST /api/auth/login    → { access_token, token_type, user }
  GET  /api/auth/me       → current user info (requires Bearer token)
  POST /api/auth/logout   → (client just discards token; no server-side invalidation for JWT)

Passwords are hashed with bcrypt via passlib.
Tokens are signed JWTs using the SECRET_KEY from config.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Crypto setup ──────────────────────────────────────────────────────────────

pwd_context = None  # not used — direct bcrypt below
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserInfo(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    showroom_id: Optional[str]
    is_active: bool


# ── Password helpers ──────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (cost factor 12)."""
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    email: str = payload.get("sub", "")
    if not email:
        return None
    return get_user_by_email(db, email)


# ── Seed helper (called from main.py startup) ─────────────────────────────────

def seed_default_admin(db: Session) -> None:
    """
    Create the default admin user if it doesn't already exist.
    Credentials: admin@showroom.com / admin123
    Change via env vars CRM_ADMIN_EMAIL / CRM_ADMIN_PASSWORD in production.
    """
    import os
    admin_email    = os.environ.get("CRM_ADMIN_EMAIL", "admin@showroom.com")
    admin_password = os.environ.get("CRM_ADMIN_PASSWORD", "admin123")

    existing = get_user_by_email(db, admin_email)
    if existing:
        return  # Already seeded

    admin = User(
        email=admin_email.lower().strip(),
        hashed_password=hash_password(admin_password),
        full_name="Showroom Admin",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"[Auth] Seeded default admin user: {admin_email}")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    JSON login endpoint.
    Accepts: { "email": "...", "password": "..." }
    Returns: { "access_token": "...", "token_type": "bearer", "user": {...} }
    """
    user = authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "showroom_id": user.showroom_id,
        },
    )



@router.get("/me", response_model=UserInfo)
def get_me(current_user: Optional[User] = Depends(get_current_user)):
    """Return current authenticated user info."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        showroom_id=current_user.showroom_id,
        is_active=current_user.is_active,
    )


@router.post("/logout")
def logout():
    """Client-side logout — JWT is stateless, client just discards the token."""
    return {"message": "Logged out successfully"}
