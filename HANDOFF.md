# Ishara (VTSP) - Hackathon Master Handoff & Task Division

**Target Repository:** `/home/vibhav/Projects/Ishara_VTSP`  
**Last Updated:** 2026-09-12  
**Tech Stack:** Bun v1.4.0, Next.js 16.3.5 (Turbopack, React 19), Supabase (PostgreSQL, Realtime, Storage), LiveKit Cloud WebRTC, Tailwind CSS v4, Lucide Icons.

---

## 1. Executive Summary & Forensic Audit

During initial testing of Phase 1, buttons on `/login` appeared non-responsive, the Staff Station and Interpreter Portal would not open, and the Patient Kiosk seemed to send alerts into a void. A deep forensic audit revealed the exact root causes:

1. **Next.js 16 Middleware Lockdown (`proxy.ts` -> `lib/supabase/middleware.ts`)**:
   - `lib/supabase/middleware.ts` only whitelisted `/login`, `/auth`, `/patient`, and `/api`.
   - `/dashboard/*` and `/interpreter/*` were blocked for unauthenticated users, throwing `HTTP 307 Temporary Redirect` back to `/login`.
   - Demo accounts require normal Supabase authentication; no auth bypass is supported.
2. **Session ID Desynchronization**:
   - `/login` demo buttons generated random isolated UUIDs on each click. The patient was in Session A, the doctor was in Session B, and the interpreter was listening for `'demo-session'`. None shared a realtime channel.
3. **Patient Kiosk UX / Unconnected Terminal**:
   - The patient tablet is a bedside call-bell. When tapping a pictogram, it broadcasts to the doctor station. Because the doctor station was blocked by middleware, no staff terminal was open to sound the chime or acknowledge.
4. **Premature IPC Channel Teardown**:
   - `hooks/use-session-realtime.ts` called `bc.close()` synchronously right after `postMessage()`, dropping cross-tab messages before dispatch.
5. **Postgres UUID Syntax in Events API**:
   - `app/api/session/[id]/events/route.ts` queried `session_id` using raw slug `'demo-session'` without `toValidSessionUuid`, causing PostgreSQL syntax errors.
6. **Video Clip Assets Missing**:
   - `public/videos/` is empty and Supabase Storage `isl-clips` bucket has 0 files, causing `<video>` tags to error out to fallback placeholders.

---

## 2. Team Division of Labor

The project is divided across team members with zero overlap:

```
+---------------------------------------------------------------------------------------+
|                                    ISHARA PLATFORM                                    |
+------------------------------------+--------------------------------------------------+
|           VIBHAV (ME)              |                 TEJAS (TEAMMATE 1)               |
|    Full-Stack, Realtime & UX       |         Vision AI & ISL Video Media Lead         |
+------------------------------------+--------------------------------------------------+
| 1. Fix Middleware & Demo Bypass [DONE] | 1. MediaPipe Tasks Vision Gesture Model (P3) |
| 2. Synchronize Demo Sessions    [DONE] | 2. Clinical Sign Classifier (Debounce & Filter) |
| 3. Fix IPC & Realtime Signaling [DONE] | 3. Stream Recognized Signs to Realtime Pipeline |
| 4. Fix Postgres Events UUID Bug [DONE] | 4. Curate/Record Complete 44 ISL Video Clips    |
| 5. Patient Kiosk 1-Tap Interp UX [DONE]| 5. Encode H.264/AAC & Place in public/videos/   |
| 6. Doctor Station QR Tablet Pair [DONE]| 6. Upload Clips to Supabase Storage 'isl-clips' |
| 7. 60s Fallback Escalation Timer [DONE]| 7. Camera Privacy Shutter & Landmarker Overlay  |
| 8. Interpreter Audio Chime Alarm [DONE]|                                                 |
+------------------------------------+--------------------------------------------------+
* Note: Teammate 2 is independently developing the P2 AI Sign Video Fallback pipeline.
```

---

## 3. Detailed Tasks for VIBHAV (Full-Stack, Realtime & UX) - ALL COMPLETED (Commit bf1d181)

