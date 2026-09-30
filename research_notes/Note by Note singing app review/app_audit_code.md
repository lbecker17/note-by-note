# Note by Note: code audit (teaching content, pitch engine, scoring, risks)

Audited from `/home/user/note-by-note` at commit `8809b46` ("Note by Note: singing lessons with live pitch feedback"). All files were read in full: `index.html`, `app.css`, `js/app.js`, `js/audio.js`, `js/lane.js`, `js/lessons.js`, `js/music.js`, `js/pitch.js`, `js/score.js`, `js/songs.js`, `js/store.js`, `sw.js`, `manifest.webmanifest`, `README.md`. No repo files were modified. Throwaway Node scripts in the session scratchpad imported the real modules to generate lesson content for sample ranges, check song data, exercise the YIN detector on synthetic tones and simulate the noise gate. Those results are marked "simulated".

Evidence labels:
- **[read]**: confirmed by reading the code.
- **[sim]**: confirmed by running the real module code in Node.
- **[suspected]**: likely from reading, but it needs checking on a device (usually iOS Safari).

The app has no build step: plain ES modules, a canvas "pitch lane", Web Audio synthesis, and `localStorage` for storage.

---

## 0. Architecture in one paragraph

`app.js` is a small screen router with these controllers: `homeCtrl` (451), `playerCtrl` (491, used for lessons, the warmup and songs), `rangeCtrl` (981) and `freeCtrl` (1202). One `requestAnimationFrame` loop (1273–1282) calls `current.frame()`. Each frame, while the mic is on, it pulls one pitch reading from an `AnalyserNode` (`audio.js` 117–132), schedules the lesson audio up to 0.7 s ahead against `AudioContext.currentTime` (`app.js` 655–677), scores that frame live (`decorate`, 679–703) and draws the lane (`lane.js` 122–311). A lesson is a list of "steps". Each step is a timeline built by the `Builder` class (`lessons.js` 6–62), with `events` (listen/sing notes), `audio` (guide, piano, click, glide) and `cues` (small captions). Audio timing and visual timing both run off the audio clock (`T0 = audio.now() + LEAD`, `app.js` 626), which is a sound design choice.

---

## 1. Teaching content

### 1.1 Structure (`lessons.js` 363–369, `app.js` 380–398)

| Unit | Lessons (in order, numbered 1–13 on home) |
|---|---|
| Start here | 1 Find your range · 2 Match a note · 3 Hold it steady |
| Pitch | 4 Step up, step down · 5 Five-note scale · 6 The full scale · 7 Leaps · 8 Arpeggios · 9 Minor mood · 10 Echo game |
| Breath and control | 11 Longer holds · 12 Sirens · 13 Short and sharp |
| (separate) | Daily warmup card, Free sing row, 8 Songs |

Every lesson is open from day one. Nothing is locked. "Next" on the results sheet follows `ORDER` whatever the score was (`app.js` 477–489).

### 1.2 Shared mechanics

- **Listen, then sing (`echo()`, `lessons.js` 71–80):** the app plays the pattern ("listen" notes), then one accented tick, then a gap of `gap = 1` beat, then the singer sings the same pattern ("sing" notes), then `after = 1.5` beats of rest. The code comment reads: "Hear it, a beat to breathe (with a tick), then sing it back."
- **Guide during singing only with headphones:** every sing note also adds a guide tone with `hp: true` (`lessons.js` 31–32). The scheduler skips `hp` audio unless Settings → Headphones is on (`app.js` 659). Without headphones the singer sings unaccompanied. The only reference is the pattern they just heard.
- **Last note is longer:** `pattern()` gives each degree 1 beat and the last one 2 beats (`lessons.js` 66–68).
- **Tonal context:** only `patternStep` and the echo game play a chord: a root-position major or minor triad **one octave below the tonic** (`triad`, `lessons.js` 82), struck at velocity 0.05 under the listen phase. It also plays under the sing phase with headphones (`hp`). Match, Hold, Longer holds, Sirens and Staccato have **no harmonic context at all**. No key-establishing cadence or drone plays before a pattern.
- **Transposition to the singer:**
  - `fitTonic(range, lo, hi)` centres the pattern's span in the stored range (`music.js` 112–116).
  - `keyLadder(range, lo, hi, count)` gives `count` tonics climbing by semitone, centred in the feasible band (`music.js` 119–126). If the pattern doesn't fit, it returns one centred tonic and the pattern **overflows the range** (see §7).
- **Visual countdown:** a 2.4 s visual countdown (`LEAD`, `app.js` 11) shows "3, 2, 1" (`app.js` 923–926). It is not audible for lessons. Songs in "Sing it through" then add a second, audible count-in (see §5).

### 1.3 Every lesson, exactly as generated

Pitches are shown for the two presets: Lower = A2–D4 (45–62) and Higher = A3–D5 (57–74). All timings below are without the 2.4 s lead. [sim]

