import os
import pytest

# Set test env vars before any app imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests")

# Eagerly register every SQLAlchemy model so string-based relationships
# (e.g. relationship("Organization")) resolve regardless of which test
# module is imported first.
import app.models.user  # noqa: F401, E402
import app.models.client  # noqa: F401, E402
import app.models.document  # noqa: F401, E402
