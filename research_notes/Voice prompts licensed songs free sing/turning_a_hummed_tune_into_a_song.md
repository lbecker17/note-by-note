# Turning a child's sung, made-up tune into a "real song" with their own voice: on-device processing vs AI music services (as of 1 October 2026)

Method note for the report writer: the egress proxy in this session blocked direct page fetches from suno.com, help.suno.com, elevenlabs.io, oaic.gov.au, gtlaw.com.au, support.apple.com, arxiv.org, musically.com and the-decoder.com. GitHub pages could be fetched. Findings tagged **[Search summary]** come from web-search result summaries of the named page, not from a full read, so treat exact wording and numbers as "reported, not re-read". Tags used:
- **[Primary-read]**: page or file read directly in this session.
- **[Primary-snippet]**: the official page, seen only through a search summary.
- **[Vendor claim]**: marketing or blog text from the vendor.
- **[Secondary]**: a third-party review, aggregator or law-firm summary.
- **[Local]**: read from this repo.

Context checked in the repo **[Local]**: `freeCtrl()` in `/home/user/note-by-note/js/app.js` (lines ~1206–1270).
- It keeps only a rolling 600-frame array of `{t, m}` pitch values for drawing.
- It records no audio, keeps no score and saves nothing.
- `frames.splice` discards older frames, so the tune is lost once it scrolls off.

The app already computes a per-frame MIDI pitch (`r.m`) with YIN (see `research_notes/Note by Note singing app review/pitch_detection_and_scoring_tech.md`). That is the raw material for an on-device transcription.

---

## 1. On-device pipeline in the browser (transcribe → quantize → key → chords → backing → voice effects → render → export)

### Takeaway
A plain-JS "make my tune a song" feature can run entirely on the phone with no new dependencies:
1. Segment the app's existing YIN pitch track into notes.
2. Snap the notes to a beat grid.
3. Find the key with Krumhansl–Schmuckler.
4. Pick I/IV/V/vi chords per bar.
5. Play them with the app's existing piano synth plus a synthesized drum loop.
6. Optionally mix in the child's recorded voice with reverb, echo and gentle per-note pitch correction.
7. Render with OfflineAudioContext and hand a WAV to the iOS share sheet.

Spotify Basic Pitch (Apache-2.0) is the obvious off-the-shelf transcriber, but it adds a TensorFlow.js dependency and scored poorly on humming in a 2024 study. Pitch-shift libraries split cleanly by licence:
- SoundTouchJS (MPL-2.0) fits a public repo.
- Rubber Band (GPL-2.0 or commercial, no official WASM build) is awkward.
- Superpowered's WASM SDK needs a case-by-case licence before any public launch.

### Cited Findings

