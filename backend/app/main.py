from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.clients import router as clients_router
from app.routes.dashboard import router as dashboard_router
from app.routes.documents import router as documents_router

app = FastAPI(
    title="SaaS Doc API",
    description="Document management API for accounting firms",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(documents_router)
app.include_router(dashboard_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
