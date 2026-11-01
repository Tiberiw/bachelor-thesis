# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Polyglot monorepo with no root tooling; each directory is run on its own.

- `frontend/` — Angular 19 SPA (Tailwind 4). `npm start`, `npm run build`, `npm test` (Karma, needs Chrome). No lint script.
- `back-end/` — NestJS 11 API (TypeORM + Postgres, Google sign-in (ID token) + JWT, socket.io). `npm run start:dev`, `npm run lint` (auto-fixes), `npm test` (jest, `src/**/*.spec.ts`), `npm run test:e2e`.
- `model-inference/` — FastAPI Whisper ASR service (base model + LoRA adapter from the HF Hub). This is the canonical, deployed inference service (Hugging Face Space, Docker, port 7860). Run: `uvicorn app:app --host 0.0.0.0 --port 7860`. Needs `ffmpeg`.
- `training/` — notebooks and data scripts only. It has no inference code; don't add a copy of the service here.

## Gotchas

- Never read or print `.env` files (`back-end/.env`, `model-inference/.env`); they hold real secrets. Env var names are in each dir's `.env.example`.
- Secrets must come from env vars with no hardcoded fallbacks. The back-end uses `ConfigService.getOrThrow` for `DB_PASSWORD`, `JWT_SECRET` and `GOOGLE_CLIENT_ID`. Never log `HF_TOKEN`.
- TypeORM runs with `synchronize: true` (`back-end/src/app.module.ts`) and there are no migrations. Entity changes mutate the schema directly.
- The back-end calls the production ASR URL `https://tiberiw-thesis.hf.space/api/transcription`, hardcoded in `back-end/src/transcription/`. Changing `model-inference/` does not affect a local back-end until the Space is redeployed.
- The frontend hardcodes `http://localhost:3000` in its services (auth, patient, recording, websocket); there are no Angular environment files.
- Exclude `node_modules` when searching `back-end/` and `frontend/`.
- Git: the default branch is `main`. GitHub `master` is a stale squashed copy; don't use it.
