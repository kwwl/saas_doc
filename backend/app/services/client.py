from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


def _get_owned(client_id: UUID, organization_id: UUID, db: Session) -> Client:
    """Return a client iff it belongs to the given organization, else 404.

    404 (not 403) is intentional: do not leak the existence of other orgs' rows.
    """
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.organization_id == organization_id)
        .first()
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


def create(payload: ClientCreate, organization_id: UUID, db: Session) -> Client:
    client = Client(
        name=payload.name,
        siren=payload.siren,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        organization_id=organization_id,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def list_clients(organization_id: UUID, db: Session) -> list[Client]:
    return (
        db.query(Client)
        .filter(Client.organization_id == organization_id)
        .order_by(Client.created_at.desc())
        .all()
    )


def get(client_id: UUID, organization_id: UUID, db: Session) -> Client:
    return _get_owned(client_id, organization_id, db)


def update(
    client_id: UUID,
    payload: ClientUpdate,
    organization_id: UUID,
    db: Session,
) -> Client:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    client = _get_owned(client_id, organization_id, db)
    for field, value in updates.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


def delete(client_id: UUID, organization_id: UUID, db: Session) -> None:
    client = _get_owned(client_id, organization_id, db)
    db.delete(client)
    db.commit()
