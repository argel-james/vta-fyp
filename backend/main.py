import logging
import os
import sys
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import init_db
from routers import analytics, auth, content, documents, indexing, rag
from settings import get_settings

load_dotenv()

logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup_checks() -> None:
    """Validate filesystem layout before serving traffic."""
    init_db()
    settings.ensure_directories()
    logger.info(
        "Startup checks complete",
        extra={
            "data_dir": str(settings.data_dir),
            "index_dir": str(settings.index_dir),
        },
    )


app.include_router(rag.router)
app.include_router(documents.router)
app.include_router(indexing.router)
app.include_router(auth.router)
app.include_router(content.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {
        "message": "GenAI Assisted Virtual Classroom API",
        "status": "running",
        "version": "2.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}