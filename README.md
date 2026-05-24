# SaaS Doc — Document Management for Accounting Firms

A web application that allows accounting firms to centralize, organize, and track their clients' accounting documents.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.9+ / FastAPI |
| Database | PostgreSQL + SQLAlchemy |
| Migrations | Alembic |
| Frontend | Next.js + Tailwind CSS |
| Auth | JWT (python-jose) + bcrypt |
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
│   ├── tests/              # Unit tests
│   └── .env.example
├── frontend/               # Next.js app (initialized separately)
├── env/                    # Python virtual environment (not committed)
├── requirements.txt
└── README.md
```

## Getting Started

### Backend

```bash
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
cd backend
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

## Auth Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Create organization + admin user, returns JWT |
| POST | `/auth/login` | Login with email/password, returns JWT |

### Register payload
```json
{
  "organization_name": "Cabinet Dupont",
  "email": "admin@cabinet.fr",
  "password": "securepassword"
}
```

### Login payload
```json
{
  "email": "admin@cabinet.fr",
  "password": "securepassword"
}
```

### Token response
```json
{
  "access_token": "<JWT>",
  "token_type": "bearer"
}
```

JWT payload contains: `sub` (user_id), `org` (organization_id), `role`.

## Data Model

- **organizations** — one per accounting firm, fully isolated
- **users** — belong to one organization, roles: `admin` / `comptable`
- **clients** — belong to one organization
- **documents** — linked to a client and organization, stored securely

## V1 Features

- [x] Authentication (register / login / JWT)
- [ ] Organization management (multi-tenant isolation)
- [ ] Client management
- [ ] Document upload (PDF / images)
- [ ] Dashboard
- [ ] Document listing per client

## Branch Strategy

- `main` — stable production
- `dev` — integration branch
- `feature/<name>` — one branch per feature, merged via PR into `dev`
