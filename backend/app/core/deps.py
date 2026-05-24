from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise _credentials_exc

    user_id = payload.get("sub")
    if not user_id:
        raise _credentials_exc

    try:
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise _credentials_exc

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise _credentials_exc

    return user
