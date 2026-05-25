from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RecentDocumentItem(BaseModel):
    """Lightweight document summary for the dashboard recent-activity feed."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    client_id: UUID
    client_name: str
    uploaded_by_email: str
    created_at: Optional[datetime] = None


class RecentClientItem(BaseModel):
    """Lightweight client summary with its document count."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    document_count: int
    created_at: Optional[datetime] = None


class DashboardResponse(BaseModel):
    """Aggregated activity snapshot for the caller's organization."""

    total_clients: int
    total_documents: int
    total_storage_bytes: int
    recent_documents: list[RecentDocumentItem]
    recent_clients: list[RecentClientItem]
