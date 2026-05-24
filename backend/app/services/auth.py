from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import Organization, User
from app.schemas.auth import LoginRequest, RegisterRequest


def register(payload: RegisterRequest, db: Session) -> dict:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    org = Organization(name=payload.organization_name)
    db.add(org)
    db.flush()

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="admin",
        organization_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "org": str(user.organization_id),
        "role": user.role,
    })
    return {"access_token": token, "token_type": "bearer"}


def login(payload: LoginRequest, db: Session) -> dict:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "org": str(user.organization_id),
        "role": user.role,
    })
    return {"access_token": token, "token_type": "bearer"}
