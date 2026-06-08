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

## API endpoints (Fase 1)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/requests` | Listar solicitudes |
| POST | `/api/requests` | Crear solicitud (auth) |
| GET | `/api/requests/mine` | Mis solicitudes (auth) |
| POST | `/api/offers` | Enviar oferta (auth) |
| GET | `/api/offers/received` | Ofertas recibidas (auth) |
| GET | `/api/offers/sent` | Ofertas enviadas (auth) |
| GET | `/api/offers/:id/comparison` | Comparación detallada |
| PATCH | `/api/offers/:id/accept` | Aceptar oferta |
| PATCH | `/api/offers/:id/reject` | Rechazar oferta |

## Reglas de negocio

- Máx. 5 solicitudes activas por comprador
- 1 oferta por vendedor por solicitud
- No editar solicitud con ofertas
- Se puede eliminar (desactivar) solicitud con ofertas
- Al aceptar: rechaza otras ofertas pendientes + crea chat

## Demo legacy (HTML estático)

```bash
npm run dev:legacy
```

## Ramas

- `main` — producción
- `develop` — desarrollo activo
