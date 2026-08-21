from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Course, Assignment, Submission, UserRole, SubmissionStatus
from ..schemas import (
    GradeSubmission, SubmissionExportResponse, AssignmentExportResponse,
    SubmissionResponse
)
from ..auth import get_current_user

router = APIRouter(prefix="/courses", tags=["grading"])

@router.get("/{course_id}/assignments/{assignment_id}/submissions/export", response_model=AssignmentExportResponse)
def export_submissions(
    course_id: int,
    assignment_id: int,
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export submissions for a given assignment in JSON format (for Claude Code).
    Only the teacher can export.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can export submissions")

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.course_id == course_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    query = db.query(Submission).filter(Submission.assignment_id == assignment_id)

    if status_filter:
        try:
            status_enum = SubmissionStatus(status_filter)
            query = query.filter(Submission.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")

    submissions = query.all()

    submission_data = []
    for sub in submissions:
        submission_data.append(
            SubmissionExportResponse(
                id=sub.id,
                student_id=sub.student_id,
                student_name=sub.student.name,
                student_email=sub.student.email,
                text_content=sub.text_content,
                file_path=sub.file_path,
                submitted_at=sub.submitted_at,
                is_late=sub.is_late,
                status=sub.status,
                grade=sub.grade,
                feedback=sub.feedback
            )
        )

    return AssignmentExportResponse(
        assignment_id=assignment.id,
        assignment_title=assignment.title,
        course_id=course.id,
        deadline=assignment.deadline,
        submissions=submission_data
    )

@router.patch("/{course_id}/submissions/{submission_id}/grade", response_model=SubmissionResponse)
def grade_submission(
    course_id: int,
    submission_id: int,
    grade_data: GradeSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grade a submission. Only the teacher can grade.
    Validates: grade between 0-10, submission exists, belongs to teacher's course.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    course = db.query(Course).filter(Course.id == course_id, Course.id == assignment.course_id).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can grade")

    if grade_data.grade < 0 or grade_data.grade > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grade must be between 0 and 10"
        )

    if submission.status == SubmissionStatus.GRADED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission is already graded. Cannot grade twice."
        )

    submission.grade = grade_data.grade
    submission.feedback = grade_data.feedback
    submission.status = SubmissionStatus.GRADED
    submission.graded_at = datetime.utcnow()

    db.commit()
    db.refresh(submission)
    return submission

@router.patch("/{course_id}/submissions/{submission_id}", response_model=SubmissionResponse)
def update_submission_grade(
    course_id: int,
    submission_id: int,
    grade_data: GradeSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint: same as /grade but without '/grade' suffix.
    """
    return grade_submission(course_id, submission_id, grade_data, current_user, db)
