"""Video source handling: cv2.VideoCapture wrapper with RTSP auto-reconnect."""

import time
from typing import Optional, Tuple

import cv2
import numpy as np


class RobustVideoCapture:
    """cv2.VideoCapture wrapper with auto-reconnect for live streams (RTSP/HTTP).

    File sources keep EOF semantics (read() returns False when exhausted); live
    streams tolerate dropped frames and reconnect with backoff up to max_retries
    instead of killing the worker.
    """

    STREAM_PREFIXES = ("rtsp://", "rtspx://", "http://", "https://")

    def __init__(self, source: str, reconnect_wait: float = 5.0, max_retries: int = 30):
        self.source = source
        self.reconnect_wait = reconnect_wait
        self.max_retries = max_retries
        self.is_stream = source.startswith(self.STREAM_PREFIXES)
        self._cap: Optional[cv2.VideoCapture] = None
        self._read_errors = 0
        self._retries = 0
        self._open()

    @property
    def opened(self) -> bool:
        return self._cap is not None

    def _open(self) -> bool:
        if self._cap is not None:
            self._cap.release()
        self._cap = cv2.VideoCapture(self.source)
        ok = self._cap.isOpened()
        if ok:
            self._read_errors = 0
            self._retries = 0
        else:
            self._cap.release()
            self._cap = None
        return ok

    def _reopen(self) -> bool:
        if not self.is_stream:
            return False
        while self._retries < self.max_retries:
            self._retries += 1
            time.sleep(self.reconnect_wait)
            if self._open():
                print(f"[cv] reconnected to {self.source} (attempt {self._retries})")
                return True
            print(f"[cv] reconnect attempt {self._retries}/{self.max_retries} failed")
        return False

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self._cap is None:
            return (True, None) if self._reopen() else (False, None)
        ok, frame = self._cap.read()
        if ok:
            self._read_errors = 0
            return True, frame
        if not self.is_stream:
            return False, None  # EOF on a file
        # Live stream hiccup: tolerate a few dropped frames before reconnecting.
        self._read_errors += 1
        if self._read_errors < 5:
            time.sleep(0.25)
            return True, None
        if self._reopen():
            self._read_errors = 0
            return self._cap.read()
        return False, None

    def release(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
