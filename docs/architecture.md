# Arquitectura - Platform Educativa

## Visión General

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Estudiantes   │         │   Profesores     │         │    Admin     │
└────────┬────────┘         └────────┬─────────┘         └──────┬───────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Frontend (Web)    │
                          │   Next.js/React     │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────────────┐
                          │   Backend API               │
                          │   FastAPI + PostgreSQL      │
                          │  (CRUD, Usuarios, Cursos)   │
                          └──────────┬──────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
    ┌────▼─────┐                                          ┌─────▼────┐
    │    DB    │                                          │ Archivos │
    │PostgreSQL│                                          │(Entregas)│
    └──────────┘                                          └──────────┘
```

## Separación de Responsabilidades

### Backend (API)
- **Responsabilidad**: Gestión de datos y autenticación
- **No hace**: Lógica de corrección, evaluación inteligente
- **Stack**: FastAPI + SQLAlchemy + PostgreSQL
- **Endpoints**: CRUD para usuarios, cursos, entregas, calificaciones

### Frontend (Web)
- **Responsabilidad**: UI/UX para estudiantes y profesores
- **Profesores**: Crear cursos, subir material, ver entregas
- **Estudiantes**: Ver cursos, descargar material, subir entregas
- **Stack**: Next.js / React

### Claude Code (Profesor)
- **Responsabilidad**: Procesamiento inteligente de entregas
- **Tareas**: 
  - Autocorrección de múltiple choice
  - Evaluación de código con pruebas
  - Feedback en texto libre con Claude
  - Puntuación de informes
- **Método**: Script Python que consume API del backend
- **Flujo**: Descargar → Procesar con Claude → Subir calificaciones

## Flujo de Entregas

```
1. Profesor crea tarea en plataforma web
2. Estudiante sube entrega a través de web
3. Profesor (en Claude Code):
   a. Descarga entregas desde API
   b. Procesa con Claude (correcciones, feedback)
   c. Sube calificaciones y feedback a API
4. Estudiante ve notas en plataforma web
```

## Modelo de Datos - FASE 1

```sql
users
├── id (PK)
├── email (unique)
├── password_hash
├── name
├── role (teacher|student|admin)
└── created_at

courses
├── id (PK)
├── name
├── description
├── teacher_id (FK → users)
├── created_at
└── updated_at

enrollments
├── id (PK)
├── student_id (FK → users)
├── course_id (FK → courses)
└── enrolled_at
```

## Modelos Futuros - FASE 2+

```sql
materials
├── id (PK)
├── course_id (FK → courses)
├── name
├── file_path
└── uploaded_at

assignments
├── id (PK)
├── course_id (FK → courses)
├── title
├── description
├── deadline
└── created_at

submissions
├── id (PK)
├── assignment_id (FK → assignments)
├── student_id (FK → users)
├── file_path
├── text_content
├── submitted_at
└── status (pending|graded)

grades
├── id (PK)
├── submission_id (FK → submissions)
├── score
├── feedback
└── graded_at
```

## Autenticación

- **Método**: JWT (JSON Web Tokens)
- **Flow**: 
  1. POST /auth/register → crea usuario
  2. POST /auth/login → retorna JWT token
  3. Requests posteriores llevan token en header: `Authorization: Bearer <token>`
- **Expiración**: Configurable en `.env` (default: 30 min)

## Consideraciones de Seguridad

- ✅ Passwords hasheadas con bcrypt
- ✅ JWT tokens firmados
- ✅ CORS habilitado (ajustar después)
- ✅ Validación de roles (profesor vs estudiante)
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: Validación de archivos
- ⚠️ TODO: Cifrado de archivos sensibles

## Escalabilidad

**Actual**: Simple, apto para cursos pequeños (~100 estudiantes)

**Para crecer**:
- Agregar caché (Redis)
- Separar uploads a S3
- Agregar indexing en BD
- Implementar queue para procesamiento async
