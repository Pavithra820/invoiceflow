PASSWORD = "correct-horse-battery"


def register(client, email, password=PASSWORD):
    return client.post("/auth/register", json={"email": email, "password": password})


def login_headers(client, email, password=PASSWORD):
    response = client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_user_with_role(client, admin_headers, email, role):
    assert register(client, email).status_code == 201
    users = client.get("/users", headers=admin_headers).json()
    user_id = next(u["id"] for u in users if u["email"] == email)
    if role != "viewer":
        response = client.patch(f"/users/{user_id}/role", json={"role": role}, headers=admin_headers)
        assert response.status_code == 200, response.text
    return login_headers(client, email)
