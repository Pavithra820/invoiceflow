import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, get_db
from app.main import app
from tests.helpers import login_headers, register


@pytest.fixture(autouse=True)
def fast_hashing(monkeypatch):
    """Cheap bcrypt in tests so the suite stays fast. Production uses the real cost."""
    monkeypatch.setattr(settings, "bcrypt_rounds", 4)


@pytest.fixture
def client():
    """Unauthenticated client. Each test gets a fresh in-memory database."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def admin_headers(client):
    """The first registered user becomes the admin."""
    assert register(client, "admin@example.com").status_code == 201
    return login_headers(client, "admin@example.com")


@pytest.fixture
def admin_client(client, admin_headers):
    """A client that is already logged in as admin (used by the invoice tests)."""
    client.headers.update(admin_headers)
    return client
