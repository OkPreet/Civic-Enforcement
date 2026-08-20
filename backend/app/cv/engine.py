"""Detection + tracking + ANPR engine.

RealEngine: ultralytics YOLO11 detection with built-in ByteTrack-style tracking,
plus EasyOCR for plate reading. Heavy deps are imported lazily so the API can
still boot without the ML stack, and SyntheticEngine lets you demo the whole
pipeline without a GPU or footage.
"""

import re
import time
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

from .. import config

# COCO vehicle classes used for detection
VEHICLE_CLASSES = [1, 2, 3, 5, 7]  # bicycle, car, motorcycle, bus, truck

DEMO_PLATES = ["GJ01AB1234", "GJ27BX7734", "GJ05XY5678", "GJ03UV8901"]


@dataclass
class Detection:
    track_id: Optional[int]
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    name: str


class DetectionEngine:
    def detect_tracked(self, frame) -> List[Detection]:
        raise NotImplementedError

    def close(self) -> None:
        pass


class RealEngine(DetectionEngine):
    """YOLO11 + tracking via ultralytics."""

    def __init__(self, model_path: str = "yolo11n.pt", device: str = "cpu", conf: float = 0.25):
        from ultralytics import YOLO

        self.model = YOLO(model_path)
        self.device = device
        self.conf = conf
        self.last_track_id = 0

    def detect_tracked(self, frame) -> List[Detection]:
        results = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=self.conf,
            iou=0.45,
            classes=VEHICLE_CLASSES,
            device=self.device,
            verbose=False,
        )
        detections: List[Detection] = []
        if not results or results[0].boxes is None:
            return detections

        boxes = results[0].boxes
        ids = boxes.id
        for i, box in enumerate(boxes.xyxy.tolist()):
            x1, y1, x2, y2 = box
            track_id = int(ids[i].item()) if ids is not None else None
            detections.append(
                Detection(
                    track_id=track_id,
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    confidence=float(boxes.conf[i].item()),
                    name=results[0].names.get(int(boxes.cls[i].item()), "vehicle"),
                )
            )
        return detections


class SyntheticEngine(DetectionEngine):
    """Demo engine: a fake 'vehicle' that slowly crosses the frame, with plate labels.

    Used when no video/model is available so the end-to-end flow
    (track -> zone check -> dwell -> ANPR -> report) is testable.
    """

    def __init__(self, duration_sec: float = 30.0, fps: int = 10, width: int = 640, height: int = 480):
        self.duration_sec = duration_sec
        self.fps = fps
        self.width = width
        self.height = height
        self._t = 0.0
        self._last_track_id = 100

    def next_frame(self) -> np.ndarray:
        self._t += 1.0 / self.fps
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:] = (35, 35, 45)
        return frame

    def detect_tracked(self, frame) -> List[Detection]:
        # Horizontal sweep across the frame; always inside the demo zone near centre.
        progress = (self._t / self.duration_sec) % 1.0
        cx = 0.15 * self.width + progress * 0.7 * self.width
        w, h = 90, 60
        x1, y1 = cx - w / 2, self.height * 0.55 - h / 2
        return [
            Detection(
                track_id=1,
                x1=x1,
                y1=y1,
                x2=x1 + w,
                y2=y1 + h,
                confidence=0.93,
                name="car",
            )
        ]

    def plate_at(self, step: int) -> str:
        return DEMO_PLATES[step % len(DEMO_PLATES)]

    @property
    def done(self) -> bool:
        return self._t >= self.duration_sec


class ANPRReader:
    """EasyOCR-based plate reader with lazy init + plate normalisation."""

    def __init__(self):
        self._reader = None

    def _ensure(self):
        if self._reader is None:
            import easyocr

            self._reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        return self._reader

    def read(self, frame, det: Detection) -> tuple[Optional[str], float]:
        """Crop the lower portion of the bbox (where plates sit) and OCR it."""
        reader = self._ensure()
        h, w = frame.shape[:2]
        x1 = int(max(det.x1, 0))
        y1 = int(max(det.y1 + (det.y2 - det.y1) * 0.45, 0))
        x2 = int(min(det.x2, w))
        y2 = int(min(det.y2, h))
        if x2 <= x1 or y2 <= y1:
            return None, 0.0

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None, 0.0

        result = reader.readtext(crop, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        if not result:
            return None, 0.0

        # Heuristic: plate = longest alpha-numeric run with the highest mean confidence
        best_text, best_conf = "", 0.0
        for bbox, text, conf in result:
            cleaned = normalize_plate(text)
            if len(cleaned) >= config.ANPR_MIN_PLATE_LEN and conf > best_conf:
                best_text, best_conf = cleaned, conf
        return (best_text or None), float(best_conf)

    def read_image(self, image) -> tuple[Optional[str], float]:
        """OCR an entire image (used by the ANPR benchmark for plate crops)."""
        reader = self._ensure()
        result = reader.readtext(image, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        if not result:
            return None, 0.0
        best_text, best_conf = "", 0.0
        for bbox, text, conf in result:
            cleaned = normalize_plate(text)
            if len(cleaned) >= config.ANPR_MIN_PLATE_LEN and conf > best_conf:
                best_text, best_conf = cleaned, conf
        return (best_text or None), float(best_conf)


def normalize_plate(text: str) -> str:
    """Keep only plate-valid chars, uppercase, collapse spaces."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", text).upper()
    return cleaned


def format_plate(raw: str) -> str:
    """Format e.g. GJ01AB1234 -> 'GJ01 AB 1234'."""
    raw = normalize_plate(raw)
    if len(raw) != 10:
        return raw
    return f"{raw[:4]} {raw[4:6]} {raw[6:]}"
