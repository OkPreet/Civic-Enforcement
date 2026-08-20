"""Sentinel multi-camera supervisor.

Spawns and supervises one CV worker subprocess per active camera, restarts dead
workers with exponential backoff, and tears everything down on SIGINT/SIGTERM.
Useful as the process-manager layer in front of `app.cv.worker` (systemd/supervisord
deployments can wrap this instead of the individual workers).

Run (from backend/):
    python -m app.cv.supervisor --synthetic-fallback
    python -m app.cv.supervisor --once   # run each camera once and exit (smoke test)
"""

import argparse
import signal
import subprocess
import sys
import time
from datetime import datetime
from typing import Dict, Optional

from .. import config
from ..database import SessionLocal
from ..models import Camera

RESTART_BACKOFF_START = 5.0
RESTART_BACKOFF_MAX = 60.0
POLL_INTERVAL = 2.0


class CameraSupervisor:
    def __init__(self, synthetic_fallback: bool, once: bool, dwell_min: float, reconnect_wait: float, max_retries: int):
        self.synthetic_fallback = synthetic_fallback
        self.once = once
        self.dwell_min = dwell_min
        self.reconnect_wait = reconnect_wait
        self.max_retries = max_retries
        self.procs: Dict[int, dict] = {}
        self.stopping = False
        self._install_signal_handlers()

    def _install_signal_handlers(self) -> None:
        def _handle(signum, frame):
            self.stopping = True

        signal.signal(signal.SIGINT, _handle)
        signal.signal(signal.SIGTERM, _handle)

    def _worker_cmd(self, camera: Camera) -> Optional[list]:
        zone = camera.zones[0] if camera.zones else None
        if not zone:
            print(f"[supervisor] camera {camera.code}: no zone assigned, skipping")
            return None
        cmd = [sys.executable, "-m", "app.cv.worker", "--camera", camera.code, "--zone", zone.name]
        if camera.rtsp_url:
            cmd += ["--video", camera.rtsp_url, "--reconnect-wait", str(self.reconnect_wait), "--max-retries", str(self.max_retries)]
        elif self.synthetic_fallback:
            cmd += ["--synthetic"]
        else:
            print(f"[supervisor] camera {camera.code}: no RTSP url and no --synthetic-fallback, skipping")
            return None
        cmd += ["--dwell-min", str(self.dwell_min)]
        return cmd

    def _spawn(self, camera: Camera, backoff: float) -> None:
        cmd = self._worker_cmd(camera)
        if cmd is None:
            return
        proc = subprocess.Popen(
            cmd,
            cwd=config.BASE_DIR,
            env=None,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        self.procs[camera.id] = {"proc": proc, "backoff": backoff, "cmd": cmd, "camera": camera.code}
        print(f"[supervisor] started worker for {camera.code} (pid {proc.pid}): {' '.join(cmd)}")

    def _drain_output(self, camera_id: int) -> None:
        info = self.procs.get(camera_id)
        if not info:
            return
        for line in iter(info["proc"].stdout.readline, ""):
            if line:
                print(f"[worker:{info['camera']}] {line.rstrip()}")
            else:
                break

    def run(self) -> int:
        db = SessionLocal()
        try:
            cameras = db.query(Camera).filter(Camera.status == "online").all()
            if not cameras:
                print("[supervisor] no online cameras to supervise")
                return 0
            for cam in cameras:
                self._spawn(cam, RESTART_BACKOFF_START)
        finally:
            db.close()

        while not self.stopping:
            for cam_id, info in list(self.procs.items()):
                if info["proc"].poll() is None:
                    continue
                self._drain_output(cam_id)
                code = info["proc"].returncode
                if self.once or self.stopping:
                    print(f"[supervisor] worker for {info['camera']} exited with {code}")
                    del self.procs[cam_id]
                    continue
                # crashed unexpectedly — restart with backoff
                backoff = min(info["backoff"] * 2, RESTART_BACKOFF_MAX)
                print(f"[supervisor] worker for {info['camera']} died (code {code}); restarting in {backoff:.0f}s")
                db = SessionLocal()
                try:
                    camera = db.query(Camera).get(cam_id)
                finally:
                    db.close()
                if camera and camera.status == "online":
                    time.sleep(backoff)
                    self._spawn(camera, backoff)
                else:
                    del self.procs[cam_id]
            if self.once and not self.procs:
                break
            time.sleep(POLL_INTERVAL)

        # graceful shutdown
        for info in self.procs.values():
            if info["proc"].poll() is None:
                info["proc"].terminate()
        deadline = time.monotonic() + 10
        for cam_id in list(self.procs):
            info = self.procs[cam_id]
            remaining = deadline - time.monotonic()
            if remaining > 0:
                try:
                    info["proc"].wait(timeout=remaining)
                except subprocess.TimeoutExpired:
                    info["proc"].kill()
            self._drain_output(cam_id)
        print("[supervisor] shutdown complete")
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Sentinel multi-camera CV supervisor")
    parser.add_argument("--synthetic-fallback", action="store_true",
                        help="run cameras without an RTSP url in synthetic demo mode")
    parser.add_argument("--once", action="store_true",
                        help="run each camera's worker once to completion, then exit")
    parser.add_argument("--dwell-min", type=float, default=config.DWELL_THRESHOLD_MIN,
                        help="minutes of in-zone dwell before a report fires")
    parser.add_argument("--reconnect-wait", type=float, default=5.0, help="RTSP reconnect wait (s)")
    parser.add_argument("--max-retries", type=int, default=30, help="RTSP reconnect attempts")
    args = parser.parse_args()

    exit(CameraSupervisor(args.synthetic_fallback, args.once, args.dwell_min, args.reconnect_wait, args.max_retries).run())


if __name__ == "__main__":
    main()
