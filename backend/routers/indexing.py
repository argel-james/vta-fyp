from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from settings import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/indexing", tags=["Index Management"])


class IndexRequest(BaseModel):
    course_id: str
    force_rebuild: bool = False


class IndexStatus(BaseModel):
    course_id: str
    status: str
    document_count: int
    indexed: bool
    category: str


def _run_indexing(course_id: str, settings: Settings) -> None:
    from rag_core.config import AzureSettings
    from rag_core.ingestion import build_faiss_index, load_all_documents, split_docs

    data_dir = settings.data_dir / course_id
    index_dir = settings.index_dir / course_id

    try:
        azure = AzureSettings()
        azure.validate()
        docs = load_all_documents(data_dir)
        if not docs:
            logger.warning("No documents to index", extra={"course_id": course_id})
            return
        chunks = split_docs(docs)
        build_faiss_index(chunks, index_dir, azure)
        logger.info("Indexing complete", extra={"course_id": course_id, "chunks": len(chunks)})
    except Exception:
        logger.exception("Indexing failed", extra={"course_id": course_id})


@router.post("/build")
async def build_index(
    request: IndexRequest,
    background_tasks: BackgroundTasks,
    app_settings: Settings = Depends(get_settings),
):
    data_dir = app_settings.data_dir / request.course_id
    if not data_dir.exists():
        raise HTTPException(status_code=404, detail=f"No documents found for course '{request.course_id}'")

    if request.force_rebuild:
        index_dir = app_settings.index_dir / request.course_id
        if index_dir.exists():
            import shutil
            shutil.rmtree(index_dir)

    background_tasks.add_task(_run_indexing, request.course_id, app_settings)

    return {"message": f"Index building started for course '{request.course_id}'", "status": "processing"}


@router.get("/status/{course_id}", response_model=IndexStatus)
async def get_index_status(
    course_id: str,
    app_settings: Settings = Depends(get_settings),
):
    index_path = app_settings.index_dir / course_id
    data_path = app_settings.data_dir / course_id

    doc_count = 0
    if data_path.exists():
        doc_count = len([f for f in data_path.iterdir() if f.is_file() and not f.name.startswith(".")])

    category = "unknown"
    cat_file = data_path / ".category"
    if cat_file.exists():
        category = cat_file.read_text().strip()

    return IndexStatus(
        course_id=course_id,
        status="indexed" if index_path.exists() else "not_indexed",
        document_count=doc_count,
        indexed=index_path.exists(),
        category=category,
    )