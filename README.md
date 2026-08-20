# Civic-Enforcement

AI-powered parking violation enforcement system with citizen reporting, camera-based detection, and a real-time authority dashboard.

## Architecture

```
parking-enforcement-system/
├── app/                  # Next.js 16 frontend (App Router)
│   ├── citizen/          # Citizen portal (report, map, profile)
│   ├── dashboard/        # Authority dashboard
│   ├── violations/       # Violation management
│   └── login/            # Auth (local SQLite)
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── cv/           # Computer vision pipeline (ANPR, dwell detection)
│   │   └── predict/      # GBM risk prediction
│   ├── migrations/       # Alembic migrations
│   └── tests/            # pytest test suite
├── components/           # Shared React components
└── lib/                  # Shared utilities (API client, types)
```

## Features

- **Citizen Reporting** — Submit violations with photos, plate numbers, and GPS location
- **Camera Detection** — RTSP stream processing with ANPR and dwell-time analysis
- **Authority Dashboard** — Real-time stats, violation feed, map view, trend charts
- **Predictive Analytics** — GBM model for hotspot prediction and risk scoring
- **Challan Management** — Auto-generated fines with pay/dispute workflow
- **Live Events** — SSE-based real-time updates across the dashboard
- **Role-Based Auth** — Citizen and authority roles with JWT + refresh tokens

## Tech Stack

**Frontend**
- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS 4, shadcn/ui
- Leaflet + React-Leaflet (maps)
- Recharts (charts)

**Backend**
- FastAPI, Uvicorn
- SQLAlchemy 2 + Alembic
- SQLite (default) — easily swappable to Postgres
- PyJWT (auth), ReportLab (PDF challans)
- OpenCV + ONNX Runtime (CV pipeline)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- pnpm

### Frontend

```bash
pnpm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
pnpm dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python -m app.seed            # seed demo users + sample data
uvicorn app.main:app --reload --port 8000
```

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Citizen | `citizen` | `citizen123` |
| Authority | `admin` | `password123` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET | `/api/users/me` | Current user profile |
| POST | `/api/reports` | Submit violation report |
| GET | `/api/reports` | List all reports (authority) |
| GET | `/api/reports/mine` | List own reports (citizen) |
| POST | `/api/reports/{id}/review` | Confirm or reject report |
| GET | `/api/violations/stats` | Violation statistics |
| GET | `/api/violations/trend` | Hourly trend data |
| GET | `/api/violations/by-type` | Breakdown by type |
| GET | `/api/violations/top-zones` | Top violation zones |
| GET | `/api/events/stream` | SSE live event stream |

## License

MIT