### Task A1: Fix Middleware & Demo Mode Auth Bypass [COMPLETED]
- **Files:** `lib/supabase/middleware.ts`, `proxy.ts`, `app/auth/hospital/page.tsx`, `app/auth/interpreter/page.tsx`, `app/auth/callback/route.ts`
- **Current behavior:** Staff and interpreter portals require the matching profile role. Patient tablets require a session pairing cookie. `NEXT_PUBLIC_DEMO_MODE=true` only displays evaluation credential helpers.

### Task A2: Synchronize Demo Session IDs [COMPLETED]
- **File:** `app/login/page.tsx`
- **Status:** Verified. All demo launcher buttons ("1. Open Patient Tablet Kiosk", "2. Open Staff Station", "3. Open Interpreter Portal") route to the canonical shared session ID: `demo-session`.

### Task A3: Fix Realtime Signaling & Channel Teardown [COMPLETED]
- **Files:** `hooks/use-session-realtime.ts`, `app/interpreter/dashboard/page.tsx`
- **Status:** Verified. Replaced premature synchronous `bc.close()` with delayed cleanup (`setTimeout(..., 3000)`), ensuring IPC messages are dispatched across all tabs.

### Task A4: Fix PostgreSQL UUID Slug Syntax in Events API [COMPLETED]
- **File:** `app/api/session/[id]/events/route.ts`
- **Status:** Verified. Wrapped session ID with `toValidSessionUuid(id)` in both `GET` and `POST`. Tested via curl, returns 200 OK.

### Task A5: Patient Tablet Kiosk UX & Dedicated Interpreter Button [COMPLETED]
- **File:** `app/patient/[sessionId]/page.tsx`
- **Status:** Verified. Added 1-tap **"🤟 Request Live ISL Interpreter / अनुवादक बुलाएं"** card and header button. Added "Nurse Station Online" status pill. Removed auto-play of missing video files on P0 taps.

### Task A6: Doctor Station QR Code Bedside Pairing [COMPLETED]
- **File:** `app/dashboard/[sessionId]/page.tsx`
- **Status:** Verified. Added "Pair Bedside Tablet" button opening a modal with a locally generated QR code with a five-minute, one-use pairing link. The tablet exchanges the secret for an httpOnly session cookie.

### Task A7: 60-Second Auto-Fallback Escalation Timer [COMPLETED]
- **File:** `app/dashboard/[sessionId]/page.tsx`
- **Status:** Verified. When interpreter is paged, a 60s countdown banner runs on clinician monitor. Escalation triggers fallback recommendations if unaccepted.

### Task A8: Interpreter Portal Audio-Visual Ring Chime [COMPLETED]
- **File:** `app/interpreter/dashboard/page.tsx`
- **Status:** Verified. Web Audio chime (853Hz + 960Hz) sounds upon incoming emergency call, with one-click acceptance routing into `/interpreter/call/[sessionId]`.

---

## 4. Detailed Tasks for TEJAS (Vision AI & ISL Video Media)

> **IMPORTANT:** Our backend fuzzy-match router (`lib/isl-clips.ts`), seed definitions (`lib/seed-clips.ts`), and Supabase PostgreSQL table (`public.isl_clips`) **already support all 44 phrases across all 7 categories**. Your task is to provide the actual video files and build the MediaPipe gesture recognizer.

### Task B1: The Complete ISL Video Clips Library (44 Phrases)
- **Target Folders:** `public/videos/*.mp4` AND Supabase Storage bucket `isl-clips`
- **Specifications:**
  - Video format: **MP4 (H.264 video, AAC audio)**.
  - Resolution: 720p (1280x720) or 1080p, 15–30 seconds each, well-lit, plain/neutral background.
  - Filename format: Exact lowercase slug matching `storage_path` in `lib/seed-clips.ts` (e.g. `chest-pain.mp4`).
  - Sourcing: Record a team member performing the signs, OR source from open ISL datasets (**INCLUDE dataset**, **ISLRTC videos**).

#### Complete Master Phrase List to Provide:

