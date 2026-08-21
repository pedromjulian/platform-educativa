import os
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException, status

UPLOAD_BASE_DIR = Path(__file__).parent.parent.parent / "uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "txt", "docx", "doc", "xls", "xlsx", "py", "js", "java", "cpp", "c", "jpg", "jpeg", "png", "gif", "zip"}

def ensure_upload_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

def validate_file(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type .{ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

async def save_material_file(file: UploadFile, course_id: int) -> str:
    validate_file(file)

    material_dir = UPLOAD_BASE_DIR / "courses" / str(course_id) / "materials"
    ensure_upload_dir(material_dir)

    file_path = material_dir / file.filename

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"courses/{course_id}/materials/{file.filename}"

async def save_submission_file(file: UploadFile, course_id: int, assignment_id: int, student_id: int) -> str:
    validate_file(file)

    submission_dir = UPLOAD_BASE_DIR / "courses" / str(course_id) / "assignments" / str(assignment_id) / "submissions" / str(student_id)
    ensure_upload_dir(submission_dir)

    file_path = submission_dir / file.filename

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"courses/{course_id}/assignments/{assignment_id}/submissions/{student_id}/{file.filename}"

def get_file_path(file_path: str) -> Path:
    full_path = UPLOAD_BASE_DIR / file_path

    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if not full_path.is_relative_to(UPLOAD_BASE_DIR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid file path")

    return full_path

def delete_file(file_path: str) -> None:
    full_path = get_file_path(file_path)
    if full_path.exists():
        full_path.unlink()

def delete_directory(dir_path: str) -> None:
    full_path = UPLOAD_BASE_DIR / dir_path
    if full_path.exists() and full_path.is_relative_to(UPLOAD_BASE_DIR):
        shutil.rmtree(full_path)
