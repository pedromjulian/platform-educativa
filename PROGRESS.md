# Estado del proyecto — Platform Educativa

Última actualización: 2026-08-21

## Qué es esto

Reemplazo de Moodle: plataforma web simple (gestión de usuarios, cursos, material,
entregas, notas) + profesores usan **Claude Code** para procesar/corregir entregas
con lógica propia (fuera de la plataforma). Cuestionarios de múltiple-choice se
autocorrigen solos en el backend (no necesitan Claude Code).

## URLs en producción

- **Frontend**: https://platform-educativa.vercel.app
- **Backend API**: https://platform-educativa-production.up.railway.app
- **Docs interactivas (Swagger)**: https://platform-educativa-production.up.railway.app/docs
- **Repo GitHub**: https://github.com/pedromjulian/platform-educativa

## Usuarios de prueba ya creados

| Rol | Email | Password |
|---|---|---|
| Profesor | `debugtest@test.com` | `password123` |
| Estudiante | `estudiante.vlsi@test.com` | `password123` |

Ya tienen cargado el curso **"VLSI para ML"** (id=1) con material, la Actividad 01
(entregada y calificada 9.5/10) y el Cuestionario Semana 1 con las 8 preguntas
reales del curso `VLSI_ML_FIUBA_RUN` (una entrega ya corregida, 5.31/10).

Nota: hay otro usuario profesor de una prueba anterior (`prof.prueba@test.com` /
`password123`) que quedó con un curso vacío — se puede ignorar o borrar.

---

## Arquitectura

```
Vercel (frontend, Next.js)  →  Railway (backend FastAPI + PostgreSQL)
        ↑
   Profesor usa Claude Code localmente para:
   - descargar entregas vía API (GET .../submissions/export)
   - evaluarlas con Claude
   - subir notas/feedback (PATCH .../submissions/{id}/grade)
```

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL, corre en Docker en Railway
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind, en Vercel
- **Auth**: JWT (HS256), token en `localStorage` del navegador
- **Archivos**: se guardan en el filesystem del contenedor de Railway (`./uploads/`) —
  ⚠️ esto se pierde si Railway recrea el contenedor sin volumen persistente. Si esto
  se vuelve un problema real, migrar a un volume de Railway o a S3.

## Estructura del repo

```
platform-educativa/
├── backend/
│   ├── app/
│   │   ├── main.py, models.py, schemas.py, database.py, auth.py
│   │   ├── api/  (auth, courses, materials, assignments, grading, quizzes)
│   │   └── utils/file_handler.py
│   ├── Dockerfile          ← Railway lo detecta y usa esto para el build
│   └── requirements.txt
├── frontend/
│   ├── app/  (login, dashboard, courses/[id], .../assignments/[id], .../quizzes/...)
│   └── lib/api.ts          ← cliente HTTP (axios) con todas las llamadas a la API
└── docs/architecture.md
```

---

## Fases completadas

1. **Usuarios y cursos** — auth JWT, roles profesor/estudiante, CRUD de cursos, inscripciones
2. **Material y entregas** — subir/listar/descargar material, crear actividades con deadline, entregar (texto/archivo)
3. **Calificación + Claude Code** — export de entregas en JSON, endpoint para subir nota/feedback
4. **Cuestionarios multiple-choice** — estilo Moodle (opciones con fracción positiva/negativa, multi-selección), autocorrección instantánea en el backend, export agregado de estadísticas por pregunta (para que el profesor vea errores comunes "en clase")
5. **Frontend completo** — todas las pantallas web: dashboard, hub de curso (tabs Material/Actividades/Cuestionarios/Estudiantes), detalle de actividad (entregar/calificar), constructor de cuestionarios, tomar cuestionario

---

## Configuración de Railway (backend)

- **Root Directory**: `backend`
- **Build**: detecta el `Dockerfile` automáticamente (Python 3.12-slim, instala `libpq-dev`+`gcc` para Postgres)
- **Start command** (en el Dockerfile): `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'`
  - El `--proxy-headers` es **crítico**: sin esto, uvicorn no confía en el header `X-Forwarded-Proto` que manda el borde de Railway, y los redirects de FastAPI (ej. `/courses` → `/courses/`) se generan con `http://` en vez de `https://`, lo que el navegador bloquea como "mixed content"
