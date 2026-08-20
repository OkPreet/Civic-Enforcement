import os

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(BASE_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'sentinel.db')}")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))  # 2 hours
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
MAX_UPLOAD_MB = 10
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# Object storage (local disk by default; see app/storage.py)
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # local | s3
S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION", "ap-south-1")
S3_PREFIX = os.getenv("S3_PREFIX", "sentinel/uploads")

# Demo credentials
DEMO_AUTHORITY_USERNAME = "admin"
DEMO_AUTHORITY_PASSWORD = "password123"
DEMO_CITIZEN_USERNAME = "citizen"
DEMO_CITIZEN_PASSWORD = "citizen123"

# CV pipeline
DWELL_THRESHOLD_MIN = float(os.getenv("DWELL_THRESHOLD_MIN", 10))  # min dwell in zone before report
AUTO_CONFIDENCE_THRESHOLD = float(os.getenv("AUTO_CONFIDENCE_THRESHOLD", 0.7))
DEDUPE_WINDOW_MIN = int(os.getenv("DEDUPE_WINDOW_MIN", 30))  # skip re-report same plate+zone within this window
ANPR_MIN_PLATE_LEN = 4
CAMERA_POSITION_STEP = float(os.getenv("CAMERA_POSITION_STEP", 0.004))  # degrees for bbox->geo mapping

# Live event bridge: the CV worker runs as a separate process, so it POSTs
# detection events to the API over HTTP instead of sharing the in-process hub.
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
INTERNAL_EVENTS_TOKEN = os.getenv("INTERNAL_EVENTS_TOKEN", "dev-internal-token")

