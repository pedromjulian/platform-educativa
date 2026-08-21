from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from .models import UserRole, SubmissionStatus

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.STUDENT

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str

class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    teacher_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    teacher: UserResponse
    enrollments: List['EnrollmentResponse'] = []

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True

class StudentEnrollmentResponse(EnrollmentResponse):
    student: UserResponse

CourseDetailResponse.model_rebuild()

class MaterialCreate(BaseModel):
    name: str
    description: Optional[str] = None

class MaterialResponse(BaseModel):
    id: int
    course_id: int
    name: str
    description: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime

class AssignmentResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    deadline: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubmissionCreate(BaseModel):
    text_content: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    text_content: Optional[str]
    submitted_at: datetime
    status: SubmissionStatus
    is_late: int
    grade: Optional[float]
    feedback: Optional[str]

    class Config:
        from_attributes = True

class SubmissionDetailResponse(SubmissionResponse):
    assignment: AssignmentResponse
    student: UserResponse
    file_path: Optional[str] = None

class SubmissionWithFileResponse(SubmissionResponse):
    file_path: Optional[str]

class GradeSubmission(BaseModel):
    grade: float
    feedback: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.GRADED

class SubmissionExportResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    text_content: Optional[str]
    file_path: Optional[str]
    submitted_at: datetime
    is_late: int
    status: SubmissionStatus
    grade: Optional[float]
    feedback: Optional[str]

    class Config:
        from_attributes = True

class AssignmentExportResponse(BaseModel):
    assignment_id: int
    assignment_title: str
    course_id: int
    deadline: datetime
    submissions: List[SubmissionExportResponse]

class QuestionOptionCreate(BaseModel):
    text: str
    fraction: float

class QuestionCreate(BaseModel):
    text: str
    options: List[QuestionOptionCreate]

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    questions: List[QuestionCreate]

class QuestionOptionTeacherView(BaseModel):
    id: int
    text: str
    fraction: float
    order: int

    class Config:
        from_attributes = True

class QuestionTeacherView(BaseModel):
    id: int
    text: str
    order: int
    options: List[QuestionOptionTeacherView]

    class Config:
        from_attributes = True

class QuizTeacherView(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    deadline: Optional[datetime]
    created_at: datetime
    questions: List[QuestionTeacherView]

    class Config:
        from_attributes = True

class QuizListResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    deadline: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionOptionStudentView(BaseModel):
    id: int
    text: str
    order: int

    class Config:
        from_attributes = True

class QuestionStudentView(BaseModel):
    id: int
    text: str
    order: int
    options: List[QuestionOptionStudentView]

    class Config:
        from_attributes = True

class QuizStudentView(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    deadline: Optional[datetime]
    questions: List[QuestionStudentView]

    class Config:
        from_attributes = True

class QuizAnswerSubmit(BaseModel):
    question_id: int
    selected_option_ids: List[int]

class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerSubmit]

class QuestionScoreBreakdown(BaseModel):
    question_id: int
    score: float
    selected_option_ids: List[int]

class QuizSubmissionResult(BaseModel):
    id: int
    quiz_id: int
    student_id: int
    submitted_at: datetime
    score: float
    breakdown: List[QuestionScoreBreakdown]

class OptionStatsResponse(BaseModel):
    option_id: int
    text: str
    fraction: float
    times_selected: int

class QuestionStatsResponse(BaseModel):
    question_id: int
    text: str
    options: List[OptionStatsResponse]

class QuizSubmissionsExportResponse(BaseModel):
    quiz_id: int
    quiz_title: str
    course_id: int
    total_submissions: int
    average_score: Optional[float]
    question_stats: List[QuestionStatsResponse]
