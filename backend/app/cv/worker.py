"""Sentinel CV worker.

A separate process that consumes video (file/RTSP) and turns tracked vehicles
into auto-detected Reports:

    detection -> tracking -> zone point-in-polygon -> dwell timer ->
    ANPR plate read -> confidence scoring -> Report row (source=camera)

Run (from backend/):
    python -m app.cv.worker --synthetic --camera CAM-CGR-07 --zone "CG Road No-Parking Zone A"
    python -m app.cv.worker --video clip.mp4 --camera CAM-CGR-07 --zone "CG Road No-Parking Zone A"

--synthetic uses a generated test frame with a fake moving vehicle so the whole
pipeline can be exercised without a GPU, footage, or the ML models.
"""

import argparse
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from .. import config
from ..cv.dwell import DwellTracker
from ..cv.engine import ANPRReader, DetectionEngine, RealEngine, SyntheticEngine, format_plate
from ..cv.video import RobustVideoCapture
from ..cv.zone_geo import parse_polygon
from ..database import SessionLocal
from ..models import Camera, Report, Zone
from ..storage import storage
from ..utils import generate_public_id

CLASS_TO_VEHICLE_TYPE = {
    "car": "Car",
    "motorcycle": "Two-Wheeler",
    "bicycle": "Two-Wheeler",
    "bus": "Bus",
    "truck": "LCV / Truck",
    "vehicle": "Car",
}


class ZoneMatcher:
    def __init__(self, zones: List[Zone]):
        self.zones = [(z, parse_polygon(z.coordinates)) for z in zones]

    def match(self, lat: float, lng: float) -> Optional[Tuple[Zone, object]]:
        for zone, poly in self.zones:
            if poly is not None and poly.contains(__import__("shapely").geometry.Point(lng, lat)):
                return zone, poly
        return None


def bbox_to_geo(det, camera: Camera, h: int, w: int):
    """Approximate the vehicle's ground position from its bbox position.

    Single-camera approximation: the camera is the origin and the vehicle sits
    within ~CAMERA_POSITION_STEP degrees of it, offset by normalised bbox centre.
    Real deployments would use a homography calibration per camera.
    """
    cx = (det.x1 + det.x2) / 2.0 / w
    cy = (det.y1 + det.y2) / 2.0 / h
    step = config.CAMERA_POSITION_STEP
    lat = camera.lat + (0.5 - cy) * step if camera.lat else 0.0
    lng = camera.lng + (cx - 0.5) * step if camera.lng else 0.0
    return lat, lng


def save_evidence(frame: np.ndarray, det) -> str:
    h, w = frame.shape[:2]
    x1, y1 = max(int(det.x1), 0), max(int(det.y1), 0)
    x2, y2 = min(int(det.x2), w), min(int(det.y2), h)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return ""
    ok, buf = cv2.imencode(".jpg", crop)
    if not ok:
        return ""
    return storage.save(buf.tobytes(), ".jpg", "image/jpeg")


def compute_confidence(ocr_conf: float, det_conf: float, dwell_min: float) -> float:
    """0..1 composite: OCR x detection x dwell-time certainty."""
    dwell_certainty = min(dwell_min / config.DWELL_THRESHOLD_MIN, 1.0)
    return min(dwell_certainty * 0.45 + (ocr_conf if ocr_conf > 0 else 0.35) * 0.35 + det_conf * 0.2, 1.0)


