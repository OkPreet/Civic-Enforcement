"""Stateful dwell-time tracker, keyed by tracked vehicle ID.

Tracks first-seen / last-seen per (track_id, zone) so we know how long a
vehicle has stayed inside a restricted zone. In-memory dict is fine for a
single worker; swap for Redis in a multi-worker deployment.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class TrackEntry:
    track_id: int
    zone_id: Optional[int]
    zone_name: Optional[str]
    first_seen: float = field(default_factory=time.monotonic)
    last_seen: float = field(default_factory=time.monotonic)
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    plate: Optional[str] = None
    plate_confidence: float = 0.0
    reported: bool = False


class DwellTracker:
    def __init__(self, timeout_seconds: float = 60.0):
        self.timeout_seconds = timeout_seconds
        self._entries: Dict[int, TrackEntry] = {}

    def update(
        self,
        track_id: int,
        zone_id: Optional[int],
        zone_name: Optional[str],
        lat: Optional[float],
        lng: Optional[float],
    ) -> TrackEntry:
        now = time.monotonic()
        entry = self._entries.get(track_id)
        if entry is None:
            entry = TrackEntry(track_id=track_id, zone_id=zone_id, zone_name=zone_name)
            self._entries[track_id] = entry
        entry.last_seen = now
        if zone_id is not None:
            entry.zone_id = zone_id
            entry.zone_name = zone_name
        if lat is not None:
            entry.last_lat = lat
        if lng is not None:
            entry.last_lng = lng
        return entry

    def set_plate(self, track_id: int, plate: str, confidence: float) -> None:
        entry = self._entries.get(track_id)
        if entry and confidence > entry.plate_confidence:
            entry.plate = plate
            entry.plate_confidence = confidence

    def dwell_minutes(self, track_id: int) -> float:
        entry = self._entries.get(track_id)
        if not entry:
            return 0.0
        return (time.monotonic() - entry.first_seen) / 60.0

    def get(self, track_id: int) -> Optional[TrackEntry]:
        return self._entries.get(track_id)

    def prune(self) -> None:
        """Drop tracks that haven't been seen for `timeout_seconds`."""
        now = time.monotonic()
        stale = [tid for tid, e in self._entries.items() if now - e.last_seen > self.timeout_seconds]
        for tid in stale:
            del self._entries[tid]
