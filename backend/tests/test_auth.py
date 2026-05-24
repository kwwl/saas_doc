import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.auth import register, login


# --- Security unit tests ---

def test_hash_password_not_plaintext():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert len(hashed) > 20


def test_verify_password_correct():
    hashed = hash_password("mysecretpassword")
    assert verify_password("mysecretpassword", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("mysecretpassword")
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_token():
    data = {"sub": "user-id-123", "org": "org-id-456", "role": "admin"}
    with patch("app.core.security.settings") as mock_settings:
        mock_settings.SECRET_KEY = "test-secret"
        mock_settings.ALGORITHM = "HS256"
        mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        token = create_access_token(data)
        decoded = decode_access_token(token)
    assert decoded["sub"] == "user-id-123"
    assert decoded["org"] == "org-id-456"
    assert decoded["role"] == "admin"


# --- Service unit tests ---

def _make_db(existing_user=None):
    db = MagicMock()
    query_mock = MagicMock()
    query_mock.filter.return_value.first.return_value = existing_user
    db.query.return_value = query_mock
    return db


def test_register_duplicate_email():
    db = _make_db(existing_user=MagicMock())
    payload = RegisterRequest(organization_name="Acme", email="test@test.com", password="pass123")
    with pytest.raises(HTTPException) as exc:
        register(payload, db)
    assert exc.value.status_code == 400


def test_login_invalid_credentials():
    db = _make_db(existing_user=None)
    payload = LoginRequest(email="test@test.com", password="wrong")
    with pytest.raises(HTTPException) as exc:
        login(payload, db)
    assert exc.value.status_code == 401


def test_login_wrong_password():
    fake_user = MagicMock()
    fake_user.password_hash = hash_password("correctpassword")
    db = _make_db(existing_user=fake_user)
    payload = LoginRequest(email="test@test.com", password="wrongpassword")
    with pytest.raises(HTTPException) as exc:
        login(payload, db)
    assert exc.value.status_code == 401