| Lesson | Code | BPM | Degrees / pattern | Keys | Vowel | Sung notes | Approx. length |
|---|---|---|---|---|---|---|---|
| Match a note | `matchStep` 86–103 | 60 | Six single notes, degrees 0,4,7,2,5,9 over a tonic fitted for span 0–9. Each: listen 2 beats → tick → 1 beat → **sing 3 beats** → 1.5 rest | 1 | ah | 6 × 3 s (low preset D♭3 F3 A♭3 E♭3 G♭3 B♭3) | 45 s |
| Hold it steady | `holdStep` 105–122 | 60 | Degrees 0, 2, 4 held **4, 6, 8 s**. Listen 1.5 beats → tick → 1 beat → hold → 2 rest | 1 | ah | 3 | 31.5 s |
| Step up, step down | `patternStep` 236–251 | 80 | [0,2,0], [0,2,4,2,0], [4,2,0] | 2 (semitone apart) | ah | 22 | 53 s |
| Five-note scale | 252–267 | 96 | [0,2,4,5,7,5,4,2,0] | 4 | mee | 36 | 56 s |
| The full scale | 268–283 | 100 | [0..12..0] major, 15 notes | 2 | ah | 30 | 41 s |
| Leaps | 284–299 | 76 | [0,4,0], [0,7,0], [0,4,7,4,0], [0,7,4,0] | 2 | oo | 30 | 76 s |
| Arpeggios | 300–315 | 88 | [0,4,7,12,7,4,0] | 3 | nay | 21 | 38 s |
| Minor mood | 316–332 | 90 | [0,2,3,5,7,5,3,2,0], [0,3,7,3,0], with a minor triad | 2 | ah | 28 | 49 s |
| Echo game | `echoGameStep` 189–210 | 84 | 8 random tunes (below) | 1 | la | 28 | 66 s |
| Longer holds | 340–346 | 60 | Degrees 0,2,4 held **8, 10, 12 s** | 1 | oo | 3 | 43.5 s |
| Sirens | `sirenStep` 137–160 | 60 | 3 rounds of glides: listen up 2 s + down 2 s → tick → 1 s → sing up 2 s + down 2 s → 1.5 s. Widths are 55%, 77.5% and 100% of `half = max(3, (high−low)/2 − 1)` around the range midpoint, so the last round reaches within about 1 semitone of both range edges | – | ng (or lip trill) | 6 glides | 31.5 s |
| Short and sharp | `staccatoStep` 162–186 | 100 | [0,4,7,4,0] as half-beat notes (0.3 s) with half-beat rests. No chord, no `echo()` | 3 | ha | 15 × 0.3 s | 22.5 s |

**Echo game generator (`lessons.js` 189–210).**
- Pool: major pentatonic `[0,2,4,7,9]`.
- First note: degree 0 with probability 0.6, otherwise degree 4 or 7.
- Each next note is any pool note that is not a repeat and is ≤5 semitones from the previous one.
- Rounds 1–4 have 3 notes and rounds 5–8 have 4. The last note is 2 beats. All rounds are in one key, at 84 bpm, with a major triad under the listen phase.
- `Math.random()` is unseeded. "Try again" reuses the same plan, so the same tunes come back (`app.js` 834–837). New tunes appear only when the lesson is reopened.

**Daily warmup (`lessons.js` 371–395).** Four steps with a 4 s "Up next" interstitial between them (`app.js` 785–794), plus a "Start now" skip button:
1. Sirens, 3 rounds.
2. Five-note scale on "mee", 4 keys, 100 bpm.
3. Arpeggio [0,4,7,4,0] on "nay", 4 keys, 92 bpm.
4. Long notes: degrees 2 and 4 held 6 s and 8 s on "ah".

Total is about 156 s of timeline plus 3 × 4 s gaps, so **≈2.8 min** for a 17-semitone range [sim]. That matches the "About three minutes" blurb. For a narrow range (G3–D4) it drops to ≈1.7 min, because `keyLadder` can fit only one key. The warmup is **identical every day**.

### 1.4 User-facing teaching text (quoted verbatim)

**Lesson intros**, shown in the cue area before Start (`setReady`, `app.js` 595):
- Match: "You’ll hear a note. When its bar reaches the line, sing it back on “ah”." (101)
- Hold / Longer holds / Long notes: "Breathe in low, then hold each note on “{vowel}”. Keep the line flat and level to the end." (120)
- Steps: "Three short patterns that move by step. Listen, then sing them back on “ah”." (248)
- Five-note: "Up five notes and back down on “mee”. Each round starts a little higher." (264). Warmup version: "Up five notes and back on “mee”." (383)
- Full scale: "Do re mi fa sol la ti do, and back down. Sing it on “ah” or on the note names." (280). The live cue still says "sing on “ah”".
- Leaps: "Jumps between notes. Hear the landing note in your head before you sing it. Sing on “oo”." (296)
- Arpeggios: "Up the chord to the top note and back on “nay”. Keep the top note light." (312). Warmup: "Do, mi, sol and back on “nay”." (391)
- Minor: "A minor scale, then a minor chord. The third note is a half step lower than in major." (329)
- Echo game: "Short new tunes every time. Listen, then echo each one on “la”." (208)
- Sirens: "Slide smoothly up and down like a siren. Hum on “ng” or do a lip trill. No breaks in the sound." (158)
- Staccato: "Short, bouncy notes on “ha”. Let your belly kick each one out, then stop cleanly." (184)

**Lesson blurbs** on the home list (`lessons.js` 218–358):
- "Sing a low note and a high note. Every lesson then moves into your key."
- "Hear a note, then sing it back."
- "One note at a time, level from start to finish."
- "Move to the next note and back."
- "Do to sol and back, one key higher each time."
- "All eight notes, up and down."
- "Jump a third or a fifth and land cleanly."
- "Do, mi, sol, do. The notes of a chord."
- "The same scale with a darker third."
- "A new set of short tunes every time."
- "8, 10 and 12 seconds on one breath."
- "Slide from low to high and back without a break."
- "Quick, detached notes on “ha”."
- Warmup: "Sirens, scales, an arpeggio and a long note. About three minutes."

