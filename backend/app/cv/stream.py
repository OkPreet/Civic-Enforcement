"""In-process annotated live-feed broker for the MJPEG camera endpoint.

For each camera being watched, a background thread captures frames (RTSP via
RobustVideoCapture + YOLO, or synthetic demo), runs detection/tracking, draws
annotations (bboxes, track IDs, zone highlight, watermark) and caches the latest
JPEG. The HTTP endpoint streams whatever frame is current — no per-connection
inference. Threads are reference-counted and stop after a grace period when no
viewers remain.

The broker works on plain primitives (id, code, rtsp_url, zone_name) so it never
touches a SQLAlchemy session from a background thread.
"""

import threading
import time
from datetime import datetime
from typing import Dict, Optional

import cv2

from .engine import RealEngine, SyntheticEngine
from .video import RobustVideoCapture

BOUNDARY = "frame"
MJPEG_HEADER = b"--" + BOUNDARY.encode() + b"\r\nContent-Type: image/jpeg\r\n\r\n"
MJPEG_FOOTER = b"\r\n"


class CameraStreamBroker:
    def __init__(self, frame_interval: float = 0.1, stop_grace_sec: float = 30.0):
        self.frame_interval = frame_interval
        self.stop_grace_sec = stop_grace_sec
        self._lock = threading.Lock()
        self._threads: Dict[int, threading.Thread] = {}
        self._refcounts: Dict[int, int] = {}
        self._latest: Dict[int, bytes] = {}
        self._stop_after: Dict[int, float] = {}

    # ---- viewer lifecycle ----

    def start(self, camera_id: int, code: str, rtsp_url: Optional[str], zone_name: Optional[str]) -> None:
        with self._lock:
            self._refcounts[camera_id] = self._refcounts.get(camera_id, 0) + 1
            self._stop_after.pop(camera_id, None)
            if camera_id in self._threads:
                return
            thread = threading.Thread(
                target=self._run, args=(camera_id, code, rtsp_url, zone_name), daemon=True
            )
            self._threads[camera_id] = thread
            thread.start()

    def release(self, camera_id: int) -> None:
        with self._lock:
            self._refcounts[camera_id] = self._refcounts.get(camera_id, 0) - 1
            if self._refcounts[camera_id] <= 0:
                self._stop_after[camera_id] = time.monotonic() + self.stop_grace_sec

    def latest_jpeg(self, camera_id: int) -> Optional[bytes]:
        with self._lock:
            return self._latest.get(camera_id)

    # ---- capture + annotate loop ----

    def _should_stop(self, camera_id: int) -> bool:
        with self._lock:
            if self._refcounts.get(camera_id, 0) > 0:
                return False
            return time.monotonic() >= self._stop_after.get(camera_id, 0)

    def _run(self, camera_id: int, code: str, rtsp_url: Optional[str], zone_name: Optional[str]) -> None:
        engine: Optional[RealEngine] = None
        synthetic = None
        cap: Optional[RobustVideoCapture] = None
        try:
            step = 0
            if rtsp_url:
                cap = RobustVideoCapture(rtsp_url)
                engine = RealEngine()
            else:
                synthetic = SyntheticEngine(duration_sec=10 ** 7, fps=10)
            while not self._should_stop(camera_id):
                if cap is not None:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    if frame is None:  # dropped frame
                        time.sleep(0.05)
                        continue
                    dets = engine.detect_tracked(frame)
                    plate = None
                else:
                    frame = synthetic.next_frame()
                    dets = synthetic.detect_tracked(frame)
                    plate = synthetic.plate_at(step)
                annotated = self._annotate(frame, dets, code, zone_name, plate, synthetic=rtsp_url is None)
                ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ok:
                    with self._lock:
                        self._latest[camera_id] = buf.tobytes()
                step += 1
                time.sleep(self.frame_interval)
        except Exception as exc:
            print(f"[stream] camera {code} feed error: {exc}")
        finally:
            if cap is not None:
                cap.release()
            if engine is not None:
                engine.close()
            with self._lock:
                self._threads.pop(camera_id, None)
                self._latest.pop(camera_id, None)

    @staticmethod
    def _annotate(frame, dets, code: str, zone_name: Optional[str], plate: Optional[str], synthetic: bool) -> object:
        out = frame.copy()
        for det in dets:
            x1, y1 = max(int(det.x1), 0), max(int(det.y1), 0)
            x2, y2 = int(det.x2), int(det.y2)
            color = (0, 255, 0) if det.track_id is not None else (0, 165, 255)
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
            label = f"{det.name} {det.confidence:.2f}"
            if det.track_id is not None:
                label += f" ID:{det.track_id}"
            cv2.putText(out, label, (x1, max(y1 - 6, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
        if plate:
            cv2.putText(out, f"PLATE: {plate}", (8, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1, cv2.LINE_AA)

        if synthetic and zone_name:
            # Placeholder zone highlight for demo frames (a real deployment
            # would project the polygon via per-camera homography).
            h, w = out.shape[:2]
            rect = (int(0.12 * w), int(0.5 * h), int(0.88 * w), int(0.55 * h))
            cv2.rectangle(out, (rect[0], rect[1]), (rect[2], rect[3]), (0, 0, 255), 1)
            cv2.putText(out, zone_name, (rect[0] + 6, rect[1] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)

        cv2.putText(
            out,
            f"{code}  {datetime.utcnow().strftime('%H:%M:%S')}",
            (8, 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        return out


broker = CameraStreamBroker()
