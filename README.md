# 🌊 EcoRal — Global Ocean Risk & AI Environmental Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.12-18C8FF?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1.3-FF6F00?style=flat-square&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-27D980?style=flat-square)](LICENSE)

**EcoRal** is a full-stack, enterprise-grade AI Environmental Intelligence SaaS Platform designed for global coral bleaching risk prediction, sea surface temperature (SST) telemetry monitoring, and marine conservation decision support.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["Next.js 16 Frontend<br/>(TypeScript / Tailwind / shadcn / Leaflet / Recharts)"]
    API["FastAPI Production Backend<br/>(Async REST API / JWT Auth / OpenAPI)"]
    
    subgraph Core Intelligence Services
        ExecCenter["Executive Monitoring Center<br/>(Global Risk Index / Ocean Health Meter / Alerts)"]
        GISMapEngine["GIS-Grade Mapping Engine<br/>(GeoJSON Export / Distance Measurement / Reef Polygons)"]
        GlobalIntelligence["Global Background Intelligence Engine<br/>(Periodic Worker Scans / 7 Global Reef Systems)"]
        ForecastingEngine["Predictive Forecasting Engine<br/>(5 Horizon Windows / 95% CI Uncertainty Bands)"]
        AIAnalyst["AI Environmental Analyst<br/>(Structured Reports / SHAP Driver Rationale)"]
        ReportGen["ReportLab Publication PDF Engine<br/>(Cover Page / NumberedCanvas / 8 Sections)"]
        WorkspaceSvc["Collaborative Research Workspace<br/>(Projects / Notebook / Comparisons / CSV Export)"]
        GridEngine["Global Ocean Risk Engine<br/>(Spatial Bounding Boxes / Parallel ThreadPool)"]
        Simulator["Scenario Simulator & Climate Engine<br/>(IPCC Delta SST / Marine Heatwave / El Niño)"]
    end

    MLCore["ML Intelligence Core<br/>(XGBoost 2.1.3 / SHAP Explainability)"]
    DB[(PostgreSQL 16 Database<br/>SQLAlchemy 2.0 Async)]
    Cache[(Redis 7 Cache)]

    Client -->|REST / JSON| API
    API --> ExecCenter
    API --> GISMapEngine
    API --> GlobalIntelligence
    API --> ForecastingEngine
    API --> AIAnalyst
    API --> ReportGen
    API --> WorkspaceSvc
    API --> GridEngine
    API --> Simulator
    GlobalIntelligence --> MLCore
    GlobalIntelligence --> Cache
    ReportGen --> DB
    WorkspaceSvc --> DB
    GridEngine --> MLCore
    API --> DB
    API --> Cache
```

---

## 🗄️ Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ PREDICTION_HISTORY : logs
    USERS ||--o{ REPORTS : generates
    USERS ||--o{ LOCATIONS : saves
    USERS ||--o{ RESEARCH_PROJECTS : owns
    RESEARCH_PROJECTS ||--o{ RESEARCH_NOTES : contains
    RESEARCH_PROJECTS ||--o{ EXPERIMENT_RECORDS : tracks

    USERS {
        string id PK
        string email
        string hashed_password
        string full_name
        datetime created_at
    }

    PREDICTION_HISTORY {
        string id PK
        string user_id FK
        float latitude
        float longitude
        float sea_surface_temperature
        int prediction
        float probability
        float confidence
        string location_name
        text explanation
        datetime created_at
    }

    REPORTS {
        string id PK
        string user_id FK
        string prediction_id FK
        string title
        string status
        string file_path
        datetime created_at
    }

    RESEARCH_PROJECTS {
        string id PK
        string user_id FK
        string title
        text description
        string tags
        boolean is_collaborative
        datetime created_at
    }

    RESEARCH_NOTES {
        string id PK
        string project_id FK
        string user_id
        string author_name
        text content
        datetime created_at
    }

    EXPERIMENT_RECORDS {
        string id PK
        string project_id FK
        string title
        float latitude
        float longitude
        float sea_surface_temperature
        int prediction
        float probability
        float confidence
        datetime created_at
    }
```

---

## ✨ Key Features

1. **Executive Monitoring Center**:
   - **Global Risk Index %**, **Ocean Health Score Radial Gauge (0-100)**, active thermal anomaly alerts, and high-risk region leaderboards.
2. **GIS-Grade Digital Ocean Map**:
   - Leaflet map featuring 7 modular layers, **GeoJSON Export Tool**, **Geodesic Distance Measurement Tool (km & NM)**, and **Reef Sanctuary Polygons**.
3. **Coral Bleaching Predictive Forecasting**:
   - 5 projection horizons (`1 Week`, `1 Month`, `3 Months`, `6 Months`, `1 Year`) with **95% Confidence Interval uncertainty bands**.
4. **Global Background Intelligence Engine**:
   - Asynchronous worker scanning 7 global reef sanctuaries (Great Barrier Reef, Maldives, Lakshadweep, Red Sea, Coral Triangle, Caribbean, Hawaii).
5. **AI Environmental Analyst Engine**:
   - Generates structured multi-section intelligence reports (`EAR-2026-TREND-01`) detailing thermal anomalies and SHAP feature drivers.
6. **Enterprise Publication PDF Generator**:
   - Multi-page ReportLab PDF generator featuring cover pages, automatic Table of Contents, and `Page X of Y` page numbering.
7. **Collaborative Research Workspace**:
   - Multi-user project tracking, experiment comparison matrix, collaborative research notebook, and CSV dataset exporter.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (optional for containerized setup)

### 1. Local Development Setup

#### Backend Setup
```bash
# Navigate to repository root
cd ecoralla

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r backend/requirements.txt

# Run pytest backend test suite
python -m pytest tests/unit/ -v

# Start FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Run TypeScript type check & build
npm run build

# Start Next.js development server
npm run dev
```

---

## 🐳 Docker Deployment

To launch the full EcoRal platform (PostgreSQL 16, Redis 7, FastAPI Backend, and Next.js Frontend) using Docker Compose:

```bash
docker-compose up --build -d
```

Access services at:
- **Frontend App**: `http://localhost:3000`
- **FastAPI API Documentation**: `http://localhost:8000/docs`
- **Health Endpoint**: `http://localhost:8000/health`

---

## 📜 API Documentation Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/predict` | Executes XGBoost prediction & SHAP explainability |
| `POST` | `/api/v1/forecasting/predict-forecast` | Multi-horizon temporal forecast with 95% CI bands |
| `GET` | `/api/v1/intelligence/global-summary` | Fetches background scan snapshots for 7 global regions |
| `POST` | `/api/v1/assistant/chat` | Generates AI Environmental Analyst structured report |
| `POST` | `/api/v1/reports` | Generates publication-grade ReportLab PDF report |
| `GET` | `/api/v1/workspace/projects` | Lists user research projects & experiment logs |
| `GET` | `/api/v1/workspace/projects/{id}/export-dataset` | Exports project experiment dataset as CSV |

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for details.