| Category | Filename (`storage_path`) | English Label | Hindi Text | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Emergency** | `chest-pain.mp4` | Chest pain | सीने में दर्द | P0 |
| **Emergency** | `cant-breathe.mp4` | Can't breathe | साँस लेने में तकलीफ़ | P0 |
| **Emergency** | `im-dizzy.mp4` | I'm dizzy | चक्कर आ रहे हैं | P0 |
| **Emergency** | `feel-very-sick.mp4` | I feel very sick | बहुत बीमार महसूस कर रहा हूँ | P0 |
| **Emergency** | `call-doctor-now.mp4` | Call doctor now | डॉक्टर को तुरंत बुलाएं | P0 |
| **Emergency** | `emergency.mp4` | Emergency | आपातकालीन | P0 |
| **Emergency** | `help-me.mp4` | Help me | मेरी मदद करो | P0 |
| **Pain** | `pain-level.mp4` | Pain level 1-10 | दर्द का स्तर (१-१०) | P0 |
| **Pain** | `head-hurts.mp4` | My head hurts | सिर दर्द | P0 |
| **Pain** | `stomach-hurts.mp4` | My stomach hurts | पेट दर्द | P0 |
| **Pain** | `chest-hurts.mp4` | My chest hurts | छाती में दर्द | P0 |
| **Pain** | `back-hurts.mp4` | My back hurts | पीठ दर्द | P0 |
| **Pain** | `pain-started-now.mp4` | Pain started now | दर्द अभी शुरू हुआ | P0 |
| **Allergies** | `i-have-allergy.mp4` | I have allergy | एलर्जी है | P0 |
| **Allergies** | `allergic-penicillin.mp4` | Allergic to penicillin | पेनिसिलिन एलर्जी | P0 |
| **Allergies** | `allergic-aspirin.mp4` | Allergic to aspirin | एस्पिरिन एलर्जी | P0 |
| **Allergies** | `allergic-latex.mp4` | Allergic to latex | लेटेक्स एलर्जी | P0 |
| **Allergies** | `no-known-allergy.mp4` | No known allergy | कोई एलर्जी नहीं | P0 |
| **Basic needs** | `water.mp4` | Water | पानी | P1 |
| **Basic needs** | `toilet.mp4` | Toilet | शौचालय | P1 |
| **Basic needs** | `cold.mp4` | Cold | ठंड लग रही है | P1 |
| **Basic needs** | `hot.mp4` | Hot | गर्मी लग रही है | P1 |
| **Basic needs** | `blanket.mp4` | Blanket | कंबल चाहिए | P1 |
| **Basic needs** | `hungry.mp4` | Hungry | भूख लगी है | P1 |
| **Basic needs** | `nausea.mp4` | Nausea | जी घबराना | P1 |
| **Basic needs** | `vomit.mp4` | Vomit | उल्टी | P1 |
| **Medical history** | `diabetic.mp4` | Diabetic | मधुमेह / शुगर | P1 |
| **Medical history** | `heart-condition.mp4` | Heart condition | दिल की बीमारी | P1 |
| **Medical history** | `high-blood-pressure.mp4` | High blood pressure | उच्च रक्तचाप / बीपी | P1 |
| **Medical history** | `pregnant.mp4` | Pregnant | गर्भवती | P1 |
| **Medical history** | `surgery-before.mp4` | Surgery before | पहले ऑपरेशन हुआ है | P1 |
| **Medical history** | `blood-type.mp4` | Blood type | रक्त समूह | P1 |
| **Doctor -> patient** | `you-are-safe.mp4` | You are safe | आप सुरक्षित हैं | P1 |
| **Doctor -> patient** | `we-are-helping.mp4` | We are helping you | हम आपकी मदद कर रहे हैं | P1 |
| **Doctor -> patient** | `do-you-understand.mp4` | Do you understand? | क्या आप समझ रहे हैं? | P1 |
| **Doctor -> patient** | `take-medicine.mp4` | Take this medicine | यह दवाई लीजिए | P1 |
| **Doctor -> patient** | `stay-still.mp4` | Stay still | शांत / स्थिर रहिए | P1 |
| **Doctor -> patient** | `relax.mp4` | Relax | शांत हो जाइए | P1 |
| **Doctor -> patient** | `good.mp4` | Good | अच्छा | P1 |
| **Consent** | `do-you-agree.mp4` | Do you agree? | क्या आप सहमत हैं? | P2 |
| **Consent** | `sign-here.mp4` | Sign here | यहाँ हस्ताक्षर करें | P2 |
| **Consent** | `need-to-do-test.mp4` | We need to do a test | हमें एक जांच करनी होगी | P2 |
| **Consent** | `this-will-help.mp4` | This will help you | इससे आपको आराम मिलेगा | P2 |
| **Consent** | `family-here.mp4` | Do you have family here? | क्या आपके परिजन यहाँ हैं? | P2 |

