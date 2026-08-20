from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import config
from .auth import hash_password
from .models import Camera, Report, User, Zone
from .utils import generate_public_id


def _polygon(center_lat: float, center_lng: float, half: float = 0.004) -> str:
    """Small square polygon around a point, as 'lat,lng;lat,lng;...' (WGS84)."""
    return ";".join(
        f"{center_lat + dlat},{center_lng + dlng}"
        for dlat, dlng in [
            (-half, -half),
            (-half, half),
            (half, half),
            (half, -half),
        ]
    )


def seed(db: Session) -> None:
    # Demo users
    if db.query(User).filter(User.username == config.DEMO_AUTHORITY_USERNAME).count() == 0:
        db.add(
            User(
                username=config.DEMO_AUTHORITY_USERNAME,
                password_hash=hash_password(config.DEMO_AUTHORITY_PASSWORD),
                full_name="R. Patel",
                email="admin@sentinel.com",
                phone="+91 98765 43210",
                role="authority",
                area="Traffic Control, AMC",
            )
        )
    if db.query(User).filter(User.username == config.DEMO_CITIZEN_USERNAME).count() == 0:
        db.add(
            User(
                username=config.DEMO_CITIZEN_USERNAME,
                password_hash=hash_password(config.DEMO_CITIZEN_PASSWORD),
                full_name="Citizen User",
                email="citizen@sentinel.com",
                phone="+91 98765 43211",
                role="citizen",
                area="Navrangpura, Ahmedabad",
            )
        )

    # Cameras
    cameras = [
        {"code": "CAM-CGR-07", "name": "CG Road", "location": "CG Road, Navrangpura", "lat": 23.0301, "lng": 72.5606},
        {"code": "CAM-ASH-03", "name": "Ashram Road", "location": "Ashram Road, near RTO", "lat": 23.0412, "lng": 72.5709},
        {"code": "CAM-LWG-04", "name": "Law Garden", "location": "Law Garden, Ellisbridge", "lat": 23.0246, "lng": 72.5581},
        {"code": "CAM-SGH-11", "name": "SG Highway", "location": "SG Highway, Thaltej", "lat": 23.0466, "lng": 72.5041},
        {"code": "CAM-MNG-05", "name": "Maninagar", "location": "Maninagar Station Road", "lat": 22.9967, "lng": 72.6021},
    ]
    for c in cameras:
        if db.query(Camera).filter(Camera.code == c["code"]).count() == 0:
            db.add(Camera(**c))

    db.flush()

    # Zones
    zones = [
        {
            "name": "CG Road No-Parking Zone A",
            "violation_type": "No-Parking Zone",
            "fine_amount": 500,
            "camera_id": 1,
            "coordinates": _polygon(23.0301, 72.5606),
        },
        {
            "name": "Ashram Road Emergency Corridor",
            "violation_type": "Emergency Lane",
            "fine_amount": 1000,
            "camera_id": 2,
            "coordinates": _polygon(23.0412, 72.5709),
        },
        {
            "name": "Law Garden Footpath",
            "violation_type": "Footpath Parking",
            "fine_amount": 500,
            "camera_id": 3,
            "coordinates": _polygon(23.0246, 72.5581),
        },
        {
            "name": "SG Highway Junction Blocking",
            "violation_type": "Junction Blocking",
            "fine_amount": 800,
            "camera_id": 4,
            "coordinates": _polygon(23.0466, 72.5041),
        },
        {
            "name": "Maninagar Bus Stop",
            "violation_type": "Bus Stop Obstruction",
            "fine_amount": 300,
            "camera_id": 5,
            "coordinates": _polygon(22.9967, 72.6021),
        },
    ]
    for z in zones:
        zone = db.query(Zone).filter(Zone.name == z["name"]).first()
        if not zone:
            db.add(Zone(**z))
        elif zone.coordinates is None:
            zone.coordinates = z["coordinates"]  # backfill polygons on existing DBs

    # Sample citizen reports
    if db.query(Report).count() == 0:
        citizen = db.query(User).filter(User.username == config.DEMO_CITIZEN_USERNAME).first()
        samples = [
            {
                "public_id": generate_public_id("RPT"),
                "user_id": citizen.id,
                "plate": "GJ01 AB 1234",
                "vehicle_type": "Car",
                "vehicle_color": "White",
                "violation_type": "No-Parking Zone",
                "status": "challan-issued",
                "location": "CG Road, Navrangpura",
                "lat": 23.0301,
                "lng": 72.5606,
                "description": "Car parked in no-parking zone blocking traffic flow",
                "source": "citizen",
                "fine_amount": 500,
                "evidence": "/evidence/evidence-1.png",
                "reviewer_notes": "Verified against CCTV CAM-CGR-07. Challan issued.",
                "reviewed_at": datetime.utcnow() - timedelta(days=5),
                "reported_at": datetime.utcnow() - timedelta(days=5),
            },
            {
                "public_id": generate_public_id("RPT"),
                "user_id": citizen.id,
                "plate": "GJ05 XY 5678",
                "vehicle_type": "Two-Wheeler",
                "vehicle_color": "Black",
                "violation_type": "Footpath Parking",
                "status": "verified",
                "location": "Law Garden, Ellisbridge",
                "lat": 23.0246,
                "lng": 72.5581,
                "description": "Two-wheeler parked on pedestrian footpath",
                "source": "citizen",
                "evidence": "/evidence/evidence-2.png",
                "reviewer_notes": "Verified. Awaiting challan generation.",
                "reviewed_at": datetime.utcnow() - timedelta(days=3),
                "reported_at": datetime.utcnow() - timedelta(days=3),
            },
            {
                "public_id": generate_public_id("RPT"),
                "user_id": citizen.id,
                "plate": "GJ27 CD 9012",
                "vehicle_type": "Auto-Rickshaw",
                "vehicle_color": "Yellow/Green",
                "violation_type": "Bus Stop Obstruction",
                "status": "under-review",
                "location": "Lal Darwaja Bus Stand",
                "lat": 23.0258,
                "lng": 72.5873,
                "description": "Auto-rickshaw blocking bus stop entrance",
                "source": "citizen",
                "evidence": "/evidence/evidence-3.png",
                "reported_at": datetime.utcnow() - timedelta(days=1),
            },
            {
                "public_id": generate_public_id("RPT"),
                "user_id": citizen.id,
                "plate": "GJ01 EF 3456",
                "vehicle_type": "Car",
                "vehicle_color": "Red",
                "violation_type": "Zebra Crossing",
                "status": "rejected",
                "location": "Paldi Char Rasta",
                "lat": 23.0128,
                "lng": 72.5679,
                "description": "Car stopped on zebra crossing",
                "source": "citizen",
                "evidence": "/evidence/evidence-1.png",
                "reviewer_notes": "Insufficient evidence. Vehicle was moving, not parked.",
                "reviewed_at": datetime.utcnow() - timedelta(days=7),
                "reported_at": datetime.utcnow() - timedelta(days=7),
            },
        ]
        for s in samples:
            db.add(Report(**s))

    db.commit()
