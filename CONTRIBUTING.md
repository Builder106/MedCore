# Contributing to MedCore

Thanks for considering a contribution. MedCore is a centralised digital health records platform for African healthcare providers, built as a Vite + React PWA front-end with a Node + Express + SQLite (libSQL) API. The PRD lives at [`docs/PRD.md`](docs/PRD.md); read it before proposing scope changes.

## Dev setup

```bash
git clone https://github.com/Builder106/medcore.git
cd medcore
npm install
npm --prefix server install
cp server/.env.example server/.env   # fill in only the integrations you need
npm run dev                          # runs web (5173) + api (3001) + tunnel
```

The Vite dev server proxies `/api/*` to Express. Seeded demo users are listed in the README. All external integrations (OpenAI Whisper, Daily.co, Africa's Talking, Web Push, OpenFDA) fall back to working mocks when API keys are absent — you can develop entirely offline.

## Build, test, lint

```bash
npm test                       # web Vitest suite (DOM-based)
npm --prefix server test       # API + SMS + interaction + FHIR tests
npm run test:all               # both
npm --prefix server exec tsc --noEmit   # server type-check
npm run build                  # production web bundle
```

CI runs all of the above on every PR. PRs must keep the suite green.

## Project guardrails

- **PHI safety.** Patient data is sensitive even in demos. Don't log full patient records, don't commit real PII, and don't bypass the `auditMiddleware`on`/api` routes — every read/write must be recorded.
- **Offline-first.** The PWA must work without network. New features should not assume connectivity; degrade to a queued or mock path when offline.
- **Mock-friendly integrations.** Every third-party call (Daily, OpenAI, Africa's Talking, OpenFDA, RxNorm) must keep its mock fallback. Tests should never hit real APIs — vitest sets `NODE_ENV=test` which skips dotenv loading; API mocks live in test setup.
- **Low-bandwidth UX.** Target a 3G connection on a $50 Android phone. Keep route bundles small; avoid synchronous heavy work on the main thread.
- **RBAC.** New patient-scoped endpoints must use `requireRole`/`requirePatientAccess` from [`server/src/middleware/rbac.ts`](server/src/middleware/rbac.ts). Don't trust client-supplied `patientId` without going through that gate.
- **FHIR shape.** When adding domain entities, mirror the FHIR resource shape where reasonable so the `/api/fhir` exporters keep working.

## Commit & PR convention

- Conventional commits: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs(scope): …`. Keep subject under 70 chars; use the body for the *why*.
- One logical change per PR. Refactors separate from features. UI changes separate from backend changes when possible.
- Reference the PRD section or issue number when relevant (`Refs PRD §4.2`, `Fixes #42`).
- Update [`docs/DEMO.md`](docs/DEMO.md) if the feature changes the demo walkthrough.

## Out of scope

To keep this codebase focused on the PRD, the following are **not** accepted without prior discussion:

- Swapping Drizzle / libSQL / Express for another stack.
- Replacing MUI/Radix/Tailwind primitives with a new design system.
- Adding heavyweight observability stacks (DataDog, Sentry, etc.). The lightweight `lib/logger.ts` is intentional for low-bandwidth deploys.
- Test framework changes (Vitest stays).
- Per-feature CSS-in-JS libraries — stick to Tailwind + the small set of MUI/Radix primitives already in use.
- Multi-tenant / SaaS abstractions. MedCore is a single-clinic deployment per instance by design.

If unsure, open a discussion issue first.

## Reporting issues

Use GitHub Issues. For security-sensitive reports (auth bypass, PHI exposure, injection), email the maintainer rather than filing publicly.