**Live cues** (`updateCue`, `app.js` 713–727):
- "Get ready"
- "Listen" / "Listen to the slide"
- "Your turn: slide with it"
- "Hold it · N" (a seconds countdown)
- "Your turn" (songs)
- "Your turn: sing on “{vowel}”"
- "Breathe in…"
- "Nicely done"

Between warmup steps the cue says "Nice. Take a breath." (793). The subtitle shows "{step} · i of n · Key k of n / Note i of 6 / Tune i of 8 / Slide i of 3 · on “vowel”" (577–585).

**Live readout** (`readout`, 755–780):
- The note name (letters or movable-do).
- Against the target: "In tune" (within the *good* tolerance) or "{N}¢ flat/sharp" (after octave folding).
- With no target: "+N¢ from X" or "Right on the note".
- Otherwise "Listening…" / "Tap Start to begin" / "Mic is off".
- A level bar mapped from −58 to −12 dBFS.

**Headphone toggle messages** (892):
- "Headphones on: you’ll hear the guide while you sing."
- "Headphones off: you’ll hear each part first, then sing."

**Settings copy** (184):
- "On: you also hear the guide note while you sing. Wired headphones work best. Bluetooth drops to call quality while the mic is on."
- Strictness line: "{blurb}. 100 cents is one half step."

**Mic sheet** (120–157):
- "Note by Note listens so it can show your pitch as you sing. Nothing is recorded or sent anywhere."
- "Tip: you'll hear the notes best with the phone's volume up and Silent mode off."
- For a denied permission, step-by-step Safari instructions: "tap aA … Website Settings … Microphone … Allow", and "Settings → Safari → Microphone".

**Result verdicts** (`score.js` 142–147): "Spot on" (≥85%), "Nicely done" (≥65%), "Getting there" (≥40%), "Keep practising".

**Result tips.** Only the first matching one is shown (`score.js` 149–160):
1. Coverage <45%: "The mic lost you on a lot of notes. Sing a little louder, or hold the phone closer."
2. Octave share >50%: "You sang most notes an octave away from the guide. That still counts. Redo the range test if the notes felt uncomfortable."
3. Lean < −20¢: "On average you sat about N cents flat. Think of each note as slightly higher, and keep the air moving to the end of the note."
4. Lean > +20¢: "On average you sat about N cents sharp. Relax your jaw and let each note settle instead of pushing."
5. Onset >0.35 s: "You found the notes, but late. Breathe in during the tick so you’re ready to start on time."
6. Steadiness <0.7: "Your long notes wobbled. Breathe low into your belly and let the air out slowly and evenly."
7. Score ≥85%: "That was accurate. Switch to Strict in settings for a tougher check."
8. Score ≥60%: "Good work. Run it again and aim to land each note sooner."
9. Otherwise: "Listen closely to each note, then hum it quietly before you sing it out."

That is all the technique teaching in the app: one-line intros, one results tip, and the vowel label. There are no explanations, diagrams, demonstrations, posture or breath lessons, vocal-health notes or theory pages.

### 1.5 Songs (`songs.js`)

Eight public-domain songs. Each is written in a reference key and shifted by `fitShift`, which centres the melody's lowest-to-highest span in the range (`music.js` 129–133). Lyric token counts equal note counts for all 8, and chord beats equal melody beats [sim].

| Song | Ref key | BPM / meter | Notes | Lines | Span | Label |
|---|---|---|---|---|---|---|
| Mary Had a Little Lamb | C | 108, 4 | 26 | 2 | 7 (C4–G4) | Easy |
| Twinkle, Twinkle | C | 100, 4 | 42 | 3 | 9 | Easy |
| Ode to Joy (sung on solfa: "mi mi fa sol…") | C | 108, 4 | 62 | 4 | 12 (G3–G4) | Medium |
| Are You Sleeping | C | 104, 4 | 32 | 4 | 14 | Medium |
| Row, Row, Row Your Boat | C | 192 (eighths), 6/8, pulse 3 | 27 | 2 | 12 | Medium |
| Happy Birthday ("dear friend") | C | 96, 3 | 25 | 4 | 12 | Medium |
| Amazing Grace | G | 84, 3 | 32 | 4 | 12 (D4–D5) | Medium |
| Waltzing Matilda | C | 100, 4 | 91 | 8 | 17 (G3–C5) | Harder |

Difficulty comes from span alone: ≤9 is Easy, ≤14 Medium, otherwise Harder (`songs.js` 192–197). Every song is major, with diatonic I/IV/V harmony.

**Line by line ("learn") mode** (`songs.js` 252–272). For each phrase (`//` in the melody):
1. The app plays the line: guide melody at level 0.22 plus piano chords at velocity 0.05.
2. Tick(s) on the pulse for a gap of `max(2, pulse*2)` beats.
3. The singer sings the line. Chords and guide play only with headphones (`hp`).
4. 1.5 beats of rest.

The whole song runs once as a single step and gets one score. There is **no way to repeat a single line, loop a hard line, slow the tempo, speak the rhythm, or learn the words first**.

**Sing it through ("along") mode** (273–281):
- A count-in of `meter` beats (ticks per `pulse`), then the whole melody as sing notes.
- Guide melody only with headphones (level 0.16).
- Piano chords always play (`hp: false`): velocity 0.07 with headphones, **0.035 without** ("soft so the mic hears you").
- Cues are "Line i of n".

Lyrics sit under the lane with the current syllable underlined (`renderLyrics`, `app.js` 729–753). Bars carry syllables (`lane.js` 230).

