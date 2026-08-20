"""Simple in-memory sliding-window rate limiter.

Single-process / dev-grade. Swap for Redis when deploying horizontally.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # key -> (bucket_start, deque of request timestamps)
        self._buckets: Dict[str, Tuple[float, Deque[float]]] = defaultdict(lambda: (time.monotonic(), deque()))

    def hit(self, key: str) -> None:
        now = time.monotonic()
        start, timestamps = self._buckets[key]
        if now - start > self.window_seconds:
            self._buckets[key] = (now, deque())
            start, timestamps = now, deque()
        while timestamps and now - timestamps[0] > self.window_seconds:
            timestamps.popleft()
        if len(timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Try again shortly.",
            )
        timestamps.append(now)

    def reset(self) -> None:
        """Clear all buckets (used by tests between cases)."""
        self._buckets.clear()


# Login: 10 attempts / 60s per IP
login_limiter = SlidingWindowLimiter(max_requests=10, window_seconds=60)
# Report creation: 20 uploads / 60s per user (user_id or IP)
report_limiter = SlidingWindowLimiter(max_requests=20, window_seconds=60)


def rate_limit(client_ip: str) -> None:
    """Thin helper so callers control which limiter applies."""
    raise NotImplementedError


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