- **Networking → Target Port**: tiene que coincidir con el puerto que Railway asigna vía `$PORT` (se vio como 8080 en la práctica) — si se desincroniza da 502 "Application failed to respond"
- **Variables de entorno**:
  - `DATABASE_URL` — la genera Railway automáticamente al agregar el servicio PostgreSQL
  - `SECRET_KEY` — clave para firmar JWT, cargada manualmente (no sensible/oculta, para poder editarla fácil)
  - `ALGORITHM=HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES=30`

## Configuración de Vercel (frontend)

- **Root Directory**: `frontend`
- Framework autodetectado: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=https://platform-educativa-production.up.railway.app`
  - ⚠️ **No marcar la variable como "Sensitive"** — si querés editarla después, Vercel no te deja tocar una variable sensible in-place, hay que borrarla y crearla de nuevo
  - Las variables `NEXT_PUBLIC_*` de Next.js se "hornean" en el build → **cambiar la variable sola no alcanza, hace falta un Redeploy** después
- **Deploy**: automático con cada push a `main` (o Redeploy manual desde la pestaña Deployments)

---

## Bugs reales encontrados y arreglados (en producción, probando con datos reales)

Todos estos existían desde las fases 1-3 pero recién se manifestaron al probar
end-to-end con el navegador real (no solo curl):

1. **JWT roto desde el día 1**: `python-jose` exige que el claim `sub` sea *string*,
   no *int*. El código hacía `{"sub": user.id}` (int) → toda request autenticada
   fallaba con 401. Estaba oculto porque el frontend tragaba los errores de fetch
   silenciosamente y mostraba igual el estado "vacío" (ej. "No has creado cursos aún"),
   pareciendo que todo andaba bien.
   → Fix: `{"sub": str(user.id)}` al crear el token, `int(sub)` al decodificarlo.

2. **Upload de material no guardaba nombre/descripción**: FastAPI no trata un
   `str = None` como campo de formulario si lo mezclás con `File(...)` — hay que
   declararlo explícitamente como `Form(...)`.

3. **Mismo problema en el envío de entregas** (mezclaba un body Pydantic con `File()`).

4. **Mixed Content / redirects con http://** (ver arriba, sección Railway) — el fix
   fue `--proxy-headers` en uvicorn + usar barra final en las llamadas del frontend
   a `/courses/` para evitar el redirect directamente.

**Moraleja para la próxima sesión**: si algo "no anda" en la UI sin error visible,
mirar la consola del navegador (`read_console_messages` con `onlyErrors: true`)
antes de asumir que el backend está bien — el frontend actual no siempre muestra
los errores de forma visible al usuario (ver "Deuda técnica" abajo).

---

## Deuda técnica / cosas a mejorar

- El frontend traga errores silenciosamente en varios lugares (`catch (err) { console.error(...) }`
  sin mostrar nada al usuario) — sería bueno agregar mensajes de error visibles
- No hay edición de material/actividades/cuestionarios ya creados (solo crear/listar/eliminar)
- No hay endpoint para "descubrir" cursos — el estudiante necesita que el profesor
  le pase el ID del curso a mano (se ve en el dashboard del profesor)
- Archivos subidos viven en el filesystem del contenedor de Railway, no en un volumen
  persistente ni en S3 — riesgo de perderse en un redeploy grande
- No hay tests automatizados (todo se probó manualmente vía curl + navegador)

## Próximos pasos posibles

- Mejorar manejo de errores visible en el frontend
- Migrar almacenamiento de archivos a algo persistente (Railway volume o S3)
- Agregar edición de actividades/cuestionarios
- Script de ejemplo en Python para que el profesor use Claude Code y automatice
  la descarga+evaluación+subida de notas de las Actividades (no cuestionarios,
  esos ya se autocorrigen solos)
