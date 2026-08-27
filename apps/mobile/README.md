# Buyseek Mobile

Expo + Expo Router + TypeScript native client (`apps/mobile`).

## Run

From repo root (dev client / device):

```bash
npm run dev:mobile
# or
npm run mobile:ios
```

Copy `.env.example` → `.env.local` and set `EXPO_PUBLIC_API_URL`.

## Auth (phase 1A)

- Refresh token: Expo SecureStore only (`buyseek.refreshToken.v1`)
- Access JWT: memory only
- Endpoints: `/api/auth/mobile/*` + `/api/auth/me`

## Assets

`assets/images/*` are temporary Expo placeholders. Replace before TestFlight.
