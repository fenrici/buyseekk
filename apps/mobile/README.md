# Buyseek Mobile

Expo + Expo Router + TypeScript native client (`apps/mobile`).

## Run

From repo root:

```bash
npm run dev:mobile
# or
npm run mobile:ios
npm run mobile:android
```

## Config

Copy `.env.example` → `.env.local` and set `EXPO_PUBLIC_API_URL`.

This value is public in the JS bundle. Never put backend secrets here.

## Assets

`assets/images/*` are temporary Expo placeholders. Replace with Buyseek brand
icons/splash before TestFlight / Play Store.