Chord voicing (`voiceChord`, `songs.js` 201–214): the triad tones sit in `[max(lowMelody−7, C3), …]`. The **bass note can go down to C2–B2 (36–47)**, which contradicts the comment "kept above C3" [read].

Both modes save progress under the same id `song:<id>` (`app.js` 471, 804).

### 1.6 Free sing (`app.js` 1202–1269)

The lane follows the voice with a smoothed centre (`lane.js` 129–132). There is no target, drone or score. The readout shows the note plus cents from the nearest semitone.

---

## 2. Range test (`app.js` 981–1198)

**Flow.** It starts with: "You'll sing a comfortable low note, then a comfortable high note. Hold each one until the bar fills."

- Step 1 (1032): "Sing a comfortable low note on “ah” and hold it. Low, but not growly."
- Step 2 (1124): "Low note: X. Now a comfortable high note, still on “ah”. Not a squeak."

**Measurement (`track`, 1100–1136) [read]:**
1. It looks at frames from the last 0.5 s.
2. That window is "stable" when it has ≥10 frames, ≥70% of them voiced, and ≥85% of the voiced frames within ±0.5 semitone of their median.
3. Progress builds at 1× while the window is stable and drains at 1.5× otherwise. It must reach **1.2 s**.
4. The captured note is `round(median(voiced frames of last 1.2 s))`.
5. A high note less than 4 semitones above the low is rejected: "That's close to your low note (X). Try a higher note." (1110, 1126–1128).
6. After each capture it plays a confirmation `blip` of the detected note.

So it measures **one self-chosen "comfortable" low and one "comfortable" high note**. It is not the extreme range (no slide down or up to the limit), and there is no check that the voice is warmed up. The range test is the first thing a new user does.

**Result sheet (1037–1082):**
- Shows "Your comfortable range X to Y", "Closest voice type: …", the interval span in words and a keyboard picture.
- ± buttons nudge each edge within [36, 88] while keeping ≥4 semitones apart. Each change plays a blip.
- Tapping a note plays it.
- Copy: "Tap a note to hear it. Nudge the edges if they felt like a stretch."
- Buttons: "Save my range" and "Test again".

**How the range becomes a key or tessitura.** The saved `{low, high}` is used directly as the **full working band**. Every exercise is centred inside it (`fitTonic`, `keyLadder`), songs are centred with `fitShift`, and sirens go to within about 1 semitone of both edges. There is no separate tessitura, and exercises don't favour the middle of the voice beyond the centring. With a 17-semitone range all lessons stay inside it [sim].

**Voice type** (`music.js` 135–147) comes from the *midpoint* of the range: Bass <D♯3, Baritone <G3, Tenor <B3, Alto <D♯4, Mezzo <G4, otherwise Soprano. The label is shown to the user and put into the Claude report. It is crude and can mislabel: a male C3–C5 range (midpoint 60) reads **"Alto"**, and A2–A4 reads "Tenor" [read].

**Presets** (`app.js` 12, 166–168, 1150–1155):
- "Lower voice · A2 to D4 · most men" = 45–62, classified Baritone.
- "Higher voice · A3 to D5 · most women and children" = 57–74, classified Mezzo-soprano.

**Re-test options:**
- "Retest" on the home voice card (358).
- Settings → Your range → "Retest / Find it" (191).
- "Test again" on the result sheet.
- "Skip and pick a typical range" (1007).

Nothing ever prompts a re-test or widens the range automatically as the user improves.

**Safety guidance** is limited to "Low, but not growly", "Not a squeak" and "Nudge the edges if they felt like a stretch". Nothing says to stop if it hurts, to warm up first, or to avoid pushing the high note.

---

## 3. Pitch detection (`pitch.js`, `audio.js`)

- **Capture:**
  - `getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})` (`audio.js` 80–82).
  - `navigator.audioSession.type = 'play-and-record'` where available (75).
  - An **`AnalyserNode`** with `fftSize` = 2048 (the smallest power of two ≥ `need`) and `smoothingTimeConstant = 0`. It is routed through a zero-gain node to the destination so it runs (90–101).
  - **No AudioWorklet and no ScriptProcessor.** The analyser is polled once per `requestAnimationFrame` on the main thread. The hop therefore equals the display frame interval: about 16.7 ms at 60 Hz, 8.3 ms at 120 Hz, and it varies with throttling.
  - There is an 8-bit `getByteTimeDomainData` fallback for old browsers (120–126).
- **Algorithm:** YIN (difference function → cumulative mean normalised difference, CMNDF) with an adaptive threshold (`pitch.js` 15–80).
  - Frequency band: `minHz 60`, `maxHz 1250`. So `tauMin = floor(sr/1250)` and `tauMax = ceil(sr/60)`.
  - Integration window `W = round(sr × 0.0213)`, which is 939 samples at 44.1 kHz and 1022 at 48 kHz (21.3 ms). It needs `W + tauMax + 2` samples (1676 at 44.1 kHz, 1824 at 48 kHz) and uses the most recent ones.
  - The difference function is computed directly, O(W × tauMax), with no FFT: about 0.8 M multiply-adds per frame.
- **Threshold:**
  - The absolute threshold is 0.12. If the global CMNDF minimum is above that, the threshold becomes `gmin × 1.2 + 0.03`: the first dip "close to the global minimum", to avoid octave-down errors (52–54).
  - The code takes the lowest point of the first dip under the threshold (56–67), then applies parabolic interpolation on the CMNDF (70–75).
  - It returns `{hz, ap: cmndf value, rms}`.
