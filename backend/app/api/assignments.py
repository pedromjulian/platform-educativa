from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Course, Assignment, Submission, UserRole, Enrollment, SubmissionStatus
from ..schemas import (
    AssignmentCreate, AssignmentResponse, SubmissionResponse,
    SubmissionDetailResponse, SubmissionWithFileResponse
)
from ..auth import get_current_user
from ..utils.file_handler import save_submission_file, delete_file, get_file_path

router = APIRouter(tags=["assignments"])

@router.post("/courses/{course_id}/assignments", response_model=AssignmentResponse)
def create_assignment(
    course_id: int,
    assignment: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can create assignments")

    if assignment.deadline <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deadline must be in the future")

    db_assignment = Assignment(
        course_id=course_id,
        title=assignment.title,
        description=assignment.description,
        deadline=assignment.deadline
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.get("/courses/{course_id}/assignments", response_model=List[AssignmentResponse])
def list_assignments(
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

    assignments = db.query(Assignment).filter(Assignment.course_id == course_id).all()
    return assignments

@router.put("/courses/{course_id}/assignments/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    course_id: int,
    assignment_id: int,
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.course_id == course_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    assignment.title = assignment_data.title
    assignment.description = assignment_data.description
    assignment.deadline = assignment_data.deadline
    db.commit()
    db.refresh(assignment)
    return assignment

@router.delete("/courses/{course_id}/assignments/{assignment_id}")
def delete_assignment(
    course_id: int,
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.course_id == course_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}

@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionWithFileResponse)
async def submit_assignment(
    assignment_id: int,
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == assignment.course_id,
        Enrollment.student_id == current_user.id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")

    existing_submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()

    if existing_submission and existing_submission.status == SubmissionStatus.GRADED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot resubmit a graded assignment")

    now = datetime.utcnow()
    is_late = 1 if now > assignment.deadline else 0
    file_path = None

    if file:
        file_path = await save_submission_file(file, assignment.course_id, assignment_id, current_user.id)

    if existing_submission:
        existing_submission.text_content = text_content
        existing_submission.file_path = file_path or existing_submission.file_path
        existing_submission.submitted_at = now
        existing_submission.is_late = is_late
        db.commit()
        db.refresh(existing_submission)
        return existing_submission

    new_submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        text_content=text_content,
        file_path=file_path,
        is_late=is_late
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return new_submission

@router.get("/assignments/{assignment_id}/submission", response_model=SubmissionWithFileResponse)
def get_my_submission(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()

    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    return submission

@router.get("/courses/{course_id}/assignments/{assignment_id}/submissions", response_model=List[SubmissionDetailResponse])
def list_submissions(
    course_id: int,
    assignment_id: int,
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.course_id == course_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    query = db.query(Submission).filter(Submission.assignment_id == assignment_id)

    if status_filter:
        try:
            status_enum = SubmissionStatus(status_filter)
            query = query.filter(Submission.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")

    submissions = query.all()
    return submissions

@router.get("/courses/{course_id}/submissions/{submission_id}/download")
def download_submission_file(
    course_id: int,
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    course = db.query(Course).filter(Course.id == course_id, Course.id == assignment.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    is_owner_teacher = course.teacher_id == current_user.id
    is_submission_author = submission.student_id == current_user.id
    if not is_owner_teacher and not is_submission_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    if not submission.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission has no file")

    full_path = get_file_path(submission.file_path)
    filename = full_path.name
    return FileResponse(full_path, filename=filename)
