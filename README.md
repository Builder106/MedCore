<picture>
  <source media="(prefers-color-scheme: dark)"  srcset="assets/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="MedCore — Centralised digital health records for African healthcare" src="assets/banner-dark.svg">
</picture>

[![CI](https://github.com/Builder106/med-core/actions/workflows/ci.yml/badge.svg)](https://github.com/Builder106/med-core/actions/workflows/ci.yml)
[![Deploy](https://github.com/Builder106/med-core/actions/workflows/deploy.yml/badge.svg)](https://github.com/Builder106/med-core/actions/workflows/deploy.yml)
[![Demo](https://img.shields.io/badge/demo-live-success.svg)](https://medcore-health.vercel.app)
[![Node](https://img.shields.io/badge/node-22%2B-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![PWA](https://img.shields.io/badge/PWA-installable-success.svg)](docs/DEMO.md)
[![FHIR](https://img.shields.io/badge/FHIR-R4-orange.svg)](server/src/lib/fhir-mappers.ts)
[![Yale AIS](https://img.shields.io/badge/Yale%20AIS%20IV-Winner-DAB776.svg)](https://www.yaleafricainnovation.org/)

MedCore is a centralised digital health records platform for African healthcare providers — a **Vite + React PWA** front-end with a **Node + Express + SQLite (libSQL)** API. It implements the [PRD's eight features](docs/PRD.md) end-to-end with FHIR-shaped resources, RBAC-gated access, and an AI assist layer that summarises patient context and surfaces risk flags. Every external integration (Daily.co, OpenAI Whisper, Africa's Talking, OpenFDA, Web Push) ships with a working mock so the demo runs offline.

## 🏆 Recognition

**Winner — [Yale Africa Innovation Symposium IV](https://www.yaleafricainnovation.org/) (April 16–18, 2026)**, built within the **Technology & AI Innovation Lab** track under the symposium's "The Pulse of Progress" theme.

<table>
  <tr>
    <td width="50%"><img src="assets/yais-iv-team-presenting.jpeg" alt="MedCore team presenting at YAIS IV judging — April 18, 2026"></td>
    <td width="50%"><img src="assets/yais-iv-tech-ai-lab.jpeg" alt="Technology & AI Innovation Lab participants at YAIS IV"></td>
  </tr>
  <tr>
    <td align="center"><em>Final presentation, Yale, April 18, 2026</em></td>
    <td align="center"><em>Technology &amp; AI Innovation Lab participants, YAIS IV</em></td>
  </tr>
</table>

## Quick start

```bash
git clone https://github.com/Builder106/med-core.git
cd MedCore
npm install
npm --prefix server install
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:3001/api/health>

The Vite dev server proxies `/api/*` to the Express server on port 3001 and binds to `0.0.0.0`, so a phone on the same Wi-Fi can open `http://<laptop-ip>:5173`.

### Sign-in (demo)

| Role | User ID | Default PIN |
|------|---------|-------------|
| Doctor | `DOC-001` | `4242` |
| Patient | `PAT-001` | `1212` |
| Admin | `ADM-001` | `3434` |

PINs are configurable in `server/.env` (see `server/.env.example`). For production, set `SESSION_SECRET` to a long random string (≥32 characters). If a login fails after editing PINs, restart the API to resync demo PINs — dev does this on every start.

## How it works

```mermaid
sequenceDiagram
  actor Doctor
  participant PWA as PWA<br/>(Vite + React)
  participant API as Express API
  participant DB as SQLite<br/>(libSQL)
  participant Ext as External APIs<br/>(OpenFDA · Daily · AT · Whisper)
  participant AI as AI Layer<br/>(OpenRouter · Groq)

  Doctor->>PWA: Open patient chart
  PWA->>API: GET /api/patients/:id<br/>(session cookie)
  API->>API: requireApiSession + audit
  API->>DB: SELECT patient, meds, labs, encounters
  DB-->>API: rows
  API-->>PWA: 200 JSON
  PWA-->>Doctor: Render chart

  Doctor->>PWA: Request AI summary
  PWA->>API: POST /api/ai/summarize
  API->>AI: Prompt with patient context
  AI-->>API: Summary + risk flags
  API-->>PWA: 200 JSON
  PWA-->>Doctor: Show AI panel

  Doctor->>PWA: Prescribe new drug
  PWA->>API: POST /api/prescriptions
  API->>Ext: OpenFDA interaction check
  Ext-->>API: critical / warning / none
  alt critical, no ack
    API-->>PWA: 409 critical_interaction
    PWA-->>Doctor: Modal: override w/ PIN?
    Doctor->>PWA: Acknowledge + PIN
    PWA->>API: POST /api/prescriptions (ack)
    API->>DB: INSERT prescription + audit
    API-->>PWA: 201 created
  else safe
    API->>DB: INSERT prescription + audit
    API-->>PWA: 201 created
  end
  PWA-->>Doctor: Updated chart
```

All external integrations fall back to mocks when API keys are absent, so the canonical journey above works offline.

## Demo recordings

<details>
<summary><strong>Core workflow</strong> — doctor signs in, opens a patient chart, AI panel auto-loads (≈25s)</summary>

![Doctor signs in and opens a patient chart](assets/demo-01-core.gif)

Recorded against the live deploy at <https://136-117-181-143.nip.io> via the [`e2e/demo/features/01-core.feature`](e2e/demo/features/01-core.feature) Gherkin scenario.

</details>

<details>
<summary><strong>How to regenerate / add more</strong></summary>

The Gherkin suite at [`e2e/demo/features/`](e2e/demo/features/) drives Playwright with slowmo + a custom video reporter that converts webm → mp4 → gif. Add a `0N-<name>.feature` and:

```bash
npx playwright install chromium    # one-time
E2E_BASE_URL=https://136-117-181-143.nip.io DEMO=1 npm run e2e:demo  # records mp4
npm run e2e:demo:gif               # mp4 -> gif (10 fps, 960px wide)
cp e2e/demo-videos/<slug>.gif assets/<name>.gif
```

The full mechanics — cursor injection, dwell helpers, the 0-byte first-test workaround — are documented in [`docs/E2E.md`](docs/E2E.md).

</details>

## Demo on your phone

See [`docs/DEMO.md`](docs/DEMO.md) for the full phone walkthrough (PWA install, voice, video, push reminders, SMS, Health ID QR, offline/low-bandwidth).

Media APIs (camera, microphone, push) require a **secure context**:

```bash
# Option 1 — tunnel (recommended for dev)
cloudflared tunnel --url http://localhost:5173    # brew install cloudflared
# or
ngrok http 5173

# Option 2 — light cloud deploy (Fly.io / Railway / Render)
docker build -t medcore .
```

For the Africa's Talking SMS callback, point the inbound webhook at `https://<your-public-url>/api/sms/inbound` and send `PATIENT PAT-001 PIN:4242` from the phone number set as `DEMO_DOCTOR_PHONE` in `server/.env`.

## Tests

```bash
npm test                    # web (Vitest)
npm --prefix server test    # API + SMS + interaction + FHIR + integrations
npm --prefix server run typecheck
npm run test:all            # web + server
```

CI runs all of the above on every PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Docs

| File | Contents |
|------|----------|
| [`docs/PRD.md`](docs/PRD.md) | Full product requirements document |
| [`docs/DEMO.md`](docs/DEMO.md) | Phone walkthrough for all 8 features |
| [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md) | Guide to filling out `server/.env` |
| [`docs/go-to-market.md`](docs/go-to-market.md) | GTM strategy and pilot roadmap |
| [`docs/GUIDELINES.md`](docs/GUIDELINES.md) | Development conventions |
| [`docs/ATTRIBUTIONS.md`](docs/ATTRIBUTIONS.md) | Third-party licenses and credits |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Dev setup, project guardrails, PR convention |

## Environment variables

Copy `server/.env.example` to `server/.env` and fill in only the integrations you need:

| Variable | Purpose | Fallback when empty |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | AI summaries and risk flags | Returns a deterministic mock summary |
| `GROQ_API_KEY` / `OPENAI_API_KEY` | Whisper transcription (F2) | Returns realistic mock transcripts |
| `DAILY_API_KEY` / `DAILY_DOMAIN` | Video rooms (F3) | Falls back to a public Jitsi room |
| `AT_API_KEY` | SMS send (F4 & F5) | Logs to a mock outbox |
| `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` | Push reminders (F5) | In-memory fake send |
| `DATABASE_ENCRYPTION_KEY` | AES-256-GCM PII column encryption | Disabled (plaintext) — set before real PII |
| `DEMO_DOCTOR_PHONE` / `DEMO_PATIENT_PHONE` | Route SMS / reminders to your real number | — |

Generate VAPID keys: `npx web-push generate-vapid-keys`. Generate an encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## PRD features implemented

1. **Multilingual (i18next, 5 languages + RTL Arabic)** — [`src/locales/`](src/locales/)
2. **Voice recording + AI transcription** — [`src/app/components/clinical/VoiceConsultPanel.tsx`](src/app/components/clinical/VoiceConsultPanel.tsx) and [`server/src/routes/voice.ts`](server/src/routes/voice.ts)
3. **Video consulting (Daily.co + Jitsi fallback)** — [`src/app/pages/VideoConsultPage.tsx`](src/app/pages/VideoConsultPage.tsx) and [`server/src/routes/video.ts`](server/src/routes/video.ts)
4. **SMS offline system** — [`server/src/routes/sms.ts`](server/src/routes/sms.ts) + doctor inbox at [`src/app/pages/SmsInboxPage.tsx`](src/app/pages/SmsInboxPage.tsx)
5. **Medication reminders + adherence** — [`server/src/routes/reminders.ts`](server/src/routes/reminders.ts) + doctor/patient UIs
6. **Drug interaction checker** — [`server/src/routes/interactions.ts`](server/src/routes/interactions.ts) + [`server/src/routes/prescriptions.ts`](server/src/routes/prescriptions.ts) with PIN override
7. **EHR domain — appointments, labs, vaccinations, referrals, encounters, inventory, staff, consent, audit** — `server/src/routes/*`
8. **AI assist + FHIR export** — [`server/src/routes/ai.ts`](server/src/routes/ai.ts), [`server/src/routes/fhir.ts`](server/src/routes/fhir.ts), [`server/src/lib/fhir-mappers.ts`](server/src/lib/fhir-mappers.ts)

## Postgres (production option)

```bash
docker compose up -d postgres
# then set DATABASE_URL in server/.env to a Postgres URL
```

The SQLite schema in [`server/src/db/migrations.sql`](server/src/db/migrations.sql) is portable; switching dialects only requires updating the Drizzle client.

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for dev setup, project guardrails (PHI safety, offline-first, mock-friendly integrations, RBAC), commit convention, and the out-of-scope list. CI must stay green.

## License

MedCore is released under the [MIT License](LICENSE). © 2026 Yinka Vaughan.

Third-party licenses and asset attributions are tracked in [`docs/ATTRIBUTIONS.md`](docs/ATTRIBUTIONS.md).
