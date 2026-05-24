from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    siren: Optional[str] = Field(None, min_length=9, max_length=9, pattern=r"^\d{9}$")
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=32)


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    siren: Optional[str] = Field(None, min_length=9, max_length=9, pattern=r"^\d{9}$")
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=32)


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    siren: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    organization_id: UUID
    created_at: Optional[datetime] = None
