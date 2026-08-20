import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_authority
from ..cv.stream import MJPEG_FOOTER, MJPEG_HEADER, broker
from ..database import get_db
from ..models import Camera, Zone, User
from ..schemas import CameraIn, CameraOut, ZoneIn, ZoneOut

router = APIRouter(prefix="/api", tags=["zones"])


def _get_camera_or_404(db: Session, camera_id: int) -> Camera:
    camera = db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


def _get_zone_or_404(db: Session, zone_id: int) -> Zone:
    zone = db.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone


# ---------- Cameras (read: any auth, write: authority) ----------
@router.get("/cameras", response_model=List[CameraOut])
def list_cameras(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Camera).order_by(Camera.code).all()


@router.post("/cameras", response_model=CameraOut)
def create_camera(
    payload: CameraIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    if db.query(Camera).filter(Camera.code == payload.code).count() > 0:
        raise HTTPException(status_code=409, detail=f"Camera code '{payload.code}' already exists")
    camera = Camera(**payload.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.put("/cameras/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: int,
    payload: CameraIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    camera = _get_camera_or_404(db, camera_id)
    dup = db.query(Camera).filter(Camera.code == payload.code, Camera.id != camera_id).first()
    if dup:
        raise HTTPException(status_code=409, detail=f"Camera code '{payload.code}' already exists")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(camera, key, value)
    db.commit()
    db.refresh(camera)
    return camera


@router.delete("/cameras/{camera_id}", status_code=204)
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    camera = _get_camera_or_404(db, camera_id)
    db.query(Zone).filter(Zone.camera_id == camera_id).update({Zone.camera_id: None})
    db.delete(camera)
    db.commit()
    return None


@router.get("/cameras/{camera_id}/stream")
async def camera_live_stream(
    camera_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    """Annotated MJPEG live feed for a camera (multipart/x-mixed-replace).

    Frames are produced by a shared background broker (YOLO annotations for
    RTSP cameras, synthetic demo frames otherwise) so inference never runs
    inside the HTTP response generator.
    """
    camera = _get_camera_or_404(db, camera_id)
    zone_name = camera.zones[0].name if camera.zones else None
    broker.start(camera.id, camera.code, camera.rtsp_url, zone_name)

    async def gen():
        last: Optional[bytes] = None
        try:
            while True:
                jpeg = broker.latest_jpeg(camera.id)
                if jpeg is not None and jpeg != last:
                    yield MJPEG_HEADER + jpeg + MJPEG_FOOTER
                    last = jpeg
                await asyncio.sleep(0.05)
        finally:
            broker.release(camera.id)

    return StreamingResponse(gen(), media_type=f"multipart/x-mixed-replace; boundary=frame")


# ---------- Zones (read: any auth, write: authority) ----------
@router.get("/zones", response_model=List[ZoneOut])
def list_zones(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Zone).order_by(Zone.name).all()


@router.post("/zones", response_model=ZoneOut)
def create_zone(
    payload: ZoneIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    zone = Zone(**payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.put("/zones/{zone_id}", response_model=ZoneOut)
def update_zone(
    zone_id: int,
    payload: ZoneIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    zone = _get_zone_or_404(db, zone_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(zone, key, value)
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/zones/{zone_id}", status_code=204)
def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authority),
):
    zone = _get_zone_or_404(db, zone_id)
    db.delete(zone)
    db.commit()
    return None
