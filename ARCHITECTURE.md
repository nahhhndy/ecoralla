# 🏗️ EcoRal Platform Architecture & Developer Documentation

## 1. System Design Principles

EcoRal is built upon five foundational architecture principles:
1. **Decoupled Asynchronous API Core**: FastAPI async handlers with SQLAlchemy 2.0 async ORM and Redis 7 caching.
2. **Explainable AI First**: Every machine learning prediction is accompanied by SHAP (SHapley Additive exPlanations) values explaining feature forces.
3. **Reactive GIS Visualization**: Leaflet interactive rendering with vector tiles, polygon boundaries, and client-side GeoJSON generation.
4. **Background Task Scalability**: Long-running operations (spatial grid batch inference, ReportLab PDF compilation, regional background scans) run asynchronously without blocking main looper threads.
5. **Strict Type Assurance**: End-to-end type safety using Pydantic v2 schemas in Python and TypeScript strict interfaces in Next.js 16.

---

## 2. Directory Structure

```
ecoralla/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API endpoints (predict, forecasting, intelligence, assistant, workspace, reports)
│   │   ├── core/            # App configuration, security, JWT dependencies
│   │   ├── db/              # SQLAlchemy session & base models
│   │   ├── models/          # ORM models (User, Prediction, Report, ResearchProject, etc.)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Core business logic (predict, forecasting, background_intelligence, report, assistant)
│   │   └── main.py          # FastAPI application factory
├── frontend/
│   ├── app/                 # Next.js 16 App Router pages (/dashboard, /map, /workspace, /history, /reports)
│   ├── components/          # Reusable UI components (Executive widgets, GIS map, forecasting, assistant)
│   ├── lib/                 # Axios API client & React Query providers
│   └── types/               # TypeScript interfaces
├── infra/
│   ├── docker/              # Dockerfiles for backend and frontend
│   └── nginx/               # Nginx reverse proxy configurations
├── models/                  # Serialized XGBoost model artifacts
├── tests/
│   └── unit/                # Pytest unit & API integration test suite
├── docker-compose.yml       # Production orchestrator
├── README.md                # Main documentation & quick start
└── ARCHITECTURE.md          # Technical architecture & developer guide
```

---

## 3. Deployment & CI/CD Pipeline

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) executes on every push to `main` and `develop`:
1. Spawns isolated PostgreSQL 16 & Redis 7 container services.
2. Installs Python 3.12 requirements and executes `pytest tests/unit/ -v`.
3. Sets up Node.js 20 and executes `npx tsc --noEmit` and `npm run build`.

---

## 4. Production Checklist

- [x] All 44 Python unit & API integration tests pass 100%.
- [x] Next.js 16 production build compiles static routes with 0 errors.
- [x] Docker multi-stage images use non-root `ecoral` and `nextjs` execution users.
- [x] Database queries use indexed foreign keys and eager `selectinload` loading.
- [x] GeoJSON export & geodesic distance measurement tools verified.
