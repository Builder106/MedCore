# End-to-end tests + demo recording

MedCore ships two Playwright + Gherkin suites that share a step library and split at the config / feature-file level.

| | **QA suite** | **Demo suite** |
| --- | --- | --- |
| Config | [`e2e/playwright.config.ts`](../e2e/playwright.config.ts) | [`e2e/playwright.demo.config.ts`](../e2e/playwright.demo.config.ts) |
| Features | [`e2e/features/`](../e2e/features/) | [`e2e/demo/features/`](../e2e/demo/features/) |
| Goal | Verify behaviour. Fast, headless, parallel. | Produce narrative mp4 walkthroughs. |
| Videos | `retain-on-failure` | `on` for every test |
| Workers | parallel | 1 (single worker — the Playwright 0-byte first-test bug requires serial recording) |
| Slowmo | none | 1200 ms per action |
| Run | `npm run e2e` | `npm run e2e:demo` |

The shared step library is in [`e2e/steps/`](../e2e/steps/) and [`e2e/lib/hooks.ts`](../e2e/lib/hooks.ts). Phrasing is plain English (`When I click the "Sign in" button`), not selectors — reuse the same step text across QA and demo features.

## Running

```bash
npx playwright install chromium     # one-time
npm run dev                         # in another terminal
npm run e2e                         # QA suite
DEMO=1 npm run e2e:demo             # demo suite, writes e2e/demo-videos/*.mp4
npm run e2e:demo:gif                # converts the mp4s to README-embeddable gifs
```

`E2E_BASE_URL` overrides `http://localhost:5173` if the app runs elsewhere (e.g. behind a tunnel).

## Demo recording mechanics

Per the spec in [`~/.claude/CLAUDE.md`](https://github.com/Builder106) "Gherkin E2E Tests + Demo Video Recording", the demo run wires up:

- **`slowMo` (1200 ms)** — pause before each Playwright action so a viewer can follow at 1×.
- **`Locator.fill` patch → `pressSequentially`** — animates typing character-by-character so form fields don't pop from empty to full.
- **Cursor injection (`addInitScript`)** — a visible gold dot follows the mouse; without it, headless mode hides the system cursor.
- **Zoom + counter-scale** — `zoom: 1.3` on `<html>` for a "filmed close" feel, with `min-h-screen` counter-scaled so layout still fits.
- **Dark background pin + `localStorage.theme = 'dark'`** — prevents a white flash before React mounts the theme.
- **`dwellForDemo(page, ms?)`** — explicit dwell after assertions and navigations; `slowMo` alone doesn't cover `page.goto()` or `expect(...).toBeVisible()`.
- **`DEMO_TAIL_MS` in After hook** — holds the final frame so the end state reads as a still.

Environment-variable knobs (defaults in parens):

| Var | Default | Purpose |
| --- | --- | --- |
| `DEMO` | — | Master switch. Hooks no-op when not `1`. |
| `DEMO_SLOWMO` | `1200` | Per-action pause in ms |
| `DEMO_TYPE_DELAY` | `70` | Per-character delay in ms for slow typing |
| `DEMO_TAIL_MS` | `1500` | Hold-final-frame duration at end of each scenario |
| `DEMO_DWELL_MS` | `1500` | Default dwell for `dwellForDemo()` |
| `DEMO_ZOOM` | `1.3` | CSS zoom factor on `<html>` |
| `E2E_BASE_URL` | `http://localhost:5173` | App URL the suite drives |

## Known Playwright quirks

- **0-byte first-test video.** With `slowMo + video: on + workers: 1`, one early test slot records a 0-byte webm. [`00-warmup.feature`](../e2e/demo/features/00-warmup.feature) holds two throwaway scenarios at the top of the demo suite; [`reporter.ts`](../e2e/lib/reporter.ts) detects them by feature-slug prefix (`00-warmup`) and discards the videos.
- **Don't switch to parallel workers as a fix.** Multiple test contexts compete for the video subsystem and most videos end up 0 bytes.
- **Reporter race on finalization.** `onTestEnd` can fire before Playwright flushes the video file. The reporter collects `{ sourcePath, slug }` pairs in `onTestEnd` and processes them all in `onEnd`.

## Adding a new demo

1. Author a feature file in `e2e/demo/features/` with a sort-order prefix (`02-something.feature`).
2. Use existing steps from [`e2e/steps/common.steps.ts`](../e2e/steps/common.steps.ts) where possible — accessibility-first locators only.
3. Run `DEMO=1 npm run e2e:demo`. The output mp4 lands at `e2e/demo-videos/<feature-slug>-<scenario-slug>.mp4`.
4. Add a narration section to [`e2e/demo/SCRIPT.md`](../e2e/demo/SCRIPT.md), render with TTS, mux audio in:

   ```bash
   ffmpeg -i demo.mp4 -i narration.mp3 \
     -map 0:v -map 1:a -c:v copy -c:a aac -shortest \
     demo-narrated.mp4
   ```

5. Embed in the README under the existing `<details>` block for that user-journey cluster.

## Adding a new QA scenario

1. Author a feature file in `e2e/features/` — one assertion-bearing scenario per behaviour or edge case.
2. Reuse step phrases where possible. Validation scenarios (server-side error paths) are high-value; keep them. Cut smoke tests that only assert `expect(x).toBeVisible()` on static elements — they don't catch regressions.
3. Run `npm run e2e` to validate.
