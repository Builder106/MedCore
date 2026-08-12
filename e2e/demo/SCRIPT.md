# Demo narration script

One section per video. Each section has a **clean script**(the literal text fed to TTS) and**timed beats** (start time + line + on-screen action) for the editor.

Target ~140 wpm. Use contractions. Avoid superlatives. Don't announce transitions — the cuts do that.

Suggested voice / delivery:

- ElevenLabs Adam or Brian; OpenAI alloy or echo.
- Speed ~0.95×.
- Stability biased high (less variability ≈ less theatrical).

## 01 Core workflow (~30s)

### Clean script

Sign in with the doctor's ID and PIN — it's the same flow nurses run in the field on a $50 Android. Once the chart loads, the AI panel pulls up a summary of the patient's last six months: meds, allergies, recent labs, anything flagged. The summary's grounded in the patient's record — no hallucinated drugs, no made-up dates.

### Timed beats

| t (s) | Line | On-screen |
| --- | --- | --- |
| 0.5 | Sign in with the doctor's ID and PIN | Login form, fields filling |
| 6.0 | — it's the same flow nurses run in the field on a $50 Android | Dashboard loads |
| 12.0 | Once the chart loads, the AI panel pulls up a summary of the patient's last six months: | Patient chart visible, AI panel opening |
| 19.0 | meds, allergies, recent labs, anything flagged. | AI panel content scrolling |
| 24.0 | The summary's grounded in the patient's record — no hallucinated drugs, no made-up dates. | Summary fully rendered, lingering |

## Adding a new section

1. Author a `0N-<name>.feature`under`e2e/demo/features/`.
2. Run `DEMO=1 npm run e2e:demo`to produce`e2e/demo-videos/<feature-slug>-<scenario-slug>.mp4`.
3. Add a section here with the same heading as the feature.
4. Pick a TTS voice/speed, render the clean script, mux with `ffmpeg -i video.mp4 -i audio.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4`.
