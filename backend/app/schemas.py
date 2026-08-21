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
