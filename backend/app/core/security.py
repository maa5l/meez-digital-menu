from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

ROLE_HIERARCHY = {
    UserRole.viewer: 1,
    UserRole.staff: 2,
    UserRole.owner: 3,
    UserRole.admin: 4,
}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(*, user_id: UUID, venue_id: UUID, role: UserRole, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user_id),
        "venue_id": str(venue_id),
        "role": role.value,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


class CurrentUser:
    def __init__(self, user: User, token_payload: dict):
        self.user = user
        self.token_payload = token_payload

    @property
    def id(self) -> UUID:
        return self.user.id

    @property
    def venue_id(self) -> UUID:
        return self.user.venue_id

    @property
    def role(self) -> UserRole:
        return self.user.role

    def has_role(self, minimum: UserRole) -> bool:
        return ROLE_HIERARCHY[self.role] >= ROLE_HIERARCHY[minimum]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == UUID(user_id), User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return CurrentUser(user=user, token_payload=payload)


def require_role(minimum: UserRole):
    def _checker(current: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if not current.has_role(minimum):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current

    return _checker


RequireStaff = Annotated[CurrentUser, Depends(require_role(UserRole.staff))]
RequireViewer = Annotated[CurrentUser, Depends(require_role(UserRole.viewer))]