def publish_event(event: str, data: dict) -> None:
    """Forward a live event to the API's hub (worker is a separate process)."""
    try:
        import json
        import urllib.request

        req = urllib.request.Request(
            f"{config.API_BASE_URL}/api/events/internal",
            data=json.dumps({"event": event, "data": data}).encode(),
            headers={"Content-Type": "application/json", "X-Internal-Token": config.INTERNAL_EVENTS_TOKEN},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass  # live feed is best-effort; report is already persisted


def build_report(
    db,
    camera: Camera,
    zone: Zone,
    plate: str,
    vehicle_type: str,
    lat: float,
    lng: float,
    duration_min: float,
    confidence: float,
    evidence: str,
) -> Report:
    status = "under-review" if confidence < config.AUTO_CONFIDENCE_THRESHOLD else "auto-detected"
    report = Report(
        public_id=generate_public_id("RPT"),
        user_id=None,
        plate=plate,
        vehicle_type=vehicle_type,
        vehicle_color=None,
        violation_type=zone.violation_type,
        status=status,
        location=zone.name,
        lat=lat,
        lng=lng,
        description=f"Auto-detected by {camera.code}: vehicle dwelled {duration_min:.0f} min in {zone.name}.",
        confidence=round(confidence, 3),
        source="camera",
        fine_amount=zone.fine_amount,
        evidence=evidence,
        duration_min=round(duration_min, 1),
        reported_at=datetime.utcnow(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def run_pipeline(
    video: Optional[str],
    synthetic: bool,
    camera_code: str,
    zone_name: str,
    model_path: str,
    device: str,
    timeout: float,
    dwell_min: float,
    reconnect_wait: float = 5.0,
    max_retries: int = 30,
) -> int:
    db = SessionLocal()
    try:
        camera = db.query(Camera).filter(Camera.code == camera_code).first()
        if not camera:
            print(f"[cv] camera '{camera_code}' not found")
            return 2
        zones = db.query(Zone).filter(Zone.name == zone_name).all()
        if not zones:
            print(f"[cv] zone '{zone_name}' not found")
            return 2
        zone = zones[0]

        tracker = DwellTracker(timeout_seconds=timeout)
        anpr = ANPRReader() if not synthetic else None
        dedupe: Dict[Tuple[str, int], datetime] = {}
        last_ocr: Dict[int, float] = {}

        if synthetic:
            engine: DetectionEngine = SyntheticEngine(duration_sec=15.0, fps=5)
            cap = None
            frame_interval = 1.0 / 5
        else:
            engine = RealEngine(model_path=model_path, device=device)
            cap = RobustVideoCapture(video, reconnect_wait=reconnect_wait, max_retries=max_retries)
            if not cap.opened and not cap.is_stream:
                print(f"[cv] could not open video: {video}")
                engine.close()
                return 2
            frame_interval = None

        import time as _time

        reported = 0
        step = 0
        try:
            while True:
                if synthetic:
                    frame = engine.next_frame()
                    if engine.done:  # type: ignore[attr-defined]
                        break
                else:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    if frame is None:  # dropped frame on a live stream — skip it
                        continue

                h, w = frame.shape[:2]
                detections = engine.detect_tracked(frame)

                for det in detections:
                    if det.track_id is None:
                        continue
                    lat, lng = bbox_to_geo(det, camera, h, w)
                    matched = ZoneMatcher([zone]).match(lat, lng)

                    entry = tracker.update(
                        det.track_id,
                        zone.id if matched else None,
                        zone.name if matched else None,
                        lat,
                        lng,
                    )
                    if not matched:
                        continue

                    dwell = tracker.dwell_minutes(det.track_id)

                    # ANPR — at most once per track every 5s (OCR is expensive on CPU)
                    if anpr is not None and det.track_id is not None:
                        now = _time.monotonic()
                        if now - last_ocr.get(det.track_id, 0.0) >= 5.0:
                            last_ocr[det.track_id] = now
                            try:
                                plate_raw, ocr_conf = anpr.read(frame, det)
                                if plate_raw:
                                    tracker.set_plate(det.track_id, format_plate(plate_raw), ocr_conf)
                            except Exception as exc:  # OCR errors shouldn't kill the worker
                                print(f"[cv] ANPR error: {exc}")

                    if synthetic and entry.plate is None:
                        tracker.set_plate(det.track_id, format_plate(engine.plate_at(step)), 0.99)

                    plate = entry.plate or f"UNKNOWN-{det.track_id}"
                    ocr_conf = entry.plate_confidence if entry.plate else 0.0

                    if entry.reported:
                        continue
                    if dwell < dwell_min:
                        continue

                    # Dedupe: same plate + zone within window
                    key = (plate, zone.id)
                    last = dedupe.get(key)
                    if last and (datetime.utcnow() - last).total_seconds() < config.DEDUPE_WINDOW_MIN * 60:
                        continue

                    confidence = compute_confidence(ocr_conf, det.confidence, dwell)
                    evidence = save_evidence(frame, det)
                    vehicle_type = CLASS_TO_VEHICLE_TYPE.get(det.name, "Car")

                    report = build_report(
                        db, camera, zone, plate, vehicle_type, lat, lng, dwell, confidence, evidence
                    )
                    dedupe[key] = datetime.utcnow()
                    entry.reported = True
                    reported += 1
                    publish_event(
                        "camera.detection",
                        {
                            "public_id": report.public_id,
                            "plate": report.plate,
                            "zone": zone.name,
                            "status": report.status,
                            "confidence": report.confidence,
                            "camera": camera.code,
                        },
                    )
                    print(
                        f"[cv] +{report.public_id} plate={plate} zone={zone.name} "
                        f"dwell={dwell:.1f}min conf={confidence:.2f} status={report.status} "
                        f"evidence={evidence or 'none'}"
                    )

                step += 1
                tracker.prune()
                if frame_interval is not None:
                    _time.sleep(frame_interval)
        finally:
            if cap is not None:
                cap.release()
            engine.close()

        print(f"[cv] done. {reported} report(s) generated from {camera_code}")
        return 0
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Sentinel CV pipeline worker")
    parser.add_argument("--video", default=None, help="path to a video file or RTSP URL")
    parser.add_argument("--synthetic", action="store_true", help="use generated demo frames (no video needed)")
    parser.add_argument("--camera", default="CAM-CGR-07", help="camera code (must exist in DB)")
    parser.add_argument("--zone", default="CG Road No-Parking Zone A", help="zone name (must exist in DB)")
    parser.add_argument("--model", default="yolo11n.pt", help="ultralytics model path")
    parser.add_argument("--device", default="cpu", help="torch device (cpu/cuda)")
    parser.add_argument("--timeout", type=float, default=60.0, help="track timeout seconds")
    parser.add_argument("--dwell-min", type=float, default=config.DWELL_THRESHOLD_MIN,
                        help="minutes of in-zone dwell before a report fires (default: from config)")
    parser.add_argument("--reconnect-wait", type=float, default=5.0,
                        help="seconds between RTSP reconnect attempts")
    parser.add_argument("--max-retries", type=int, default=30,
                        help="RTSP reconnect attempts before giving up")
    args = parser.parse_args()

    if not args.video and not args.synthetic:
        parser.error("provide --video or --synthetic")

    exit(run_pipeline(
        args.video, args.synthetic, args.camera, args.zone, args.model, args.device,
        args.timeout, args.dwell_min, args.reconnect_wait, args.max_retries,
    ))


if __name__ == "__main__":
    main()
