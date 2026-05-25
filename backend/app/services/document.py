from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.storage import (
    ALLOWED_MIME_TYPES,
    absolute_path,
    delete_file,
    save_bytes,
)
from app.models.client import Client
from app.models.document import Document


def _get_owned_client(client_id: UUID, organization_id: UUID, db: Session) -> Client:
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.organization_id == organization_id)
        .first()
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


def _get_owned_document(document_id: UUID, organization_id: UUID, db: Session) -> Document:
    """Return a document iff it belongs to the given organization, else 404.

    404 (not 403) is intentional: do not leak the existence of other orgs' rows.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.organization_id == organization_id)
        .first()
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


def upload(
    client_id: UUID,
    content: bytes,
    filename: str,
    mime_type: str,
    uploaded_by_id: UUID,
    organization_id: UUID,
    db: Session,
) -> Document:
    # 1. MIME validation
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {mime_type}. Allowed: {sorted(ALLOWED_MIME_TYPES)}",
        )

    # 2. Size validation
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    # 3. Filename validation
    safe_filename = (filename or "").strip()
    if not safe_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    # 4. Client ownership check (multi-tenant)
    _get_owned_client(client_id, organization_id, db)

    # 5. Persist on disk first (so DB row never references a missing file)
    document_id = uuid4()
    storage_path = save_bytes(content, organization_id, client_id, document_id)

    # 6. Create DB row; on commit failure, roll back AND remove the orphaned file
    try:
        document = Document(
            id=document_id,
            client_id=client_id,
            organization_id=organization_id,
            filename=safe_filename,
            storage_path=storage_path,
            mime_type=mime_type,
            size_bytes=len(content),
            uploaded_by_id=uploaded_by_id,
        )
        db.add(document)
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        delete_file(storage_path)
        raise

    return document


def list_for_client(
    client_id: UUID,
    organization_id: UUID,
    db: Session,
) -> list[Document]:
    # Ensure the client itself belongs to the org (avoid leaking client existence)
    _get_owned_client(client_id, organization_id, db)

    return (
        db.query(Document)
        .filter(
            Document.client_id == client_id,
            Document.organization_id == organization_id,
        )
        .order_by(Document.created_at.desc())
        .all()
    )


def get(document_id: UUID, organization_id: UUID, db: Session) -> Document:
    return _get_owned_document(document_id, organization_id, db)


def get_file_path(document_id: UUID, organization_id: UUID, db: Session) -> tuple[Path, Document]:
    """Return (absolute file path, document row) for serving a download."""
    document = _get_owned_document(document_id, organization_id, db)
    abs_path = absolute_path(document.storage_path)
    if not abs_path.exists():
        # DB/disk desync — treat as gone
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file missing on disk",
        )
    return abs_path, document


def delete(document_id: UUID, organization_id: UUID, db: Session) -> None:
    document = _get_owned_document(document_id, organization_id, db)
    storage_path = document.storage_path

    # DB first: if disk delete later fails, we have an orphan file (cleanable),
    # not a DB row pointing to a real file we falsely 'deleted'.
    db.delete(document)
    db.commit()
    delete_file(storage_path)
