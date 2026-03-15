from __future__ import annotations

import logging
import re
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from settings import Settings, get_settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".docx", ".md", ".txt"}

router = APIRouter(prefix="/documents", tags=["Document Management"])


class UploadResponse(BaseModel):
    message: str
    files: List[str]
    course_id: str
    category: str
    auto_ingest: bool


def _safe_filename(name: str) -> str:
    """Sanitise a user-supplied filename to prevent path traversal."""
    name = Path(name).name
    name = re.sub(r'[<>:"/\\|?*\x00-\x1F]', "_", name)
    return name or "upload"


def _run_ingestion(course_id: str, settings: Settings) -> None:
    """Background task: ingest documents and build FAISS index."""
    from rag_core.config import AzureSettings
    from rag_core.ingestion import build_faiss_index, load_all_documents, split_docs

    data_dir = settings.data_dir / course_id
    index_dir = settings.index_dir / course_id

    try:
        azure = AzureSettings()
        azure.validate()

        docs = load_all_documents(data_dir)
        if not docs:
            logger.warning("No documents found for ingestion", extra={"course_id": course_id})
            return

        chunks = split_docs(docs)
        build_faiss_index(chunks, index_dir, azure)
        logger.info(
            "Auto-ingestion complete",
            extra={"course_id": course_id, "chunks": len(chunks)},
        )
    except Exception:
        logger.exception("Auto-ingestion failed", extra={"course_id": course_id})


@router.post("/upload/{course_id}", response_model=UploadResponse)
async def upload_documents(
    course_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    category: str = Form("university"),
    auto_ingest: bool = Form(True),
    app_settings: Settings = Depends(get_settings),
):
    upload_dir = app_settings.data_dir / course_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files: list[str] = []
    for file in files:
        safe_name = _safe_filename(file.filename or "upload")
        ext = Path(safe_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        file_path = upload_dir / safe_name
        with file_path.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)
        uploaded_files.append(safe_name)

    meta_path = upload_dir / ".category"
    meta_path.write_text(category)

    if auto_ingest and uploaded_files:
        background_tasks.add_task(_run_ingestion, course_id, app_settings)

    return UploadResponse(
        message=f"Uploaded {len(uploaded_files)} file(s)",
        files=uploaded_files,
        course_id=course_id,
        category=category,
        auto_ingest=auto_ingest,
    )


@router.get("/list/{course_id}")
async def list_documents(
    course_id: str,
    app_settings: Settings = Depends(get_settings),
):
    data_dir = app_settings.data_dir / course_id
    if not data_dir.exists():
        return {"course_id": course_id, "category": "unknown", "documents": []}

    category = "unknown"
    cat_file = data_dir / ".category"
    if cat_file.exists():
        category = cat_file.read_text().strip()

    documents = [
        {"filename": f.name, "size": f.stat().st_size, "type": f.suffix}
        for f in data_dir.iterdir()
        if f.is_file() and not f.name.startswith(".")
    ]

    return {"course_id": course_id, "category": category, "documents": documents}


@router.delete("/{course_id}/{filename}")
async def delete_document(
    course_id: str,
    filename: str,
    app_settings: Settings = Depends(get_settings),
):
    safe_name = _safe_filename(filename)
    file_path = app_settings.data_dir / course_id / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    file_path.unlink()
    return {"message": f"Deleted {safe_name}", "course_id": course_id}