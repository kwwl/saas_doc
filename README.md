# SaaS Doc — Document Management for Accounting Firms

A web application that allows accounting firms to centralize, organize, and track their clients' accounting documents.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI |
| Database | PostgreSQL + SQLAlchemy |
| Frontend | Next.js + Tailwind CSS |
| Auth | JWT (python-jose + passlib) |
| File storage | Local (dev) / S3-compatible (prod) |

## Project Structure

```
saas_doc/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI entrypoint
│   │   ├── core/           # Config, DB, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API routers
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/               # Next.js app (initialized separately)
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
python -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`
Health check: `GET /health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

## Data Model

- **organizations** — one per accounting firm, fully isolated
- **users** — belong to one organization, roles: `admin` / `comptable`
- **clients** — belong to one organization
- **documents** — linked to a client and organization, stored securely

## V1 Features

- [ ] Authentication (register / login / JWT)
- [ ] Organization management (multi-tenant isolation)
- [ ] Client management
- [ ] Document upload (PDF / images)
- [ ] Dashboard
- [ ] Document listing per client

## Branch Strategy

- `main` — stable production
- `dev` — integration branch
- `feature/<name>` — one branch per feature, merged via PR into `dev`
