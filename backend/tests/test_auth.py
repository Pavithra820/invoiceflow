from datetime import datetime, timedelta, timezone

import jwt

from app.security import create_access_token
from tests.helpers import PASSWORD, create_user_with_role, login_headers, register

INVOICE = {
    "supplier_name": "Acme GmbH",
    "invoice_number": "INV-001",
    "issue_date": "2026-01-10",
    "total_amount": "10.00",
}


def test_first_registered_user_is_admin(client):
    response = register(client, "first@example.com")
    assert response.status_code == 201
    assert response.json()["role"] == "admin"
    assert "password" not in response.text


def test_later_users_start_as_viewers(client, admin_headers):
    response = register(client, "second@example.com")
    assert response.json()["role"] == "viewer"


def test_email_is_case_insensitive_and_unique(client):
    assert register(client, "Anna@Example.com").status_code == 201
    assert register(client, "anna@example.com").status_code == 409


def test_short_password_is_rejected(client):
    assert register(client, "a@example.com", password="short").status_code == 422


def test_invalid_email_is_rejected(client):
    assert register(client, "not-an-email").status_code == 422


def test_login_and_me(client):
    register(client, "anna@example.com")
    headers = login_headers(client, "anna@example.com")
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "anna@example.com"


def test_wrong_password_and_unknown_email_give_the_same_error(client):
    register(client, "anna@example.com")
    wrong = client.post("/auth/login", data={"username": "anna@example.com", "password": "nope-nope-nope"})
    unknown = client.post("/auth/login", data={"username": "ghost@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_protected_routes_need_a_token(client):
    assert client.get("/invoices").status_code == 401
    assert client.post("/invoices", json=INVOICE).status_code == 401


def test_garbage_token_is_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401


def test_token_signed_with_wrong_secret_is_rejected(client):
    register(client, "anna@example.com")
    forged = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        "x" * 40,
        algorithm="HS256",
    )
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_expired_token_is_rejected(client):
    register(client, "anna@example.com")
    expired = create_access_token(1, expires_delta=timedelta(minutes=-1))
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


def test_viewer_can_read_but_not_create(client, admin_headers):
    viewer = create_user_with_role(client, admin_headers, "viewer@example.com", "viewer")
    assert client.get("/invoices", headers=viewer).status_code == 200
    assert client.post("/invoices", json=INVOICE, headers=viewer).status_code == 403


def test_reviewer_can_create_invoices(client, admin_headers):
    reviewer = create_user_with_role(client, admin_headers, "rev@example.com", "reviewer")
    assert client.post("/invoices", json=INVOICE, headers=reviewer).status_code == 201


def test_only_admin_can_list_users_or_change_roles(client, admin_headers):
    viewer = create_user_with_role(client, admin_headers, "viewer@example.com", "viewer")
    assert client.get("/users", headers=viewer).status_code == 403
    assert client.patch("/users/1/role", json={"role": "viewer"}, headers=viewer).status_code == 403


def test_admin_cannot_change_own_role(client, admin_headers):
    me = client.get("/auth/me", headers=admin_headers).json()
    response = client.patch(f"/users/{me['id']}/role", json={"role": "viewer"}, headers=admin_headers)
    assert response.status_code == 400


def test_role_change_takes_effect_immediately(client, admin_headers):
    viewer = create_user_with_role(client, admin_headers, "viewer@example.com", "viewer")
    assert client.post("/invoices", json=INVOICE, headers=viewer).status_code == 403
    users = client.get("/users", headers=admin_headers).json()
    user_id = next(u["id"] for u in users if u["email"] == "viewer@example.com")
    client.patch(f"/users/{user_id}/role", json={"role": "reviewer"}, headers=admin_headers)
    # same token as before, new permissions
    assert client.post("/invoices", json=INVOICE, headers=viewer).status_code == 201


def test_unknown_user_and_invalid_role(client, admin_headers):
    assert client.patch("/users/999/role", json={"role": "viewer"}, headers=admin_headers).status_code == 404
    assert client.patch("/users/999/role", json={"role": "superuser"}, headers=admin_headers).status_code == 422
