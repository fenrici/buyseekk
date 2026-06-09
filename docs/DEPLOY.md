# Deploy BuySeekk — Railway (API) + Vercel (Web)

Guía paso a paso. **Vos** creás las cuentas y conectás el repo; el código ya incluye Dockerfile, `railway.toml` y `vercel.json`.

---

## Resumen

| Servicio | Plataforma | URL ejemplo |
|----------|------------|-------------|
| API + WebSocket + DB | Railway | `https://buyseekk-api-production.up.railway.app` |
| Frontend | Vercel | `https://buyseekk.vercel.app` |

---

## Parte 1 — Lo que tenés que hacer en GitHub

1. **Commitear y pushear** esta rama al remoto (si aún no está).
2. Asegurate de que el repo esté en GitHub (Railway y Vercel se conectan desde ahí).

---

## Parte 2 — Railway (API + PostgreSQL)

### 2.1 Crear proyecto

1. Entrá a [railway.app](https://railway.app) → **New Project**.
2. Elegí **Deploy from GitHub repo** → seleccioná `buyseekk`.
3. Railway detecta el `Dockerfile` y `railway.toml` automáticamente.

### 2.2 Agregar PostgreSQL

1. En el proyecto Railway → **+ New** → **Database** → **PostgreSQL**.
2. Railway crea `DATABASE_URL` automáticamente.

### 2.3 Conectar la DB al servicio API

1. Abrí el servicio **API** (el que deploya desde GitHub).
2. **Variables** → **Add Reference** → elegí `DATABASE_URL` del servicio Postgres.
   - O copiá manualmente la URL de Postgres al servicio API.

### 2.4 Variables de entorno (servicio API)

En **Variables** del servicio API, agregá:

| Variable | Valor | Notas |
|----------|-------|-------|
| `DATABASE_URL` | *(referencia a Postgres)* | Obligatorio |
| `JWT_SECRET` | string aleatorio ≥16 chars | Ver comando abajo |
| `JWT_EXPIRES_IN` | `7d` | Opcional |
| `NODE_ENV` | `production` | Obligatorio |
| `CORS_ORIGIN` | URL de Vercel (sin `/` final) | Actualizar después del paso 3 |
| `STORAGE_PROVIDER` | `local` o `r2` | En prod usar `r2` (ver 2.4.1) |

**Generar JWT_SECRET** (en tu terminal):

```bash
openssl rand -base64 32
```

> `PORT` lo inyecta Railway automáticamente — no hace falta setearlo.

#### 2.4.1 Storage de imágenes (Cloudflare R2 — recomendado en prod)

Sin R2, las imágenes viven en disco efímero del container y **se pierden en cada redeploy**. Con 2+ instancias, cada una tiene su propio disco.

1. Creá un bucket en [Cloudflare R2](https://dash.cloudflare.com/) → habilitá acceso público (custom domain o `r2.dev`).
2. Creá API token con permiso de escritura al bucket.
3. En Railway (servicio API), agregá:

| Variable | Ejemplo |
|----------|---------|
| `STORAGE_PROVIDER` | `r2` |
| `STORAGE_PUBLIC_URL` | `https://pub-xxxx.r2.dev` o tu dominio |
| `R2_ACCOUNT_ID` | ID de cuenta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access key del token |
| `R2_SECRET_ACCESS_KEY` | Secret del token |
| `R2_BUCKET_NAME` | nombre del bucket |

4. En Vercel, si usás dominio custom de R2, agregá `NEXT_PUBLIC_STORAGE_HOST` (opcional, para `next/image`).

Las migraciones corren en **pre-deploy** (`railway.toml`), no al arrancar el container — seguro con múltiples réplicas.

#### 2.4.2 Redis para chat en tiempo real (requerido con 2+ réplicas)

Sin Redis, Socket.IO guarda rooms y conexiones **en memoria de cada instancia**. Con 2+ réplicas de Railway, un usuario en la instancia A no recibe mensajes emitidos desde la instancia B.

1. En Railway → **+ New** → **Database** → **Redis** (o plugin Redis).
2. En el servicio **API** → **Variables** → **Add Reference** → `REDIS_URL` del servicio Redis.
3. Redeploy. En los logs deberías ver:
   ```
   Socket.IO Redis adapter enabled — ready for multiple instances
   ```

| Variable | Ejemplo | Notas |
|----------|---------|-------|
| `REDIS_URL` | `redis://default:pass@redis.railway.internal:6379` | Referencia al servicio Redis |

> Sin `REDIS_URL`, el chat funciona con **una sola instancia** (adapter en memoria). El fallback HTTP (`POST /api/chats/:id/messages`) sigue funcionando siempre.

**Probar localmente con Redis:**

```bash
docker compose up -d redis
REDIS_URL=redis://localhost:6379 npm run dev -w @buyseekk/api
```

**Probar multi-instancia local** (dos terminales, mismo Redis y DB):

```bash
# Terminal 1
REDIS_URL=redis://localhost:6379 API_PORT=4000 npm run dev -w @buyseekk/api

# Terminal 2
REDIS_URL=redis://localhost:6379 API_PORT=4001 npm run dev -w @buyseekk/api
```

Abrí dos navegadores (o normal + incógnito), entrá al mismo chat aceptado, y enviá mensajes cruzados. Con Redis, ambos deberían ver los mensajes en tiempo real aunque cada uno pegue a un puerto distinto (configurá `NEXT_PUBLIC_API_URL` al puerto correspondiente para esa prueba).

### 2.5 Dominio público

1. Servicio API → **Settings** → **Networking** → **Generate Domain**.
2. Copiá la URL, ej: `https://buyseekk-api-production.up.railway.app`.
3. Verificá: `https://TU-URL/api/health` debe responder `{"status":"ok","db":"ok",...}`.

### 2.6 Seed (datos demo) — una sola vez

Desde tu máquina con [Railway CLI](https://docs.railway.app/develop/cli):

```bash
npm i -g @railway/cli
railway login
railway link          # elegí el proyecto y servicio API
railway run npm run db:seed
```

O desde el dashboard: servicio API → **Shell** → `ALLOW_PRODUCTION_SEED=true npm run db:seed`.

> El seed está **bloqueado en producción** por defecto (evita borrar datos reales). Solo usá `ALLOW_PRODUCTION_SEED=true` en entornos controlados.

---

## Parte 3 — Vercel (Frontend)

### 3.1 Importar proyecto

1. [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Importá el repo `buyseekk` de GitHub.
3. Configuración:

| Campo | Valor |
|-------|-------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js (auto) |

`vercel.json` ya define `installCommand` y `buildCommand` para el monorepo.

### 3.2 Variable de entorno

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://tu-api.up.railway.app` (**con** `https://`, sin `/api` al final) |

Ejemplo: `https://buyseekk-api-production.up.railway.app`

### 3.3 Deploy

1. **Deploy**.
2. Copiá la URL de Vercel, ej: `https://buyseekk.vercel.app`.

### 3.4 Cerrar el círculo (CORS)

Volvé a **Railway** → servicio API → **Variables**:

```
CORS_ORIGIN=https://buyseekk.vercel.app
```

Si tenés preview deployments, podés usar varias URLs separadas por coma:

```
CORS_ORIGIN=https://buyseekk.vercel.app,https://buyseekk-git-feature-xxx.vercel.app
```

Railway redeploya automáticamente al cambiar variables.

---

## Parte 4 — Verificación

1. `GET https://TU-API/api/health` → `db: ok`
2. Abrí la URL de Vercel → login con `comprador@buyseekk.com` / `demo1234` (si corriste seed)
3. Creá una solicitud, logueate como vendedor, enviá oferta
4. Chat en tiempo real (WebSocket usa la misma URL del API)

---

## Limitaciones actuales (staging)

| Tema | Estado |
|------|--------|
| **Uploads** | Disco del contenedor — se pierden al redeploy. R2/S3 es el siguiente paso. |
| **WebSocket** | Funciona con 1 instancia Railway. Multi-réplica requiere Redis adapter. |
| **Redis** | No usado aún — podés ignorarlo en prod por ahora. |

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| API no arranca | Revisá logs Railway; casi siempre es `JWT_SECRET` corto o `DATABASE_URL` mal referenciada |
| CORS error en browser | `CORS_ORIGIN` debe coincidir exacto con la URL de Vercel (sin trailing slash) |
| 502 en health | Esperá 1–2 min; migrate deploy corre al inicio |
| Login ok pero fetch falla | `NEXT_PUBLIC_API_URL` mal seteada en Vercel — redeploy web después de cambiarla |
| Imágenes rotas | Normal en staging: uploads efímeros hasta migrar a R2 |

---

## Comandos útiles

```bash
# Build local (verificar antes de push)
npm run build

# Simular imagen Docker localmente
docker build -t buyseekk-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="tu-secret-largo-de-al-menos-16" \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=http://localhost:3000 \
  buyseekk-api
```
