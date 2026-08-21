"""
Cliente Python para operar Platform Educativa desde Claude Code.

Uso típico (desde una sesión de Claude Code en este repo):

    from cli.platform_client import PlatformClient
    client = PlatformClient()  # lee cli/.env

    courses = client.list_courses()
    export = client.export_submissions(course_id=1, assignment_id=3, status_filter="pending")
    # ... evaluar cada entrega con Claude ...
    client.grade_submission(course_id=1, submission_id=42, grade=8.5, feedback="...")

Ver cli/README.md para ejemplos completos y el formato esperado de create_quiz.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


class PlatformClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.base_url = (base_url or os.environ["PLATFORM_API_URL"]).rstrip("/")
        email = email or os.environ["PLATFORM_EMAIL"]
        password = password or os.environ["PLATFORM_PASSWORD"]
        self.token = self._login(email, password)
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {self.token}"

    def _login(self, email: str, password: str) -> str:
        res = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password},
        )
        res.raise_for_status()
        return res.json()["access_token"]

    # --- Cursos ---

    def list_courses(self) -> list[dict]:
        res = self.session.get(f"{self.base_url}/courses/")
        res.raise_for_status()
        return res.json()

    def create_course(self, name: str, description: Optional[str] = None) -> dict:
        res = self.session.post(
            f"{self.base_url}/courses/",
            json={"name": name, "description": description},
        )
        res.raise_for_status()
        return res.json()

    def get_course(self, course_id: int) -> dict:
        res = self.session.get(f"{self.base_url}/courses/{course_id}")
        res.raise_for_status()
        return res.json()

    def list_students(self, course_id: int) -> list[dict]:
        res = self.session.get(f"{self.base_url}/courses/{course_id}/students")
        res.raise_for_status()
        return res.json()

    def enroll_course(self, course_id: int) -> dict:
        res = self.session.post(f"{self.base_url}/courses/{course_id}/enroll")
        res.raise_for_status()
        return res.json()

    # --- Material ---

    def upload_material(
        self, course_id: int, file_path: str, name: str, description: Optional[str] = None
    ) -> dict:
        with open(file_path, "rb") as f:
            files = {"file": (Path(file_path).name, f)}
            data = {"name": name}
            if description:
                data["description"] = description
            res = self.session.post(
                f"{self.base_url}/courses/{course_id}/materials",
                files=files,
                data=data,
            )
        res.raise_for_status()
        return res.json()

    def list_materials(self, course_id: int) -> list[dict]:
        res = self.session.get(f"{self.base_url}/courses/{course_id}/materials")
        res.raise_for_status()
        return res.json()

    def download_material_file(self, course_id: int, material_id: int, out_path: str) -> str:
        res = self.session.get(
            f"{self.base_url}/courses/{course_id}/materials/{material_id}/download"
        )
        res.raise_for_status()
        Path(out_path).write_bytes(res.content)
        return out_path

    # --- Actividades (Assignments) ---

    def create_assignment(
        self, course_id: int, title: str, description: Optional[str], deadline: str
    ) -> dict:
        """deadline: ISO 8601 string, ej. '2027-01-01T23:59:00'"""
        res = self.session.post(
            f"{self.base_url}/courses/{course_id}/assignments",
            json={"title": title, "description": description, "deadline": deadline},
        )
        res.raise_for_status()
        return res.json()

    def list_assignments(self, course_id: int) -> list[dict]:
        res = self.session.get(f"{self.base_url}/courses/{course_id}/assignments")
        res.raise_for_status()
        return res.json()

    def delete_assignment(self, course_id: int, assignment_id: int) -> dict:
        res = self.session.delete(f"{self.base_url}/courses/{course_id}/assignments/{assignment_id}")
        res.raise_for_status()
        return res.json()

    def list_submissions(
        self, course_id: int, assignment_id: int, status_filter: Optional[str] = None
    ) -> list[dict]:
        params = {"status_filter": status_filter} if status_filter else {}
        res = self.session.get(
            f"{self.base_url}/courses/{course_id}/assignments/{assignment_id}/submissions",
            params=params,
        )
        res.raise_for_status()
        return res.json()

    def export_submissions(
        self, course_id: int, assignment_id: int, status_filter: Optional[str] = None
    ) -> dict:
        """Formato pensado para que Claude Code lo lea y evalúe: incluye texto,
        ruta de archivo y datos del estudiante por cada entrega."""
        params = {"status_filter": status_filter} if status_filter else {}
        res = self.session.get(
            f"{self.base_url}/courses/{course_id}/assignments/{assignment_id}/submissions/export",
            params=params,
        )
        res.raise_for_status()
        return res.json()

    def download_submission_file(self, course_id: int, submission_id: int, out_path: str) -> str:
        res = self.session.get(
            f"{self.base_url}/courses/{course_id}/submissions/{submission_id}/download"
        )
        res.raise_for_status()
        Path(out_path).write_bytes(res.content)
        return out_path

    def grade_submission(
        self, course_id: int, submission_id: int, grade: float, feedback: Optional[str] = None
    ) -> dict:
        """grade: 0 a 10. No se puede calificar dos veces la misma entrega."""
        res = self.session.patch(
            f"{self.base_url}/courses/{course_id}/submissions/{submission_id}/grade",
            json={"grade": grade, "feedback": feedback},
        )
        res.raise_for_status()
        return res.json()

    # --- Cuestionarios (Quizzes) ---

    def create_quiz(self, course_id: int, quiz: dict) -> dict:
        """
        quiz debe tener la forma:
        {
          "title": str,
          "description": str | None,
          "deadline": str | None,  # ISO 8601
          "questions": [
            {
              "text": str,
              "options": [{"text": str, "fraction": float}, ...]
            },
            ...
          ]
        }
        fraction: porcentaje que suma/resta a la nota de la pregunta si se elige
        esa opción (positivo = correcta, negativo = incorrecta). Ver cli/README.md.
        """
        res = self.session.post(f"{self.base_url}/courses/{course_id}/quizzes", json=quiz)
        res.raise_for_status()
        return res.json()

    def list_quizzes(self, course_id: int) -> list[dict]:
        res = self.session.get(f"{self.base_url}/courses/{course_id}/quizzes")
        res.raise_for_status()
        return res.json()

    def get_quiz(self, course_id: int, quiz_id: int) -> dict:
        res = self.session.get(f"{self.base_url}/courses/{course_id}/quizzes/{quiz_id}")
        res.raise_for_status()
        return res.json()

    def export_quiz_stats(self, course_id: int, quiz_id: int) -> dict:
        res = self.session.get(
            f"{self.base_url}/courses/{course_id}/quizzes/{quiz_id}/submissions/export"
        )
        res.raise_for_status()
        return res.json()
