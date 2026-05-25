from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    """Metadata exposed to API clients. Never includes storage_path (server-internal)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    organization_id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_by_id: UUID
    created_at: Optional[datetime] = None
