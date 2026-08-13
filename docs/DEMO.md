# MedCore phone-demo guide

This is what actually needs a phone — and for each one, what to show, why it's better than on the laptop, and any setup.

## TL;DR — seven things only a phone proves

| #   | Feature                                      | What it proves                                  |
| --- | -------------------------------------------- | ----------------------------------------------- |
| 1   | **PWA install**                              | "Works like a native app, offline-capable"      |
| 2   | **Voice consultation recording**             | AI note-gen in a doctor's pocket                |
| 3   | **Video consultation**                       | Telemedicine on a patient's phone               |
| 4   | **Medication reminders with push**           | Real lockscreen alerts, even when app is closed |
| 5   | **SMS reply flow (Africa's Talking)**        | Feature-phone users can access the system       |
| 6   | **Health ID QR**                             | Paper/ID card → instant patient chart           |
| 7   | **Low-bandwidth / offline mode on cellular** | Realistic network conditions                    |

Everything else (i18n, prescriptions, interactions, inbox, dashboards, admin) is just as convincing on the laptop. Bring those up there, bring the seven items above up on your phone.

---

## Pre-flight (do once before your demo)

### Laptop

1. From the project root:

  ```bash
   npm run demo
  ```

   Wait for **all three**:

1. Scan the QR the tunnel script prints, or AirDrop the URL to your phone.
2. **Sign in** when the app loads. Sessions use a secure HTTP-only cookie after you authenticate. Demo accounts (override PINs via `server/.env` if needed):

  | Role    | User ID   | PIN    |
  | ------- | --------- | ------ |
  | Doctor  | `DOC-001`|`4242` |
  | Patient | `PAT-001`|`1212` |
  | Admin   | `ADM-001`|`3434` |

### Phone

1. Open the tunnel URL in **Safari (iOS)**or**Chrome (Android)** — not in an in-app browser like Slack/Gmail, those block push + mic.
2. Allow the browser to: **use camera**, **use microphone**, **send notifications** when it asks (you can also pre-grant in Settings).
3. Bookmark it / add to home screen (see Feature 1 below).

### Optional — for the full "connected" demo

Copy `server/.env.example`to`server/.env` on the laptop and fill only what you want live:

| Feature                  | Env vars                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Real Whisper transcripts | `OPENAI_API_KEY`                                                                   |
| Real Daily.co rooms      | `DAILY_API_KEY`, `DAILY_DOMAIN`                                                    |
| Real SMS round-trip      | `AT_API_KEY`, `AT_USERNAME`, `DEMO_DOCTOR_PHONE=+1yourmobile`                      |
| Real push notifications  | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` (`npx web-push generate-vapid-keys`) |

Everything you leave blank runs against the built-in mock. Restart `npm run demo`after editing`.env`.

---

## Recommended setup (what I'd actually do)

**Two devices, two roles, one story.** You stand in front of the room with:

- **Laptop = Doctor** (Clinical Workspace) — projected on screen so audience can see.
- **Phone = Patient** (Patient Portal) — held in your hand, also mirrored if possible.

Use **separate sign-ins**on each device (or**Sign out**and log in as the other demo user on one device): e.g.**Doctor**`DOC-001`/`4242`on the laptop,**Patient**`PAT-001`/`1212` on the phone. Language and current patient ID still persist in local storage per browser profile.

### The 5-minute narrative

1. **[Laptop / Doctor]** Open a patient, write a prescription with an interaction warning. Enable the "Send via Push" reminder schedule.

  → Shows F6 (interactions) + F5 (reminder authoring).

1. **[Phone / Patient]**Seconds later, a push notification pops. Tap it → opens the PWA to today's reminders. Tap**TAKEN**.

  → Shows F5 delivery + PWA install.

1. **[Laptop / Doctor]** Refresh the patient's adherence view. The tap you just did on the phone is already logged.

  → Closes the loop; this is the "wow".

1. **[Phone / Patient]**Open**Health ID**, show the QR (encodes a **full URL** to this demo instance: `/patients/PAT-001?from=health-id`).
2. **[Doctor device — laptop or phone]**Logged in as**Doctor**, use the **system camera**to scan the QR (browser opens the patient chart on the same tunnel origin).**Patients → search `PAT-001`**still works the same if you skip the scan. The**Scan QR** button inside the Patients screen is cosmetic in this MVP — there is no in-app camera scanner wired up.

  → Shows F8 (portable ID + same chart from the clinician side).

1. **[Laptop / Doctor]** **Voice Consult**. Record ~20 seconds, e.g. *"Patient reports headache, BP 140/90, assessment hypertension, plan amlodipine 5mg."* → SOAP note fills in.

  → Shows F2 (dictation + structured note on the **chart**— there is no separate “send recording to patient’s phone” in the MVP; the patient does**not** get a voice message or push from this flow).

1. **[Both]** **Video consult**— ensure**both** devices use `**PAT-001`**as the active patient, then each taps**Start call**(see §3:**same Jitsi room** without copying a URL).

  → F3.

Audience walks away with **"oh, it's one system for both sides."**

The rest of this document is reference material for each feature — what to show, why a phone matters, and the setup needed. Use it to prep, then follow the seven steps above on demo day.

---

## Mobile navigation quick reference

Below the `lg` breakpoint (under 1024px, i.e. phones and most tablets):

- **Hamburger**(top-left of the header) opens a full off-canvas drawer with every route for the active role, plus the language picker,**Sign out**, low-bandwidth toggle, offline-sync toggle, and USSD/AES/FHIR compliance badges.
- **Bottom tab bar**keeps the 4 most-used routes for the active role one tap away, with a fifth**More** tab that re-opens the drawer.
  - Patient: Home, Reminders, Health ID, Video, More
  - Doctor: Home, Patients, Prescriptions, Voice, More
  - Admin: Home, Staff, Inventory, Reports, More
- **Header** is simplified on mobile — hamburger, page title + role chip, notification bell, avatar. All the pills (low-bandwidth, FHIR, AES) live inside the drawer to keep the phone header uncluttered.
- **Safe-area insets** are respected, so the bottom tab sits above the iOS home indicator and the header sits below the notch.

At `lg+` the classic sidebar + full pill header returns.

Throughout the 7-step narrative above, "sidebar" on phone means "bottom tab or hamburger drawer" — everything is still one tap away.

---

## 1. PWA install — "This is an app, not a webpage"

### Why phone

Installing to the home screen is the move that visually separates "web demo" from "product". Laptop PWAs exist but nobody notices.

### Show it

- **iOS Safari**: tap Share → **Add to Home Screen** → name stays "MedCore" → Add.
- **Android Chrome**: menu → **Install app**/**Add to Home screen**.

Launch from the home-screen icon. The browser chrome disappears; you get a splash screen (the green hex + gold caduceus from `public/icons/icon-192.svg`) and fullscreen shell.

### Talking point

"Low-end Android phones install the app in under 200 KB, cache the UI via the service worker in `public/sw.js`, and work through offline pockets."

---

## 2. Voice consultation — "Dictate a SOAP note in 20 seconds"

### Why phone

Doctors in African clinics often consult bedside with a phone, not a laptop. The native mic on a phone is closer to real usage than a laptop mic. Plus it shows mobile-first UX.

### Requires

- **HTTPS context** → use the Cloudflare tunnel URL (the `localhost` / LAN URL will silently refuse mic access on iOS). This is the #1 reason voice demos fail.
- Mic permission granted to the browser.

### Show it

1. Log in as **Doctor** (`DOC-001`).
2. Navigate to **Voice Consult**— on phone it's the**Mic** tab in the bottom bar (Doctor role); on desktop it's in the sidebar.
3. Check the consent checkbox ("I agree to the recording") — mention audio retention is 30 days and auto-purged (`purgeExpiredAudio`in`server/src/routes/voice.ts`).
4. Tap **Record** — allow mic when iOS prompts.
5. Dictate into the phone for ~15–30 seconds, e.g.:

  > "Chief complaint: 42-year-old female with two weeks of intermittent headaches, worse in the evenings. History: hypertension, on amlodipine. Assessment: likely tension-type headache, rule out poorly controlled blood pressure. Plan: recheck BP, trial of paracetamol, follow up in one week."

1. Tap **Stop**→ tap**Generate consultation note**.
2. The SOAP fields populate. Edit inline if you want, then **Save**.
3. Show the past-recordings list at the bottom with the embedded audio player.

### Does the doctor “send” this to the patient

**Not in this MVP.**The flow is**clinical documentation**: audio and transcript are stored against the patient’s chart, and the SOAP note saves into the same record. There is **no** separate action to push the recording, transcript, or note to the patient’s phone (no SMS, no patient-app notification from this screen). That would be a future product feature (e.g. secure link or portal message).

### Talking point

"Audio goes over HTTPS to `/api/transcribe`, which hits OpenAI Whisper with a fallback to a mock if no key. The transcript is parsed into SOAP sections. Audio is encrypted at rest and purged after 30 days."

---

## 3. Video consultation — "Real telemedicine, one tap"

### Why phone

A video consult viewed on a laptop is meaningless — telemedicine is about a patient on their phone talking to a clinician. Being the patient on a phone makes the point instantly.

### Requires

- HTTPS tunnel URL (camera + mic are blocked on plain HTTP).
- Camera and mic permissions.
- Laptop to simultaneously play the "other end" of the call.

### Show it

**Jitsi without Daily keys (default demo):**The server maps each**patient**to**one stable `meet.jit.si`room**(e.g. patient`PAT-001`→ room`medcorepat001`). So**doctor and patient can each tap Start call**and still land in the**same**room — no copying URLs, no env variables. Both sides must use the**same `currentPatientId`** (`PAT-001` in the demo).

**Two-device demo (low friction):**

1. **Doctor**(laptop or phone): `DOC-001` →**Video Consult**→ confirm patient field shows**PAT-001**→**Start call** and allow camera/mic.
2. **Patient**(`PAT-001`):**Video Consult**→**Start call**.
3. You should see each other in one Jitsi room. If a rare lobby/moderator prompt appears on public `meet.jit.si`, **doctor joins first**, patient second, or both tap **Join** if asked.

**Note:**With**Daily.co** configured, each session still gets its own Daily room; behavior differs from Jitsi fallback above.

Option B — **Phone-only walkthrough**:

1. On the phone, go to Video Consult.
2. Walk through the pre-call checklist (camera test, mic test, bandwidth selector).
3. Flip the bandwidth selector to **Poor** — point out the amber "switching to audio only" banner — this is the graceful degradation story.
4. Show the telemedicine disclaimer text.
5. Start the call → end the call → show the post-call notes form → Save.

### Talking point

"Pre-call device checks, bandwidth-aware degradation, post-call notes persisted to the patient record. Without Daily API keys we pin Jitsi to a **per-patient room name** so two clients can join without sharing links. With Daily, each session is its own hosted room."

---

## 4. Medication reminders + push — "Lockscreen alert, even when app closed"

### Why phone

A desktop notification sitting in Notification Center is forgettable. A push showing on your **phone's lock screen** while the app is backgrounded is visceral. This is the feature that sells patient adherence.

### Requires

- HTTPS tunnel URL.
- For *real* push: `WEB_PUSH_PUBLIC_KEY`/`WEB_PUSH_PRIVATE_KEY`set in`server/.env`.
- On iOS 16.4+, push **only works after "Add to Home Screen"** — install the PWA (Feature 1) before enabling push.
- Notification permission granted.

### Show it

1. Phone: log in as Patient → **Reminders** page.
2. Tap **Enable push reminders** — iOS/Android prompts "Allow notifications?" → Allow.
3. Lock the phone (press power button).
4. On the **laptop**(doctor role): Reminders page → pick a prescription → tap**Send test reminder**.
5. Phone lockscreen lights up with a MedCore notification: "Time for your medication — Metformin 500mg". Tap it → app opens directly to the Reminders screen.
6. Back on the laptop, show the **adherence %**and**streak** widgets update when you tap TAKEN on the phone.

### Talking point

"Reminders are scheduled with node-cron server-side. The Web Push API + our service worker deliver the notification even when the PWA isn't running. TAKEN/SKIP replies land in the adherence events table, which feeds the streak calculation."

---

## 5. SMS reply flow — "Works on a $10 feature phone"

### Why phone

This isn't about your smartphone's browser — it's about using the **actual SMS app** to send a real text. A laptop can simulate this via the `/sms-inbox`form, but handing your phone to someone and letting *them* type`PATIENT PAT-001 PIN:4242` into Messages, then watching a reply come back ~2 seconds later, is the only way to feel the pitch: "This works when the internet doesn't."

### Requires

- Africa's Talking account + shortcode (free sandbox: [https://account.africastalking.com](https://account.africastalking.com)).
- `server/.env`: `AT_API_KEY`, `AT_USERNAME`, and `**DEMO_DOCTOR_PHONE=+254…`** — your actual phone number in E.164.
- Set the AT dashboard's **SMS callback URL** to:

  ```text
  https://<your-tunnel>.trycloudflare.com/api/sms/inbound
  ```

- Wait for the AT sandbox approval (~minutes).

### Show it

From your phone's native SMS app, send the AT shortcode (shown on the AT dashboard):

```text
PATIENT PAT-001 PIN:4242
```

~2 seconds later you get an SMS back:

> `Amina O.: meds Metformin 500mg, Amlodipine 5mg, Warfarin 5mg. RISK med. See app for full record.`

Now from the laptop, show the same message in **SMS Inbox** — it's logged with command, PIN status, response snippet.

Other commands to demo:

- `MEDS PAT-001 PIN:4242` — medication list
- `NOTE PAT-001 PIN:4242 follow up in two weeks` — adds a clinician note
- `APPT PAT-001 PIN:4242` — upcoming appointments
- `EMRG PAT-001 PIN:4242` — emergency summary
- `PATIENT PAT-001 PIN:0000` — wrong PIN; do it 3 times → account locks for 15 minutes

### Talking point

"93% of rural African phones are SMS-capable but not smartphones. The inbound webhook parses the command, validates the doctor's PIN (3 attempts, 15-min lockout), queries the same data store, and replies in under 140 chars."

### Fallback if you can't get AT set up

Use the `/sms-inbox` simulator on the laptop. Type the same commands into the "Simulate inbound SMS" form. Not as dramatic, but functionally identical.

---

## 6. Health ID QR — "Scan an ID card, get the chart"

### Why phone

The **card UI** and QR read well on a small screen; the clinician story is “same record, any device.”

### What the QR actually is (this MVP)

The QR encodes an **HTTPS URL**on the**same origin**as the app (your tunnel or localhost), e.g. `https://<host>/patients/PAT-001?from=health-id`. The**system camera**can open that link in the browser. The signed-in user must be allowed to view the chart (e.g. doctor logged in on that device). If the camera opens a fresh browser profile with no session, sign in as doctor first or fall back to**Patients → search `PAT-001`**.

### Requires

- Same tunnel URL on both devices if you open the app in multiple browsers (optional for search-based flow).

### Show it

1. **Patient phone**: **Health ID** — show the card + QR (audience sees a realistic “ID card”).
2. **Doctor (laptop or phone, logged in as `DOC-001`)**: Scan the QR with the **camera app**(or open the encoded URL from a QR reader) to land on**PAT-001**’s chart, **or**use**Patients** → search `**PAT-001`**.

- **Yes, the doctor can use their own phone** — sign in as doctor first if the browser opened by the camera has no MedCore session.  
- The **Scan QR**control on the Patients list is**not**connected to a camera in this build; the**system camera** scanning the patient’s Health ID QR is the supported path.

### Talking point

"The QR is a stable deep link into the same deployment — scan with any phone camera, or search by id. Either way the chart is the same record."

---

## 7. Low-bandwidth / offline / cellular data — "Rural realistic"

### Why phone

Your laptop is on your home Wi-Fi. Rural Kenya is on a 2G cell, which behaves differently. Doing even part of the demo on cellular is more credible than claiming offline-first from a gigabit connection.

### Show it — any of these

- **Turn Wi-Fi off on your phone**, use LTE. Load the tunnel URL — observe the app still loads via the cached service-worker shell even if API calls are slow.
- In the app header, toggle **Low-bandwidth** on → show that image-heavy views switch to compressed text/icon mode.
- Toggle **Offline mode** on → show the app continues to work against cached data; the header badge flips to amber "Offline sync"; submissions queue.
- iOS: turn on **Settings → Developer → Network Link Conditioner → 3G** to throttle live.

### Talking point

"Service worker caches the UI shell. Offline mode queues writes and reconciles when online. Low-bandwidth mode drops avatars/images and uses iconography — the UX stays usable on 2G."

---

## Bonus — USSD

If a demo audience includes carriers or ministry-of-health folks, mention the `USSD *123#` pill in the header. It's a visual placeholder right now, but pitch it as:

> "In production, this dial-string is provisioned with Safaricom / MTN. A patient with a brick phone dials `*123#`, gets a menu, and interacts with MedCore over USSD sessions. No internet, no SMS cost."

That reinforces the "works on any phone" narrative even if you don't wire it up live.

---

## One-screen cheat sheet

Tape this to your laptop:

```text
LAPTOP (DOC-001 / 4242)
  • /patients → PAT-001 chart                  (F8 doctor side; search works on phone too)
  • /prescriptions → Aspirin + Warfarin → PIN 4242 override
  • /sms-inbox     → simulate inbound
  • /reminders     → Send test reminder

PHONE PATIENT (PAT-001 / 1212, tunnel URL)
  • Add to Home Screen                       (Feature 1)
  • /voice-consult → record 20 s → SOAP      (Feature 2)
  • /video-consult → PAT-001 → Start (same Jitsi room as doctor; Feature 3)
  • /reminders   → push, lock phone          (Feature 4)
  • SMS PATIENT PAT-001 PIN:4242             (Feature 5)
  • /health-id   → QR = chart URL (scan w/ camera) (Feature 6)
  • Wi-Fi OFF, tunnel on LTE                 (Feature 7)
```

Total demo length: 5–7 minutes to hit all seven. 10–12 if you want to slow down on voice + video + push (the three that usually wow people).
