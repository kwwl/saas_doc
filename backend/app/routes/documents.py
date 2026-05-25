from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services import document as document_service

router = APIRouter(tags=["documents"])


@router.post(
    "/clients/{client_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    client_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    return document_service.upload(
        client_id=client_id,
        content=content,
        filename=file.filename or "",
        mime_type=file.content_type or "",
        uploaded_by_id=current_user.id,
        organization_id=current_user.organization_id,
        db=db,
    )


@router.get(
    "/clients/{client_id}/documents",
    response_model=list[DocumentResponse],
)
def list_client_documents(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return document_service.list_for_client(
        client_id, current_user.organization_id, db
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return document_service.get(document_id, current_user.organization_id, db)


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    abs_path, document = document_service.get_file_path(
        document_id, current_user.organization_id, db
    )
    return FileResponse(
        path=abs_path,
        media_type=document.mime_type,
        filename=document.filename,
    )


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document_service.delete(document_id, current_user.organization_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