- **Sample rate:** everything uses `ctx.sampleRate` (90). The detector is rebuilt when the mic starts. The context sample rate is not checked against the track's actual rate (see §7).
- **Voicing and confidence gate (`Tracker`, 83–111):**
  - A frame counts as voiced when `60 ≤ hz ≤ 1250`, `ap < 0.3`, and `rms > gate`.
  - `gate = clamp(floor × 3.5, 0.0035, 0.03)`.
  - The floor adapts: it falls fast (×0.7) when rms is below it and rises slowly (0.15% per frame) otherwise.
  - **Smoothing:** a median of the last 3 voiced frames within 100 ms. With fewer than 3, the raw value is used. There is no hysteresis, no octave-jump correction across frames, no vibrato-aware smoothing, and no confidence value exposed to the UI.
- **Timestamp:** `t = ctx.currentTime − need/2/sr − 0.02` (`audio.js` 129). That is the middle of the analysis span plus a fixed 20 ms input-delay guess. `outputLatency` and `baseLatency` are never used.
- **Octave handling:** detection has only YIN's first-dip rule. Scoring then *folds* octaves (see §4), so octave errors are forgiven rather than corrected.
- **Synthetic check [sim]:** on harmonic tones (including a weak fundamental) at 44.1, 48 and 16 kHz, the error was ≤1¢ from 65 Hz to 1245 Hz at 44.1 and 48 kHz, and up to 9¢ at 16 kHz. **Above 1250 Hz (≈E6) the detector reports one octave down** (1319 Hz read as 659.5 Hz, which still passes the 60–1250 Hz voiced filter). That only matters for very high sopranos in the range test.

---

## 4. Scoring and feedback (`score.js`, `app.js` 679–703, `lane.js`)

**Tolerances** (`score.js` 5–9, chosen in Settings):

| Setting | Full credit | Half credit |
|---|---|---|
| Relaxed | ±50¢ | ±100¢ |
| Standard (default) | ±30¢ | ±60¢ |
| Strict | ±15¢ | ±35¢ |

Glides double both (`wide = 2`).

**Per frame:**
- `foldDiff` (19–25): if the sung pitch is within ±2 semitones of an octave-shifted target, the octave is removed and the frame is judged on the folded distance, so **singing in the wrong octave earns full credit**. The UI marks it "8va/8vb" (`lane.js` 297).
- `creditFor` (27–32) gives 1, 0.5 or 0.

**Per note (`scoreStep`, 39–105):**
- Frames count from `ev.t + grace` to `ev.t + ev.d`, where `grace = min(0.2 s, 0.3 × duration)` (34–36). Early frames are ignored.
- Unvoiced frames inside the window count as 0, so silence or dropouts lower the score.
- Note score = mean credit over the counted frames.
- The "onset" is the first frame, from `ev.t` on, within the *near* tolerance.
- **Steadiness** is computed only for `hold` notes with more than 10 voiced frames: drop the first 10%, then take the share of frames within ±25¢ of the median.
- "Longest in-tune run" is also for holds only. It adds 1/60 s, which assumes 60 fps.
- There is no timing credit for starting early or ending late. Being late costs in proportion. For the 0.3 s staccato notes, grace is only 0.09 s.

**Per run (`summarize`, 107–140):**
- Score: the duration-weighted mean of note scores.
- "Landed": notes with a score of at least 0.5.
- Coverage: voiced frames ÷ counted frames.
- **Lean (`tendency`):** the mean signed cents over *all voiced frames*, with no outlier rejection.
- `avgAbs`: the same, unsigned.
- Octave share, mean onset (notes ≥0.45 s, not glides), mean steadiness, longest hold.
- **Consequence [read]:** one wrong note (for example 200¢ away) or a glide lag inflates "average miss" and "lean". The flat or sharp tip then blames general intonation for what is really a wrong-note error. The results-sheet lean shows "Centred" below 6¢ (812–813), but the tip only fires beyond ±20¢.

**Live feedback while singing:**
- The voice trace is drawn as a line. It is hidden during listen notes and for 0.3 s after, so speaker bleed isn't drawn (`app.js` 684).
- A live dot at the playhead is coloured by credit: the note's degree colour when in tune, `--near` (yellow) for half credit, grey when off (`lane.js` 286).
- The target bar fills with colour where hits land (full or 40% opacity).
- An up or down arrow appears when the voice is off-screen.
- An "8va/8vb" tag marks octave-folded frames.
- The readout shows "In tune / N¢ flat / sharp", and the cue text says "Hold it · N".

**After the run (`resultsSheet`, 810–851):**
- Score % and verdict.
- Three stats: "notes landed", "average miss", and either "held steady" (when there were holds) or "overall lean".
- A miniature replay of the whole run (`drawOverview`).
- One tip.
- Buttons: "Try again", "Next: {lesson}" or "Done", and "Copy results for Claude".

**"Copy results for Claude" text (`reportText`, 168–204):**
- "Note by Note practice results"
- Lesson, plus "(line by line)" or "(sung through)" for songs
- Date in en-AU format
- "My comfortable range: X to Y (voice type)"
- Strictness and its blurb
- "Score: N% · a of b notes landed"
- "Average distance from the note: N cents · overall lean: N cents flat|sharp". A lean of exactly 0 prints "0 cents sharp".
- "The mic heard me for N% of the singing time"
- "Average time to reach each note: N ms"
- "Long notes: N% steady, longest in-tune hold N s"
- A per-note list grouped by step, for example `C4 “twin” +12 (85%)` or `… not heard`, using flats when the key calls for them
- It closes with "Based on this, what are the one or two most useful things for me to practise next?"

