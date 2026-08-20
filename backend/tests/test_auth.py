from conftest import DEMO_ADMIN, DEMO_CITIZEN, auth


def test_login_success(client):
    r = client.post("/api/auth/login", json={"username": DEMO_ADMIN[0], "password": DEMO_ADMIN[1]})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["role"] == "authority"


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"username": DEMO_ADMIN[0], "password": "nope"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/users/me").status_code == 401


def test_me_returns_profile(client, admin_token):
    r = client.get("/api/users/me", headers=auth(admin_token))
    assert r.status_code == 200
    assert r.json()["username"] == DEMO_ADMIN[0]


def test_refresh_rotates_token(client):
    login = client.post("/api/auth/login", json={"username": DEMO_CITIZEN[0], "password": DEMO_CITIZEN[1]})
    refresh = login.json()["refresh_token"]

    r = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    new_token = r.json()["refresh_token"]
    assert new_token != refresh

    # Old token must now be revoked
    r2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401


def test_logout_revokes_refresh_token(client):
    login = client.post("/api/auth/login", json={"username": DEMO_CITIZEN[0], "password": DEMO_CITIZEN[1]})
    refresh = login.json()["refresh_token"]

    assert client.post("/api/auth/logout", json={"refresh_token": refresh}).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_invalid_refresh_token(client):
    assert client.post("/api/auth/refresh", json={"refresh_token": "bogus"}).status_code == 401


def test_register_creates_citizen(client):
    r = client.post("/api/auth/register", json={"username": "newuser", "password": "secret123", "full_name": "New User"})
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"]
    assert body["role"] == "citizen"
    assert body["username"] == "newuser"

    me = client.get("/api/users/me", headers=auth(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["full_name"] == "New User"


def test_register_duplicate_username(client):
    r = client.post("/api/auth/register", json={"username": DEMO_ADMIN[0], "password": "secret123"})
    assert r.status_code == 409
