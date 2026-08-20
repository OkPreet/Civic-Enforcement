import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .database import Base, SessionLocal, engine
from .routers import auth, challans, events, notifications, predictions, reports, users, zones

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sentinel API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(config.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(zones.router)
app.include_router(users.router)
app.include_router(challans.router)
app.include_router(notifications.router)
app.include_router(predictions.router)
app.include_router(events.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        from .seed import seed

        seed(db)
    finally:
        db.close()