It leaves out the headphone mode, tempo or key per step, vowel, the strictness change history and any previous runs. Copying falls back to a read-only textarea if the clipboard fails (863–874).

---

## 5. Guide audio (`audio.js` 134–255)

- **Engine setup:**
  - An `AudioContext` created on first tap with `latencyHint:'interactive'`.
  - A master `DynamicsCompressor` (threshold −16 dB, ratio 3).
  - The iOS unlock trick: a silent 1-sample buffer (33–65).
- **Guide tone** (174–196):
  - A `PeriodicWave` with harmonic amplitudes [1, .5, .26, .14, .08, .05, .03] (sawtooth-like roll-off) through a 2.4 kHz low-pass.
  - Envelope: 30 ms attack to 0.24, a gentle sag to 80%, and a release starting 50 ms before the note end.
  - Glides use `exponentialRampToValueAtTime`.
  - Level: 0.24 for lessons; 0.22 (listen) and 0.16 (sing) for songs.
- **"Piano"** (198–224): two oscillators detuned ±3¢ with 10 harmonics, a filter envelope, a 5 ms attack, and a decay to 22% with τ = 0.45 s. It is a plucked or struck sound, not a sustained pad.
- **Clicks** (226–240): a 50 ms sine at 1760 Hz (accent) or 1320 Hz. Both sit above the detector's 1250 Hz ceiling, so the tick can't register as sung pitch. That is a deliberate and good choice.
- **Headphone mode vs call-and-response:** this is the Headphones switch in Settings and the headphones icon in the player (886–893).
  - Off (default): the app plays, then the singer sings in silence.
  - On: the guide tone (and chords) also play *during* the singer's turn.
  - The app never detects the audio route. It trusts the switch.
- **Count-ins:**
  - Lessons: a 2.4 s *visual* 3-2-1 only, then one accented tick before each sung repeat.
  - Songs, learn mode: ticks on each pulse during the 2- or 6-beat gap before the singer's line.
  - Songs, "Sing it through": the visual 3-2-1, *then* an audible count-in of `meter` beats. That is two count-ins in a row, and the visual one isn't in tempo.
