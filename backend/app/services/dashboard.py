"""Dashboard aggregation queries.

CRITICAL: every query in this module MUST be filtered by organization_id.
Defense-in-depth: JOINs that pull client/user data also re-filter on the
join target's organization where it is loadbearing, so no row from another
organization can ever leak into a caller's dashboard — even if a future
data inconsistency made the FKs cross orgs.
"""
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.document import Document
from app.models.user import User
from app.schemas.dashboard import (
    DashboardResponse,
    RecentClientItem,
    RecentDocumentItem,
)

RECENT_LIMIT = 5


def get_summary(organization_id: UUID, db: Session) -> DashboardResponse:
    # 1. Totals — each filtered by organization_id
    total_clients = (
        db.query(func.count(Client.id))
        .filter(Client.organization_id == organization_id)
        .scalar()
        or 0
    )
    total_documents = (
        db.query(func.count(Document.id))
        .filter(Document.organization_id == organization_id)
        .scalar()
        or 0
    )
    total_storage_bytes = (
        db.query(func.coalesce(func.sum(Document.size_bytes), 0))
        .filter(Document.organization_id == organization_id)
        .scalar()
        or 0
    )

    # 2. Recent documents (JOIN client + user, double-scoped on document AND client)
    recent_doc_rows = (
        db.query(
            Document,
            Client.name.label("client_name"),
            User.email.label("uploaded_by_email"),
        )
        .join(Client, Document.client_id == Client.id)
        .join(User, Document.uploaded_by_id == User.id)
        .filter(Document.organization_id == organization_id)
        .filter(Client.organization_id == organization_id)  # defense in depth
        .order_by(Document.created_at.desc())
        .limit(RECENT_LIMIT)
        .all()
    )
    recent_documents = [
        RecentDocumentItem(
            id=doc.id,
            filename=doc.filename,
            mime_type=doc.mime_type,
            size_bytes=doc.size_bytes,
            client_id=doc.client_id,
            client_name=client_name,
            uploaded_by_email=uploaded_by_email,
            created_at=doc.created_at,
        )
        for doc, client_name, uploaded_by_email in recent_doc_rows
    ]

    # 3. Recent clients with their document counts.
    # Subquery is itself scoped on Document.organization_id, so a client from
    # this org will only ever see counts of documents from the same org.
    doc_count_subq = (
        db.query(
            Document.client_id.label("client_id"),
            func.count(Document.id).label("doc_count"),
        )
        .filter(Document.organization_id == organization_id)
        .group_by(Document.client_id)
        .subquery()
    )
    recent_client_rows = (
        db.query(
            Client,
            func.coalesce(doc_count_subq.c.doc_count, 0).label("document_count"),
        )
        .outerjoin(doc_count_subq, Client.id == doc_count_subq.c.client_id)
        .filter(Client.organization_id == organization_id)
        .order_by(Client.created_at.desc())
        .limit(RECENT_LIMIT)
        .all()
    )
    recent_clients = [
        RecentClientItem(
            id=client.id,
            name=client.name,
            document_count=int(doc_count),
            created_at=client.created_at,
        )
        for client, doc_count in recent_client_rows
    ]

    return DashboardResponse(
        total_clients=int(total_clients),
        total_documents=int(total_documents),
        total_storage_bytes=int(total_storage_bytes),
        recent_documents=recent_documents,
        recent_clients=recent_clients,
    )
