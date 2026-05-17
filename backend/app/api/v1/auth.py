
from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User
from app.models.venue import Venue
from app.schemas.auth import TokenRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/token", response_model=TokenResponse)
def login(body: TokenRequest, db: DbSession):
    user = db.query(User).filter(User.email == body.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user_id=user.id, venue_id=user.venue_id, role=user.role, email=user.email)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        venue_id=user.venue_id,
        role=user.role,
    )
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: DbSession):
    venue = db.query(Venue).filter(Venue.slug == body.venue_slug).first()
    if not venue:
        venue = Venue(name=body.venue_slug.replace("-", " ").title(), slug=body.venue_slug)
        db.add(venue)
        db.flush()

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    role = body.role
    if not db.query(User).filter(User.venue_id == venue.id).first():
        role = UserRole.owner

    user = User(
        venue_id=venue.id,
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