---

### Task B2: MediaPipe Tasks Vision Hand Gesture Tracker (Phase 2 / P3)
- **Files to Create/Edit:** `components/vision-gesture-camera.tsx`, `app/patient/[sessionId]/page.tsx`
- **Package to Use:** `@mediapipe/tasks-vision`
- **Actions:**
  1. Create `components/vision-gesture-camera.tsx` rendering the patient tablet front camera.
  2. Initialize `@mediapipe/tasks-vision` `HandLandmarker` in WebAssembly (client-side, 30 FPS).
  3. Detect 21 3D hand landmarks in real time (wrist, thumb, index, middle, ring, pinky).
  4. Render skeleton overlays on `<canvas>` over the camera preview.

### Task B3: Rule-Based / Heuristic Gesture Classifier
- **File to Create:** `lib/gesture-classifier.ts`
- **Actions:**
  1. Implement geometric heuristic rules:
     - **Help Me / Emergency**: Open palm held up, fingers spread, waving or steady.
     - **Chest Pain**: Clenched fist held against torso/chest region.
     - **Yes / Agree**: Thumbs up.
     - **No / Disagree**: Index finger wagging or flat palm waving side-to-side.
     - **Pain Level 1 to 5**: Extended finger count (1 to 5 fingers).
  2. Include an 800ms debounce filter to prevent accidental triggers.

### Task B4: Stream Detected Gestures to Realtime Pipeline
- **File:** Integrate with `hooks/use-session-realtime.ts`
- **Actions:**
  1. When confidence > 80%, broadcast `REALTIME_EVENTS.GESTURE_TEXT`:
     ```typescript
     broadcastChannelRef.current?.postMessage({
       type: REALTIME_EVENTS.GESTURE_TEXT,
       payload: {
         text: 'Chest Pain',
         confidence: 0.92,
         timestamp: new Date().toISOString(),
       }
     })
     ```
  2. Post to `/api/patient/[sessionId]/events` with `eventType: 'gesture_text'`.
  3. The Doctor Station's Live Transcript Feed will display the recognized sign in real time.

---

## 5. Verification Checklist Before Final Submission

- [ ] Run `bun run lint` (0 errors).
- [ ] Run `bun run build` (Next.js 16 compiles cleanly).
- [ ] Multi-tab test:
  1. Tab 1: `http://localhost:3000/patient/demo-session`
  2. Tab 2: `http://localhost:3000/dashboard/demo-session`
  3. Tab 3: `http://localhost:3000/interpreter/dashboard`
  4. Tap "Chest Pain" on Tab 1 $\rightarrow$ Tab 2 sounds audio chime and flashes red alert banner.
  5. Tap "Request Interpreter" on Tab 1 $\rightarrow$ Tab 3 rings with incoming call.
  6. Click "Accept Call & Join Video" on Tab 3 $\rightarrow$ LiveKit WebRTC 2-party video connects Tab 1 & Tab 3.
  7. Clinician types "take medicine" on Tab 2 $\rightarrow$ Tab 1 plays `take-medicine.mp4`.
  8. Patient makes gesture on Tab 1 camera $\rightarrow$ Tab 2 transcript displays detected sign text.
