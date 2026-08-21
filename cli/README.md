# CLI para Claude Code

Este módulo (`platform_client.py`) es la forma de operar Platform Educativa desde
Claude Code: crear cursos, subir material, crear actividades y cuestionarios, bajar
entregas, evaluarlas y subir notas. El dashboard web del profesor es **solo lectura**
(panel de monitoreo) — toda la operación pasa por acá.

No se despliega en ningún lado: es tooling local que le pega a la API ya desplegada
en Railway.

## Setup (una sola vez)

```bash
cd cli
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales reales
```

## Uso desde Claude Code

Le decís a Claude Code en lenguaje natural qué querés hacer, y Claude usa
`PlatformClient` para ejecutarlo. Ejemplos de prompts:

> "Usá `cli/platform_client.py` para bajar las entregas pendientes de la actividad
> 3 del curso 1, evaluálas contra la rúbrica en
> `Actividades/03-Tema/rubrica-03-Tema.md`, y subí las notas con feedback."

> "Creá el cuestionario de la semana 2 en el curso 1 a partir de las preguntas en
> `Cuestionarios/02-Tema/Preguntas_con_Soluciones/preguntas-02-Tema.md`."

> "Subí como material el resumen de `Materiales/03-Tema/resumen-tema.md` al curso 1."

## Ejemplo directo en Python

```python
from cli.platform_client import PlatformClient

client = PlatformClient()  # lee cli/.env

# Ver cursos
courses = client.list_courses()

# Crear una actividad
assignment = client.create_assignment(
    course_id=1,
    title="Actividad 03 - Tema X",
    description="Consigna...",
    deadline="2027-01-01T23:59:00",
)

# Bajar entregas pendientes de calificar
export = client.export_submissions(course_id=1, assignment_id=assignment["id"], status_filter="pending")
for sub in export["submissions"]:
    # sub["text_content"], sub["file_path"], sub["student_name"], etc.
    # Evaluar con Claude contra la rúbrica del curso...
    grade = 8.5
    feedback = "..."
    client.grade_submission(course_id=1, submission_id=sub["id"], grade=grade, feedback=feedback)
```

## Formato de cuestionarios (multiple choice)

`create_quiz(course_id, quiz)` espera:

```json
{
  "title": "Cuestionario Semana 1",
  "description": "Opcional",
  "deadline": "2027-01-01T23:59:00",
  "questions": [
    {
      "text": "Enunciado de la pregunta",
      "options": [
        {"text": "Opción correcta 1", "fraction": 33.33},
        {"text": "Opción correcta 2", "fraction": 33.33},
        {"text": "Opción correcta 3", "fraction": 33.33},
        {"text": "Opción incorrecta", "fraction": -25.0}
      ]
    }
  ]
}
```

`fraction`: porcentaje que suma (opción correcta, positivo) o resta (opción
incorrecta, negativo) a la nota de esa pregunta si el estudiante la marca. La nota
de la pregunta es la suma de las fracciones de las opciones elegidas, entre 0 y 100%.
Si hay N opciones correctas en una pregunta, cada una suele valer `100/N`%.

### Generar el JSON a partir de un archivo de preguntas en Markdown

Si las preguntas ya están escritas en el formato de tabla usado en
`Cuestionarios/*/Preguntas_con_Soluciones/preguntas-*.md` (columnas: opción,
fracción, correcta), pedile a Claude Code que las convierta directamente al JSON
de arriba y llame a `create_quiz` — no hace falta un script separado, Claude puede
leer la tabla y armar el diccionario en el momento (así se hizo la primera vez, a
mano, para probar la plataforma con el curso VLSI).

## Métodos disponibles

Ver los docstrings en `platform_client.py`. Resumen:

| Método | Qué hace |
|---|---|
| `list_courses()`, `create_course()`, `get_course()` | Cursos |
| `list_students(course_id)` | Estudiantes inscriptos |
| `enroll_course(course_id)` | Inscribirse (por si el profesor prueba como estudiante) |
| `upload_material()`, `list_materials()`, `download_material_file()` | Material |
| `create_assignment()`, `list_assignments()`, `delete_assignment()` | Actividades |
| `list_submissions()`, `export_submissions()`, `download_submission_file()` | Ver/bajar entregas |
| `grade_submission()` | Calificar una entrega |
| `create_quiz()`, `list_quizzes()`, `get_quiz()` | Cuestionarios |
| `export_quiz_stats()` | Estadísticas agregadas (para la etapa "en clase") |

Los cuestionarios se autocorrigen solos apenas el estudiante entrega — no hace
falta llamar a nada para calificarlos, solo `export_quiz_stats()` si querés ver el
resumen de errores comunes.
