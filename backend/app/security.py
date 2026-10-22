from datetime import datetime, timedelta, timezone
from functools import cache

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


@cache
def dummy_hash() -> str:
    """Used to spend the same time on unknown emails as on wrong passwords."""
    return hash_password("not-a-real-password")


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    lifetime = expires_delta if expires_delta is not None else timedelta(
        minutes=settings.access_token_expire_minutes
    )
    # Only the user id goes in the token. The role is read from the database on every
    # request, so a role change takes effect immediately.
    payload = {"sub": str(user_id), "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "sub"]},
    )
