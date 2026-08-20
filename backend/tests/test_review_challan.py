from conftest import auth


def _create_report(client, token, plate="GJ01 TEST 123"):
    return client.post(
        "/api/reports",
        headers=auth(token),
        data={
            "plate": plate,
            "vehicle_type": "Car",
            "violation_type": "No-Parking Zone",
            "location": "CG Road, Navrangpura",
            "lat": "23.0301",
            "lng": "72.5606",
            "description": "Test violation",
        },
        files={},
    )


def test_citizen_can_create_report(client, citizen_token):
    r = _create_report(client, citizen_token)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "submitted"
    assert body["source"] == "citizen"
    assert body["plate"] == "GJ01 TEST 123"


def test_citizen_cannot_review(client, citizen_token, admin_token):
    r = _create_report(client, citizen_token)
    pid = r.json()["public_id"]
    rr = client.post(
        f"/api/reports/{pid}/review",
        headers=auth(citizen_token),
        json={"action": "confirmed"},
    )
    assert rr.status_code == 403


def test_confirm_issues_challan_and_notifies(client, citizen_token, admin_token):
    r = _create_report(client, citizen_token)
    pid = r.json()["public_id"]

    rv = client.post(
        f"/api/reports/{pid}/review",
        headers=auth(admin_token),
        json={"action": "confirmed", "notes": "Verified on CCTV"},
    )
    assert rv.status_code == 200, rv.text
    body = rv.json()
    assert body["status"] == "challan-issued"
    assert body["fine_amount"] == 500

    # A pending challan must exist for the report
    challans = client.get("/api/challans", headers=auth(admin_token)).json()
    assert any(c["report_id"] == body["id"] and c["status"] == "pending" for c in challans)

    # Reporter must get a notification
    notifs = client.get("/api/notifications", headers=auth(citizen_token)).json()
    assert any(n["ref_id"] == pid and n["ntype"] == "report" for n in notifs)
    assert client.get("/api/notifications/unread-count", headers=auth(citizen_token)).json() >= 1


def test_reject_marks_rejected_no_challan(client, citizen_token, admin_token):
    r = _create_report(client, citizen_token)
    pid = r.json()["public_id"]

    rv = client.post(
        f"/api/reports/{pid}/review",
        headers=auth(admin_token),
        json={"action": "rejected", "notes": "Insufficient evidence"},
    )
    assert rv.status_code == 200
    assert rv.json()["status"] == "rejected"
    assert rv.json()["reviewer_notes"] == "Insufficient evidence"

    challans = client.get("/api/challans", headers=auth(admin_token)).json()
    assert not any(c["report_id"] == rv.json()["id"] for c in challans)


def test_review_invalid_action(client, citizen_token, admin_token):
    r = _create_report(client, citizen_token)
    pid = r.json()["public_id"]
    assert (
        client.post(f"/api/reports/{pid}/review", headers=auth(admin_token), json={"action": "maybe"}).status_code
        == 400
    )
