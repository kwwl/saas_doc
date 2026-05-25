"""Dashboard tests — mixed strategy: SQL/mock spies + real SQLite isolation test."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.client import Client
from app.models.document import Document
from app.models.user import Organization, User
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard as dashboard_service


# --- SQLite portability: render PostgreSQL UUID columns as CHAR(36) ---
@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(element, compiler, **kw):
    return "CHAR(36)"


# --- Mock-based tests (lightweight, fast) ---

def _scalar_mock(values):
    """Make MagicMock that returns each value from `values` on successive .scalar() calls."""
    db = MagicMock()
    db.query.return_value.filter.return_value.scalar.side_effect = list(values)
    # all the .join/.outerjoin/.filter/.order_by/.limit chains end in .all() returning []
    db.query.return_value.join.return_value.join.return_value.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    db.query.return_value.outerjoin.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    return db


def test_get_summary_returns_zeros_for_empty_org():
    db = _scalar_mock([0, 0, 0])
    result = dashboard_service.get_summary(uuid4(), db)
    assert result.total_clients == 0
    assert result.total_documents == 0
    assert result.total_storage_bytes == 0
    assert result.recent_documents == []
    assert result.recent_clients == []


def test_get_summary_handles_null_storage_sum():
    """sum() returns None on empty rows in some DBs — service must coerce to 0."""
    db = _scalar_mock([0, 0, None])
    result = dashboard_service.get_summary(uuid4(), db)
    assert result.total_storage_bytes == 0


def test_get_summary_returns_typed_counts():
    db = _scalar_mock([5, 12, 2048])
    result = dashboard_service.get_summary(uuid4(), db)
    assert result.total_clients == 5
    assert result.total_documents == 12
    assert result.total_storage_bytes == 2048
    assert isinstance(result, DashboardResponse)


def test_recent_limit_is_five():
    assert dashboard_service.RECENT_LIMIT == 5


# --- Real SQLite integration: the multi-tenant isolation proof ---

@pytest.fixture
def sqlite_session():
    """In-memory SQLite session with all tables created. Each test gets a fresh DB."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionMaker = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionMaker()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def _seed_org(session, org_name: str, user_email: str, base_time: datetime) -> dict:
    """Create an org with one user, two clients (each with two docs). Returns ids."""
    org = Organization(id=uuid4(), name=org_name, created_at=base_time)
    user = User(
        id=uuid4(),
        email=user_email,
        password_hash="hash",
        role="admin",
        organization_id=org.id,
        created_at=base_time,
    )
    client_a = Client(
        id=uuid4(),
        name=f"{org_name} ClientA",
        organization_id=org.id,
        created_at=base_time + timedelta(seconds=1),
    )
    client_b = Client(
        id=uuid4(),
        name=f"{org_name} ClientB",
        organization_id=org.id,
        created_at=base_time + timedelta(seconds=2),
    )
    docs = []
    for i, client in enumerate([client_a, client_b]):
        for j in range(2):
            docs.append(
                Document(
                    id=uuid4(),
                    client_id=client.id,
                    organization_id=org.id,
                    filename=f"{org_name}-{client.name}-{j}.pdf",
                    storage_path=f"fake/{uuid4()}",
                    mime_type="application/pdf",
                    size_bytes=1000 * (j + 1),
                    uploaded_by_id=user.id,
                    created_at=base_time + timedelta(minutes=i, seconds=j),
                )
            )

    session.add_all([org, user, client_a, client_b, *docs])
    session.commit()
    return {
        "org_id": org.id,
        "user_email": user_email,
        "client_a_id": client_a.id,
        "client_b_id": client_b.id,
        "doc_ids": [d.id for d in docs],
    }


