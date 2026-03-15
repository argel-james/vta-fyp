"""Optional Azure Blob Storage sync for FAISS indexes.

When VTA_BLOB_CONNECTION_STR is set, indexes are uploaded after build
and downloaded on startup (if the local copy is missing).
This provides durable cloud-backed storage for embeddings.
"""
from __future__ import annotations

import logging
from pathlib import Path

from settings import get_settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(get_settings().blob_connection_str)


def upload_index(course_id: str) -> bool:
    """Upload a local FAISS index directory to Azure Blob Storage."""
    if not _is_configured():
        return False

    settings = get_settings()
    index_dir = settings.index_dir / course_id

    if not index_dir.exists():
        logger.warning("No local index to upload", extra={"course_id": course_id})
        return False

    try:
        from azure.storage.blob import BlobServiceClient

        client = BlobServiceClient.from_connection_string(settings.blob_connection_str)
        container = client.get_container_client(settings.blob_container)

        if not container.exists():
            container.create_container()

        for file_path in index_dir.rglob("*"):
            if not file_path.is_file():
                continue
            blob_name = f"{course_id}/{file_path.relative_to(index_dir)}"
            with open(file_path, "rb") as fh:
                container.upload_blob(blob_name, fh, overwrite=True)

        logger.info("Index uploaded to blob storage", extra={"course_id": course_id})
        return True
    except Exception:
        logger.exception("Failed to upload index to blob storage", extra={"course_id": course_id})
        return False


def download_index(course_id: str) -> bool:
    """Download a FAISS index from Azure Blob Storage to local disk."""
    if not _is_configured():
        return False

    settings = get_settings()
    index_dir = settings.index_dir / course_id

    if index_dir.exists() and (index_dir / "index.faiss").exists():
        return True

    try:
        from azure.storage.blob import BlobServiceClient

        client = BlobServiceClient.from_connection_string(settings.blob_connection_str)
        container = client.get_container_client(settings.blob_container)

        if not container.exists():
            return False

        prefix = f"{course_id}/"
        blobs = list(container.list_blobs(name_starts_with=prefix))
        if not blobs:
            return False

        index_dir.mkdir(parents=True, exist_ok=True)
        for blob in blobs:
            rel = blob.name[len(prefix):]
            local_path = index_dir / rel
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as fh:
                fh.write(container.download_blob(blob.name).readall())

        logger.info("Index downloaded from blob storage", extra={"course_id": course_id})
        return True
    except Exception:
        logger.exception("Failed to download index from blob storage", extra={"course_id": course_id})
        return False
