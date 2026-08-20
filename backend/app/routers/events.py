"""Server-Sent Events live feed.

Browsers' EventSource can't set an Authorization header, so auth is accepted
either as a Bearer header or a `?token=` query parameter. The query param
variant is a dev convenience — revoke in production or move behind a cookie.
"""

import asyncio
import queue
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import config
from ..auth import get_current_user
from ..database import get_db
from ..events import hub
from ..models import User

router = APIRouter(prefix="/api/events", tags=["events"])

TOPIC = "violations"


class InternalEventIn(BaseModel):
    event: str
    data: dict


@router.post("/internal")
def publish_internal(
    payload: InternalEventIn,
    x_internal_token: str = Header(None),
):
    """Bridge so out-of-process workers (CV) can publish into the hub."""
    if x_internal_token != config.INTERNAL_EVENTS_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")
    hub.publish(TOPIC, payload.event, payload.data)
    return {"ok": True}


async def _current_user_query(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> User:
    """Auth dependency that reads the Bearer header, falling back to ?token=."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return get_current_user(auth_header.split(" ", 1)[1], db)
    if token:
        return get_current_user(token, db)
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.get("/stream")
async def stream(
    request: Request,
    user: User = Depends(_current_user_query),
):
    q = hub.subscribe(TOPIC)

    async def gen():
        try:
            yield f"event: connected\ndata: {{\"user\": \"{user.username}\"}}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = q.get_nowait()
                except queue.Empty:
                    await asyncio.sleep(0.5)
                    continue
                yield hub.to_sse(message)
        finally:
            hub.unsubscribe(TOPIC, q)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