def test_dashboard_isolates_organizations_no_cross_org_leak(sqlite_session):
    """The critical security test: org A's dashboard must NEVER contain org B's data."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    org_a = _seed_org(sqlite_session, "OrgA", "a@a.com", base)
    org_b = _seed_org(sqlite_session, "OrgB", "b@b.com", base + timedelta(days=1))

    summary_a = dashboard_service.get_summary(org_a["org_id"], sqlite_session)
    summary_b = dashboard_service.get_summary(org_b["org_id"], sqlite_session)

    # Each org sees only its own counts (2 clients, 4 docs per seed)
    assert summary_a.total_clients == 2
    assert summary_a.total_documents == 4
    assert summary_a.total_storage_bytes == 2 * (1000 + 2000)  # 2 clients × (1000+2000)

    assert summary_b.total_clients == 2
    assert summary_b.total_documents == 4
    assert summary_b.total_storage_bytes == 2 * (1000 + 2000)

    # Recent docs: ALL filenames must reference the right org
    for item in summary_a.recent_documents:
        assert item.filename.startswith("OrgA-"), f"OrgA leak: saw {item.filename}"
        assert item.client_name.startswith("OrgA"), f"OrgA client leak: {item.client_name}"
        assert item.uploaded_by_email == "a@a.com"
        assert item.client_id in (org_a["client_a_id"], org_a["client_b_id"])

    for item in summary_b.recent_documents:
        assert item.filename.startswith("OrgB-"), f"OrgB leak: saw {item.filename}"
        assert item.client_name.startswith("OrgB"), f"OrgB client leak: {item.client_name}"
        assert item.uploaded_by_email == "b@b.com"
        assert item.client_id in (org_b["client_a_id"], org_b["client_b_id"])

    # Recent clients: all IDs must be from the right org
    for item in summary_a.recent_clients:
        assert item.id in (org_a["client_a_id"], org_a["client_b_id"])
        assert item.document_count == 2  # each client seeded with 2 docs

    for item in summary_b.recent_clients:
        assert item.id in (org_b["client_a_id"], org_b["client_b_id"])
        assert item.document_count == 2


def test_dashboard_recent_documents_limited_to_five(sqlite_session):
    """LIMIT 5 must be enforced — seed 7 docs, expect 5 back."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    org = Organization(id=uuid4(), name="Org", created_at=base)
    user = User(
        id=uuid4(), email="u@u.com", password_hash="h",
        role="admin", organization_id=org.id, created_at=base,
    )
    client = Client(id=uuid4(), name="C", organization_id=org.id, created_at=base)
    docs = [
        Document(
            id=uuid4(),
            client_id=client.id,
            organization_id=org.id,
            filename=f"doc-{i}.pdf",
            storage_path=f"fake/{i}",
            mime_type="application/pdf",
            size_bytes=100,
            uploaded_by_id=user.id,
            created_at=base + timedelta(seconds=i),
        )
        for i in range(7)
    ]
    sqlite_session.add_all([org, user, client, *docs])
    sqlite_session.commit()

    summary = dashboard_service.get_summary(org.id, sqlite_session)
    assert summary.total_documents == 7
    assert len(summary.recent_documents) == 5
    # Most recent first (descending by created_at)
    expected_top_filenames = [f"doc-{i}.pdf" for i in [6, 5, 4, 3, 2]]
    actual = [d.filename for d in summary.recent_documents]
    assert actual == expected_top_filenames


def test_dashboard_recent_clients_limited_to_five(sqlite_session):
    """LIMIT 5 must apply to clients too — seed 7, expect 5 back."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    org = Organization(id=uuid4(), name="Org", created_at=base)
    clients = [
        Client(
            id=uuid4(),
            name=f"Client-{i}",
            organization_id=org.id,
            created_at=base + timedelta(seconds=i),
        )
        for i in range(7)
    ]
    sqlite_session.add_all([org, *clients])
    sqlite_session.commit()

    summary = dashboard_service.get_summary(org.id, sqlite_session)
    assert summary.total_clients == 7
    assert len(summary.recent_clients) == 5
    # All have zero docs
    for item in summary.recent_clients:
        assert item.document_count == 0


def test_dashboard_empty_org_returns_zero_and_empty_lists(sqlite_session):
    """A brand new org with no clients/docs returns clean zeros."""
    org = Organization(id=uuid4(), name="Empty", created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    sqlite_session.add(org)
    sqlite_session.commit()

    summary = dashboard_service.get_summary(org.id, sqlite_session)
    assert summary.total_clients == 0
    assert summary.total_documents == 0
    assert summary.total_storage_bytes == 0
    assert summary.recent_documents == []
    assert summary.recent_clients == []


def test_dashboard_document_count_per_client_is_accurate(sqlite_session):
    """document_count subquery must scope by org AND group by client correctly."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    org = Organization(id=uuid4(), name="Org", created_at=base)
    user = User(
        id=uuid4(), email="u@u.com", password_hash="h",
        role="admin", organization_id=org.id, created_at=base,
    )
    client_busy = Client(id=uuid4(), name="Busy", organization_id=org.id, created_at=base + timedelta(seconds=1))
    client_lazy = Client(id=uuid4(), name="Lazy", organization_id=org.id, created_at=base + timedelta(seconds=2))

    busy_docs = [
        Document(
            id=uuid4(), client_id=client_busy.id, organization_id=org.id,
            filename=f"b-{i}.pdf", storage_path=f"fake/b{i}",
            mime_type="application/pdf", size_bytes=10,
            uploaded_by_id=user.id, created_at=base,
        )
        for i in range(3)
    ]
    lazy_docs = [
        Document(
            id=uuid4(), client_id=client_lazy.id, organization_id=org.id,
            filename="l-0.pdf", storage_path="fake/l0",
            mime_type="application/pdf", size_bytes=10,
            uploaded_by_id=user.id, created_at=base,
        )
    ]
    sqlite_session.add_all([org, user, client_busy, client_lazy, *busy_docs, *lazy_docs])
    sqlite_session.commit()

    summary = dashboard_service.get_summary(org.id, sqlite_session)
    counts = {item.id: item.document_count for item in summary.recent_clients}
    assert counts[client_busy.id] == 3
    assert counts[client_lazy.id] == 1
