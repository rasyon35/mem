# MemOS Waitlist

A waitlist landing page for **MemOS Desktop** — a local-first AI knowledge wiki for students, researchers, and small teams. The desktop app ingests PDFs, .docx, Markdown, web pages, and notes, indexes them in a local vector workspace, and lets the user approve every AI-proposed wiki edit (Git-style staging, snapshots, branches, conflict resolution). Companion 2D/3D knowledge graph and page-context chat with citations. Privacy by default — only account/license/billing touch the cloud.

## Overview

This project was imported from a Vercel/v0 Next.js codebase and ported to Replit's pnpm monorepo as a Vite + React app.

## Structure

- `artifacts/memos-waitlist/` — the React + Vite frontend artifact (single-page landing site). Copy describes MemOS Desktop accurately (local-first, private-by-default, ingest → approve → wiki, knowledge graph, page-context chat).
- `artifacts/api-server/` — Express backend exposing `POST /api/waitlist` (idempotent signup) and `GET /api/waitlist/stats` (live count + last signup).
- `artifacts/mockup-sandbox/` — pre-existing component preview sandbox (unused by this app).
- `lib/db` — Drizzle + Postgres; `waitlistSignups` table holds signups. Schema in `lib/db/src/schema/waitlist.ts`.
- `lib/api-spec` — OpenAPI source-of-truth; `pnpm --filter @workspace/api-spec run codegen` regenerates `@workspace/api-zod` and `@workspace/api-client-react` (orval). Note: avoid `nullable: true` and string `format: email/date-time` in the spec — they break orval's resolver.
- `.migration-backup/mem-desktop/` — reference port of the full MemOS Desktop product (Electron + Next.js + Django). Not built or run; used only as a product spec reference for waitlist copy and future feature alignment.

## Tech

- React 19 + Vite (TypeScript)
- Plain CSS Modules + global CSS variables (no Tailwind, matching the original)
- Inter + Outfit fonts loaded from Google Fonts via `<link>` in `index.html`

## Migration notes (from Next.js)

- `src/app/layout.tsx` → metadata moved to `index.html`; `<html>` wrapper replaced by `App.tsx` + `main.tsx`.
- `src/app/page.tsx` → `src/App.tsx` (renders all sections directly; no router needed for this single page).
- `next/font/google` → standard `<link>` tag for Google Fonts; CSS variables (`--font-inter`, `--font-outfit`) preserved.
- All `"use client"` directives removed (Vite is fully client-rendered).
- `@/` import alias preserved via `vite.config.ts` and `tsconfig.json`.

## Running

The waitlist runs via workflow `artifacts/memos-waitlist: web`; the API runs via `artifacts/api-server: API Server`. Both are required for the live signup count badge to populate. Do not run `pnpm dev` at the workspace root.

## Backend gotchas

- **Drizzle aggregates need helpers, not raw `sql\`count(*)\``.** Use `import { count, max } from "drizzle-orm"` and select like `{ value: count(), last: max(table.col) }`. Raw `sql\`count(*)::int\`` returned 0 silently because Drizzle couldn't map the unaliased column. The fix is in `artifacts/api-server/src/routes/waitlist.ts`.
- Stats endpoint sets `Cache-Control: no-store` so the proxy won't 304 a stale count back to the React Query poller.
- Email is normalized to lowercase server-side and `onConflictDoNothing({ target: waitlistSignups.email })` makes signup idempotent; a follow-up SELECT handles the "already signed up" case so position never moves on re-submission.
