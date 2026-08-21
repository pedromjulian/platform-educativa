from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from collections import defaultdict

from ..database import get_db
from ..models import (
    User, Course, Quiz, Question, QuestionOption, QuizSubmission, QuizAnswer,
    UserRole, Enrollment
)
from ..schemas import (
    QuizCreate, QuizTeacherView, QuizListResponse, QuizStudentView,
    QuizSubmitRequest, QuizSubmissionResult, QuestionScoreBreakdown,
    QuizSubmissionsExportResponse, QuestionStatsResponse, OptionStatsResponse
)
from ..auth import get_current_user

router = APIRouter(tags=["quizzes"])

def _get_owned_course(course_id: int, current_user: User, db: Session) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the teacher can do this")
    return course

def _require_enrollment(course_id: int, student_id: int, db: Session) -> None:
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")

@router.post("/courses/{course_id}/quizzes", response_model=QuizTeacherView)
def create_quiz(
    course_id: int,
    quiz_data: QuizCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_owned_course(course_id, current_user, db)

    if not quiz_data.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz must have at least one question")

    quiz = Quiz(
        course_id=course_id,
        title=quiz_data.title,
        description=quiz_data.description,
        deadline=quiz_data.deadline
    )
    db.add(quiz)
    db.flush()

    for q_order, q in enumerate(quiz_data.questions):
        if not q.options:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Question '{q.text}' must have options")
        question = Question(quiz_id=quiz.id, text=q.text, order=q_order)
        db.add(question)
        db.flush()

        for o_order, opt in enumerate(q.options):
            option = QuestionOption(
                question_id=question.id,
                text=opt.text,
                fraction=opt.fraction,
                order=o_order
            )
            db.add(option)

    db.commit()
    db.refresh(quiz)
    return quiz

@router.get("/courses/{course_id}/quizzes", response_model=List[QuizListResponse])
def list_quizzes(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user.role == UserRole.STUDENT:
        _require_enrollment(course_id, current_user.id, db)
    elif course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
    return quizzes

@router.get("/courses/{course_id}/quizzes/{quiz_id}", response_model=QuizTeacherView)
def get_quiz_teacher_view(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_owned_course(course_id, current_user, db)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.course_id == course_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz

@router.delete("/courses/{course_id}/quizzes/{quiz_id}")
def delete_quiz(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_owned_course(course_id, current_user, db)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.course_id == course_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted"}

@router.get("/quizzes/{quiz_id}/take", response_model=QuizStudentView)
def take_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    _require_enrollment(quiz.course_id, current_user.id, db)
    return quiz

def _score_quiz(quiz: Quiz, answers_by_question: dict) -> tuple[float, list[QuestionScoreBreakdown]]:
    breakdown = []
    question_scores = []

    for question in quiz.questions:
        selected_ids = answers_by_question.get(question.id, [])
        options_by_id = {opt.id: opt for opt in question.options}

        raw_fraction_sum = sum(
            options_by_id[oid].fraction for oid in selected_ids if oid in options_by_id
        )
        clamped = max(0.0, min(100.0, raw_fraction_sum))
        question_score = clamped / 100.0

        question_scores.append(question_score)
        breakdown.append(QuestionScoreBreakdown(
            question_id=question.id,
            score=round(question_score, 4),
            selected_option_ids=selected_ids
        ))

    final_score = (sum(question_scores) / len(question_scores) * 10) if question_scores else 0.0
    return round(final_score, 2), breakdown

@router.post("/quizzes/{quiz_id}/submit", response_model=QuizSubmissionResult)
def submit_quiz(
    quiz_id: int,
    submission_data: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    _require_enrollment(quiz.course_id, current_user.id, db)

    existing = db.query(QuizSubmission).filter(
        QuizSubmission.quiz_id == quiz_id,
        QuizSubmission.student_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz already submitted")

    valid_question_ids = {q.id for q in quiz.questions}
    answers_by_question = {}
    for ans in submission_data.answers:
        if ans.question_id not in valid_question_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid question_id {ans.question_id}")
        answers_by_question[ans.question_id] = ans.selected_option_ids

    score, breakdown = _score_quiz(quiz, answers_by_question)

    now = datetime.utcnow()
    quiz_submission = QuizSubmission(
        quiz_id=quiz_id,
        student_id=current_user.id,
        submitted_at=now,
        score=score,
        graded_at=now
    )
    db.add(quiz_submission)
    db.flush()

    for question_id, selected_ids in answers_by_question.items():
        db.add(QuizAnswer(
            quiz_submission_id=quiz_submission.id,
            question_id=question_id,
            selected_option_ids=selected_ids
        ))

    db.commit()
    db.refresh(quiz_submission)

    return QuizSubmissionResult(
        id=quiz_submission.id,
        quiz_id=quiz_id,
        student_id=current_user.id,
        submitted_at=quiz_submission.submitted_at,
        score=score,
        breakdown=breakdown
    )

@router.get("/quizzes/{quiz_id}/submission", response_model=QuizSubmissionResult)
def get_my_quiz_submission(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(QuizSubmission).filter(
        QuizSubmission.quiz_id == quiz_id,
        QuizSubmission.student_id == current_user.id
    ).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    breakdown = [
        QuestionScoreBreakdown(
            question_id=ans.question_id,
            score=0.0,
            selected_option_ids=ans.selected_option_ids
        )
        for ans in submission.answers
    ]

    return QuizSubmissionResult(
        id=submission.id,
        quiz_id=submission.quiz_id,
        student_id=submission.student_id,
        submitted_at=submission.submitted_at,
        score=submission.score,
        breakdown=breakdown
    )

@router.get("/courses/{course_id}/quizzes/{quiz_id}/submissions/export", response_model=QuizSubmissionsExportResponse)
def export_quiz_submissions(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_owned_course(course_id, current_user, db)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.course_id == course_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    submissions = db.query(QuizSubmission).filter(QuizSubmission.quiz_id == quiz_id).all()

    selection_counts = defaultdict(lambda: defaultdict(int))
    for sub in submissions:
        for ans in sub.answers:
            for option_id in ans.selected_option_ids:
                selection_counts[ans.question_id][option_id] += 1

    question_stats = []
    for question in quiz.questions:
        options_stats = [
            OptionStatsResponse(
                option_id=opt.id,
                text=opt.text,
                fraction=opt.fraction,
                times_selected=selection_counts[question.id][opt.id]
            )
            for opt in question.options
        ]
        question_stats.append(QuestionStatsResponse(
            question_id=question.id,
            text=question.text,
            options=options_stats
        ))

    scores = [s.score for s in submissions if s.score is not None]
    average_score = round(sum(scores) / len(scores), 2) if scores else None

    return QuizSubmissionsExportResponse(
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        course_id=course_id,
        total_submissions=len(submissions),
        average_score=average_score,
        question_stats=question_stats
    )
