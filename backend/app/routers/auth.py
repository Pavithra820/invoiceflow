from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserRole
from app.schemas import Token, UserCreate, UserOut
from app.security import create_access_token, dummy_hash, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User).where(User.email == payload.email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    # The very first account becomes the admin; everyone after that starts as a viewer.
    is_first_user = (db.scalar(select(func.count(User.id))) or 0) == 0
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.ADMIN if is_first_user else UserRole.VIEWER,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    user = db.scalar(select(User).where(User.email == form.username.strip().lower()))
    if user is None:
        verify_password(form.password, dummy_hash())  # keep timing similar
    if user is None or not user.is_active or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
