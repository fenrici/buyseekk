# BuySeekk

Mercado invertido para autos e inmuebles — AR + US.

## Estructura

```
buyseekk/
├── apps/
│   ├── api/          # NestJS + Prisma + PostgreSQL
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Tipos y utilidades compartidas
├── legacy/           # Demo HTML estático (referencia)
└── docker-compose.yml
```

## Requisitos

- Node.js 20+
- Docker Desktop (PostgreSQL + Redis)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar base de datos
npm run db:up

# 3. Copiar variables de entorno
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Editar NEXT_PUBLIC_API_URL en web si hace falta

# 4. Migrar y seed
npm run db:migrate
npm run db:seed

# 5. Correr todo
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000/api

## Cuentas demo (seed)

| Rol | Email | Password |
|---|---|---|
| Comprador | comprador@buyseekk.com | demo1234 |
| Vendedor | vendedor@buyseekk.com | demo1234 |

## API endpoints (Fase 1 / P0)

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | — | Registro |
| POST | `/api/auth/login` | — | — | Login |
| GET | `/api/auth/me` | JWT | cualquiera | Usuario actual |
| GET | `/api/health` | — | — | Health check |
| GET | `/api/requests` | JWT | seller | Marketplace (paginado) |
| POST | `/api/requests` | JWT | buyer | Crear solicitud |
| GET | `/api/requests/mine` | JWT | buyer | Mis solicitudes (paginado) |
| PATCH | `/api/requests/:id` | JWT | buyer | Editar solicitud propia |
| DELETE | `/api/requests/:id` | JWT | buyer | Desactivar solicitud |
| POST | `/api/offers` | JWT | seller | Enviar oferta |
| GET | `/api/offers/received` | JWT | buyer | Ofertas recibidas |
| GET | `/api/offers/sent` | JWT | seller | Ofertas enviadas |
| GET | `/api/offers/:id/comparison` | JWT | buyer | Comparación detallada |
| PATCH | `/api/offers/:id/accept` | JWT | buyer | Aceptar oferta |
| PATCH | `/api/offers/:id/reject` | JWT | buyer | Rechazar oferta |
| GET | `/api/chats` | JWT | cualquiera | Listar chats (paginado) |
| GET | `/api/chats/:id` | JWT | participante | Detalle + mensajes (paginado) |
| POST | `/api/chats/:id/messages` | JWT | participante | Enviar mensaje |
| GET | `/api/ratings/pending` | JWT | cualquiera | Ratings pendientes (paginado) |
| POST | `/api/ratings` | JWT | cualquiera | Calificar tras operación |
| POST | `/api/uploads` | JWT | cualquiera | Subir imagen |

### P0 — cambios de esta etapa

| Endpoint | Cambio |
|---|---|
| `PATCH /api/requests/:id` | **Nuevo.** Edición de solicitud propia con reglas según estado de ofertas |
| `GET /api/requests/mine` | **Modificado.** Antes devolvía `Request[]`; ahora devuelve objeto paginado |
| `GET /api/chats/:id` | **Modificado.** Mensajes paginados por defecto (últimos 30); agrega `messagesMeta` |
| `GET /api/ratings/pending` | **Modificado.** Antes devolvía array plano; ahora devuelve objeto paginado |

### Paginación estándar (`mine`, `ratings/pending`, `chats` list)

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0,
  "hasNextPage": false
}
```

Query params: `page` (default 1), `limit` (default 20, max 50 vía `@buyseekk/shared`).

**`GET /api/requests/mine`** — query adicional: `active=true|false` (opcional).

**`GET /api/chats/:id`** — paginación de mensajes (no rompe el shape del chat):

| Query | Default | Max |
|---|---|---|
| `messagesLimit` | 30 | 100 |
| `messagesPage` | última página | — |

Respuesta incluye `messagesMeta`:

```json
{
  "messagesMeta": {
    "total": 35,
    "page": 2,
    "limit": 30,
    "totalPages": 2,
    "hasNextPage": false,
    "hasOlderPage": true
  }
}
```

### `PATCH /api/requests/:id` — reglas de edición

| Estado de ofertas | Campos editables |
|---|---|
| Sin ofertas / solo rechazadas | Todos los campos del DTO (mismas validaciones que create) |
| Con ofertas **pendientes** | Solo `title`, `requirements`, `budget`, `budgetPeriod`, `imageUrls` |
| Con oferta **aceptada** | Bloqueado → 400 |

No editables nunca: `id`, `buyerId`, `category`, `country`, `createdAt`, `updatedAt`.

### Compatibilidad frontend

| Endpoint | Frontend actual | Estado |
|---|---|---|
| `/requests/mine` | `BuyerPanel` usa `data.items` | Adaptado |
| `/chats/:id` | `ChatThread` usa `chat.messages` | Compatible (campo `messages` sigue existiendo; `messagesMeta` es opcional) |
| `/ratings/pending` | No consumido aún en web | Sin impacto |

## Reglas de negocio

- Máx. 5 solicitudes activas por comprador
- 1 oferta por vendedor por solicitud
- Edición de solicitud: sin ofertas → campos completos; con ofertas pendientes → solo título, requisitos, presupuesto, negociación e imágenes; con oferta aceptada → bloqueado
- Se puede eliminar (desactivar) solicitud con ofertas
- Al aceptar: rechaza otras ofertas pendientes + crea chat

## Tests y validación

```bash
# Build completo (shared + api + web; incluye typecheck de Next)
npm run build

# Tests e2e (requiere Postgres local en :5432)
npm run test:e2e
```

Suites e2e:
- `test/critical-flow.e2e-spec.ts` — flujo register → request → offer → accept → chat → rating
- `test/p0-phase1.e2e-spec.ts` — PATCH requests, paginación mine/chats/ratings, permisos

## Deploy (Railway + Vercel)

Guía completa: [docs/DEPLOY.md](docs/DEPLOY.md)

## Demo legacy (HTML estático)

```bash
npm run dev:legacy
```

## Ramas

- `main` — producción
- `develop` — desarrollo activo
