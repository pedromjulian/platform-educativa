from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, Course, Material, UserRole, Enrollment
from ..schemas import MaterialCreate, MaterialResponse
from ..auth import get_current_user
from ..utils.file_handler import save_material_file, delete_file

router = APIRouter(prefix="/courses", tags=["materials"])

@router.post("/{course_id}/materials", response_model=MaterialResponse)
async def upload_material(
    course_id: int,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can upload material")

    file_path = await save_material_file(file, course_id)

    material = Material(
        course_id=course_id,
        name=name or file.filename,
        description=description,
        file_path=file_path
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.get("/{course_id}/materials", response_model=List[MaterialResponse])
def list_materials(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user.role == UserRole.STUDENT:
        enrollment = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.student_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")

    materials = db.query(Material).filter(Material.course_id == course_id).all()
    return materials

@router.delete("/{course_id}/materials/{material_id}")
def delete_material(
    course_id: int,
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can delete material")

    material = db.query(Material).filter(Material.id == material_id, Material.course_id == course_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    delete_file(material.file_path)
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}
