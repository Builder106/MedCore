# JOURNAL — MedCore

> Dated log of decisions, pivots, incidents, and quotes. Add entries as things happen — retrospectives need this raw material to land. Not a changelog (commit messages are that). Not a ticket tracker. Capture the *human* context that disappears within weeks.

**Tags:** `#decision` `#pivot` `#incident` `#quote` `#feedback` `#milestone`

> ℹ️ **Backfill notice.** Entries below dated 2026-04-18 and 2026-05-21 were reconstructed from git history and the published README in May 2026, AFTER the YAIS sprint. They cover the *what*and*when*that's verifiable from commits and docs — the*who said what*and*what surprised you* parts are mostly missing because the journal didn't exist during the sprint. Going forward, treat these as the structure, not the precedent: new entries should land in the moment with the human detail intact.

---

## 2026-08-27 — Pinned frontend tooling to supported ESLint and TypeScript versions `#incident`

The frontend lint job failed before reading source because TypeScript 7 is not supported by the installed `typescript-eslint`, and ESLint 10 is not supported by `eslint-plugin-react`. Pinned root tooling to TypeScript 5.9.3 and ESLint 9.39.5, then synchronized `package-lock.json`; frontend and server lint pass on ampere-dev.

## 2026-08-27 — Resolved CI workflow action tags and @eslint/js dependency `#incident`

Audited GitHub Actions workflow runs and resolved the frontend lint failure on CI. Downgraded GitHub Action runner references (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`) in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` from invalid `@v7` tags to `@v4`. Explicitly declared `@eslint/js` in root `devDependencies` and synced root package metadata so ESLint flat config loads properly in CI runner environments.

---

## 2026-05-28 — Landed deferred Turso/Vercel-FS path support `#milestone`

Folded in the in-flight server work from before the pivot: optional Turso (remote libSQL over HTTPS) backend via `TURSO_DATABASE_URL`+`TURSO_AUTH_TOKEN`, gated so the GCP VM keeps using its local SQLite file (env vars unset → existing code path). `voice.ts`skips audio persistence when`process.env.VERCEL`is set so the read-only deployment FS doesn't blow up the transcribe endpoint — transcript is source of truth, the audio replay endpoint just 404s in that mode.`migrate.ts`now accepts`--env <file>`and`--seed`flags for remote-DB workflows. None of this is on the production path today (Vercel serves static-only via PR #10's rewrite), but the code paths are now in place if a Vercel-Turso preview environment ever makes sense. Also deleted the legacy`api/[...all].ts` entry point — it was the original "deploy Express to Vercel as a serverless function" handler from May 21, never actually shipped, made obsolete by the static + rewrite pivot.

---

## 2026-05-28 — Post-pivot baseline cleanup `#milestone`

