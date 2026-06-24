# MedPrep AI

A medical exam prep platform where students upload PDFs, AI extracts questions, and they practice with a personalized question bank for NEET PG and university finals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `GEMINI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + shadcn/ui (artifact: `medprep`, port 21284)
- API: Express 5 (artifact: `api-server`, port 8080)
- Auth: Clerk v6 (email + Google OAuth), proxied via `/api/__clerk`
- DB: PostgreSQL + Drizzle ORM
- Object Storage: Replit Object Storage (GCS presigned URLs)
- AI: Gemini API via user's own key
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle DB schema (users, profiles, pdfs, processing_jobs)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/medprep/src/pages/` — Frontend pages (landing, dashboard, upload, library, settings)

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → type-safe React Query hooks. Never write raw fetch calls.
- **Presigned upload flow**: client requests a signed GCS URL from `/api/storage/uploads/request-url`, uploads directly to GCS, then calls `/api/pdfs/register` to create the DB record and enqueue the job.
- **Clerk proxy**: Clerk Frontend API is proxied via `/api/__clerk` so auth works on custom/replit.app domains without CNAME DNS.
- **Auth cookie-based (web)**: No bearer token handling in browser API calls — Clerk session cookie is used. `getAuth(req)` extracts the Clerk user on every protected route.
- **JIT user provisioning**: User rows are created on first `/api/users/me` call from the Clerk session claims — no webhook required.

## Product

Phase 1 (current): Auth, PDF upload, processing job queue shell, dashboard stats, PDF library management.
Phase 2 (planned): Gemini PDF analysis pipeline, question extraction, quiz/flashcard generation.

## User preferences

- Stack: React + Vite (frontend) + Express (backend), NOT Next.js
- Using Replit native stack: Clerk Auth, Replit Object Storage, Replit Postgres + Drizzle ORM
- User's own GEMINI_API_KEY (not via Replit AI integration)

## Gotchas

- **Clerk v6 API**: Use `<Show when="signed-in">` / `<Show when="signed-out">` not `SignedIn`/`SignedOut`. Routes need `/*?` wildcard: `path="/sign-in/*?"`. `SignIn path` must be full path including basePath.
- **`publishableKey`** must come from `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` from `@clerk/react/internal`.
- **`proxyUrl`** must be `import.meta.env.VITE_CLERK_PROXY_URL` (empty in dev, auto-set in prod). Do NOT hardcode `/api/__clerk`.
- Always run `pnpm run typecheck:libs` after changing `lib/*` packages before leaf typechecks.
- After schema changes: `pnpm --filter @workspace/db run push` to apply.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
