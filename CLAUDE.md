# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Polyglot monorepo with no root tooling; each directory is run on its own.

- `frontend/` — Angular 19 SPA (Tailwind 4). `npm start`, `npm run build`, `npm test` (Karma, needs Chrome). No lint script.
- `back-end/` — NestJS 11 API (TypeORM + Postgres, Google sign-in (ID token) + JWT, socket.io). `npm run start:dev`, `npm run lint` (auto-fixes), `npm test` (jest, `src/**/*.spec.ts`), `npm run test:e2e`.
- `model-inference/` — Gradio Whisper ASR service (base model + LoRA adapter from the HF Hub, run on CPU). This is the canonical, deployed inference service: the free ZeroGPU Space `Tiberiw/thesis-asr`. Run locally: `python app.py` (port 7860; needs `ffmpeg` and `HF_TOKEN`). Deploy: see its README.
- `training/` — notebooks and data scripts only. It has no inference code; don't add a copy of the service here.

## Gotchas

- Never read or print `.env` files (`back-end/.env`, `model-inference/.env`); they hold real secrets. Env var names are in each dir's `.env.example`.
- Secrets must come from env vars with no hardcoded fallbacks. The back-end uses `ConfigService.getOrThrow` for `DB_PASSWORD`, `JWT_SECRET` and `GOOGLE_CLIENT_ID`. Never log `HF_TOKEN`.
- TypeORM runs with `synchronize: true` (`back-end/src/app.module.ts`) and there are no migrations. Entity changes mutate the schema directly.
- The back-end calls the ASR service at `ASR_URL` (required, no fallback) through Gradio's HTTP API (`back-end/src/transcription/asr.client.ts`). Changing `model-inference/` does not affect a back-end pointed at the Space until the Space is redeployed.
- The frontend's API URL comes from `frontend/src/environments/` (`environment.development.ts` for `ng serve`, `environment.ts` for production builds).
- Deploy: frontend on Cloudflare Pages (`medspeech.pages.dev`) (`frontend/public/_redirects` sends every route to `index.html`), back-end on Render via the root `render.yaml`, Postgres on Neon (`DATABASE_URL`, SSL). The back-end uses `DATABASE_URL` when set, otherwise the `DB_*` variables.
- Exclude `node_modules` when searching `back-end/` and `frontend/`.
- Git: the default branch is `main`. GitHub `master` is a stale squashed copy; don't use it.
