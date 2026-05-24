import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException
from jose import JWTError

from app.core.deps import get_current_user
from app.schemas.client import ClientCreate, ClientUpdate
from app.services.client import (
    create,
    delete,
    get,
    list_clients,
    update,
)


# --- Helpers ---

def _make_db(existing=None, list_result=None):
    """Build a MagicMock session where .query().filter()... returns the wanted value."""
    db = MagicMock()
    query_mock = MagicMock()
    query_mock.filter.return_value.first.return_value = existing
    query_mock.filter.return_value.order_by.return_value.all.return_value = list_result or []
    db.query.return_value = query_mock
    return db


# --- create ---

def test_create_client_persists_with_org_id():
    db = _make_db()
    org_id = uuid4()
    payload = ClientCreate(name="Dupont SARL", siren="123456789", contact_email="ct@dupont.fr")

    create(payload, org_id, db)

    added = db.add.call_args.args[0]
    assert added.name == "Dupont SARL"
    assert added.siren == "123456789"
    assert added.contact_email == "ct@dupont.fr"
    assert added.organization_id == org_id
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(added)


def test_create_client_minimal_payload():
    db = _make_db()
    org_id = uuid4()
    payload = ClientCreate(name="Minimal")

    create(payload, org_id, db)

    added = db.add.call_args.args[0]
    assert added.name == "Minimal"
    assert added.siren is None
    assert added.contact_email is None
    assert added.contact_phone is None
    assert added.organization_id == org_id


# --- list ---

def test_list_clients_returns_session_query_results():
    fake_clients = [MagicMock(), MagicMock()]
    db = _make_db(list_result=fake_clients)

    result = list_clients(uuid4(), db)

    assert result == fake_clients
    db.query.assert_called_once()


# --- get ---

def test_get_client_not_found_raises_404():
    db = _make_db(existing=None)
    with pytest.raises(HTTPException) as exc:
        get(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


def test_get_client_returns_when_owned():
    fake_client = MagicMock()
    db = _make_db(existing=fake_client)

    result = get(uuid4(), uuid4(), db)

    assert result is fake_client


# --- update ---

def test_update_client_empty_payload_raises_400():
    db = _make_db(existing=MagicMock())
    with pytest.raises(HTTPException) as exc:
        update(uuid4(), ClientUpdate(), uuid4(), db)
    assert exc.value.status_code == 400


def test_update_client_not_found_raises_404():
    db = _make_db(existing=None)
    payload = ClientUpdate(name="New")
    with pytest.raises(HTTPException) as exc:
        update(uuid4(), payload, uuid4(), db)
    assert exc.value.status_code == 404


def test_update_client_applies_partial_changes():
    fake_client = MagicMock()
    db = _make_db(existing=fake_client)
    payload = ClientUpdate(name="Renamed", contact_phone="+33999999999")

    update(uuid4(), payload, uuid4(), db)

    assert fake_client.name == "Renamed"
    assert fake_client.contact_phone == "+33999999999"
    db.commit.assert_called_once()


# --- delete ---

def test_delete_client_not_found_raises_404():
    db = _make_db(existing=None)
    with pytest.raises(HTTPException) as exc:
        delete(uuid4(), uuid4(), db)
    assert exc.value.status_code == 404


def test_delete_client_calls_db_delete_and_commit():
    fake_client = MagicMock()
    db = _make_db(existing=fake_client)

    delete(uuid4(), uuid4(), db)

    db.delete.assert_called_once_with(fake_client)
    db.commit.assert_called_once()


# --- Multi-tenant isolation (the critical security guarantee) ---

def test_get_filters_by_organization_id():
    """Confirm the SQL filter receives the organization_id arg, so cross-org reads return 404."""
    db = _make_db(existing=None)
    org_id = uuid4()
    client_id = uuid4()

    with pytest.raises(HTTPException) as exc:
        get(client_id, org_id, db)

    assert exc.value.status_code == 404
    # The filter call must reference organization_id — verify two args (client.id, organization_id)
    filter_call = db.query.return_value.filter.call_args
    assert len(filter_call.args) == 2, "expected query to filter on both client_id and organization_id"


def test_list_filters_by_organization_id():
    db = _make_db(list_result=[])
    org_id = uuid4()

    list_clients(org_id, db)

    # filter must be invoked (single arg: organization_id constraint)
    db.query.return_value.filter.assert_called_once()


# --- get_current_user dependency ---

def test_get_current_user_invalid_token_raises_401():
    db = MagicMock()
    with patch("app.core.deps.decode_access_token", side_effect=JWTError("bad")):
        with pytest.raises(HTTPException) as exc:
            get_current_user(token="bad-token", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_missing_sub_raises_401():
    db = MagicMock()
    with patch("app.core.deps.decode_access_token", return_value={"role": "admin"}):
        with pytest.raises(HTTPException) as exc:
            get_current_user(token="x", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_invalid_uuid_sub_raises_401():
    db = MagicMock()
    with patch("app.core.deps.decode_access_token", return_value={"sub": "not-a-uuid"}):
        with pytest.raises(HTTPException) as exc:
            get_current_user(token="x", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_user_not_in_db_raises_401():
    db = _make_db(existing=None)
    valid_uuid = str(uuid4())
    with patch("app.core.deps.decode_access_token", return_value={"sub": valid_uuid}):
        with pytest.raises(HTTPException) as exc:
            get_current_user(token="x", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_valid_returns_user():
    fake_user = MagicMock()
    db = _make_db(existing=fake_user)
    valid_uuid = str(uuid4())
    with patch("app.core.deps.decode_access_token", return_value={"sub": valid_uuid}):
        result = get_current_user(token="x", db=db)
    assert result is fake_user
