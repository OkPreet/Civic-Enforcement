from datetime import datetime

from app.database import SessionLocal
from app.models import Report, ReviewAction, User
from app.predict import risk


def _seed_actions(db, count, reviewer_id, user_id):
    for i in range(count):
        action = "confirmed" if i % 2 == 0 else "rejected"
        report = Report(
            public_id=f"RPT-T{1000 + i}",
            user_id=user_id,
            plate=f"GJ01 TEST {i:03d}",
            vehicle_type="Car",
            violation_type="No-Parking Zone",
            status="challan-issued" if action == "confirmed" else "rejected",
            location="CG Road, Navrangpura",
            lat=23.0301,
            lng=72.5606,
            source="citizen",
            fine_amount=500,
            reported_at=datetime.utcnow(),
        )
        db.add(report)
        db.flush()
        db.add(ReviewAction(report_id=report.id, reviewer_id=reviewer_id, action=action))


def test_heuristic_fallback_below_threshold(client, admin_token, tmp_path, monkeypatch):
    monkeypatch.setattr(risk, "MODEL_PATH", str(tmp_path / "risk_model.pkl"))
    reports = client.get("/api/reports", headers={"Authorization": f"Bearer {admin_token}"}).json()
    pid = reports[0]["public_id"]
    r = client.get(f"/api/predictions/risk/{pid}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "heuristic"
    assert 0.0 <= body["score"] <= 1.0
    assert body["band"] in {"low", "medium", "high"}


def test_gbm_kicks_in_at_threshold(client, admin_token, tmp_path, monkeypatch):
    monkeypatch.setattr(risk, "MODEL_PATH", str(tmp_path / "risk_model.pkl"))
    db = SessionLocal()
    try:
        reviewer = db.query(User).filter(User.username == "admin").first()
        citizen = db.query(User).filter(User.username == "citizen").first()
        _seed_actions(db, 60, reviewer.id, citizen.id)
        db.commit()

        report = db.query(Report).filter(Report.public_id == "RPT-T1000").first()
        score = risk.risk_score(report, db)
    finally:
        db.close()

    assert 0.0 <= score <= 1.0

    # Endpoint now reports the GBM model
    r = client.get(
        f"/api/predictions/risk/RPT-T1000",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert r.json()["model"] == "gbm"
