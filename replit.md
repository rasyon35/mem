# MemOS Waitlist

A waitlist landing page for MemOS — an AI-powered "living wiki" that evolves company knowledge through Git-style version control and human-reviewed AI updates.

## Overview

This project was imported from a Vercel/v0 Next.js codebase and ported to Replit's pnpm monorepo as a Vite + React app.

## Structure

- `artifacts/memos-waitlist/` — the React + Vite frontend artifact (single-page landing site).
- `artifacts/api-server/` — pre-existing Express scaffold (currently unused; the waitlist has no backend).
- `artifacts/mockup-sandbox/` — pre-existing component preview sandbox (unused by this app).
- `lib/` — pre-existing shared packages (api-spec, api-client-react, db). Not used by this site yet.

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

The app runs via the workflow `artifacts/memos-waitlist: web`. Do not run `pnpm dev` at the workspace root.
