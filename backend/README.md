# Platform API - Backend (FastAPI)

Backend para plataforma educativa online que reemplaza Moodle.

## Setup

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2. Configurar Base de Datos (PostgreSQL)

Asegúrate de tener PostgreSQL instalado y corriendo. Luego:

```bash
createdb platform_db
```

### 3. Configurar variables de entorno

Edita `.env` con tus valores (especialmente `DATABASE_URL` y `SECRET_KEY`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/platform_db
SECRET_KEY=tu-clave-secreta-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Ejecutar el servidor

```bash
cd backend
uvicorn app.main:app --reload
```

La API estará en: http://localhost:8000

Documentación interactiva (Swagger): http://localhost:8000/docs

## API Endpoints - FASE 1

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Login y obtener JWT token

### Cursos (Profesor)
- `POST /courses` - Crear curso
- `GET /courses` - Listar mis cursos
- `GET /courses/{id}` - Detalles del curso
- `PUT /courses/{id}` - Editar curso
- `DELETE /courses/{id}` - Eliminar curso

### Inscripciones
- `POST /courses/{id}/enroll` - Inscribirse a un curso
- `GET /courses/{id}/students` - Listar estudiantes (solo profesor)
- `DELETE /courses/{id}/students/{student_id}` - Remover estudiante

## Testing

### 1. Registrar un profesor
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123",
    "name": "Prof. García",
    "role": "teacher"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

Guarda el `access_token` del response.

### 3. Crear un curso
```bash
curl -X POST "http://localhost:8000/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "name": "Python Avanzado",
    "description": "Curso de Python para nivel avanzado"
  }'
```

### 4. Ver mis cursos
```bash
curl -X GET "http://localhost:8000/courses" \
  -H "Authorization: Bearer {access_token}"
```

## API Endpoints - FASE 2 ✅

### Material (Profesor)
- `POST /courses/{course_id}/materials` - Subir material (con archivo)
- `GET /courses/{course_id}/materials` - Listar materiales
- `DELETE /courses/{course_id}/materials/{material_id}` - Eliminar material

### Material (Estudiante)
- `GET /courses/{course_id}/materials` - Descargar materiales

### Tareas (Profesor)
- `POST /courses/{course_id}/assignments` - Crear tarea con deadline
- `GET /courses/{course_id}/assignments` - Listar tareas
- `PUT /courses/{course_id}/assignments/{assignment_id}` - Editar tarea
- `DELETE /courses/{course_id}/assignments/{assignment_id}` - Eliminar tarea
- `GET /courses/{course_id}/assignments/{assignment_id}/submissions` - Ver entregas (filtro: status=pending|graded)

### Entregas (Estudiante)
- `POST /assignments/{assignment_id}/submit` - Subir entrega (archivo + texto)
- `GET /assignments/{assignment_id}/submission` - Ver mi entrega
- `PUT /assignments/{assignment_id}/submission` - Actualizar entrega (si aún no está calificada)

## Almacenamiento de Archivos

- Directorio: `./uploads/`
- Estructura:
  - Materiales: `uploads/courses/{course_id}/materials/`
  - Entregas: `uploads/courses/{course_id}/assignments/{assignment_id}/submissions/{student_id}/`
- Máximo: 50MB por archivo
- Extensiones permitidas: pdf, txt, docx, doc, xls, xlsx, py, js, java, cpp, c, jpg, jpeg, png, gif, zip

## Testing FASE 2

### 1. Profesor sube material
```bash
curl -X POST "http://localhost:8000/courses/1/materials" \
  -H "Authorization: Bearer {token}" \
  -F "file=@archivo.pdf" \
  -F "name=Clase 1" \
  -F "description=Material de introducción"
```

### 2. Profesor crea tarea con deadline
```bash
curl -X POST "http://localhost:8000/courses/1/assignments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Tarea 1",
    "description": "Resolver ejercicios",
    "deadline": "2025-12-31T23:59:00"
  }'
```

### 3. Estudiante sube entrega (archivo)
```bash
curl -X POST "http://localhost:8000/assignments/1/submit" \
  -H "Authorization: Bearer {token}" \
  -F "file=@tarea.py" \
  -F "text_content="
```

### 4. Estudiante sube entrega (texto)
```bash
curl -X POST "http://localhost:8000/assignments/1/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "text_content": "Mi respuesta aquí"
  }'
```

### 5. Profesor ve entregas sin calificar
```bash
curl -X GET "http://localhost:8000/courses/1/assignments/1/submissions?status_filter=pending" \
  -H "Authorization: Bearer {token}"
```

## API Endpoints - FASE 3 ✅

### Descargar Entregas (Profesor - para Claude Code)
- `GET /courses/{course_id}/assignments/{assignment_id}/submissions/export` - Descargar en JSON
  - Parámetro opcional: `?status_filter=pending` (solo sin calificar)
  - Retorna JSON con metadata de estudiante + entregas

### Calificar Entregas (Profesor)
- `PATCH /courses/{course_id}/submissions/{submission_id}/grade` - Calificar
  - Body: `{ "grade": 8.5, "feedback": "Texto feedback" }`
  - Valida: 0 <= grade <= 10, no doble-calificación

## Flujo FASE 3: Profesor usa Claude Code

### 1. Descargar entregas (en Claude Code)
```bash
curl -X GET "http://localhost:8000/courses/1/assignments/5/submissions/export?status_filter=pending" \
  -H "Authorization: Bearer {token}"
```

Retorna JSON como:
```json
{
  "assignment_id": 5,
  "assignment_title": "Tarea 1",
  "course_id": 1,
  "deadline": "2025-12-31T23:59:00",
  "submissions": [
    {
      "id": 42,
      "student_id": 10,
      "student_name": "Juan García",
      "student_email": "juan@example.com",
      "text_content": "Mi respuesta...",
      "file_path": "courses/1/assignments/5/submissions/10/tarea.py",
      "submitted_at": "2025-12-20T15:30:00",
      "is_late": 0,
      "status": "pending"
    },
    ...
  ]
}
```

### 2. Procesar con Claude (en Claude Code)
El profesor crea un script que:
- Lee el JSON descargado
- Para cada entrega, usa Claude para evaluar
- Genera calificación y feedback personalizado

### 3. Subir calificaciones
```bash
curl -X PATCH "http://localhost:8000/courses/1/submissions/42/grade" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "grade": 8.5,
    "feedback": "Buen código, pero le falta documentación. Considera agregar docstrings."
  }'
```

## Próximos pasos
- [ ] Frontend (Next.js) para UI
- [ ] Script ejemplo de Claude Code para evaluar entregas
- [ ] Descargas de entregas en ZIP (opcional)
