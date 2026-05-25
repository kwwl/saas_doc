import pytest
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import HTTPException

from app.core import storage
from app.core.config import settings
from app.core.storage import (
    ALLOWED_MIME_TYPES,
    absolute_path,
    delete_file,
    save_bytes,
)
from app.services import document as doc_service


# --- Helpers ---

def _make_db(client_obj=None, document_obj=None, list_result=None):
    """Mock session where the first query returns client_obj, subsequent ones return document_obj.

    Because the upload path calls .query() once (for Client) and the delete/get paths
    call .query() once (for Document), we just need filter().first() to return the right
    thing per test scenario. Tests pass whichever object they need as the existing row.
    """
    db = MagicMock()
    query_mock = MagicMock()
    # Use document_obj first if set (single-row paths), else client_obj
    existing = document_obj if document_obj is not None else client_obj
    query_mock.filter.return_value.first.return_value = existing
    query_mock.filter.return_value.order_by.return_value.all.return_value = list_result or []
    db.query.return_value = query_mock
    return db


def _isolated_storage(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))


# --- Storage helper ---

def test_save_and_read_bytes_roundtrip(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    org, client, doc = uuid4(), uuid4(), uuid4()

    rel = save_bytes(b"hello world", org, client, doc)

    assert rel == f"{org}/{client}/{doc}"
    assert absolute_path(rel).read_bytes() == b"hello world"


def test_delete_file_idempotent(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    rel = save_bytes(b"x", uuid4(), uuid4(), uuid4())

    assert delete_file(rel) is True
    assert delete_file(rel) is False


def test_absolute_path_blocks_traversal(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    with pytest.raises(ValueError):
        absolute_path("../../etc/passwd")


def test_allowed_mime_types_contains_pdf_and_images():
    assert "application/pdf" in ALLOWED_MIME_TYPES
    assert "image/jpeg" in ALLOWED_MIME_TYPES
    assert "image/png" in ALLOWED_MIME_TYPES
    assert "image/webp" in ALLOWED_MIME_TYPES


# --- Service: upload validation (no DB/disk hit) ---

def test_upload_rejects_unsupported_mime():
    db = _make_db(client_obj=MagicMock())
    with pytest.raises(HTTPException) as exc:
        doc_service.upload(
            client_id=uuid4(),
            content=b"x",
            filename="f.exe",
            mime_type="application/x-msdownload",
            uploaded_by_id=uuid4(),
            organization_id=uuid4(),
            db=db,
        )
    assert exc.value.status_code == 400


def test_upload_rejects_oversized_file(monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)
    db = _make_db(client_obj=MagicMock())
    too_big = b"x" * (2 * 1024 * 1024)

    with pytest.raises(HTTPException) as exc:
        doc_service.upload(
            client_id=uuid4(),
            content=too_big,
            filename="big.pdf",
            mime_type="application/pdf",
            uploaded_by_id=uuid4(),
            organization_id=uuid4(),
            db=db,
        )
    assert exc.value.status_code == 413


def test_upload_rejects_empty_filename():
    db = _make_db(client_obj=MagicMock())
    with pytest.raises(HTTPException) as exc:
        doc_service.upload(
            client_id=uuid4(),
            content=b"x",
            filename="   ",
            mime_type="application/pdf",
            uploaded_by_id=uuid4(),
            organization_id=uuid4(),
            db=db,
        )
    assert exc.value.status_code == 400


# --- Service: upload + multi-tenant ---

def test_upload_cross_org_client_returns_404():
    db = _make_db(client_obj=None)  # client lookup yields nothing
    with pytest.raises(HTTPException) as exc:
        doc_service.upload(
            client_id=uuid4(),
            content=b"x",
            filename="f.pdf",
            mime_type="application/pdf",
            uploaded_by_id=uuid4(),
            organization_id=uuid4(),
            db=db,
        )
    assert exc.value.status_code == 404


def test_upload_happy_path_persists_file_and_row(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    fake_client = MagicMock()
    db = _make_db(client_obj=fake_client)
    org_id, user_id, client_id = uuid4(), uuid4(), uuid4()

    doc_service.upload(
        client_id=client_id,
        content=b"PDFDATA",
        filename="report.pdf",
        mime_type="application/pdf",
        uploaded_by_id=user_id,
        organization_id=org_id,
        db=db,
    )

    added = db.add.call_args.args[0]
    assert added.filename == "report.pdf"
    assert added.mime_type == "application/pdf"
    assert added.size_bytes == len(b"PDFDATA")
    assert added.organization_id == org_id
    assert added.client_id == client_id
    assert added.uploaded_by_id == user_id
    # File actually on disk at expected path
    on_disk = tmp_path / str(org_id) / str(client_id) / str(added.id)
    assert on_disk.read_bytes() == b"PDFDATA"
    db.commit.assert_called_once()


def test_upload_commit_failure_removes_orphan_file(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    fake_client = MagicMock()
    db = _make_db(client_obj=fake_client)
    db.commit.side_effect = RuntimeError("DB went down")
    org_id, client_id = uuid4(), uuid4()

    with pytest.raises(RuntimeError):
        doc_service.upload(
            client_id=client_id,
            content=b"data",
            filename="f.pdf",
            mime_type="application/pdf",
            uploaded_by_id=uuid4(),
            organization_id=org_id,
            db=db,
        )

    db.rollback.assert_called_once()
    # No orphan file should remain
    org_dir = tmp_path / str(org_id) / str(client_id)
    assert not any(org_dir.iterdir()) if org_dir.exists() else True


# --- Service: list / get / delete ---

def test_list_for_client_returns_query_results():
    fake_docs = [MagicMock(), MagicMock()]
    db = _make_db(client_obj=MagicMock(), list_result=fake_docs)

    result = doc_service.list_for_client(uuid4(), uuid4(), db)
    assert result == fake_docs


def test_list_for_client_cross_org_returns_404():
    db = _make_db(client_obj=None)  # client not in org
    with pytest.raises(HTTPException) as exc:
        doc_service.list_for_client(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


def test_get_document_not_found_raises_404():
    db = _make_db(document_obj=None)
    with pytest.raises(HTTPException) as exc:
        doc_service.get(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


def test_get_document_returns_owned_row():
    fake_doc = MagicMock()
    db = _make_db(document_obj=fake_doc)
    assert doc_service.get(uuid4(), uuid4(), db) is fake_doc


def test_get_file_path_returns_abs_path(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    org, client, doc_id = uuid4(), uuid4(), uuid4()
    rel = save_bytes(b"abc", org, client, doc_id)

    fake_doc = MagicMock()
    fake_doc.storage_path = rel
    db = _make_db(document_obj=fake_doc)

    abs_p, returned_doc = doc_service.get_file_path(doc_id, org, db)
    assert abs_p.read_bytes() == b"abc"
    assert returned_doc is fake_doc


def test_get_file_path_missing_disk_returns_404(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    fake_doc = MagicMock()
    fake_doc.storage_path = "nonexistent/path/here"
    db = _make_db(document_obj=fake_doc)

    with pytest.raises(HTTPException) as exc:
        doc_service.get_file_path(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


def test_delete_removes_db_row_and_file(monkeypatch, tmp_path):
    _isolated_storage(monkeypatch, tmp_path)
    org, client, doc_id = uuid4(), uuid4(), uuid4()
    rel = save_bytes(b"x", org, client, doc_id)

    fake_doc = MagicMock()
    fake_doc.storage_path = rel
    db = _make_db(document_obj=fake_doc)

    doc_service.delete(doc_id, org, db)

    db.delete.assert_called_once_with(fake_doc)
    db.commit.assert_called_once()
    assert not absolute_path(rel).exists()


def test_delete_not_found_returns_404():
    db = _make_db(document_obj=None)
    with pytest.raises(HTTPException) as exc:
        doc_service.delete(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


# --- Multi-tenant isolation guarantee ---

def test_get_filters_by_organization_id():
    """Confirm the query filter passes organization_id, so cross-org reads 404."""
    db = _make_db(document_obj=None)
    org_id = uuid4()
    doc_id = uuid4()

    with pytest.raises(HTTPException) as exc:
        doc_service.get(doc_id, org_id, db)
    assert exc.value.status_code == 404
    filter_call = db.query.return_value.filter.call_args
    assert len(filter_call.args) == 2, "expected filter on both document_id and organization_id"
