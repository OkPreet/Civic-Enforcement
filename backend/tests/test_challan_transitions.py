from conftest import auth


def _confirmed_challan(client, citizen_token, admin_token, plate):
    r = client.post(
        "/api/reports",
        headers=auth(citizen_token),
        data={
            "plate": plate,
            "vehicle_type": "Car",
            "violation_type": "No-Parking Zone",
            "location": "CG Road, Navrangpura",
        },
        files={},
    )
    pid = r.json()["public_id"]
    assert (
        client.post(f"/api/reports/{pid}/review", headers=auth(admin_token), json={"action": "confirmed"}).status_code
        == 200
    )
    challans = client.get("/api/challans", headers=auth(admin_token)).json()
    return next(c for c in challans if c["report_id"] == r.json()["id"])


def test_pending_to_paid_sets_paid_at(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 100")
    r = client.post(
        f"/api/challans/{c['public_id']}/status",
        headers=auth(admin_token),
        json={"status": "paid"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "paid"
    assert body["paid_at"] is not None


def test_pending_to_disputed(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 200")
    r = client.post(
        f"/api/challans/{c['public_id']}/status",
        headers=auth(admin_token),
        json={"status": "disputed"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "disputed"


def test_paid_cannot_go_back(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 300")
    pid = c["public_id"]
    assert client.post(f"/api/challans/{pid}/status", headers=auth(admin_token), json={"status": "paid"}).status_code == 200
    assert client.post(f"/api/challans/{pid}/status", headers=auth(admin_token), json={"status": "disputed"}).status_code == 409
    assert client.post(f"/api/challans/{pid}/status", headers=auth(admin_token), json={"status": "paid"}).status_code == 409


def test_disputed_can_be_paid(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 400")
    pid = c["public_id"]
    assert client.post(f"/api/challans/{pid}/status", headers=auth(admin_token), json={"status": "disputed"}).status_code == 200
    r = client.post(f"/api/challans/{pid}/status", headers=auth(admin_token), json={"status": "paid"})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"


def test_invalid_status_rejected(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 500")
    assert client.post(f"/api/challans/{c['public_id']}/status", headers=auth(admin_token), json={"status": "void"}).status_code == 400


def test_citizen_cannot_update_challan(client, citizen_token, admin_token):
    c = _confirmed_challan(client, citizen_token, admin_token, "GJ01 A 600")
    r = client.post(
        f"/api/challans/{c['public_id']}/status",
        headers=auth(citizen_token),
        json={"status": "paid"},
    )
    assert r.status_code == 403