**Transcription (audio → notes)**
- **[Primary-read]** Basic Pitch TypeScript is published on npm as `@spotify/basic-pitch` under **Apache License 2.0**. You decode audio into an AudioBuffer and pass it to the `BasicPitch` class. The model produces frames, onsets and contours, which are post-processed into note events with onset, offset, pitch and velocity. Audio is resampled to 22,050 Hz and mono is recommended. — [spotify/basic-pitch-ts](https://github.com/spotify/basic-pitch-ts)
- **[Primary-read]** `package.json` depends on `@tensorflow/tfjs ^3.2.0` and `@tonejs/midi ^2.0.28`, and is versioned "0.0.0-development". It is an npm/TypeScript package, so a no-build PWA would have to vendor a prebuilt bundle. — [basic-pitch-ts package.json](https://github.com/spotify/basic-pitch-ts/blob/main/package.json)
- **[Primary-read]** The Python Basic Pitch is Apache-2.0 and ships TF, CoreML, TFLite and ONNX model formats. It "works best on one instrument at a time" and lets you set minimum and maximum frequency. — [spotify/basic-pitch](https://github.com/spotify/basic-pitch)
- **[Secondary]** The underlying paper is "A Lightweight Instrument-Agnostic Model for Polyphonic Note Transcription and Multipitch Estimation" (Bittner et al., ICASSP 2022). It is described as having roughly 16–17k parameters and as generalising to many instruments including vocals. — [ResearchGate record](https://www.researchgate.net/publication/360792948_A_Lightweight_Instrument-Agnostic_Model_for_Polyphonic_Note_Transcription_and_Multipitch_Estimation); [Spotify Engineering blog, June 2022](https://engineering.atspotify.com/2022/6/meet-basic-pitch)
- **[Search summary]** In a 2024 humming-transcription comparison ("Dynamic HumTrans"), Basic Pitch scored note F1 0.268 with onsets and 0.432 for notes only (octave-aware), below other methods tested. — [arXiv 2410.05455](https://arxiv.org/pdf/2410.05455)
- **[Search summary]** "CREPE Notes" (arXiv 2311.08884) is a method for segmenting a continuous pitch contour into discrete notes, which is the step the app would need on top of its YIN track. — [arXiv 2311.08884](https://arxiv.org/pdf/2311.08884)
- **[Search summary]** Standard singing-transcription evaluation uses 50 ms onset tolerance, an offset tolerance of max(50 ms, 20% of duration), and 50-cent pitch tolerance. — [Note-Level Singing Melody Transcription, arXiv 2502.12438](https://arxiv.org/pdf/2502.12438)

**Key detection**
- **[Search summary]** Krumhansl–Schmuckler key-finding builds a duration-weighted pitch-class histogram. It correlates that histogram with the Krumhansl–Kessler major/minor key profiles for all 24 keys and picks the highest correlation. Simple open implementations exist. — [Corentin-Lcs/music-key-finder](https://github.com/Corentin-Lcs/music-key-finder); [Humdrum keycor](https://extras.humdrum.org/man/keycor/)

**Pitch shifting and correction libraries (licences matter for a public repo)**
- **[Primary-read]** SoundTouchJS's repository LICENSE is **Mozilla Public License 2.0**.
  - It does real-time pitch shifting (semitones or ratio), tempo/playback-rate changes and time-stretching.
  - The `@soundtouchjs/audio-worklet` package provides an AudioWorklet implementation with AudioParam controls and **offline rendering**.
  - A separate `@soundtouchjs/formant-correction-worklet` offers "LPC-based formant preservation for natural-sounding vocal pitch shifts".
  - Phase-vocoder packages have also been added, and the project looks actively maintained.
  - It has no built-in "snap each note to the scale" auto-tune mode.

  Sources: [cutterbl/SoundTouchJS](https://github.com/cutterbl/SoundTouchJS); [LICENSE](https://github.com/cutterbl/SoundTouchJS/blob/master/LICENSE)
- **[Primary-read]** Rubber Band Library is **GPL v2 with a commercial licence option**. The README says "you may not legally distribute through any Apple App Store unless you have a commercial licence". It has an R3 engine recommended for "vocals and other sounds that have soft onsets and smooth pitch changes" and both real-time and offline APIs. The README does not mention an official WebAssembly/JS build. — [breakfastquay/rubberband](https://github.com/breakfastquay/rubberband)
- **[Primary-snippet]** Superpowered's JS/WASM Web Audio SDK is "licensed separately on a case-by-case basis". Developers may evaluate it and build private apps, but "may not launch publicly and/or without a license". Free licences are possible "at Superpowered's sole discretion". — [Superpowered licensing](https://superpowered.com/licensing); [Superpowered WASM page](https://superpowered.com/webassembly-wasm-audio-web-audio)
- **[Search summary]** Open-source browser pitch-correction demos exist:
  - "Autotone" uses CREPE plus Bernsee-style FFT pitch shifting.
  - `k15z/pitch-perfect-auto-tune` does real-time client-side correction.
  - VexWarp is a JS STFT/phase vocoder.
  - No maintained JS PSOLA library turned up.

  Sources: [uzstudio/autotone](https://github.com/uzstudio/autotone); [k15z/pitch-perfect-auto-tune](https://github.com/k15z/pitch-perfect-auto-tune); [0xfe/vexwarp](https://github.com/0xfe/vexwarp); [0xdevalias pitch-correction notes](https://gist.github.com/0xdevalias/7f4a5c31758e04aea5c2f5520e53accb)

**Backing, rendering, recording and export in Safari**
- **[Search summary]** Tone.js is MIT-licensed. It offers a transport, synths, effects, `Tone.Sampler` and `Tone.Offline`. Old GitHub issues (#234, #237, circa 2016–2017) reported that offline rendering on iOS Safari must start after a user gesture and had problems. Current status is unverified. — [Tone.js](https://github.com/Tonejs/Tone.js); [issue #237](https://github.com/Tonejs/Tone.js/issues/237); [issue #234](https://github.com/Tonejs/Tone.js/issues/234)
- **[Search summary]** MediaRecorder: Safari 14.1–18.3 cannot record `audio/webm` and falls back to `audio/mp4` (AAC). Safari Technology Preview 214 added ALAC and PCM codecs to MediaRecorder. — [WebKit MediaRecorder blog](https://webkit.org/blog/11353/mediarecorder-api/); [addpipe on ALAC/PCM in STP](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/); [testmuai MediaRecorder support](https://www.testmuai.com/learning-hub/mediarecorder-browser-support/)
- **[Search summary]** Web Share Level 2 (sharing files) arrived in Safari 15, and `navigator.canShare({files})` exists. `audio/wav`, `audio/mpeg` and `audio/x-m4a` are in the permitted file-type list, so a PWA can hand a WAV/M4A to the iOS share sheet (Save to Files, AirDrop, GarageBand). — [MDN navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share); [MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare); [Bits and Pieces, iOS 15 Safari file sharing](https://blog.bitsrc.io/sharing-files-from-ios-15-safari-to-apps-using-web-share-c0e98f6a4971)
- **[Search summary]** WebKit's GPU process has a memory limit. One project hit "com.apple.WebKit.GPU exceeded mem limit: ActiveSoft 300 MB" playing a 4-hour WebM, so long recordings in memory are a real risk on iPhone. — [lukleh/besedy issue #291](https://github.com/lukleh/besedy/issues/291)

**Heavier on-device ML generation**
- **[Search summary]** Transformers.js supports MusicGen text-to-music in the browser via ONNX Runtime (WASM or WebGPU). A benchmark article cites MusicGen as "too heavy to load on arrival". The melody-conditioned 1.5B variant is not shown running in-browser. — [SitePoint WebGPU vs WASM](https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/); [transformers.js](https://github.com/xenova/transformers.js/)

### Inferences
- **Use the app's own pitch track rather than Basic Pitch for the first version.** Reasons:
  - YIN already runs every frame at the child's phone. Note segmentation needs only a few dozen lines: median-smooth, split on voicing gaps and on pitch jumps over ~70 cents held for over ~80 ms, then take each segment's median pitch.
  - Basic Pitch adds TensorFlow.js (several hundred KB to MB of JS plus model weights, and a build step to bundle).
  - Basic Pitch needs the audio recorded, not just the pitch track.
  - Its published humming score was weak.
  - Basic Pitch is a sensible later upgrade only if octave and onset errors in children's singing prove to be a problem.
- **The pitch-track-only route needs no audio recording at all.** "Play my tune back on piano with drums and chords" can be built from the `{t, m}` frames alone. That avoids every privacy question about storing a child's voice. This is the strongest first step.
- **Rhythm quantization should be child-proof.**
  - Let the child pick "slow / medium / fast" (e.g. 70/90/110 bpm) instead of estimating tempo.
  - Snap onsets to 8th notes and merge notes shorter than one 16th.
  - Free-time singing by 4–7-year-olds will not have a stable beat. A fallback is "rubato mode": keep the child's timing and pad chords under each phrase. This is inference, not tested.
- **Harmonization rule of thumb** (inference from standard functional-harmony practice):
  - For each bar, score the major-key chords I, IV, V and vi (or i, iv, V and VI in minor) by how many of the bar's melody-note durations are chord tones.
  - Favour I at the start and end, and V before the final I.
  - This produces acceptable nursery-style accompaniment for diatonic tunes. It fails gracefully on chromatic wandering, which is common in young children, by falling back to a drone or "sus" pad.
- **Voice effects with built-in Web Audio nodes** (zero licence cost):
  - Reverb: ConvolverNode with a generated decaying-noise impulse.
  - Echo: DelayNode plus feedback GainNode.
  - Tone: BiquadFilter EQ, plus DynamicsCompressor.
- **Pitch correction ("make it in tune")** is feasible offline because the app knows each segment's measured pitch and the detected key.
  - For each note, compute the shift to the nearest scale tone (usually under ±1 semitone). Pitch-shift that segment with SoundTouchJS in an OfflineAudioContext and crossfade 10–20 ms at the joins.
  - A hard snap gives the robotic "Extreme Tuning" sound kids enjoy.
  - Partial correction (e.g. 50%) sounds natural.
  - Diatonic harmonies (a third above) come from the same machinery with a 3- or 4-semitone shift per note.
  - Formant artefacts are small for shifts under ~3 semitones.
  - SoundTouchJS's MPL-2.0 is file-level copyleft. Vendoring its unmodified files into the public repo with the licence header is straightforward. If modified, those files must stay MPL and public, which the public repo already is.
- **Avoid Rubber Band and Superpowered.**
  - Rubber Band: GPL-2.0 would arguably require the whole app to be GPL-compatible, there is no official WASM build, and the commercial licence costs money.
  - Superpowered: no public launch without a negotiated licence.
- **CPU, memory and file size** (arithmetic, not measured on iPhone):
  - One minute of mono Float32 at 48 kHz is 48,000 × 4 B × 60 ≈ 11.5 MB in memory.
  - A stereo 44.1 kHz offline render of 60 s is ≈ 21 MB.
  - A 16-bit mono WAV is ≈ 5.3 MB/min, 16-bit stereo ≈ 10.6 MB/min, and AAC at 128 kbps ≈ 1 MB/min.
  - Capping free-sing recordings at 60–90 s keeps everything well under the WebKit memory limits mentioned above.
  - OfflineAudioContext renders faster than real time on recent iPhones for this kind of graph: a few oscillators/samples, one convolver and one pitch shifter. This is an expectation, not a benchmark.
- **WAV encoding needs no library**: a 44-byte RIFF header plus Int16 samples, about 30 lines of JS. MediaRecorder's AAC output can be decoded with `decodeAudioData` for processing.
- **MIDI export needs no library either.** A minimal Standard MIDI File writer is about 60 lines, or `@tonejs/midi` can be used. Its licence was not checked in this session.

### Gaps
- No measured CPU, battery or latency numbers for Basic Pitch (TF.js), SoundTouchJS worklets or OfflineAudioContext on specific iPhone models were found.
- The current state of `Tone.Offline` on iOS Safari 18/26 was not verified. The cited issues are about 9 years old.
- Whether Home-Screen PWAs on iOS keep IndexedDB audio blobs indefinitely or can lose them to eviction was not verified. This matters if recordings are saved between sessions.
- SoundTouchJS licence history: older npm `soundtouchjs` releases may have carried a different licence (the C++ SoundTouch is LGPL). Check the licence of the exact package version vendored.
- No published accuracy figures for children's (age 4–12) singing transcription with YIN-based segmentation were found.

---

## 2. Cloud AI music generators that accept a voice or hummed melody (2026)

### Takeaway
By October 2026 several services can take a hummed or sung clip and build a full produced track:
- Suno: Covers, plus "Voices", which clones your singing voice.
- ElevenLabs Music v2: Audio Reference and "Vocals".
- Stability: Stable Audio 2.5/3.0 audio-to-audio and inpainting, instrumental only.
- Google Flow Music: uploads.

None of them suits a 4–12-year-old:
- Every major service is **18+**, or **13+ with parental consent** (Suno, BandLab, Stability audio).
- Most train on uploads by default or by consent box.
- Suno treats Voices data as biometric and keeps it up to 3 years.

Google's Lyria 3 / 3 Pro / 3.5 in Gemini do not accept audio input at all. Udio cannot export. Self-hosted MusicGen-Melody needs a GPU server, makes instrumental music only, and its weights are non-commercial. GarageBand on the parent's iPhone is the only "real song" tool that keeps the child's actual voice and stays on-device.

### Cited Findings

**Suno** (the most capable consumer option; many changes in Aug–Sep 2026)
- **[Secondary]** Audio input: you can record or upload audio, including singing or humming, then extend, cover, remix, make a Persona from it, or place it in Suno Studio. "Cover" is described as recreating accompaniment and arrangement "while keeping the melody and chord progression of your performance". — [suno.hk handbook ch. 8 (Covers & Audio Input)](https://suno.hk/suno-tutorial/suno-handbook-08-covers-audio/); [Jack Righteous, Personas 2026](https://jackrighteous.com/en-us/blogs/guides-using-suno-ai-music-creation/suno-ai-personas-update-dec-2025-what-changed-how-to-use-it)
- **[Secondary]** **Voices**:
  - Launched with Suno v5.5 (March 2026) for Pro and Premier subscribers.
  - It builds a voice model from your own singing so generated songs are sung "in your own voice".
  - Before creating it, you must record a randomly generated phrase, which is matched against the upload "to confirm the voice is actually yours".
  - It came to the iOS and Android apps in August 2026 (reported as live since 7 August 2026) and is "now available to try on free plans".

  Sources: [Dubspot, Suno Voices 2026](https://blog.dubspot.com/suno-voices-your-own-voice-2026); [Music Ally, 10 Aug 2026](https://musically.com/2026/08/10/suno-adds-vocal-recording-voices-feature-to-its-mobile-app/); [The Decoder on v5.5](https://the-decoder.com/suno-5-5-lets-users-sing-their-own-ai-generated-songs-with-a-personalized-voice-feature/); [RouteNote](https://routenote.com/blog/suno-voices-mobile-app/)
- **[Primary-snippet]** Minimum age: the Terms of Service, reported as effective **3 September 2026**, require users to be 18+, or at least 13 with parental or guardian consent. Under-13s may not register, "access, or otherwise use the service in any capacity". In EU countries the consent age is 13–16. — [Suno Terms of Service](https://suno.com/terms-of-service); [Suno Help: Minimum Age](https://help.suno.com/en/articles/9720001)
- **[Primary-snippet]** Training and retention:
  - Suno's privacy notice says it uses User Activity Information, "Submissions" and other Content "to train and enhance the models".
  - For Voices, it records your speech, builds a voice model, "may treat it as biometric data", trains on it, and keeps it **up to three years after last use**.
  - The Voices consent box grants permission to "train, develop, fine-tune or otherwise improve" its models.
  - The Services are "not intended" for under-13s.

  Sources: [Suno Privacy Notice](https://suno.com/privacy); [about.suno.com/privacy](https://about.suno.com/privacy). The three-year and consent-box wording came via search summaries; re-read before quoting.
- **[Secondary]** Licensing and models:
  - Warner Music Group settled with Suno in **November 2025**.
  - In **September 2026** Suno launched licensed models v6, v6-wild and v6-mini (with WMG, BMG and Believe). v6 and v6-wild are Pro/Premier only, and v6-mini is for all users.
  - Older models are being retired.
  - **Free-tier songs can no longer be downloaded** (play and share only).
  - Sony and UMG suits were still active in September 2026.

  Sources: [ProPakistani, 10 Sep 2026](https://propakistani.pk/2026/09/10/suno-launches-licensed-ai-music-models-after-warner-copyright-settlement/); [AllAboutAI](https://www.allaboutai.com/ai-news/free-suno-downloads-are-ending-as-warner-music-backs-licensed-ai-models/); [Music Ally, 25 Nov 2025](https://musically.com/2025/11/25/ai-music-firm-suno-strikes-first-licensing-deal-with-warner-music-group/)
- **[Secondary]** Price:
  - Free: 50 credits a day, no commercial use, watermarked, no downloads.
  - Pro: US$10/month (US$8 annual), 2,500 credits, about 20 downloads a month, commercial rights.
  - Premier: US$30/month (US$24 annual), 10,000 credits plus Suno Studio, about 60 downloads.
  - Pricing appears global; no Australia-specific pricing was found.

  Sources: [Lumi Music, Suno pricing 2026](https://lumimusic.ai/blog/suno-pricing); [StackSheriff](https://stacksheriff.com/ai-tools/suno-pricing/). Download counts may have changed with v6.
- **[Secondary]** API: there is **no official public API**. On 1 July 2026 CPO Jack Brody posted an intake form for a developer API, framed as "exploring". There are no public keys, docs or timeline. Third-party "Suno APIs" are unofficial wrappers. — [Music Business Worldwide](https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/); [tunova.ai](https://tunova.ai/guides/is-there-an-official-suno-api)

**Udio**
- **[Secondary]** Udio settled with UMG in October 2025 and Warner in November 2025. Downloads of audio, video and stems were **disabled on 30 October 2025**, with no restoration date as of mid-2026. The new licensed platform is a "walled garden": creations stay inside, with no off-platform export. — [WebProNews](https://www.webpronews.com/udio-halts-ai-song-downloads-after-copyright-settlement-with-umg-warner/); [Undetectr, Udio review 2026](https://undetectr.com/blog/udio-review-2026); [Chartlex, walled garden explained](https://www.chartlex.com/blog/business/udio-umg-walled-garden-explained-2026); [Hypebeast, Oct 2025](https://hypebeast.com/2025/10/umg-x-udio-settle-launch-licensed-ai-music-platform-in-2026)

**ElevenLabs Music (Eleven Music v2/v2.5)**
- **[Primary-snippet]** Music v2 adds:
  - Section-by-section composition plans and inpainting.
  - An **Audio Reference** upload. Help docs say "~30 seconds", while another page says 10 s to 5 min, which is inconsistent. It steers style, instrumentation, tempo and mood, does "not copy or remix the uploaded audio", and is screened for copyright.
  - A **Vocals** feature for a "consistent voice … be it your own or one from a Vocal Library".
  - A reported "Voice-to-Song" tool.

  Sources: [ElevenLabs: What is Audio Reference?](https://elevenlabs.io/docs/help-center/product/core-capabilities/music/what-is-audio-reference); [Introducing Vocals](https://elevenlabs.io/blog/introducing-vocals-a-consistent-voice-for-your-elevenmusic-songs); [Introducing References](https://elevenlabs.io/blog/introducing-references-sound-control-for-music-v2). **Conflict:** an August 2026 InVideo summary says ElevenLabs "doesn't support singing as an input" ([InVideo](https://invideo.io/blog/elevenlabs-ai-voice-models/)). Treat whether a child's *sung melody* is followed as unverified. Audio Reference explicitly steers style, not melody.
- **[Primary-snippet]** Age: under the non-EEA Terms, you may not use the Services if under 18 (or the age of majority). The prohibited-use policy bars making the services available to anyone under 13 or aged 13–18. A **Music API** exists with separate Music API Terms. — [ElevenLabs Terms (non-EEA)](https://elevenlabs.io/terms-of-use); [Prohibited Use Policy](https://elevenlabs.io/use-policy); [Music API Terms](https://elevenlabs.io/music-api-terms); [Eleven Music API](https://elevenlabs.io/eleven-music-api)

**Stability AI: Stable Audio 2.5 and 3.0**
- **[Secondary]** Stable Audio 2.5 supports text-to-audio, **audio-to-audio** (upload a sound and transform it into new instruments or styles) and **inpainting/extension**. It is trained on licensed AudioSparx and Freesound data. The API costs 20 credits (US$0.20) per result. — [The Rundown, Stable Audio 2.5](https://www.therundown.ai/tools/stable-audio-2-5); [Stability REST API](https://platform.stability.ai/docs/api-reference)
- **[Secondary]** **Stable Audio 3.0** was released **20 May 2026**.
  - Three of its models are open weights on Hugging Face under the Stability AI Community License, which allows free commercial use under US$1M annual revenue.
  - The 2.7B "Large" model is API-only.
  - The models do inpainting, but **"none of the models do vocals or lyrics"**.

  Sources: [The Decoder](https://the-decoder.com/stability-ai-launches-stable-audio-3-0-with-up-to-six-minute-tracks-and-open-weights/); [Dubspot review](https://blog.dubspot.com/stable-audio-3-review)
- **[Primary-snippet]** Stability's terms: the general technology is for adults (18+). **Audio Services: 13+** (or the local minimum), and under-18s may use them only with parental permission and supervision, with the parent agreeing to the Terms. A voice clip uploaded to Stable Audio "can be stored and used unless you opt out of training" (third-party summary of the terms). — [Stability AI Terms of Service](https://stability.ai/terms-of-service); [2025 Acceptable Use Policy](https://stability.ai/2025-acceptable-use-policy); [Gen Digital Agent Trust Hub](https://ai.gendigital.com/app/stability-ai)

**Google: Lyria 3 / 3 Pro / 3.5, Gemini app, Flow Music**
- **[Primary-snippet]** Lyria 3 came to the Gemini app in beta on **18 Feb 2026**. It makes 30-second tracks from text or images, writes lyrics automatically, is SynthID-watermarked, and is free for users **aged 18+**. — [Google blog: Lyria 3 in Gemini](https://blog.google/innovation-and-ai/products/gemini-app/lyria-3/); [9to5Google](https://9to5google.com/2026/02/18/gemini-app-music-lyria-3/); [TechCrunch](https://www.techcrunch.com/2026/02/18/google-adds-music-generation-capabilities-to-the-gemini-app/)
- **[Secondary]** Lyria 3 Pro launched **25 March 2026**. It "only takes text"; you "can't feed it a melody, hum a tune, or upload a reference track". — [findskill.ai](https://findskill.ai/blog/google-lyria-3-pro-ai-music-gemini/); [Google blog: Lyria 3 Pro](https://blog.google/innovation-and-ai/technology/ai/lyria-3-pro/)
- **[Primary-snippet]** Lyria 3.5 first launched in Flow Music on 29 July 2026, then reached the Gemini app, AI Studio and the Gemini API around **4 September 2026**. It accepts text and images, **not audio or MIDI melody**. One reported API price is US$0.08 per song. Gemini music generation is reported as available in Australia, for over-18s. — [Gemini API: Lyria 3.5 music generation](https://ai.google.dev/gemini-api/docs/music-generation); [Google blog: Lyria 3.5 in Gemini](https://blog.google/innovation-and-ai/products/gemini-app/better-tracks-lyria-gemini/); [cellcog.ai](https://cellcog.ai/blog/lyria-3-5/); [The Next Web](https://thenextweb.com/news/google-lyria-3-5-gemini-app-api-music-generation-gema-suno-munich-ruling-deezer-uploads)
- **[Secondary]** Google acquired ProducerAI (formerly Riffusion) and rebranded it **Google Flow Music** (Google Labs, Lyria-powered).
  - Users can upload audio or images as a starting point.
  - From 16 July 2026 it accepts direct uploads of user beats and instrumentals.
  - Flow Music requires an **age-verified user 18+**.
  - The old Riffusion terms were 13+ with parental involvement for minors.

  Sources: [Music Business Worldwide on the acquisition](https://www.musicbusinessworldwide.com/google-acquires-ai-music-platform-and-suno-challenger-producerai/); [pasqualepillitteri.it, Flow Music uploads](https://pasqualepillitteri.it/en/news/8251/google-flow-music-upload-your-beats-remix); [The Rundown, Lyria 3.5 / Flow Music](https://www.therundown.ai/tools/lyria-3-5); [Riffusion terms](https://www.riffusion.com/terms)

**Meta MusicGen-Melody (open source, self-hostable)**
- **[Primary-snippet]** MusicGen code is **MIT**, and model weights are **CC-BY-NC 4.0** (non-commercial).
  - The melody variant is a 1.5B-parameter LM over 32 kHz EnCodec, conditioned on a **chromagram** extracted from reference audio.
  - It was trained on Meta Music Initiative, Shutterstock and Pond5 data.

  Sources: [MusicGen model card](https://facebookresearch.github.io/audiocraft/model_cards/MUSICGEN_MODEL_CARD.html); [HF facebook/musicgen-melody](https://huggingface.co/facebook/musicgen-melody/resolve/main/README.md); [audiocraft issue #198 on weights licence](https://github.com/facebookresearch/audiocraft/issues/198)

**BandLab**
- **[Search summary]** BandLab offers several AI tools:
  - SongStarter: an AI idea generator for "royalty-free music ideas".
  - Voice Cleaner: noise removal, on the Pro/Max plans.
  - Others including AI mastering and a splitter.

  Age: 13+ with parent or guardian consent until majority, but **users in Australia must be at least 16**. It has social features. — [BandLab AI tools blog](https://blog.bandlab.com/bandlab-ai-tools-best-ai-music-generator/); [BandLab Help: Minor Safety](https://help.bandlab.com/hc/en-us/articles/52223951629465-Minor-Safety); [BandLab Voice Cleaner](https://www.bandlab.com/products/voice-cleaner)

**Apple GarageBand for iPhone** (free, on-device)
- **[Primary-snippet]** GarageBand for iPhone:
  - Imports audio (AIFF, WAV, Apple Loops, AAC, MP3) **and MIDI files** from the Files app or iCloud Drive.
  - Has a virtual **Drummer** that plays genre grooves.
  - Its Audio Recorder has "Fun" presets including **Extreme Tuning**, a vocal pitch-correction effect that uses the song's key and scale. Apple advises setting the song key first, and you can adjust Pitch Control and Distortion.

  Sources: [Apple: Import audio and MIDI files (GarageBand iPhone)](https://support.apple.com/guide/garageband-iphone/import-audio-and-midi-files-chsab9d208e/ios); [Apple: Use Drummer](https://support.apple.com/guide/garageband-iphone/use-drummer-chs9692b2133/ios); [Apple: Use Extreme Tuning in GarageBand for iOS](https://support.apple.com/en-us/101982)

**Voice-cloning singing services**
- **[Primary-snippet]** Kits.ai:
  - Users must be **18+**.
  - Custom voice models are built from "Provided Voice Files", and the user grants Kits a licence to use them "for the purpose of providing and improving the Services".
  - Supplying a voice without authority is prohibited.

  Source: [Kits.ai Terms of Service](https://www.kits.ai/terms-of-service)
- **[Primary-snippet]** Voice-Swap requires users to be **18+**. Singing services on standard plans are **non-commercial only**. — [Voice-Swap Terms](https://www.voice-swap.ai/terms-conditions)

**Kid-focused services**
- **[Secondary, low quality]** A kids-AI-tools site recommends "Splash Music" for ages 6–10 (preset beats, AI backing), Soundtrap (Spotify) with an education version, and Boomy. It also notes "a 2026 systematic review reported that early childhood settings were absent from research entirely". None of these were verified against the vendors' own terms. — [kidsaitools.com](https://www.kidsaitools.com/en/articles/ai-music-maker-for-kids); [TuneLark, questions to ask](https://www.tunelark.com/blog/ai-music-apps-for-kids/)

### Inferences
- **Summary table** (ages and dates as reported; ✔ = yes, ✘ = no, ? = unverified):

| Service | Takes child's singing/hum? | Keeps child's *actual* voice? | Min age | Trains on uploads? | Price | Official API | Output licence |
|---|---|---|---|---|---|---|---|
| Suno Cover / audio upload | ✔ (melody + chords kept) | ✘ (AI re-sings) | 18, or 13+ with parental consent; under 13 barred | ✔ (Submissions) | Free (no downloads), Pro US$10, Premier US$30 | ✘ (exploring, Jul 2026) | Free non-commercial; paid commercial |
| Suno Voices | ✔ | Cloned model of voice, not the recording | same | ✔ with consent; biometric; kept ≤3 yrs | Free trial, Pro+ | ✘ | as above |
| Udio | ? | ✘ | ? | ? | ? | ✘ | No export at all |
| ElevenLabs Music v2 | Style reference only (melody following unverified) | "Vocals" claims own voice | **18+** | ? | paid plans | ✔ Music API | per plan |
| Stable Audio 2.5 / 3.0 | ✔ audio-to-audio / inpaint | ✘ (no vocals in 3.0) | Audio 13+ with parent | ✔ unless opt-out | API US$0.20/result; 3.0 small models open | ✔ | Community licence |
| Google Gemini Lyria 3 / 3 Pro / 3.5 | ✘ (text/image only) | ✘ | 18+ | ? | Free in app; API ~US$0.08/song | ✔ (Gemini API) | ? |
| Google Flow Music | ✔ uploads (beats/instrumentals) | ? | 18+ age-verified | ? | ? | ✘ | ? |
| MusicGen-Melody (self-host) | ✔ (chromagram) | ✘ | n/a (own server) | n/a | GPU server cost | own | CC-BY-NC weights |
| BandLab | Recording ✔; AI SongStarter text-led | ✔ (you record) | 13+ with consent; **16+ in Australia** | ? | Free + Pro/Max | ✘ | ? |
| GarageBand (iPhone) | ✔ import WAV/MIDI | ✔ (on-device) | Apple Account rules | ✘ (on-device) | Free | n/a | User owns |
| Kits.ai / Voice-Swap | ✔ | Clone | **18+** | ✔ ("improving the Services") | paid | Kits ? | non-commercial on standard plans (Voice-Swap) |

- **A 4–12-year-old cannot lawfully be the user of any of the major generators.**
  - Suno bars under-13s "in any capacity".
  - ElevenLabs, Gemini/Flow, Kits and Voice-Swap are 18+.
  - BandLab is 16+ in Australia.
  - Even a parent uploading a young child's voice to their own adult account sits badly with "not intended for under-13s", and with "voice must be yours" verification in Suno Voices and ElevenLabs cloning.
- **Only a 13–17 teen with parental consent could use Suno or Stable Audio audio services under their own terms.** Suno's Voices still creates a retained, trained-on biometric model, which is a high privacy cost for a hobby result.
- **None of these can be integrated into a no-server public-GitHub-Pages PWA safely.**
  - Suno has no official API.
  - The others need secret API keys, which cannot be hidden in a public client-side repo. Any key in the JS would be scraped and abused.
  - Calls would upload a child's voice from the app itself.
- **The AI generators re-synthesise rather than keep the child's voice.** The "real song with their own voice" result is either a clone (Suno Voices, ElevenLabs Vocals, Kits) or GarageBand/on-device mixing of the actual recording. For kids, on-device mixing is both safer and arguably more honest: it is *their* singing, polished.
- **MusicGen-Melody is the only melody-conditioned open model,** but it fails every constraint of this app:
  - It needs a server/GPU.
  - It is too large for an iPhone browser.
  - It outputs instrumental music; the model card notes weak vocals, recalled but not re-read here.
  - Its weights are non-commercial, though that is acceptable for a free family app.
- **Many of these facts changed in the last 2–3 months:**
  - Suno: Voices on mobile (Aug 2026), new ToS (3 Sep 2026), v6 and the end of free downloads (Sep 2026).
  - Google: Lyria 3.5 (Sep 2026) and Flow Music uploads (Jul 2026).
  - Stability: Stable Audio 3.0 (May 2026).

  The report should date-stamp them.

### Gaps
- The full text of the Suno ToS (3 Sep 2026), the Suno privacy notice and the ElevenLabs Music terms could not be read directly (egress blocked). Ages and training wording come from search summaries of those official pages.
- Udio's 2026 minimum age, training policy and whether the walled-garden relaunch has gone live were not found.
- Whether ElevenLabs Music v2 actually follows a sung melody, rather than only style, could not be verified, and sources conflict.
- YouTube Dream Track / YouTube Create "hum-to-song" status in 2026 was not researched for lack of time, as were Apple Logic Pro (iPad/Mac) 2026 features such as Session Players and Stem Splitter.
- GarageBand's App Store age rating and whether it is available to child Apple Accounts by default were not verified.
- No genuine, verified kid-focused (under-13, COPPA/Australian-compliant) "sing → song" AI service was found. The aggregator's "Splash Music" claim is unverified.

---

## 3. Privacy and law for children's voice recordings (Australia first, US where US services are involved)

### Takeaway
Australia's Children's Online Privacy Code was released as an exposure draft on 31 March 2026 and must be registered by 10 December 2026; its commencement date is not yet set.
- It will impose consent, parental consent for under-15s, strict-necessity and deletion rules on **APP entities** whose online services are likely to be accessed by children.
- The small-business (≤A$3M turnover) exemption is expected to carry over.
- An individual running a family app is also outside the APPs for personal, family or household affairs (s 16).

Voice recordings are personal information, and biometric uses of voice are sensitive information. In the US, the amended COPPA Rule (in force since 23 June 2025, compliance due 22 April 2026) lists voiceprints as personal information.

Because Note by Note keeps everything on the phone and uploads nothing, it collects no personal information at all. Any upload to a third party moves the legal risk, and the binding constraint becomes that service's age terms. A parent-initiated export through the iOS share sheet keeps both the app and the parent on safe ground.

### Cited Findings
- **[Primary-snippet]** The OAIC released the exposure draft **Privacy (Children's Online Privacy) Code 2026** on **31 March 2026**.
  - Submissions closed **5 June 2026**.
  - The finished Code **must be registered by 10 December 2026**, and commencement is not yet confirmed.
  - Key features:
    - a consent-based model, requiring consent for collection, use and disclosure of a child's personal information (with exceptions);
    - collection only where "strictly necessary";
    - for **under-15s, consent must come from a parent or guardian**;
    - a duty to consider the child's best interests;
    - consent for targeted advertising;
    - children's right to request deletion.
  - A breach of the Code is a breach of the Privacy Act.

  Sources: [OAIC media release](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code); [Attorney-General media release, 31 Mar 2026](https://ministers.ag.gov.au/media-centre/draft-childrens-online-privacy-code-released-31-03-2026); [Gilbert + Tobin](https://www.gtlaw.com.au/insights/exposure-draft-of-childrens-online-privacy-code-released); [DLA Piper, Apr 2026](https://privacymatters.dlapiper.com/2026/04/australia-exposure-draft-of-childrens-online-privacy-code-signals-tougher-standards/)
- **[Secondary]** Scope: the Code applies to an **APP entity** providing a social media service, relevant electronic service or designated internet service that is **likely to be accessed by children or primarily concerned with children's activities**. Examples given include family photo-sharing apps. Because it applies to APP entities, the **small business exemption (annual turnover ≤ A$3M) would also apply**. — [Baker McKenzie, May 2026](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft); [MinterEllison](https://www.minterellison.com/articles/oaics-childrens-online-privacy-code-what-to-expect); [Allens, Apr 2026](https://www.allens.com.au/insights-news/insights/2026/04/draft-childrens-online-privacy-code-proposed-protections-to-have-material-impact-on-online-services/)
- **[Primary-snippet]** Privacy Act 1988 **s 16**: nothing in the APPs applies to personal information collected, held, used or disclosed by an individual "only for the purposes of, or in connection with, his or her personal, family or household affairs". — [Privacy Act s 16 (AustLII)](https://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/pa1988108/s16.html); [ALRC Report 108 on personal/non-business use](https://www.alrc.gov.au/publication/for-your-information-australian-privacy-law-and-practice-alrc-report-108/43-other-private-sector-exemptions/personal-or-non-business-use/)
- **[Primary-snippet]** The OAIC lists **voice** among biometric features. Biometric information (as used for verification or identification, and biometric templates) is **sensitive information** with stricter collection rules. Voice recordings are personal information. — [OAIC: Biometric scanning](https://www.oaic.gov.au/privacy/your-privacy-rights/surveillance-and-monitoring/biometric-scanning); [OAIC: What is personal information?](https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/what-is-personal-information)
- **[Primary-snippet]** US COPPA amended Rule:
  - Published in the Federal Register on 22 April 2025 and effective **23 June 2025**, with full compliance due **22 April 2026**.
  - It adds "biometric identifiers", **including voiceprints**, to the definition of personal information.
  - Civil penalties reach up to US$53,088 per violation.

  Sources: [Federal Register, COPPA Rule, 22 Apr 2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule); [Latham & Watkins client alert](https://www.lw.com/admin/upload/SiteAttachments/FTC-Publishes-Updates-to-COPPA-Rule.pdf); [privacylawmap.com](https://privacylawmap.com/blog/coppa-compliance-guide-2026)
- **[Primary-snippet]** FTC Enforcement Policy Statement on voice recordings (23 October 2017; Federal Register 8 December 2017): the FTC will not enforce lack of parental consent when a child's voice recording is used **solely as a replacement for written words** (e.g. a voice search), is **deleted immediately** afterwards, is disclosed in the privacy policy, and is not used for any other purpose. It does not apply if the audio asks for personal information such as a name. — [FTC policy statement PDF](https://ftc.gov/system/files/documents/public_statements/1266473/coppa_policy_statement_audiorecordings.pdf); [Federal Register, 8 Dec 2017](https://www.federalregister.gov/documents/2017/12/08/2017-26509/enforcement-policy-statement-regarding-the-applicability-of-the-coppa-rule-to-the-collection-and-use); [Hunton](https://www.hunton.com/hunton-retail-law-resource/ftc-issues-policy-statement-on-coppa-and-voice-recordings)
- **[Secondary]** A parent-oriented guide advises finding out "where those recordings go, how long they are kept, and whether you can delete them" before letting children use AI music apps. — [TuneLark](https://www.tunelark.com/blog/ai-music-apps-for-kids/)

### Inferences
- **Note by Note today, and with any purely on-device song feature, collects no personal information.** No data reaches the owner or any server; GitHub Pages only serves static files. The Privacy Act and the future Children's Code are therefore effectively not engaged. Even if they were, s 16 (family use) and the small-business exemption point the same way.
  - This holds only while nothing is transmitted: no analytics, no upload, no API call with audio.
  - It is worth stating plainly in the app's About text: "Your singing never leaves this phone."
- **The rules bite on the moment of upload.**
  - If the *app* sent a child's voice to Suno, ElevenLabs or Stability, the app would be the conduit for disclosing a child's (potentially biometric) personal information to a third party whose terms bar under-13s or under-18s.
  - Those vendors' COPPA and Australian obligations would be triggered, and the vendor would likely train on it.
  - This is high-risk and should not be built into the app.
- **A responsible parent-initiated flow** (inference, based on the share-sheet facts in section 1 and the GarageBand facts in section 2):
  1. The child sings in Free sing. The audio stays in memory only, and is discarded on leaving the screen unless the child taps "Keep".
  2. The app makes the song on-device: backing, effects, optional tuning.
  3. "Send to grown-up" opens the iOS **share sheet** with a WAV/M4A, plus optionally a `.mid` of the melody and chords. It sits behind a simple parent gate (e.g. hold for 3 s, or a sum a young child can't do).
  4. The parent decides where it goes: Photos/Files, AirDrop to their phone, or **GarageBand**, which is on-device, adds Drummer and Extreme Tuning, and keeps the child's real voice.
  5. If a parent then chooses a cloud tool, they do so under their own account and that tool's terms. Note that most terms bar using a young child's voice, and Suno/ElevenLabs voice cloning requires the account holder's own voice.
- Retention of "kept" songs, if added, should be local (IndexedDB) with a visible "Delete all my recordings" button. That mirrors the draft Code's deletion right even though the Code would not formally apply.
- The FTC's 2017 "replace written words" carve-out is irrelevant to music-making. Keeping a recorded song is not that use, so US services that receive kids' songs need verifiable parental consent.

### Gaps
- The full OAIC exposure-draft text could not be read (egress blocked). Whether "voice recording" is named, how "likely to be accessed by children" is defined, and whether non-commercial or free apps by individuals are expressly excluded were not confirmed beyond the law-firm summaries.
- Whether the final Code (due by 10 Dec 2026) will change from the draft is unknown as of 1 Oct 2026.
- The exact text of the APP definition of biometric "sensitive information" (s 6(1)) was not re-read. The OAIC summary says "some aspects of biometric information".
- The statutory tort for serious invasions of privacy (in force from 10 June 2025) and any eSafety or social-media-age interplay were not researched for this topic.

---

## 4. Claude as a creative partner without APIs or uploads (text in, text out)

### Takeaway
This is feasible and low-risk, provided a **parent** does the Claude step: Claude.ai's consumer terms are 18+.
1. The app copies the transcribed tune as compact text: key, tempo, notes with durations, and phrase breaks.
2. In Claude, the parent asks for lyrics, a chord chart or an arrangement.
3. Claude replies in a strict, simple song format.
4. The parent pastes it back into the app, which validates it and turns it into a "My song" playable in the existing pitch lane with lyrics and piano.

LLM accuracy with formal notation such as ABC is only moderate, so the app's format should be tiny, forgiving and validated. Lyrics and chord choices are where Claude adds the most value.

### Cited Findings
- **[Secondary]** Anthropic's Consumer Terms require Claude.ai account holders to be **18+**. Users affirm their age at signup. In June 2026 Anthropic added "Verification Data" to its privacy policy for age checks (Yoti, Persona), and accounts confirmed to be minors' are disabled. Organisations may build the Claude API into products for under-18s if they add safeguards. — [Anthropic: Protecting the wellbeing of our users](https://www.anthropic.com/news/protecting-well-being-of-users); [banthebots.org explainer](https://www.banthebots.org/explainers/ai-chatbot-age-requirements); [Common Sense Media risk assessment](https://www.commonsensemedia.org/ai-ratings/claude)
- **[Vendor claim, third party]** A transcription vendor says Claude can discuss pasted ABC notation or chord charts and "sketch a single-line melody … in a text notation like ABC". It also says Claude cannot transcribe audio into sheet music. — [Songscription blog](https://www.songscription.ai/blog/can-gemini-make-sheet-music)
- **[Search summary]** In a 2025 study on teaching LLMs music theory, Claude reached about 57% accuracy on ABC-notation tasks with in-context guidance, about 15 points better than without. Other evaluations found most models other than GPT-4 produced valid, renderable ABC less than 50% of the time (2024 models). — [arXiv 2503.22853](https://arxiv.org/pdf/2503.22853); [arXiv 2407.21531](https://arxiv.org/html/2407.21531v1)
- **[Local]** The app already has a "Copy results for Claude" button that copies a text report for pasting into a Claude chat, so the clipboard round-trip pattern exists. (From the assignment context; the button's code was not re-read for this topic.)

### Inferences
- **A suggested minimal format.** It is easy for Claude to emit and trivial to parse in plain JS:
  ```
  NBN-SONG v1
  title: Rainbow Puppy
  key: G major
  tempo: 90
  time: 4/4
  chords: | G | C | D | G |
  notes: G4/1 A4/1 B4/2 | D5/2 B4/2 | ...   (pitch/duration in beats; "r/1" = rest)
  lyrics: Rain-bow pup-py | jump-ing high | ...   (hyphenated syllables, one per note)
  ```
  - The app validates note names, range (transposing into the child's saved range as it already does for songs), bar lengths and syllable counts.
  - It shows friendly errors, or repairs, e.g. by padding bars.
  - It is safer than full ABC because there are fewer ways to be wrong, and the app can auto-fix mismatches.
- **Where Claude helps most:**
  - age-appropriate lyrics that scan to the child's own rhythm;
  - a chorus or verse structure (repeat the child's best phrase as a chorus);
  - chord suggestions;
  - a title;
  - an "answer phrase" for a call-and-response duet.
  These are text tasks that LLMs do well. The melody stays the child's.
- **Privacy:** only notes and timings leave the phone, by the parent's own paste. No audio or name is included, and no API key or server is needed. This fits the app's architecture and the 18+ rule (parent-operated).
- **Appeal:** the "sing → Claude writes words → sing your own song in the pitch lane with a score" loop turns Free sing into a creative project. It reuses the existing song player and scoring, so it gives kids a reason to practise their *own* tune, and adds value pedagogically too.
- **Risks:**
  - The child might want to paste into Claude directly. The UI copy should say "Ask a grown-up to paste this into Claude".
  - Claude outputs may need small fixes. A tolerant parser plus a preview before saving mitigates this.

### Gaps
- No user testing of this round-trip with children was found. Appeal is inferred.
- Claude's accuracy at producing *this specific* small format was not tested in this research. The ABC benchmarks are only a rough proxy and concern older models.
- iOS PWA clipboard behaviour for *reading* (`navigator.clipboard.readText`, which needs a gesture and may prompt) was not checked. A paste-into-textarea UI avoids the issue.

---

## 5. Recommend a staged plan → Implications for Note by Note

### Takeaway
Build everything kids touch on-device first:
- **Stage 1:** score the made-up song and play it back as a song from the pitch track alone, with no recording.
- **Stage 2:** save it as a "My song" to sing again in the pitch lane, with a Claude-assisted lyrics/chords text round-trip done by a parent.
- **Stage 3:** optional in-memory voice recording with reverb, echo, harmony and gentle auto-tune, rendered on-device and shared to a parent via the iOS share sheet, plus MIDI export for GarageBand.

Do not integrate any cloud generator into the app. Suno, ElevenLabs, Gemini/Flow, Udio and Kits/Voice-Swap are all 13+/18+, have no usable keyless API, and most train on uploads. Mention them only as parent-side options for teens 13+ with consent, with clear caveats.

### Cited Findings
- Facts underpinning the ranking are cited in sections 1–4:
  - Age limits: [Suno ToS](https://suno.com/terms-of-service), [ElevenLabs Terms](https://elevenlabs.io/terms-of-use), [Kits.ai Terms](https://www.kits.ai/terms-of-service), [BandLab Minor Safety](https://help.bandlab.com/hc/en-us/articles/52223951629465-Minor-Safety), [Google Lyria 3 blog](https://blog.google/innovation-and-ai/products/gemini-app/lyria-3/), [Stability ToS](https://stability.ai/terms-of-service).
  - No official Suno API: [MBW](https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/).
  - Licences: [SoundTouchJS MPL-2.0](https://github.com/cutterbl/SoundTouchJS/blob/master/LICENSE), [Basic Pitch Apache-2.0](https://github.com/spotify/basic-pitch-ts), [Rubber Band GPL/commercial](https://github.com/breakfastquay/rubberband), [Superpowered case-by-case](https://superpowered.com/licensing).
  - iOS share and import: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [GarageBand import](https://support.apple.com/guide/garageband-iphone/import-audio-and-midi-files-chsab9d208e/ios), [Extreme Tuning](https://support.apple.com/en-us/101982).
  - Australian law: [OAIC draft Code](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code), [Privacy Act s 16](https://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/pa1988108/s16.html).

### Inferences

**Implications for Note by Note: options ranked** (value to kids → cost → effort for a plain-JS PWA → privacy/legal risk)

1. **"My tune" score and playback from the pitch track (no audio recorded).** Value: very high. Cost: A$0. Effort: low–medium (~200–400 lines). Risk: none.
   - Stop discarding frames in `freeCtrl`: keep the whole take, up to 60–90 s.
   - On "Done", segment notes, detect the key, and show a fun scorecard, for example:
     - range used ("you sang 9 notes, G3 to E4");
     - longest steady note;
     - "in-tune-ness" relative to the detected key's scale;
     - a melody shape picture.
   - Then "Play it back" with the existing piano synth, auto-chords (I/IV/V/vi) and a simple drum pattern (oscillator kick, noise snare/hat), choosing slow/medium/fast.
   - This answers the owner's question "can we score the made-up song?" without touching privacy.
2. **Save as "My song" and sing it again in the pitch lane.** Value: high, since it turns improvisation into practice. Cost: A$0. Effort: low–medium. Risk: none (local storage only).
   - Quantized notes become the same song structure the 8 public-domain songs use. The child can re-sing their own tune with the scrolling lane and normal scoring, and their own song could unlock after the warm-up like other songs.
3. **Claude text round-trip (parent-operated).** Value: medium–high; lyrics and chorus make it feel like a "real song". Cost: A$0 (parent's own Claude account). Effort: low (copy and paste plus a small parser for a tiny `NBN-SONG v1` format). Risk: very low (notes only, pasted by an adult; Claude.ai is 18+).
   - Extends the existing "Copy results for Claude" pattern.
4. **On-device voice recording with effects and "magic tune" (Stage 3).** Value: very high; this is the "real song with their own voice" moment. Cost: A$0. Effort: medium–high. Risk: low if audio stays in memory or local storage and is only exported by a parent.
   - Capture raw PCM via the existing mic graph (AudioWorklet or ScriptProcessor tap) or MediaRecorder (AAC), capped at 60–90 s.
   - Mix the voice with the backing from option 1, plus ConvolverNode reverb, DelayNode echo and optional per-note pitch correction or harmony using vendored **SoundTouchJS (MPL-2.0)** offline.
   - Render via OfflineAudioContext, encode WAV in ~30 lines, and play.
   - Test memory on the oldest family iPhone.
   - Avoid Rubber Band (GPL/commercial) and Superpowered (licence required).
5. **Parent-gated export to the share sheet: WAV + MIDI → GarageBand.** Value: medium; lets a parent or teen go further with real tools. Cost: A$0. Effort: low once option 4 exists (`navigator.share({files})` with a WAV/M4A and a tiny `.mid` writer). Risk: low; the parent chooses the destination.
   - GarageBand gives Drummer, instruments on the imported MIDI melody, and Extreme Tuning, all on-device and keeping the child's real voice.
6. **Optional upgrade: Basic Pitch transcription of the recording.** Value: low–medium (may fix octave or onset errors). Cost: A$0 (Apache-2.0). Effort: medium–high (TF.js bundle and model weights vendored with no build step, plus load time). Risk: none (on-device).
   - Only worth trying if option 1's YIN segmentation proves poor on young children. Its published humming F1 is weak.
7. **Teens only, outside the app: Suno Cover or Voices, or Stable Audio.** Value: high "wow" for a 13–17 teen. Cost: free to US$10–30 a month. Effort: none for the app. Risk: medium–high.
   - Suno: 13+ requires parental consent; Voices builds a biometric model trained on and kept up to 3 years; free tier has no downloads since Sep 2026.
   - If mentioned at all, it should be as a parent-decision note in help text, never as an in-app upload.
   - Under-13s are barred outright.
8. **Not recommended:**
   - Any in-app cloud integration: there is no official Suno API, keys cannot be hidden in a public repo, and it would mean uploading kids' voices.
   - ElevenLabs Music, Kits.ai, Voice-Swap, Gemini/Lyria and Flow Music: all 18+.
   - Udio: no export.
   - Self-hosted MusicGen-Melody: needs a GPU server and goes against the no-server design, has no real vocals, and its weights are CC-BY-NC.

**Effort and sequence suggestion:** Stage 1 = options 1 and 2 (weeks, not months). Stage 2 = option 3. Stage 3 = options 4 and 5. Option 6 only if needed. Option 7 is documentation only.

**Watch list (dates):**
- OAIC Children's Online Privacy Code registration by 10 Dec 2026, commencement TBC. Re-check if the app ever transmits data.
- Suno developer API (exploring since 1 Jul 2026).
- Suno and ElevenLabs age or verification changes.
- Safari MediaRecorder PCM/ALAC moving from Technology Preview to release.

### Gaps
- No on-device prototypes were benchmarked on iPhones. Effort estimates are engineering judgement.
- Whether children enjoy auto-chord playback of wandering, out-of-key tunes (common at ages 4–7) is untested. The rubato/drone fallback is a design guess.
- Long-term storage reliability of IndexedDB for Home-Screen PWAs on iOS was not verified.
