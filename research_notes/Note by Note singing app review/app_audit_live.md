# Note by Note: live UX walkthrough with synthetic voices

Date: 30 Sep 2026. App version string: "Note by Note 1.0" (commit 8809b46).
Screenshots: `research_notes/Note by Note singing app review/screenshots/` (124 PNGs, 780x1688 = 390x844 @2x; `dark-*` = dark mode).

---

## 1. How this was tested

| Item | Setup |
|---|---|
| Server | `python3 -m http.server 8765` on the repo (no changes to repo files) |
| Browser | Playwright 1.56.1 with the pre-installed Chromium 141 (headless shell) |
| Device emulation | 390x844 viewport, deviceScaleFactor 2, `isMobile`, `hasTouch`, iPhone Safari UA, light and dark `colorScheme` |
| Microphone | `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`, mic permission granted. A fresh browser was launched for each audio file. |
| Fonts | Google Fonts are fetched through curl and fulfilled by a Playwright route, so screenshots show the real Figtree and Young Serif type (the sandbox proxy blocked Chromium's own request). |
| Instrumentation | An init script wraps `AudioContext` (to read `currentTime`) and taps the mic source with a ScriptProcessor to log onsets. A per-frame recorder logs `window.__nbn.probe()`, the cue, the big note readout and the cents text. The results-sheet text and the "Copy results for Claude" clipboard text were also saved. |

**Synthetic singer.** Each WAV was 48 kHz, 16-bit mono:
- **Source:** harmonic-rich, up to 30 harmonics below 5 kHz, weighted with "ah"-like formants at 800, 1200 and 2600 Hz.
- **Vibrato:** 5.5 Hz. It starts 0.3 s into the note and is off for notes shorter than 0.8 s.
- **Drift:** slow random wander of about ±3 cents.
- **Envelope:** 40 ms attack and 60 ms release.
- **Room noise:** a -64 dBFS floor.
- **Timing:** by default the singer starts 60 ms late and releases 50 ms early.
- **Notes:** the timeline was built by importing the app's own `js/lessons.js` and `js/songs.js`. For the echo game, `Math.random` used the same seed in Node and in the page. So the "singer" sings exactly the notes and times the app expects.

**Alignment check.** Capture starts about 15 ms after `createMediaStreamSource`, and the app sets `T0` to mic start + 2.400 s. Each WAV started with a 2.385 s lead. The first measured voice onset landed within about 5 ms of its planned time. Warmup steps 2 to 4 started within about 5 ms of the predicted time, which confirms the "between" timing of 0.35 + 4 + 2.4 s.

**Scenarios run.** About 30 full lesson or song runs, 4 range tests, free sing, settings, navigation, interruption, clipboard fallback, mic-blocked handling, dark mode and a small-phone (375x667) layout. The scripts are in the session scratchpad (`live-audit/`). They are not in the repo.

---

## 2. Detection and scoring results (synthetic audio)

All runs used range A3 to D5 unless noted, strictness Standard (in tune within 30 cents), headphones off. "Heard" is the app's own "mic heard me for X% of the singing time".

| Scenario (screenshot) | Singer | Score / verdict | Landed | Avg miss | 3rd tile | Heard | Tip shown |
|---|---|---|---|---|---|---|---|
| Match, correct (`16`) | ±20c vibrato | **97% Spot on** | 6/6 | 11¢ | Centred | 97% | "That was accurate. Switch to Strict…" |
| Match, 30c flat (`50`, `51`) | -30c, ±20c vib | **74% Nicely done** | 6/6 | 30¢ | 30¢ flat | 97% | "About 30 cents flat. Think of each note as slightly higher…" (correct) |
| Match, 30c flat, Relaxed (`59f`) | same | 98% Spot on | 6/6 | 30¢ | 30¢ flat | 98% | flat tip (the "Spot on" headline contradicts it) |
| Match, octave below (`56`, `57`) | -12 st, ±20c | 97% Spot on | 6/6 | 11¢ | Centred | 97% | "You sang most notes an octave away… That still counts." (correct) |
| Match, wide vibrato (`58a`, `58`) | ±50c vib, centred | **73% Nicely done** | 6/6 | 27¢ | Centred | 97% | **"Aim to land each note sooner"** (wrong cause; the onset was 50 ms) |
| Match, Strict (`59e`) | ±20c vib | 79% Nicely done | 6/6 | 11¢ | Centred | 97% | "Aim to land each note sooner" (wrong cause) |
| Match, late + scooped (`59b`) | 400 ms late, 80c scoop | 89% Spot on | 6/6 | 12¢ | Centred | 90% | "You found the notes, but late…" (correct, onset 403 ms) |
| Match, voice + room noise (`59`) | ±20c + noise at -32 dBFS | 97% Spot on | 6/6 | 11¢ | Centred | 97% | accurate |
| Match, low voice A2 to D4 (`59c`, `59d`) | ±20c | 97% Spot on | 6/6 | 11¢ | Centred | 97% | accurate (detection fine at about 140 to 220 Hz) |
| Match, silence (`52`, `53`) | -64 dBFS floor only | 0% Keep practising | 0/6 | – | – | 0% | "The mic lost you… Sing a little louder" |
| Match, noise only (`54a`, `54`, `55`) | pink noise at -26 dBFS | 0% Keep practising | 0/6 | – | – | 0% | same. **No false pitches were ever shown**, so the gating is robust. |
| Hold, ±20c vibrato (`20`, `21`) | 4, 6 and 8 s holds | 99% Spot on | 3/3 | 11¢ | 100% steady | 99% | accurate |
| Hold, ±50c vibrato (`22a`, `22`) | same | **72% Nicely done** | 3/3 | 29¢ | **35% held steady** | 99% | **"Your long notes wobbled. Breathe low into your belly…"** (healthy vibrato labelled a fault) |
| Full scale (`23`, `24`) | ±15c, 40c scoop | 87% Spot on | 30/30 | 2¢ | Centred | 87% | accurate |
| Five-note, letters / solfa (`38`, `36`) | ±15c | 87% Spot on / **85% Nicely done** | 36/36 | 2¢ | Centred | 87% / 85% | the same performance got a different verdict and tip |
| Leaps (`25`, `26`) | 60c scoop, 100 ms late | 90% Spot on | 30/30 | 4¢ | Centred | 90% | accurate |
| Echo game (`27`, `28`) | ±15c | 89% Spot on | 28/28 | 4¢ | Centred | 89% | accurate |
| Sirens (`29c`, `29d`) | exact glides | 96% Spot on | 6/6 | 15¢ | Centred | 96% | accurate |
| **Short and sharp, realistic staccato** (`29e`, `29f`) | about 160 ms per note | **61% Getting there** | 15/15 | 0¢ | Centred | 61% | "Aim to land each note sooner" |
| **Short and sharp, crisp staccato** | about 100 ms per note | **22% Keep practising** | **0/15** | 0¢ | Centred | 22% | **"The mic lost you… Sing a little louder"** |
| **Short and sharp, sung legato** (`29g`) | full 300 ms per note | **92% Spot on** | 15/15 | 0¢ | Centred | 92% | "That was accurate" |
| Daily warmup, 4 parts (`30`–`33`) | ±20c | 89% Spot on | 64/64 | 9¢ | 100% steady | 90% | accurate |
| Twinkle, line by line (`40`–`43`) | ±15c, 30c scoop | 86% Spot on | 42/42 | 2¢ | Centred | 86% | accurate |
| Mary, sing it through (`44`–`46`) | ±15c, 30c scoop | 86% Spot on | 26/26 | 3¢ | Centred | 86% | accurate |
| Mary, no gaps and no scoops | exact | 94% Spot on | 26/26 | 0¢ | Centred | 94% | accurate |
| Waltzing Matilda, sing it through (`47`–`49`) | ±15c, 40c scoop, 80 ms late | **77% Nicely done** | 91/91 | 6¢ | Centred | 78% | **"Aim to land each note sooner"** |
| Mary with the wrong notes (a Match WAV played into the song) (`19`) | pitches several semitones off | 0% Keep practising | 0/26 | 387¢ | 61¢ sharp | – | **"On average you sat about 61 cents sharp. Relax your jaw…"** (these were wrong notes, not a sharp tendency) |

**What the numbers say**
- **Detection is excellent on clean, voice-like tones.** Free sing and calibration showed readings within ±1 cent. Octaves were folded correctly. Noise never produced a false pitch. Low voices (about 110 Hz) worked. Latency compensation lined up to within one frame.
- **The headline score mostly tracks "voiced coverage", not tuning.** For every accurate singer, score ≈ heard %: scale 87/87, Matilda 77/78, staccato 61/61. After a 0.2 s grace period, every unvoiced frame inside a note counts as a miss. Normal releases, breaths and consonants between short notes therefore cost 6 to 25 points. Fast songs and staccato suffer most.
- **Vibrato is treated as error.** Standard tolerance is ±30c "good" and ±60c "near". The hold "steadiness" metric counts frames within ±25c of the median. Classical and trained vibrato is often ±50 to 100 cents. At ±50c the app reports a 27 to 29¢ average miss, 35% steady and "wobbled". In the range test, ±60c vibrato cannot finish at all (see §3.3).
- **The tips pick the wrong cause** whenever the fault is not flatness, sharpness, octave or coverage. They fall through to "aim to land each note sooner" even when onsets were 36 to 64 ms.

---

## 3. Screen by screen

### 3.1 First run / home (`01`, `02`, `dark-01`, `dark-02`)
- **What you see.** Brand masthead with a settings cog. Then a "Your voice" card: "Start by finding your range", a primary **Find my range** button, and two presets, "Lower voice (Most men)" and "Higher voice (Most women and children)". Below that are the Daily warmup card with a 56 px play button and a Mon–Sun week strip, a Free sing row, three units with 13 numbered lessons, 8 songs with difficulty and credits, and a privacy footer.
- **Clarity.** The copy is short and friendly, and the first action is obvious. Each lesson has a small contour glyph, which is a nice touch.
- **Friction:**
  - The full curriculum (13 lessons and 8 songs) is visible and unlocked from the start. After the range is set, nothing says what to do next: no "Continue: lesson 2" and no recommended path. The numbering suggests an order but does not enforce or guide it.
  - "Find your range" appears twice: in the hero card and as lesson 1.
  - The Daily warmup is offered before a range exists. Tapping it opens the range sheet, which is fine.
  - "Practise today to start a streak" is a small, low-key nudge.
- The streak and week dots render well (`09d`). Progress badges show the best %: green if 60% or more, grey otherwise.

### 3.2 "First, find your range" sheet (`03`)
- Opens when you tap any lesson or song without a range. It explains why ("Every lesson moves into your key") and offers the test or the presets. After the test is saved, the lesson you originally tapped opens directly (`09`), which is good.
- "It takes about a minute" is accurate: the singing takes about 8 s, plus reading time.

### 3.3 Range test (`04`, `06`, `07`, `07b`, `08`, `08b`, `08c-*`, `dark-04`…`dark-08b`)
- **Flow.** The intro reads: "You'll sing a comfortable low note, then a comfortable high note. Hold each one until the bar fills." Step 1 asks for "a comfortable low note on 'ah'… Low, but not growly." A thin 8 px green bar at the bottom of the lane fills after about 1.2 s of stable pitch. The step 2 cue reads "Low note: G3. Now a comfortable high note… Not a squeak." A red dashed "Low G3" marker stays on the lane (`07`). The result sheet (`08`) shows "G3 to E5", "Closest voice type: Mezzo-soprano. That's an octave and a sixth", a keyboard, −/+ nudges and a "tap a note to hear it" hint.
- **Measured.** With steady ±20c or ±45c vibrato the test finished in **7.6 to 7.9 s** and read the pitches exactly. With room noise at -30 dBFS it also finished in 7.6 s (`08c-range-result-noisy`).
- **Bug / serious friction: wide vibrato never completes.** With ±60c vibrato (`08c-range-test-vib60-stuck`) the hold bar peaked at 38%. It stayed on step 1 for 25 s, and no message said why. The stability rule requires 85% of voiced frames within ±50c of the median over the last 0.5 s. Classically trained singers, and many adults singing loudly, will be stuck. The only way out is "Skip and pick a typical range".
- **Wording and jargon:**
  - The readout shows "194 Hz" under the note name. Hz means little to beginners.
  - The cue during singing does not repeat "hold until the green bar fills", and the bar is thin and sits at the very bottom of the lane.
- **Pedagogy concern.** The test samples one "comfortable" note at each end, and that range keys every lesson. A timid beginner will give a narrow range, and there is no gentle slide or "go a bit further?" probe. The voice-type label is computed from the midpoint of the two comfortable notes and shown prominently. That is not a sound basis for classification, and it may mislabel people.
- **Result sheet:**
  - The −/+ buttons are 36x36 px and the note buttons are 66x36 px, below the 44 px guideline.
  - The note buttons ("G3", "E5") do not look tappable, though a hint line explains them.
  - Nudging uses sharps (D♯5) while lessons in the same key use flats.
  - The sheet cannot be dismissed without choosing, which is appropriate.

### 3.4 Microphone permission (`05`, `70`, `70b`, `71`, `72`, `73`)
- **Pre-permission sheet (`05`):** "Turn on the microphone… Nothing is recorded or sent anywhere", plus a Silent-mode tip. This is clear and reassuring. The button changes to "Waiting for permission…" while the prompt is up (`70b`).
- **Blocked** (a `NotAllowedError` was simulated with an init script, because headless Chromium cannot show a real deny) (`71-mic-blocked-sheet-NotAllowedError`):
  - The sheet says "In Safari, tap **aA** in the address bar, then Website Settings…". The README tells users to **Add to Home Screen**, and in that standalone mode there is no address bar, so these steps can't be followed. They also don't apply to Chrome or Android.
  - The body says "Then tap Start again", but the button is labelled "Try again".
  - "Try again" just shows the same sheet again.
  - The range test hits the same sheet.
- **Other failure** (`72-mic-didnt-start-sheet-headless-NotSupportedError`). Real headless Chromium without the fake UI throws `NotSupportedError`. The app shows "The microphone didn't start. Another app may be using it…", a sensible generic fallback. This case is environment-specific.
- "Not now" and a backdrop tap both close the sheet and return to the ready state with "Tap Start to begin" (`73`). No dead ends.

### 3.5 Lesson player, general (`10`–`15`, `12`, `13`, `dark-10`, `dark-12`, `dark-14`)
- **Layout:**
  - Header: close X, title, a subtitle such as "Note 1 of 6 · on 'ah'", and a headphones icon button. The icon has no visible label, so its meaning is unclear until it is tapped (`65`).
  - Cue line.
  - Pitch lane: rows labelled at the left, a playhead line at 30% of the width, and target bars scrolling right to left.
  - Readout: a large note name, a cents text and a level meter.
  - A full-width Start/Stop button.
- **Sequence:**
  - "Get ready" with a big 3-2-1 overlay (`11`).
  - "Listen": a dashed guide bar crosses the line while the note plays (`12`).
  - "Breathe in…" with a tick (`13`).
  - "Your turn: sing on 'ah'". The solid bar fills with its scale-degree colour as you hit it, your pitch draws as a black trace, and a coloured dot sits at the playhead (`14`).
- **What works.** The lane is clean and legible for single notes. Seeing the trace sit inside the bar is intuitive. The "fill as you hit it" reward feels good (`14`, `15`).
- **Friction and wording:**
  - During "Listen" the readout says **"Listening…"**. That is the mic status, but it reads as an instruction and clashes with the cue (`12`, `32`, `42`).
  - The cents text updates every frame with no smoothing. With the 30c-flat singer it changed **471 times in about 18 s of singing (about 26 per second)**, flipping between "In tune" and "31¢…49¢ flat" (`50`). It is hard to read while singing.
  - Being close but not in tune shows as striped half-opacity fill plus a yellow dot (`50`, `dark-14`). There is no arrow or "go higher / go lower" hint, so users must read the small gap between trace and bar centre.
  - **The "near" colour is identical to the "mi" degree colour** (`#e0a500` light, `#ffd43b` dark). On any "mi" note, a near-miss dot looks exactly like an in-tune dot.
  - For an octave-displaced singer (`56`), the readout shows "D♭3" and "In tune" while the bar says D♭4. The only hint is a small "8vb" tag that overlaps the bar border. "8vb" is notation jargon.
  - Bar labels are clipped at the lane edge ("♭4", "D♭") and on short bars ("A♭‹" in `29e`). In songs the pitch trace runs through the syllable text ("lamb," struck through in `45`).
  - The count-in (3-2-1) suggests you will sing on "go", but the first thing that happens is "Listen" (`11` then `12`).
  - "Nicely done" appears as the end-of-step cue for every run, including a 0% silent run, before the verdict replaces it.
- **In-lesson silence handling.** With a silent or noise-only mic, all six notes play out over 45 s with "Listening…" and no hint that nothing is being heard. The failure appears only on the results sheet (`52`, `54`).

### 3.6 Match a note (`10`–`17`, `50`–`59f`)
- The intro "You'll hear a note. When its bar reaches the line, sing it back on 'ah'" is clear. Each note is 2 s listen, 1 beat breath and 3 s sing. With range A3 to D5 the tonic lands on D♭4, so labels read D♭4, G♭4, A♭4 and so on, which is a flat-heavy spelling for beginners.
- Detection and scoring are summarised in §2. The correct, octave, noise and flat cases behaved sensibly. Wide vibrato and Strict produced the wrong tip.

### 3.7 Hold it steady / Longer holds (`20`, `21`, `22`, `22a`)
- The cue counts down ("Hold it · 4 … 1"), which is helpful. The trace shows vibrato clearly.
- ±50c vibrato gives "35% held steady" and "Your long notes wobbled. Breathe low into your belly…" (`22`). That is the wrong coaching for a healthy, regular vibrato. The app cannot tell periodic vibrato (fine) from slow drift or irregular wobble (a real problem).
- In the results overview (`22`) the dense trace hides the coloured bars, so the replay mostly looks like a dark smudge.

### 3.8 Scales with several keys (Five-note, Full scale, Steps, Leaps, Arpeggios, Minor, Short and sharp, warmup parts) (`23`, `34`, `35`, `35b`, `37`, `37b`)
- **Bug: labels, colours and solfa stay in the first key.** `modelFor(step)` uses `step.tonic`, which is only the first key of the ladder.
  - In key 2 of the five-note scale (C♯ major) in Do-Re-Mi mode, the bars read **"fa, fi, le"** where the singer is on mi, fa, sol (`35`). The row labels still show C-major do…ti.
  - Scale-degree colours are wrong: F, the "mi" of C♯, is green (fa), and D♯ is yellow (`35`, `37b`).
  - In letter mode, the new key's notes sit on unlabelled rows between the labelled C-major rows (`37b`).
  - The Copy-for-Claude text spells D♭ major as "C♯4, D♯4, F4, F♯4, G♯4".
  - This affects every multi-key exercise and the warmup scale and arpeggio. For a solfa learner it teaches the wrong syllables.
- The key ladder itself ("Key 2 of 4", each round a semitone higher) works, and the audio timing lines up.

### 3.9 Leaps, Arpeggios, Echo game (`25`, `25a`, `26`, `27`, `27a`, `28`)
- They work and score 89 to 90% for an accurate, slightly scooping singer.
- The echo game's blurb says "A new set of short tunes every time". In practice the plan is built once when the lesson opens. "Try again" replays the identical tunes, and only reopening makes new ones. Replaying the same tunes may be useful, but it contradicts the copy.

### 3.10 Sirens (`29a`–`29d`)
- The glide is drawn as a thick band and fills yellow when followed (`29c`). The cue reads "Your turn: slide with it". This is clear, and it scored 96%.
- In the results overview, glide hits are never coloured (the `drawOverview` code skips hits for glides), so a perfect siren looks grey (`33`).
- The lesson asks for "ng" or a lip trill. A real lip trill was not tested (see §6).

### 3.11 Short and sharp (staccato) (`29e`, `29f`, `29g`)
- **Scoring contradicts the lesson.** The lesson says "Short, bouncy notes… then stop cleanly", but each note is scored across its whole 300 ms bar.
  - Crisp 100 ms staccato: **22%, "Keep practising", 0/15 landed, "The mic lost you… sing louder"**.
  - 160 ms: 61% "Getting there".
  - Singing each note legato for the full length: **92% "Spot on"**.
- **The cue flickers.** It alternates "Breathe in…" and "Your turn" between every staccato note, five times per pattern at about 3 per second (`29e` shows "Breathe in…" mid-pattern). The cue is an `aria-live` region, so a screen reader would announce each change.
- This is the last lesson, so the results show "Done" instead of "Next".

### 3.12 Daily warmup (`30`, `31`, `32`, `32b`, `32c`, `33`)
- Four parts: Sirens, Five-note scale, Arpeggio, Long notes. The real length was about 3 min 13 s, which matches "About three minutes".
- A between-parts card (`32`) shows "Up next · Five-note scale", the intro, a 4-second countdown and a "Start now" button. The subtitle behind it still reads "Sirens · 1 of 4 · Slide 3 of 3…".
- On the results screen the subtitle overflows and is truncated: "Long notes · 4 of 4 · 8 seconds · 2 of 2 · on “…" (`33`).
- The warmup scored 89% with 100% steady.
- The multi-key labelling bug (§3.8) affects the scale and arpeggio parts.
- **Interruption.** Losing focus (a simulated `visibilitychange`, e.g. a notification or app switch) stops the run and discards all progress: "Stopped because the app lost focus. Tap Start to go again." (`66`). For a 3-minute warmup there is no resume and no partial result.

### 3.13 Songs (`40`–`49`, `90`, `dark-40`)
- **Line by line** (Twinkle, `40`–`43`). You hear each line (dashed bars plus piano), get two ticks, then sing it. Syllables are printed on the bars, and the lyric line underlines the current syllable. This works well, and the lyrics make the lane much friendlier. It scored 86%.
- **Sing it through** (Mary, `44`–`46`; Matilda, `47`–`49`):
  - There is a double count-in: first the visual 3-2-1 "Get ready", then a bar of audible clicks under "Breathe in…".
  - Without headphones there is no melody guide, only soft piano. This is stated in the intro and is fine for well-known songs.
  - The cue is "Your turn" for the whole song. Line progress appears only in the subtitle.
- **Fast songs are under-scored.** Matilda scored **77% "Nicely done"** with 91/91 notes landed and a 6¢ average miss, and the tip was "aim to land each note sooner". The coverage rule (§2) penalises the natural gaps between eighth notes.
- The mode switch ("Line by line / Sing it through") stays visible but greyed while running. Its segments are 38 px tall.
- **Small phone (375x667, `90`).** Matilda's 17-semitone span squeezes the bars below the 13 px label threshold, so syllables disappear from the bars. The lyric line below remains.

### 3.14 Results sheet and "Copy results for Claude" (`16`, `17`, `19`, `21`, `22`, `24`, `26`, `28`, `29d`, `29f`, `33`, `36`, `38`, `43`, `46`, `49`, `51`, `53`, `55`, `57`, `58`, `59*`)
- **What you see:**
  - The lesson name and a big % score with a verdict (Spot on / Nicely done / Getting there / Keep practising).
  - Three tiles: notes landed, average miss (¢), and overall lean or held steady.
  - A replay overview of the whole run.
  - A one-line tip.
  - "Try again" and "Next: <lesson>" buttons.
  - "Copy results for Claude".
- **Good.** It is compact and readable. "Centred / 30¢ flat" is a genuinely useful coaching number, and the flat and late tips are accurate.
- **Friction:**
  - **The primary (dark) button is always "Next"**, even at 0% with nothing heard (`53`, `55`). "Try again" is secondary.
  - **Runs where nothing was heard still count.** The progress entry is written at 0%, and per `store.record()` the day counts toward the streak.
  - "Average miss" mixes vibrato extent with error (27 to 29¢ for a perfectly centred ±50c singer).
  - The verdict boundary at 85% is fragile: identical synthetic performances got "Spot on" at 87% and "Nicely done" at 85% (`38` vs `36`).
  - The tip can be confidently wrong: "61 cents sharp, relax your jaw" for wrong notes (`19`), and "land each note sooner" for vibrato, Strict mode or fast songs.
  - The overview canvas is small and has no axis. Wide-vibrato traces cover the bars (`22`), and glides are never coloured (`33`).
- **Copy for Claude (`17`).**
  - It worked, and the button changed to "Copied. Paste it into a chat with Claude." The text is well structured: range, voice type, strictness, score, average distance, lean, coverage, onset, steadiness, a per-note line, and a closing question.
  - Small issues: it says "overall lean: 0 cents sharp" when centred; octave-away notes aren't flagged per note; and the enharmonic spellings in later keys are wrong.
  - When the Clipboard API rejects, a read-only, pre-selected textarea replaces the button (`19`). This fallback works.

### 3.15 Settings (`61`, `62`, `64`, `91`, `dark-61`)
- **Sections:**
  - Headphones switch, with a clear explanation including the Bluetooth caveat.
  - Note names: C D E / Do Re Mi.
  - How strict: Relaxed / Standard / Strict, with a cents explanation.
  - Your range, with Retest.
  - Progress Reset, which uses tap-to-confirm ("Tap to confirm", `64`).
  - About line and Done.
- **Friction:**
  - At 390x844 the sheet is 795 px tall in a 760 px box, so **Done is partly cut off** (`61`). On 375x667 it is 195 px below the fold (`91`).
  - The switch is 52x32, the segments are 38 px tall and Retest/Reset are 36 px tall, all under 44 px.
  - The Reset label is 4.5:1, right at the contrast minimum.

### 3.16 Headphones toggle in the player (`65`)
- The toggle gives immediate feedback in the cue: "Headphones on: you'll hear the guide while you sing." It is good that you can change it in context, but the header icon on its own isn't self-explanatory.

### 3.17 Free sing (`60a`, `60`, `60b`, `dark-60`, `dark-60b`)
- It works: a live trace with note names and "±N¢ from X".
- Near a quarter-tone boundary the readout flips between neighbour names ("A♯3 −47¢ from A♯3" and "A3 +xx¢").
- The playhead is fixed at 30% of the width, so the trace fills only the left third and **the right 70% of the lane stays empty** (`60`).

### 3.18 Navigation and state
- Close (X) and the browser back button during a lesson both return home cleanly.
- Stop resets to the ready state.
- Aborted runs are not recorded, which is correct.
- "Next" swaps to the next item without growing history, and X from there returns home (`09e`).

### 3.19 Dark mode (`dark-*`)
- The theme is consistent and good. The degree colours are brightened, lane labels are 4.0:1 and the "on-colour" labels are readable (`dark-14`, `dark-16`).
- Dark mode has no issues of its own. The light-mode issues (near colour equals mi, readout flicker and so on) are the same.

---

## 4. Console errors, warnings and network

- **App console: none.** No errors, warnings or uncaught exceptions in any of the ~35 sessions. The only warning was "ScriptProcessorNode is deprecated", which came from my test instrumentation, not the app.
- **Failed requests.** Only `fonts.googleapis.com` before I routed fonts through curl (`net::ERR_TOO_MANY_RETRIES` from the sandbox proxy). This is environmental.
  - Note: the webfonts load from Google at runtime. On a first launch offline, or on a network that blocks Google, the app falls back to system fonts.
  - The service worker caches the fonts after the first online load. It registers only on https, so it was not exercised on localhost.
- **No HTTP 4xx or 5xx** from the app's own assets.
- One code-level warning path exists (`songData` warns if the count of lyric tokens differs from the count of notes). It never fired for the 8 songs.

---

## 5. Accessibility observations

**Tap targets under 44x44 px** (measured with `getBoundingClientRect`):

| Control | Size (px) |
|---|---|
| Range −/+ | 36x36 |
| Range note buttons | 66x36 |
| Home "Retest" | 76x36 |
| Settings switch | 52x32 |
| Settings segments | 113 or 171 x 38 |
| Retest / Reset | 76x36 / 69x36 |
| Song mode segments | 175x38 |
| Between-parts "Start now" | small secondary |

All primary actions are 50 to 56 px and fine.

**Contrast, light mode, HTML** (WCAG AA):
- Home badges "Set" and "72%": 3.54:1 at 13 px. **Fail.**
- Reset: 4.5:1 (borderline).

**Contrast, canvas elements against the white lane:**

| Element | Contrast | Note |
|---|---|---|
| Upcoming "sing" bars (`--bar-idle`) | **1.3:1** | very faint in `42`, `45` |
| Listen outlines (`--bar-ghost`) | 2.2:1 | |
| Playhead | 1.75:1 | |
| Row labels | 3.6:1 | at 11 px |
| "mi" / "near" yellow | 2.2:1 | |

Non-text UI should reach 3:1. Dark mode is better on every count: labels 4.0:1, degree colours 6.5 to 12.7:1. Upcoming bars are still 1.35:1.

**Colour-only signalling.** In-tune versus near is shown only by fill opacity and dot colour, and the near colour equals the mi colour. There is no shape, icon or text on the lane. The cents text is the only other channel, and it flickers (§3.5).

**Text size.** Body 16 px, cue 19 px and readout note about 48 px are good. The week-strip letters and lane labels are 11 px, and the keyboard octave labels about 6 px (SVG).

**Screen readers:**
- Icon buttons have `aria-label`s, headphones uses `aria-pressed`, sheets use `role="dialog"` with `aria-modal`, the first button is focused and Escape closes. All good.
- The cue is `aria-live="polite"` and changes very often: every second during holds ("Hold it · 4… 3…"), about 3 times a second in staccato, and at every listen / breathe / your-turn switch. That is chatty. Rate-limiting or announcing only the phase changes would help.
- The pitch lane canvas has no text alternative. The results canvas has an `aria-label` but no `role="img"`.

**Motion.** `prefers-reduced-motion` disables only the sheet animations. The scrolling lane is inherent and can't be reduced, which is acceptable. The big count-in numbers and the colour fills are not flashing.

**Small screens.** At 375x667 the player fits with no page scroll. Settings needs scrolling, and syllable labels vanish on wide-span songs (`90`, `91`).

---

## 6. What could not be tested

- **Real iOS Safari and the Home-Screen PWA:**
  - AudioContext unlock on tap and `navigator.audioSession = 'play-and-record'`.
  - Speaker-to-mic bleed when headphones are off.
  - iOS input processing (the app requests `echoCancellation`, `noiseSuppression` and `autoGainControl` all false; Safari may ignore this).
  - Bluetooth routing and call-quality drop.
  - Real output and input latency. The app assumes 20 ms.
  - Wake Lock, audio interruptions from notifications or calls (only simulated via `visibilitychange`), the real permission prompt and denial persistence in standalone mode, the clipboard on iOS, and offline behaviour through the service worker (http only here).
- **Real voices:**
  - Breathiness, vocal fry, register breaks, consonant onsets in songs, and vowel changes ("mee", "nay", "oo", "ng").
  - Lip trills on the Sirens lesson (strong amplitude modulation).
  - Humming at low level, children's voices above 600 Hz, and very low basses near the 60 Hz floor.
  - The synthetic singer is idealised: perfectly periodic, stable formants.
- **Audio output.** Headless Chromium produces no audible sound, so I could not judge the guide tone, piano timbre, loudness balance, click level, or whether the guide is easy to match by ear.
- **Real screen-reader output** (VoiceOver), Dynamic Type or large-text settings, and performance on older phones (YIN runs every frame, roughly 0.7 M multiply-adds per frame).
- **Headphones mode while singing**, where the guide plays during your turn. It was toggled and its cue checked, but not heard.

---

## 7. Top UX issues, ranked by severity

| # | Severity | Issue | Evidence |
|---|---|---|---|
| 1 | **High** | **Staccato lesson scoring rewards the opposite of the skill it teaches.** Crisp 100 ms staccato scores 22% with "mic lost you, sing louder"; legato scores 92% "Spot on". The cue also flickers "Breathe in…"/"Your turn" between every note. | `29e`, `29f`, `29g`, §3.11 |
| 2 | **High** | **In multi-key exercises, note labels, degree colours and solfa syllables stay in key 1.** Key 2 reads "fa fi le" for mi fa sol, colours are mismatched, and letter-mode bars sit on unlabelled rows. Affects 7 lessons and the warmup. | `35`, `35b`, `37b`, §3.8 |
| 3 | **High** | **Normal vibrato is treated as error.** ±60c blocks the range test indefinitely with no message. ±50c scores 72 to 73%, "35% held steady", "long notes wobbled". Tips blame late onsets. | `08c-range-test-vib60-stuck`, `22`, `58`, §2 |
| 4 | **High / Med** | **The headline score is mostly "how much of each bar you sounded", not tuning.** Accurate singers get 77 to 87% on scales and songs, and fast songs get "aim to land each note sooner". Identical runs straddle the "Spot on" boundary. | `49`, `24`, `36` vs `38`, §2 |
| 5 | **Med** | **Tips misdiagnose.** Wrong notes are reported as "61 cents sharp, relax your jaw"; vibrato and Strict mode as "land sooner". The Copy-for-Claude text passes these numbers on, so Claude's coaching inherits the error. | `19`, `58`, `59e` |
| 6 | **Med** | **No live "we can't hear you" feedback.** A silent or noisy mic plays out the whole lesson. The result still counts toward progress and the streak, and the primary CTA is "Next" even at 0%. | `52`, `53`, `55` |
| 7 | **Med** | **Mic-blocked help assumes a Safari tab** ("tap aA in the address bar"). This is impossible in the Home-Screen mode the README recommends, and wrong for Chrome. Also "tap Start again" vs a "Try again" button. | `71` |
| 8 | **Med** | **The live readout is hard to use while singing.** The cents text flickers (about 26 changes per second with vibrato). "Listening…" shows during "Listen". There is no up/down direction cue. The octave hint is "8vb". The range test shows Hz. | `12`, `50`, `56`, `06` |
| 9 | **Med** | **Low-contrast lane.** Upcoming bars 1.3:1, listen outlines 2.2:1, labels 3.6:1 at 11 px, playhead 1.75:1. The "near" colour is identical to the "mi" colour, so in-tune and near can't be told apart on mi notes. | `42`, `45`, `14`, §5 |
| 10 | **Med** | **An interruption discards the whole run**, including the 3-minute warmup, with no resume or partial result. | `66` |
| 11 | **Med** (SR users) | **The `aria-live` cue is too chatty** (per-second countdown, staccato flicker), and the lane canvas has no text alternative. | §5 |
| 12 | **Low / Med** | **No guided path after onboarding.** The whole catalogue is unlocked, there is no "next up", and "Find your range" is duplicated. The voice-type label rests on two comfortable notes. | `02`, `09c`, `08` |
| 13 | **Low** | **Tap targets under 44 px**: range ±, settings switch and segments, Retest/Reset, song-mode switch. The settings "Done" button is cut off. | §5, `61`, `91` |
| 14 | **Low** | **Small visual glitches:** trace crosses syllable text; labels clipped on short bars and at the edges; syllables vanish on wide-span songs on small phones; the results overview is tiny, never colours glides, and wide vibrato hides the bars; the warmup subtitle is truncated; "Nicely done" shows after every run. | `45`, `29e`, `90`, `33`, `22` |
| 15 | **Low** | **Copy and consistency:** double count-in in sing-through; "new tunes every time" is only true on reopen; sharps and flats mixed (D♯5 vs D♭ keys); "0 cents sharp" when centred. | `44`, `27`, `08b`, `17` |

**What already works well:**
- Pitch detection is accurate and noise-robust, octave folding is correct, and timing compensation is precise.
- The copy is warm and short.
- Onboarding with presets is clear, and the pending lesson resumes after the range test.
- The line-by-line song mode, with syllables on bars and lyric highlighting, is strong.
- The Copy-for-Claude report is well structured.
- Dark mode is polished.
- There were no console errors.
