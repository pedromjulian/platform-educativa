# Platform Educativa - Frontend

Frontend Next.js para plataforma educativa online.

## Setup Local

### 1. Instalar dependencias
```bash
npm install
# o
yarn install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Edita .env.local con URL del backend
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
# o
yarn dev
```

Frontend disponible en: http://localhost:3000

## Deploy en Vercel

### 1. Conectar repo a Vercel
- Ir a https://vercel.com
- "New Project" → Seleccionar repo de GitHub
- Vercel detecta Next.js automáticamente

### 2. Configurar variables de entorno
En Vercel dashboard → Settings → Environment Variables
```
NEXT_PUBLIC_API_URL = https://tu-backend-railway.railway.app
```

### 3. Deploy
Vercel deploy automáticamente al hacer push a main

## Estructura

- `app/` - Páginas Next.js (App Router)
  - `login/page.tsx` - Login/Register
  - `dashboard/page.tsx` - Dashboard de cursos
- `lib/api.ts` - Cliente HTTP para conectar con backend
- Tailwind CSS para estilos

## Páginas

- `/` - Redirecciona a /login o /dashboard
- `/login` - Autenticación (login/register)
- `/dashboard` - Panel principal (cursos)

## Próximas páginas (TODO)

- `/courses/[id]` - Detalle de curso
- `/courses/[id]/materials` - Material del curso
- `/assignments/[id]` - Detalles de tarea
