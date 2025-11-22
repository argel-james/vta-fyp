from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from typing import List
import shutil

router = APIRouter(
    prefix="/documents",
    tags=["Document Management"]
)

@router.post("/upload/{course_id}")
async def upload_documents(
    course_id: str,
    files: List[UploadFile] = File(...)
):
    """
    Upload documents for a course
    """
    upload_dir = Path(__file__).parent.parent.parent / "data" / course_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    uploaded_files = []
    for file in files:
        file_path = upload_dir / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_files.append(file.filename)
    
    return {
        "message": f"Uploaded {len(uploaded_files)} files",
        "files": uploaded_files,
        "course_id": course_id
    }

@router.get("/list/{course_id}")
async def list_documents(course_id: str):
    """
    List all documents for a course
    """
    data_dir = Path(__file__).parent.parent.parent / "data" / course_id
    
    if not data_dir.exists():
        return {"course_id": course_id, "documents": []}
    
    documents = [
        {
            "filename": f.name,
            "size": f.stat().st_size,
            "type": f.suffix
        }
        for f in data_dir.iterdir() if f.is_file()
    ]
    
    return {"course_id": course_id, "documents": documents}