- **Tonal context:**
  - Lessons: a struck triad one octave below the tonic under the listen phase (and the sing phase with headphones), but only for pattern lessons and the echo game.
  - No drone, no cadence, no sustained reference for holds or match.
  - For low voices this triad sits around 30–60 Hz (for example A♯1, D2, F2 for the lower preset's arpeggio key). A phone speaker can hardly reproduce that [read: pitch values; suspected: audibility].
- **Octaves for men and women:** all audio plays in the singer's own octave, because everything is transposed into the stored range. A man hears C3-ish guide tones, and nothing is displaced by an octave. On phone speakers, low guide fundamentals rely on the harmonics. Singing in the "wrong" octave is forgiven by `foldDiff`.
- **Stopping audio:** "Stop" (the Start button while running), Close and pause-on-hide all call `closeBus()`, which fades out in 20 ms and stops nodes after 160 ms. That works. The range-test and preview `blip`s can't be stopped, but they are short.

---

## 6. Progress, streaks, adaptivity, storage (`store.js`, `app.js`)

- **Storage:** one `localStorage` key, `note-by-note:v1` (`store.js` 3), holding `{range, settings:{headphones, names:'letters'|'solfa', strict}, progress:{id:{best,last,runs,at}}, days:[YYYY-MM-DD…]}`, capped at the last 120 practice days (50). Reads and writes are wrapped in try/catch. There is no schema migration and no export or import.
- **What gets recorded:** only completed runs (`finish` → `store.record`, `app.js` 804). Range tests and Free sing don't count. **A run with 0% or no voice at all still counts as a practice day** for the streak [read].
- **Streak:** consecutive local days back from today, or from yesterday if today isn't done yet (`store.js` 68–78). The week strip is Monday-first (81–92). Home shows "N-day streak" or "Practise today to start a streak".
- **Badges:** the best score as a %, styled "done" at ≥60% (`app.js` 373–378). There is no history or trend: only best, last and runs.
- **Adaptivity: none [read].**
  - Tempos, note lengths, key counts, tolerances and patterns are hard-coded.
  - Nothing unlocks.
  - "Next" ignores the score.
  - Strictness is manual. The only nudge is the "Switch to Strict" tip at ≥85%.
  - The range never updates from performance data.
  - No spaced repetition, no remedial branching (for example extra match-a-note work after a poor pitch-matching result) and no daily plan beyond the fixed warmup.
- **Reset:** Settings → Reset (tap twice) clears progress and days but keeps range and settings (`store.js` 53–58, `app.js` 209–221).

---

## 7. Bugs, edge cases and risks

### High impact

1. **The noise gate drops quiet sustained notes after 1–3 s [sim + read].** `Tracker.push` (`pitch.js` 97–102) raises the noise floor toward the current rms on every frame, and `gate = min(0.03, 3.5 × floor)`. During any unbroken sound with RMS below 0.03 (about −30 dBFS, about 60% on the in-app level bar), the floor converges on the voice and the gate overtakes it. Simulated with the real class, 2 s of room noise, then a steady voiced note:

   | Voice RMS | Dropped at 60 fps | Dropped at 120 fps |
   |---|---|---|
   | 0.005 | 1.25 s | 0.63 s |
   | 0.01 | 2.55 s | 1.27 s |
   | 0.02 | 3.15 s | 1.57 s |
   | 0.029 | 3.33 s | 1.67 s |
   | ≥0.035 | never | never |

   After that point the frames are "unvoiced", so they score 0. This hits Hold (4–8 s), Longer holds (8–12 s), warmup Long notes, Sirens (4 s continuous) and legato song lines for quieter singers or a phone held at a distance. The tip that follows ("The mic lost you… sing louder") hides the cause. The comment at `pitch.js` 98 claims the opposite ("a held note never becomes noise"). The floor update also depends on the frame rate, so behaviour changes with display refresh rate. Real-world severity depends on the iPhone's raw mic level with AGC off, so it needs a device test, but the logic flaw is certain.

2. **Nothing checks the headphones claim [read; suspected impact].** With Headphones on but sound coming from the speaker, the guide plays *at the target pitch* during the sing window (lessons at level 0.24). With echo cancellation off, the mic hears it and can score it as the singer, giving free credit. In "Sing it through" without headphones, the soft piano (`hp:false`, velocity 0.035) still plays during singing. Because `foldDiff` forgives octaves, chord tones an octave from the target could earn credit while the singer is silent.

3. **Exercises leave narrow ranges without warning [sim].** Nothing enforces a minimum range beyond 4 semitones. Examples:
   - G3–D4 (7 semitones): Match, Full scale, Arpeggios, Echo game and 7 of 8 songs go outside the range.
   - A3–C♯4 (4 semitones): nearly every lesson goes outside it, and Sirens overshoot by a semitone at each end (`half = max(3, …)`).

   `keyLadder` quietly falls back to a single centred key, which shortens the warmup to about 1.7 min.

4. **The lean and average-miss numbers include wrong notes [read].** No outlier trimming (`score.js` 72–73, 119–122). A single wrong note shifts "lean", and the flat or sharp tip is then wrong. The same numbers go into the Claude report.

5. **The mic never turns off [read].** Nothing calls `track.stop()`, and the `AudioContext` is never suspended or closed. After the first lesson, iOS keeps the orange mic indicator on (and play-and-record routing) until the page is killed, including on the home screen. There is also no in-app mic-off control. That undercuts the privacy message and uses battery.

### Medium

6. **iOS audio-session and sample-rate risks [suspected].** The `AudioContext` is created before `getUserMedia` (`unlock` → `startMic`). On some iOS versions the hardware rate changes when capture starts (44.1 ↔ 48 kHz, or 16/24 kHz with Bluetooth HFP). The detector trusts `ctx.sampleRate`. Any mismatch would shift every pitch by a constant (48/44.1 = +147¢). `audioSession.type` stays `'play-and-record'` for the life of the page, which can lower output volume or change routing. Needs testing on a device.

7. **No latency compensation [suspected].** Output latency is ignored. With Bluetooth headphones (which the app half-supports), the guide arrives about 150–300 ms late relative to the lane and the scoring windows. Grace is only 0.2 s.

8. **Duplicate count-in in song mode [read].** A visual "3-2-1" not in tempo (`LEAD` 2.4 s) comes first, then the audible `meter`-beat count-in.

9. **Lesson chords sit very low for low voices [read].** `triad` is placed an octave below the tonic (`lessons.js` 82), for example A♯1–F2. `songs.js` has a C3 floor for triad tones, but its bass note still goes to C2–B2 despite the comment (`songs.js` 199–206).

10. **The "near" colour equals "mi" [read].** `--near` = `--mi` (#e0a500 light, #ffd43b dark) (`app.css` 25/37, 77/89). On any mi-family target, a half-credit dot looks exactly like an in-tune dot (`lane.js` 286).

11. **Target bars have very low contrast in light mode [read, computed].**

    | Element | Colours | Ratio |
    |---|---|---|
    | Unfilled sing bar (`--bar-idle`) | #e3e0ea on #fff | **1.30:1** |
    | Listen outline (`--bar-ghost`) | on white | 2.17:1 |
    | Yellow degree colour | on white | 2.20:1 |
    | Playhead | on white | 1.75:1 |
    | Lane row labels (11 px) | on white | 3.57:1 |
    | Unfilled sing bar | dark mode | 1.35:1 |

    All of these fall below WCAG 1.4.11 (3:1 for graphics) or 1.4.3 (4.5:1 for small text). Several on-colour pairs are also low: white on `--re` is 3.13:1 and white on `--fa` is 3.40:1 for bar labels.

12. **Service worker [read]:**
    - Network-first with **no timeout**, so on a poor connection every file waits for the network to fail before falling back to the cache (slow start offline-ish).
    - `CACHE = 'note-by-note-v1'` never changes, and `VERSION = '1.0'` in `app.js` is separate. Updates rely on network-first, so a flaky load could mix module versions from network and cache [suspected].
    - `icons/icon-maskable-512.png` isn't pre-cached (it gets cached when first fetched).
    - Google Fonts are a third-party request, which means an IP leak against the "nothing leaves this device" wording (lyrics and audio are not sent).
    - SW registration is https-only (`app.js` 1294).

13. **Streak integrity [read].** Finishing any run, even silently, marks the day as practised.

14. **The voice-type label is unreliable and gendered [read].** It is the midpoint heuristic (§2). The preset captions say "most men" and "most women and children".

15. **Race conditions with the permission sheet [read, minor].**
    - `micSheet(then)` calls `then()` (`begin`) after `await startMic()`. If the user has left the screen meanwhile (back gesture → `popstate` → `goHome`), the destroyed controller's `begin()` runs: it takes a wake lock that is never released and opens an audio bus.
    - A second `startMic` after a track `ended` event replaces `this.stream` without stopping the old one.

16. **Escape ignores `dismissable:false` [read, desktop only].** Escape closes the range-result sheet without saving (`app.js` 293–295), which leaves `rangeCtrl` in `state='result'` with a "Stop" label.

17. **Keyboard picture edge [read].** `keyboardSVG` covers 36–84, but the range can be nudged up to 88. `findIndex` then returns −1 and the dot is drawn at a negative x (`app.js` 84–89).

18. **Sopranos above about D♯6 [sim].** They are read an octave low (maxHz 1250), which can corrupt a very high range-test capture.

19. **Performance on the main thread [suspected].** A naive O(W × tauMax) YIN (about 0.8 M operations) runs every animation frame, even in the "ready" state, alongside canvas drawing. That is fine on recent iPhones, but it could cause jank on older ones and at 120 Hz. The "longest hold" figure assumes 60 fps.

20. **iOS PWA specifics [suspected]:**
    - Home-screen apps and Safari keep separate `localStorage`, so progress made in Safari doesn't carry over after "Add to Home Screen".
    - Standalone PWAs may re-ask for mic permission each launch.
    - Wake Lock in standalone mode has been unreliable on older iOS.
    - The manifest `background_color` is dark (#1b1923) while the light theme is #f6f5f8, so the splash flashes. There are no `apple-touch-startup-image` entries.

21. **Theme change [read, minor].** A theme change mid-session re-reads canvas colours only on the player screen (`app.js` 564–566), not in the range test or Free sing.

### Accessibility summary [read]

**Positives:**
- `aria-label`s on icon buttons.
- `role=dialog`/`aria-modal` sheets, and the first button gets focus.
- `aria-live="polite"` on the cue.
- A `:focus-visible` outline.
- `prefers-reduced-motion` turns off CSS animations and transitions.
- Pinch-zoom isn't blocked.

**Gaps:**
- The lane `<canvas>` has no text alternative, and the pitch picture is the core feedback.
- No focus trap in sheets, and focus isn't restored on close.
- Settings radiogroups have no accessible name and no arrow-key handling.
- Colour carries in-tune / near / off on the lane. The text readout is the only non-colour channel.
- The contrast problems in item 11.
- Fixed px font sizes, with no Dynamic Type.
- `overflow:hidden` on the player can clip at large zoom.
- The lane keeps scrolling under reduced motion (unavoidable, but no slower mode exists).
- The countdown number isn't announced.

---

## 8. Pedagogical strengths and gaps (brief)

**Strengths:**
- Everything is transposed into the singer's own range, and the guide plays in the singer's octave.
- Call-and-response is the default, so the mic isn't fooled and the singer has to rely on audiation.
- A sensible early progression: match → hold → steps → five-note → scale → leaps → arpeggio → minor, plus an ear-training echo game with fresh pentatonic tunes.
- Semi-occluded or flow work (ng or lip-trill sirens) and staccato onsets are present.
- Real-time visual pitch feedback with degree colours and movable-do option, which is a strong visual-plus-audio model.
- Tolerances are sensible and adjustable. Octave errors are forgiven (appropriate for beginners, especially men matching a guide).
- Diagnostic numbers (onset lag, steadiness, flat or sharp lean, coverage) are good material for feedback.
- The Copy-for-Claude report is an interesting coaching hook.
- A short daily warmup with a streak, and public-domain songs with lyrics and line-by-line learning.
- Clicks sit above the detection band, and scheduling runs on the audio clock.

**Gaps:**
- **No adaptivity or mastery gating.** No level ramp in tempo, tolerance, interval size or pattern length. No review of weak items.
- **Heavy reliance on constant concurrent feedback,** with no faded-feedback or "no-lane" test mode. That risks dependence on the display, since the singer watches the line instead of listening.
- **Thin tonal context.** No drone or cadence. Match and hold have no key. Chords are too low for men on phone speakers.
- **Almost no technique instruction.** Breath, posture, onset, registration or passaggio, resonance and vowel shaping get only one-liners, and there is no feedback on anything but pitch: no tone, loudness-dynamics or timbre measurement.
- **No vocal-health guidance,** no warm-up before the range test, and no rest cues.
- **The range test measures "comfortable" points** from a cold voice, then treats them as the whole working range. It never re-measures and never extends.
- **Nothing on rhythm, reading, harmony, dynamics or expression.** All songs are major-key children's or folk tunes.
- **Songs can't be practised line by line on demand:** no loop, slow-down or isolate options.
- **No history or trends,** so there is no evidence of improvement over weeks.
- **Tips blend wrong-note errors into "lean" advice,** and "hold" scoring can be corrupted by the gate bug.

---

## Appendix: simulation details

- **Generated content for the presets:**
  - Lower A2–D4: Match D♭3 F3 A♭3 E♭3 G♭3 B♭3. Hold E3 F♯3 G♯3. Five-note tonics C3→D♯3. Full scale B2, C3. Arpeggio tonics B♭2, B2, C3 (top C4). Sirens round 3 B♭2↔D♭4.
  - Higher A3–D5: the same, one octave up.
- **Song keys after fitting:**
  - Lower preset: Mary D3, Twinkle C♯3, Ode F3, Jacques E3, Row C3, Birthday F3, Grace F3, Matilda D3.
  - Higher preset: the same one octave up, except Row C4 and Grace F4 (shift −2).
  - Matilda (span 17) exactly fills a 17-semitone range.
- **YIN on synthetic harmonic tones:** ≤1¢ error for 65–1245 Hz at 44.1/48 kHz. An octave-down report above 1250 Hz.
- **Tracker gate:** see the table in §7.1.
