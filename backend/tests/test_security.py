from datetime import timedelta

import jwt
import pytest

from app.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_is_hashed_not_stored_in_plain_text():
    hashed = hash_password("correct-horse-battery")
    assert hashed != "correct-horse-battery"
    assert verify_password("correct-horse-battery", hashed)
    assert not verify_password("wrong-password", hashed)


def test_same_password_gets_different_hashes():
    assert hash_password("correct-horse-battery") != hash_password("correct-horse-battery")


def test_token_round_trip():
    token = create_access_token(42)
    assert decode_access_token(token)["sub"] == "42"


def test_expired_token_is_rejected():
    token = create_access_token(42, expires_delta=timedelta(minutes=-1))
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)
