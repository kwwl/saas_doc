"""Local filesystem storage for uploaded documents.

Path layout: {UPLOAD_DIR}/{org_id}/{client_id}/{document_id}

The on-disk file name is the document UUID only — no original filename, no
extension. The original filename and MIME type live in the DB. This avoids
path-traversal risks entirely and keeps the layout deterministic.
"""
from pathlib import Path
from uuid import UUID

from app.core.config import settings

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)


def _base_dir() -> Path:
    return Path(settings.UPLOAD_DIR).resolve()


def _relative_path(organization_id: UUID, client_id: UUID, document_id: UUID) -> str:
    return f"{organization_id}/{client_id}/{document_id}"


def absolute_path(storage_path: str) -> Path:
    """Resolve a stored relative path to an absolute path, guarded against traversal."""
    base = _base_dir()
    target = (base / storage_path).resolve()
    if base not in target.parents and base != target:
        raise ValueError(f"Resolved path escapes upload root: {storage_path}")
    return target


def save_bytes(
    content: bytes,
    organization_id: UUID,
    client_id: UUID,
    document_id: UUID,
) -> str:
    """Persist content bytes under the org/client/doc layout. Returns the relative storage_path."""
    rel = _relative_path(organization_id, client_id, document_id)
    abs_path = absolute_path(rel)
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(content)
    return rel


def delete_file(storage_path: str) -> bool:
    """Delete a stored file. Returns True if removed, False if it was already gone."""
    abs_path = absolute_path(storage_path)
    if not abs_path.exists():
        return False
    abs_path.unlink()
    return True