After the Vercel rewrite landed (PR #10), did a baseline audit against the standard-repo checklist and closed the gaps that opened up by the platform pivot: README's `Demo`badge + GitHub repo homepage URL updated from the nip.io backend to`medcore-health.vercel.app`; banner `<picture>`srcsets swapped from`.png`to`.svg`(sources existed all along, README just referenced the rasterized fallbacks); added`apple-touch-icon.png`at 180×180 generated from`favicon.svg`via rsvg-convert with`#214838`background (iOS Safari ignores SVG favicons for home-screen installs, falls back to a low-res page screenshot); replaced deprecated`apple-mobile-web-app-capable`with the modern`mobile-web-app-capable`meta (also kept the legacy tag for iOS < 16 compatibility); installed`@vercel/analytics`+`@vercel/speed-insights`and mounted both inside`AppProvider`so the dashboards at`vercel.com/sankofa-forge/medcore/{analytics,speed-insights}` start collecting on the next deploy.

---

## 2026-05-28 — Dependabot triage + LTS-only Node policy `#decision`

Eight Dependabot PRs cleared in one sitting. Trivial five (GH Actions bumps) squash-merged as a batch. Web-deps group (#8, 49 updates) and server-deps group (#9, 14 updates) merged after a usage-grep showed the scary majors were either unused (@mui — declared but zero src/ imports; date-fns — same) or used through the most stable subset of their API (recharts `BarChart`/`Bar`/`XAxis`, multer `memoryStorage().single()`, no Express 5 route-param-regex, no Zod 4 breaking-API usage). Closed PR #3 (node 20→26-alpine) — Node 20 EOL'd on 2026-04-30 so the bump is needed, but 26 isn't LTS until October 2026 and this is a healthcare project. Bumped Dockerfile to `node:24-alpine`manually (still local-uncommitted, sitting in the working tree alongside other WIP) and added`ignore: [node, semver-major]`to`.github/dependabot.yml` so Dependabot stops proposing non-LTS jumps. Policy from here: bump node manually each October when the new LTS lands.

---

## 2026-05-28 — Vercel as a prettier front door for the GCP VM `#decision`

The live URL was the nip.io wildcard against the GCP VM's IP (`136-117-181-143.nip.io`) — accurate but ugly. Considered three paths: (1) custom domain A-record straight to the VM, (2) free real subdomain via is-a.dev / js.org, (3) deploy the Vite build to Vercel and rewrite `/api/*`back to the nip.io backend. Picked (3) for the`*.vercel.app` recognizability, accepting the ~50–150 ms Vercel-edge → us-west1 backend hop per API call. Updated [`vercel.json`](vercel.json) to drop the dead serverless `api/[...all].ts`function path (SQLite-on-disk + 30s timeout made Vercel a non-starter for the actual API months ago) and proxy`/api/*`through to the VM. Added`.vercelignore`so Vercel stops scanning`api/`+`server/`. The Express function file and `@vercel/node` dep are now dead code but left in place for now — git history is enough if we ever want them back.

---

## 2026-05-23 — Started this journal `#milestone`

Picked up that future content (post-mortem posts, demo scripts, eventual O-1 evidence) was hitting a wall on "what broke" and "what someone said at the booth" because nothing got written down during the YAIS sprint. Backfilled the entries below from git + README; marked the gaps with `[FILL]` where only personal memory can answer.

---

## 2026-05-21 — Public-facing polish round `#milestone`

Single-day push that took MedCore from "won a thing at Yale" to "is a real repo on the internet." Notable commits in this batch:

- `5f305f5` — Full EHR domain on the backend: appointments, labs, vaccinations, referrals, encounters, inventory, staff, consent, audit. FHIR mappers. AI assist layer.
- `a4491ba` — Web wired to the live endpoints (previously mocked client-side).
- `693218d` — Dockerized, LICENSE, CONTRIBUTING, CI workflow.
- `0968a10` — README rebuilt to standard baseline: banner (light + dark SVG → PNG), shields.io badges, Mermaid user-flow diagram, embedded demo GIF, license section.
- `c2c9006`— Auto-CD via`gcloud reset`+ reboot-safe startup script. Live deploy at`136-117-181-143.nip.io`.
- `18245e5` — Gherkin BDD e2e suites (QA + demo) with video reporter.

This was the "make it credible as a real project" round — distinct from the YAIS sprint, which produced a working demo but not a public repo.

> `[FILL]` What prompted this round? Was there a specific conversation post-YAIS that made you decide to harden it instead of moving on? Investor interest? A pilot conversation? Just engineering discipline kicking in?

---

## 2026-04-18 — Won YAIS IV (Technology & AI Innovation Lab) `#milestone`

Yale Africa Innovation Symposium IV. We took the Technology & AI Innovation Lab award. Photos in `assets/yais-iv-team-presenting.jpeg`and`assets/yais-iv-tech-ai-lab.jpeg`.

> `[FILL]` What was the moment you found out you'd won? Where were you standing? Who told you? What did the room sound like?
>
> `[FILL]` Anything the judges said in their announcement or feedback that's worth keeping verbatim?
>
> `[FILL]` One specific demo-floor conversation from earlier in the day — the one you'd bring up at dinner. (Without this, the YAIS retrospective falls back to generic "the room loved it" narration.)

---

## 2026-04-18 — Demo sprint culminates `#milestone`

Same day, before the judging. Late commits land the things that mattered for the live demo:

- `e83092a` — Patient chart URL encoded in QR code (Health ID).
- `c39b2dd` — Full-screen mobile consult UI for video.
- `e8ed8a3` — Deterministic Jitsi room per patient (Daily.co fallback).
- `aee4b8f` — Softer SMS command parse-error UX.
- `77cd949` — Public QR origin + login return preserves query string.

The pattern is the same: each fix is a thing someone would have hit at the booth if it had been broken. The fixes shipped *that day*. The demo ran.

> `[FILL]` Specific edge case anyone discovered during the booth demo that hadn't surfaced in testing? (This is the highest-value journal entry you can write retroactively if you can remember any.)

---

## 2026-04-18 — Mobile-first refactor mid-sprint `#decision`

Three commits within the YAIS-day sprint pivoted the UI:

- `8484545` — Mobile-first shell with bottom nav + drawer.
- `690f20c`—`ResponsiveTable` component; converted 7 pages to card-stack on mobile.
- `41cb6a8` — Mobile-friendly modals, charts, and heatmap.

The implication: at some point during the day someone realized the demo would land on phones more often than laptops and the desktop-first layout would feel clunky. The seven-page card-stack conversion is substantial work to ship in a single sprint — this wasn't a small refinement, it was a directional bet.

> `[FILL]` Was this triggered by a specific moment? Watching someone struggle to view the dashboard on a phone? Or a deliberate up-front decision that the demo would be phone-first?

---

## 2026-04-18 — JWT session cookie auth shipped `#decision`

Commits `50b843d`(server) +`693a620`(web). The auth model: HTTP-only cookie after PIN-based login,`requireApiSession`middleware on protected routes, demo PINs configurable via`server/.env`. Session secret enforced ≥32 chars in production.

The non-obvious call: PINs for demo accounts (`DOC-001 / 4242`, etc.) — a tradeoff between "feels like real auth" and "judges shouldn't have to wait for a password reset email." PINs let the demo flow cleanly while still showing the session middleware exists.

> `[FILL]` Was real password / OAuth auth considered and rejected, or was PINs the obvious choice from the start?

---

## 2026-04-18 — Mock-everything discipline `#decision`

Not in a single commit — visible across `server/src/routes/*`and`server/src/lib/*`. Every external integration (OpenRouter, Whisper, Daily.co, Africa's Talking, OpenFDA) ships with a deterministic mock that activates when the API key is absent. Documented in the README "Environment variables" table.

This is the architectural decision the YAIS retrospective leans on: the discipline that the demo runs offline. Every fallback path was a deliberate write — none of them are accidents.

> `[FILL]` Was this a decision that landed early in the sprint or accumulated as integrations were added? Was there a moment where someone proposed "let's just require the keys for now" and got pushed back? (If so, the pushback story is worth keeping verbatim.)

---

## 2026-04-18 — Rebranded AfyaLink → MedCore `#pivot`

Commit `0d1251f`. Project started as "AfyaLink" — visible in commits `b467cb3` (initial UI) and earlier. Renamed mid-sprint to MedCore.

> `[FILL]` Why the rename? Domain availability? Trademark concern? Just preferred MedCore on reflection?

---

## 2026-04-18 — Codebase scaffolded `#milestone`

Commits `2f66904`+`b467cb3`. Vite 6 + React + Tailwind. First UI shell. The journal starts here as far as git is concerned; whatever happened before this (deck, pitch prep, team formation) didn't get committed.

> `[FILL]` When did the team form? How did it form? When was the YAIS application submitted, and on what timeline? (Pre-history that's worth preserving even if it's not in git.)

---

## How to use this file going forward

When something happens during active MedCore work — a user-facing decision, a pivot, a memorable conversation, a bug that taught something — add an entry here in the moment. One paragraph max. Use the tags. Date stamps in `YYYY-MM-DD`.

Don't worry about polish. The point is the raw material; the polished retrospective comes later. A one-sentence note from today beats a missing paragraph from six months ago.
