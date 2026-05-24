import os
import importlib
from pathlib import Path


def test_migration_file_exists():
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    files = list(versions_dir.glob("*.py"))
    assert len(files) >= 1, "No migration files found"


def test_initial_migration_has_upgrade_and_downgrade():
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    migration_file = next(versions_dir.glob("*_initial_schema.py"))
    source = migration_file.read_text()
    assert "def upgrade()" in source
    assert "def downgrade()" in source


def test_initial_migration_creates_organizations_table():
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    migration_file = next(versions_dir.glob("*_initial_schema.py"))
    source = migration_file.read_text()
    assert '"organizations"' in source


def test_initial_migration_creates_users_table():
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    migration_file = next(versions_dir.glob("*_initial_schema.py"))
    source = migration_file.read_text()
    assert '"users"' in source


def test_initial_migration_has_organization_id_fk():
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    migration_file = next(versions_dir.glob("*_initial_schema.py"))
    source = migration_file.read_text()
    assert "organization_id" in source
    assert "ForeignKeyConstraint" in source


def test_env_py_imports_base_metadata():
    env_path = Path(__file__).parent.parent / "alembic" / "env.py"
    source = env_path.read_text()
    assert "Base.metadata" in source
    assert "app.models.user" in source
