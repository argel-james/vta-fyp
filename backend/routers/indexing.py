from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

router = APIRouter(
    prefix="/indexing",
    tags=["Index Management"]
)

class IndexRequest(BaseModel):
    course_id: str
    force_rebuild: bool = False

class IndexStatus(BaseModel):
    course_id: str
    status: str
    document_count: int
    indexed: bool

@router.post("/build")
async def build_index(
    request: IndexRequest,
    background_tasks: BackgroundTasks
):
    """
    Build or rebuild index for a course
    """
    data_dir = Path(__file__).parent.parent.parent / "data" / request.course_id
    
    if not data_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No documents found for course '{request.course_id}'"
        )
    
    # Add indexing task to background
    # background_tasks.add_task(run_indexing, request.course_id)
    
    return {
        "message": f"Index building started for course '{request.course_id}'",
        "status": "processing"
    }

@router.get("/status/{course_id}", response_model=IndexStatus)
async def get_index_status(course_id: str):
    """
    Get indexing status for a course
    """
    index_path = Path(__file__).parent.parent.parent / "index" / course_id
    data_path = Path(__file__).parent.parent.parent / "data" / course_id
    
    doc_count = 0
    if data_path.exists():
        doc_count = len(list(data_path.glob("*")))
    
    return IndexStatus(
        course_id=course_id,
        status="indexed" if index_path.exists() else "not_indexed",
        document_count=doc_count,
        indexed=index_path.exists()
    )