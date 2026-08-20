"""In-process pub/sub hub for live events (SSE feed).

Thread-safe so sync FastAPI endpoints and the CV worker process can publish
without awaiting. In a multi-worker deployment this must be swapped for Redis
Pub/Sub, but it is fine for the single-process dev setup.
"""

import json
import queue
import threading
from typing import Any, Dict, Set

MAX_QUEUE = 100


class EventHub:
    def __init__(self) -> None:
        self._subscribers: Dict[str, Set[queue.Queue]] = {}
        self._lock = threading.Lock()

    def subscribe(self, topic: str) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=MAX_QUEUE)
        with self._lock:
            self._subscribers.setdefault(topic, set()).add(q)
        return q

    def unsubscribe(self, topic: str, q: queue.Queue) -> None:
        with self._lock:
            subs = self._subscribers.get(topic)
            if not subs:
                return
            subs.discard(q)
            if not subs:
                self._subscribers.pop(topic, None)

    def publish(self, topic: str, event: str, data: Dict[str, Any]) -> None:
        message = {"event": event, "data": data}
        with self._lock:
            subs = list(self._subscribers.get(topic, ()))
        for q in subs:
            try:
                q.put_nowait(message)
            except queue.Full:
                pass  # slow subscriber: drop rather than block the producer

    def to_sse(self, message: Dict[str, Any]) -> str:
        return f"event: {message['event']}\ndata: {json.dumps(message['data'], default=str)}\n\n"


hub = EventHub()
