# Platform Educativa - Reemplazo de Moodle

Plataforma educativa online simple que separa claramente:
- **Backend**: Gestión de datos (usuarios, cursos, entregas, notas)
- **Frontend**: UI para estudiantes y profesores
- **Claude Code**: Procesamiento inteligente (correcciones automáticas, feedback, etc.)

## Estructura del Proyecto

```
platform-educativa/
├── backend/                    # API FastAPI + DB
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # DB config
│   │   ├── auth.py            # JWT auth
│   │   └── api/
│   │       ├── auth.py        # Auth endpoints
│   │       └── courses.py     # Course endpoints
│   ├── requirements.txt
│   ├── .env
│   └── README.md
│
├── frontend/                   # Next.js (TODO)
│   └── (próximamente)
│
├── claude-code/               # Scripts para profesores (TODO)
│   └── (próximamente)
│
└── docs/                      # Documentación
    └── architecture.md        # Decisiones arquitectónicas
```

## FASE 1: Usuarios y Cursos ✅

**Backend completado:**
- ✅ Autenticación (JWT)
- ✅ CRUD de usuarios (profesor/estudiante)
- ✅ CRUD de cursos
- ✅ Inscripción de estudiantes

## FASE 2: Material y Entregas ✅

**Backend completado:**
- ✅ Subir y descargar material
- ✅ Crear tareas con deadline
- ✅ Subir entregas (archivo + texto)
- ✅ Ver entregas sin calificar (filtrable por status)
- ✅ Validación de plazos y entregas tardías
- ✅ Almacenamiento seguro de archivos (máx 50MB)

## FASE 3: Calificación e Integración Claude Code ✅

**Backend completado:**
- ✅ Descargar entregas en JSON (para Claude Code)
- ✅ Subir calificaciones y feedback
- ✅ Validación de grade (0-10)
- ✅ Prevención de doble-calificación
- ✅ Metadata de estudiante incluida en export

**Profesor puede ahora:**
1. Descargar entregas desde Claude Code
2. Usar Claude para evaluar (autocorrección, feedback)
3. Subir notas y feedback a la plataforma
4. Estudiantes ven calificaciones

**Próximos pasos:**
- [ ] Frontend (Next.js) - para que estudiantes y profesores vean UI
- [ ] Script ejemplo: cómo usar Claude Code para evaluación
- [ ] ZIP export (opcional)

## Quick Start Local

### Backend
```bash
cd backend
pip install -r requirements.txt

# Editar .env con credenciales de PostgreSQL
# createdb platform_db

uvicorn app.main:app --reload
```

API disponible en: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en: http://localhost:3000

## Deploy en Vercel + Railway

### 1. Backend en Railway

1. Ir a https://railway.app y crear cuenta
2. "New Project" → "Deploy from GitHub"
3. Seleccionar repo de platform-educativa
4. Railway detecta Python automáticamente
5. Agregar "PostgreSQL" service (un click)
6. En Variables:
   ```
   DATABASE_URL = (Railway auto-genera)
   SECRET_KEY = (genera una key segura)
   ALGORITHM = HS256
   ACCESS_TOKEN_EXPIRE_MINUTES = 30
   ```
7. Railway auto-deploya → obtienes URL como `https://platform-educativa-prod-xxxx.railway.app`

### 2. Frontend en Vercel

1. Ir a https://vercel.com
2. "New Project" → Seleccionar repo de GitHub
3. Vercel detecta Next.js automáticamente
4. En "Environment Variables":
   ```
   NEXT_PUBLIC_API_URL = https://platform-educativa-prod-xxxx.railway.app
   ```
5. Deploy → Tu app está online en vercel

**Ambos se actualizan automáticamente cada vez que haces push a main.**

## Decisiones Tecnológicas

- **Backend**: Python + FastAPI (por flexibilidad y integración con Claude)
- **BD**: PostgreSQL
- **Frontend**: Next.js (después)
- **Auth**: JWT con HTTPBearer
- **Claude Integration**: Profesores usan Claude Code para procesar entregas

## Más info

Ver `backend/README.md` para detalles de API y testing.
