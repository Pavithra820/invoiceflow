from decimal import Decimal


def make_payload(**overrides):
    payload = {
        "supplier_name": "Acme GmbH",
        "invoice_number": "INV-001",
        "issue_date": "2026-01-10",
        "due_date": "2026-02-10",
        "currency": "EUR",
        "total_amount": "25.50",
        "line_items": [
            {"description": "Widget", "quantity": "2", "unit_price": "10.00"},
            {"description": "Shipping", "quantity": "1", "unit_price": "5.50"},
        ],
    }
    payload.update(overrides)
    return payload


def test_create_invoice_returns_201_and_computes_line_amounts(admin_client):
    response = admin_client.post("/invoices", json=make_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["supplier_name"] == "Acme GmbH"
    assert body["status"] == "draft"
    assert Decimal(body["total_amount"]) == Decimal("25.50")
    assert [Decimal(li["amount"]) for li in body["line_items"]] == [Decimal("20.00"), Decimal("5.50")]


def test_create_invoice_without_line_items_is_allowed(admin_client):
    response = admin_client.post("/invoices", json=make_payload(line_items=[]))
    assert response.status_code == 201
    assert response.json()["line_items"] == []


def test_line_items_must_add_up_to_total(admin_client):
    response = admin_client.post("/invoices", json=make_payload(total_amount="99.99"))
    assert response.status_code == 422


def test_duplicate_invoice_number_for_same_supplier_is_rejected(admin_client):
    assert admin_client.post("/invoices", json=make_payload()).status_code == 201
    response = admin_client.post("/invoices", json=make_payload())
    assert response.status_code == 409


def test_same_invoice_number_for_different_supplier_is_allowed(admin_client):
    assert admin_client.post("/invoices", json=make_payload()).status_code == 201
    response = admin_client.post("/invoices", json=make_payload(supplier_name="Other AG"))
    assert response.status_code == 201


def test_due_date_before_issue_date_is_rejected(admin_client):
    response = admin_client.post("/invoices", json=make_payload(due_date="2025-12-31"))
    assert response.status_code == 422


def test_negative_total_is_rejected(admin_client):
    response = admin_client.post("/invoices", json=make_payload(total_amount="-5.00", line_items=[]))
    assert response.status_code == 422


def test_currency_must_be_three_uppercase_letters(admin_client):
    response = admin_client.post("/invoices", json=make_payload(currency="eur"))
    assert response.status_code == 422


def test_get_invoice_by_id(admin_client):
    created = admin_client.post("/invoices", json=make_payload()).json()
    response = admin_client.get(f"/invoices/{created['id']}")
    assert response.status_code == 200
    assert response.json()["invoice_number"] == "INV-001"


def test_get_missing_invoice_returns_404(admin_client):
    assert admin_client.get("/invoices/999").status_code == 404


def test_list_invoices_is_paginated_newest_first(admin_client):
    for n in range(3):
        admin_client.post("/invoices", json=make_payload(invoice_number=f"INV-{n}", line_items=[]))

    first = admin_client.get("/invoices", params={"page": 1, "page_size": 2}).json()
    second = admin_client.get("/invoices", params={"page": 2, "page_size": 2}).json()

    assert first["total"] == 3
    assert [i["invoice_number"] for i in first["items"]] == ["INV-2", "INV-1"]
    assert [i["invoice_number"] for i in second["items"]] == ["INV-0"]


def test_list_invoices_can_filter_by_supplier(admin_client):
    admin_client.post("/invoices", json=make_payload(line_items=[]))
    admin_client.post("/invoices", json=make_payload(supplier_name="Other AG", line_items=[]))

    body = admin_client.get("/invoices", params={"supplier": "acme"}).json()

    assert body["total"] == 1
    assert body["items"][0]["supplier_name"] == "Acme GmbH"
