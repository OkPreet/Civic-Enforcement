"""Risk-scoring module.

Two modes:
  * Heuristic fallback (no model trained yet): combines dwell duration,
    ANPR confidence, source, and violation severity into a 0..1 score.
  * Trained GBM: loads the fitted GradientBoosting classifier built from
    ReviewAction labeled data (officer confirm/reject) via train_gbm().
"""

import os
from typing import Optional

import joblib
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Report, ReviewAction
from ..schemas import ViolationStats

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "risk_model.pkl")

SEVERITY = {
    "Emergency Lane": 1.0,
    "Junction Blocking": 0.9,
    "Bus Stop Obstruction": 0.75,
    "Zebra Crossing": 0.85,
    "No-Parking Zone": 0.7,
    "Footpath Parking": 0.6,
    "Double Parking": 0.65,
}


def _features(report: Report):
    hour = report.reported_at.hour if report.reported_at else 0
    dow = report.reported_at.weekday() if report.reported_at else 0
    return {
        "hour": hour,
        "day_of_week": dow,
        "severity": SEVERITY.get(report.violation_type, 0.5),
        "confidence": report.confidence or 0,
        "duration_min": report.duration_min or 0,
        "fine_amount": report.fine_amount or 0,
        "source_camera": 1 if report.source == "camera" else 0,
    }


def heuristic_risk(report: Report) -> float:
    f = _features(report)
    # Dwell time certainty: >= 10 min in a restricted zone is near-certain.
    dwell = min(f["duration_min"] / 10.0, 1.0)
    confidence = f["confidence"] / 100.0 if f["confidence"] > 0 else 0.5
    score = 0.45 * dwell + 0.35 * confidence + 0.2 * f["severity"]
    return round(min(max(score, 0.05), 0.99), 3)


def train_gbm(db: Session) -> Optional[object]:
    """Train a GradientBoosting classifier on ReviewAction labels.

    Returns the fitted model, or None if there isn't enough labeled data yet
    (needs >= 50 confirmed + rejected samples).
    """
    try:
        from sklearn.ensemble import GradientBoostingClassifier
    except ImportError:
        return None

    rows = (
        db.query(Report, ReviewAction.action)
        .join(ReviewAction, ReviewAction.report_id == Report.id)
        .all()
    )
    if len(rows) < 50:
        return None

    import numpy as np

    X, y = [], []
    for report, action in rows:
        f = _features(report)
        X.append([f["hour"], f["day_of_week"], f["severity"], f["confidence"], f["duration_min"], f["fine_amount"], f["source_camera"]])
        y.append(1 if action == "confirmed" else 0)

    X = np.array(X, dtype=float)
    y = np.array(y, dtype=int)
    if len(set(y)) < 2:
        return None

    clf = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    clf.fit(X, y)
    joblib.dump(clf, MODEL_PATH)
    return clf


def gbm_risk(report: Report, db: Session) -> Optional[float]:
    if not os.path.exists(MODEL_PATH):
        train_gbm(db)
    if not os.path.exists(MODEL_PATH):
        return None

    clf = joblib.load(MODEL_PATH)
    f = _features(report)
    prob = clf.predict_proba([[f["hour"], f["day_of_week"], f["severity"], f["confidence"], f["duration_min"], f["fine_amount"], f["source_camera"]]])[0][1]
    return round(float(prob), 3)


def risk_score(report: Report, db: Session) -> float:
    """Prefer GBM, fall back to heuristic."""
    try:
        prob = gbm_risk(report, db)
        if prob is not None:
            return prob
    except Exception:
        pass
    return heuristic_risk(report)
