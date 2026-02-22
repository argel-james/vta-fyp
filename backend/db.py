"""SQLAlchemy session helpers."""
from __future__ import annotations

import ssl
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from settings import get_settings

settings = get_settings()


def _build_connect_args() -> dict:
    """Return SSL connect_args when the DB URL points to Azure MySQL."""
    if "azure" not in settings.database_url and "mysql.database" not in settings.database_url:
        return {}

    # Prefer the Linux CA bundle (Docker), fall back to macOS
    for ca_path in (
        Path("/etc/ssl/certs/ca-certificates.crt"),      # Debian / Ubuntu
        Path("/etc/ssl/cert.pem"),                        # Alpine
        Path("/etc/pki/tls/certs/ca-bundle.crt"),         # RHEL / CentOS
    ):
        if ca_path.exists():
            return {
                "ssl": {"ca": str(ca_path)},
            }

    # macOS — PyMySQL can use an ssl.SSLContext with system defaults
    ctx = ssl.create_default_context()
    return {"ssl": ctx}


_engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    connect_args=_build_connect_args(),
)
SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from models import Base as ModelBase

    ModelBase.metadata.create_all(bind=_engine)
