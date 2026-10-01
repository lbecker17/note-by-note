# Pitch detection and scoring for real-time singing feedback in a mobile-web (iPhone Safari PWA) app

Evidence labels used throughout:
- **[A]** peer-reviewed empirical study (conference or journal).
- **[A-]** preprint or benchmark that is not peer reviewed, or a peer-reviewed paper known only from its abstract or a search summary.
- **[Code/Docs]** primary technical source: source code, a standards explainer, vendor release notes, library README.
- **[B]** established convention in practice or tradition (games, MIR evaluation conventions, pedagogy).
- **[C]** marketing, vendor or competitor blog, forum anecdote, or a low-quality aggregator.
- **[Local]** measurements already made on this app by sibling audits (`app_audit_code.md`, `app_audit_live.md`). They used synthetic voice-like tones in desktop Chromium, not real voices on an iPhone.

Research constraints: web search budget ran out, and most publisher domains (arXiv, T&F, HAL, PMC, MDN, webkit.org, bugs.webkit.org) were blocked for full-text fetch in this session. Many findings therefore come from search-result abstracts and summaries rather than full papers. These are flagged **[A-]**. Numbers quoted from abstracts are reliable. Interpretation beyond them is marked as inference.

Context on the current app (from the code, for drawing implications): `js/pitch.js` runs YIN with an adaptive threshold (60 to 1250 Hz, window about 21 ms) on an `AnalyserNode` buffer that is polled on the main thread. It applies a 3-frame median within 100 ms, an RMS gate with an adaptive noise floor, and an aperiodicity gate (`ap < 0.3`). `js/audio.js` requests `echoCancellation/noiseSuppression/autoGainControl: false` and sets `navigator.audioSession.type = 'play-and-record'`. `js/score.js` gives frame-level credit (1 inside `good`, 0.5 inside `near`) with bands of 15/35, 30/60 and 50/100 cents. It folds octaves, applies a grace period of min(0.2 s, 30% of the note), and reports a signed "tendency" threshold of ±20 cents.

---

## 1. Algorithms for monophonic voice F0 in the browser: accuracy, latency, CPU, octave errors, noise

### Takeaway
Classic time-domain methods (YIN, MPM) remain accurate enough for clean, close-mic solo singing, and they are nearly free in plain JavaScript. YIN's fine-pitch error on singing is roughly 8 to 15 cents. Their weaknesses are octave errors, voicing decisions and noise. These are addressed by adding probabilistic candidates and temporal decoding (pYIN), or by the 2023–2025 generation of tiny neural trackers (PESTO about 130k parameters, SwiftF0 about 14k to 96k parameters, plus RMVPE and FCPE). These now beat CREPE on robustness at a small fraction of its cost and can run client-side via ONNX Runtime Web. CREPE (2018, about 22M parameters) is superseded for on-device real-time use.

### Cited Findings
- **[A] YIN on singing.** Babacan et al. (ICASSP 2013) used a large database of annotated singing with aligned electroglottograph (EGG) ground truth across singer categories and exercises. Their YIN variant gave the best *fine pitch error*: 15 cents for baritones and 8.4 cents for sopranos. The study also compared algorithms by laryngeal mechanism (register) and robustness to reverberation. — [Babacan et al. 2013, arXiv 1912.12609](https://arxiv.org/abs/1912.12609); [IEEE Xplore](https://ieeexplore.ieee.org/document/6639185/)
- **[A] pYIN.** Mauch & Dixon (ICASSP 2014, pp. 659–663) turn YIN into multiple F0 candidates with probabilities, taken from a prior distribution over YIN's threshold. They then Viterbi-decode a hidden Markov model (HMM) to choose the F0 track and a voiced/unvoiced flag per frame. The method is designed for "a monophonic, harmonic instrument such as the human voice." It is implemented in librosa and as a Vamp plugin. — [ResearchGate record](https://www.researchgate.net/publication/269295422_PYIN_A_fundamental_frequency_estimator_using_probabilistic_threshold_distributions); [pYIN project page](https://code.soundsoftware.ac.uk/projects/pyin); [librosa.pyin docs](https://librosa.org/doc/0.10.2/generated/librosa.pyin.html)
- **[Code/Docs] MPM in JavaScript.** `pitchy` implements the McLeod Pitch Method (McLeod & Wyvill, "A Smarter Way to Find Pitch"). `findPitch(input, sampleRate)` returns `[hz, clarity]`, where clarity runs from 0 to 1 and low values mean noise rather than pitch. It targets real-time uses such as tuners and uses the 0BSD licence. — [pitchy README](https://github.com/ianprime0509/pitchy/blob/main/README.md). Other JS options include `pitchfinder` (a collection of YIN, AMDF and other algorithms) — [npm pitchfinder](https://www.npmjs.com/package/pitchfinder) — and `audiojs/pitch` — [GitHub](https://github.com/audiojs/pitch).
- **[A-] SwiftF0 (Nieradzik, arXiv Aug 2025).** At 10 dB SNR it reaches a 91.80% harmonic mean. That beats CREPE "by over 12 percentage points" and is only 2.3 points below its clean-audio score. The abstract gives 95,842 parameters and about 42× CPU speed versus CREPE, with about 22M parameters for CREPE. — [arXiv 2508.18440](https://arxiv.org/abs/2508.18440)
- **[Code/Docs] SwiftF0 repo (current).** The README states 14,386 parameters, 16 kHz input, a 46.875–2093.75 Hz range ("roughly F♯1 to C7"), a 16 ms frame period, and that "streaming needs 176 ms of lookahead". It gives per-frame confidence and an MIT licence, and its web demo "runs entirely client-side with ONNX Runtime Web". — [lars76/swift-f0](https://github.com/lars76/swift-f0). *The two parameter counts conflict: 95,842 in the paper abstract versus 14,386 in the README. The README probably describes a later revision. Treat the size as "tens of thousands of parameters".*
- **[A-] Pitch-detection benchmark, 19 trackers.** It covers 10 corpora with 9 versions of each clip (clean plus 8 combinations of noise, reverberation and microphone filtering), and clean audio is excluded from the averaged score. The metric is frame-level pitch F1 at a **50-cent** threshold. Results:
  - SwiftF0: 0.781 [95% CI 0.768–0.795], 179.6× real time on one CPU core.
  - RMVPE: 0.768 at 13.6×.
  - FCPE: 0.728 at 27.8×.
  - CREPE and TorchCREPE: slowest at 0.4× real time.
  - RAPT: fastest at 1276.6×.
  - pYIN, SWIPE, Praat, SPICE, PESTO, BasicPitch and others are also ranked.
  - **Caveat:** the benchmark was written by SwiftF0's author, so it carries a conflict of interest and is not peer reviewed.
  - Sources: [lars76/pitch-benchmark](https://github.com/lars76/pitch-benchmark)
- **[A] PESTO.** Riou et al. (ISMIR 2023; extended in TISMIR 2025, arXiv 2508.01488) describe a self-supervised, transposition-equivariant tracker with about 130k parameters and latency under 10 ms. It was evaluated on MIR-1K (singing), MDB-stem-synth and PTDB (speech). It "outperforms self-supervised baselines" and "competes with supervised methods", with better cross-dataset generalisation. — [arXiv 2508.01488](https://arxiv.org/abs/2508.01488); [TISMIR PDF](https://transactions.ismir.net/articles/251/files/68c0346a4b785.pdf)
- **[Code/Docs] PESTO repo.** It has a streaming mode (`streaming=True`) and per-frame confidence. ONNX export is "more than twice as fast as TorchScript… ~0.7 ± 0.03 ms inference". Performance is "close to supervised methods like CREPE (with 800x more parameters)". It runs about 12× real time on a laptop i7 at a 10 ms step, under an **LGPL-3.0** licence. — [SonyCSLParis/pesto](https://github.com/SonyCSLParis/pesto)
- **[A-] Other recent models.** FCPE, "A Fast Context-based Pitch Estimation Model" (2025) — [ResearchGate](https://www.researchgate.net/publication/395648769_FCPE_A_Fast_Context-based_Pitch_Estimation_Model). There are also early-2026 preprints on lightweight self-supervised F0 with "accurate probability of voicing" — [arXiv 2601.11768](https://arxiv.org/pdf/2601.11768) — and on voting-based pitch estimation — [arXiv 2602.01727](https://arxiv.org/pdf/2602.01727). Only the titles were retrieved.
- **[Local] YIN in this app.**
  - On synthetic harmonic tones it had at most 1 cent of error from 65 to 1245 Hz at 44.1 and 48 kHz, but reported an octave down above 1250 Hz. — [app_audit_code.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md)
  - In desktop Chromium with fake-mic WAV files, readings were within ±1 cent. Octaves were folded correctly, noise at -30 dBFS never produced a false pitch, and a low voice (about 110 Hz) worked. — [app_audit_live.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_live.md)
  - The code audit estimates a naive O(W×τmax) YIN at about 0.7 to 0.8 M multiply-adds per animation frame, running on the main thread. — [app_audit_code.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md)

### Inferences
- For one adult singing close to an iPhone mic in a quiet room, the app's YIN is not the limiting factor for accuracy. Its fine-pitch error (under 15 cents) is well below any sensible scoring tolerance. The risk areas are octave and subharmonic jumps, voicing decisions at breathy onsets and consonants, and noisy rooms. pYIN-style temporal decoding or a small neural model addresses exactly these.
- The cheapest large improvement is structural, not algorithmic:
  - Move detection into an AudioWorklet or run it at a fixed hop, for example 10 to 16 ms.
  - Use an FFT-based difference function, which makes YIN O(N log N).
  - Keep 2 to 3 candidate periods per frame and pick the path with a short fixed-lag Viterbi or a hysteresis rule. That is an "online pYIN-lite".
- SwiftF0 and PESTO would need a 16 kHz resample and ONNX Runtime Web (its WASM bundle size was not measured here). SwiftF0 also adds 176 ms of lookahead, which is visible on a scrolling lane. PESTO's LGPL licence and SwiftF0's MIT licence are both workable for a free app, but MIT is simpler. A neural model would suit an optional "noisy room" mode, or post-hoc rescoring of the finished attempt where lookahead does not matter, better than the live trace.
- Benchmark scores use a 50-cent correctness threshold. That is a *detection* metric (right semitone neighbourhood), not a musical-accuracy metric. Fine accuracy within ±10 to 20 cents on sustained vowels is where YIN is already strong.

### Gaps
- No peer-reviewed evaluation was found of any tracker on **iPhone built-in mic audio in Safari** specifically. All benchmarks use studio, synthetic or simulated-degradation corpora.
- Not retrieved: CREPE's original numbers (Kim et al., ICASSP 2018), SPICE (Gfeller et al. 2020), and the behaviour of ml5.js, essentia.js (PitchYinProbabilistic, PitchMelodia) and Spotify basic-pitch in iOS Safari. Their WASM/WebGL/WebGPU performance on iPhone was not verified.
- The size of the ONNX Runtime Web bundle and its cold-start time on iPhone Safari were not measured.
- AudioWorklet support in iOS Safari (believed available since iOS 14.5) was not verified in this session.

---

## 2. Vibrato, scoops/portamento, onsets, breathy tones, consonants, voicing decisions and smoothing

### Takeaway
Listeners hear a vibrato note at roughly its **mean** frequency. Typical singing vibrato is about ±50 cents (100 cents peak to peak) at 4.5 to 6.5 Hz. Frame-by-frame scoring against a ±30-cent band therefore penalises healthy vibrato. This app's live audit confirms it: a perfectly centred ±50-cent vibrato scored 72 to 73% and was told it "wobbled". The fix is note-level analysis:
- Detect onsets and trim the scoop.
- Estimate the note centre as a mean or median over the stable part.
- Measure spread and vibrato separately.
- Smooth with temporal decoding (median, hysteresis or Viterbi) and a confidence-gated voicing decision.

### Cited Findings
- **[A-] Vibrato is heard at its mean.** Research on "perceived principal pitch of vibrato tones" reports that listeners hear the centre of a vibrato tone at roughly its mean frequency. Studies used extents of 0, 50, 100 and 200 cents, rates of 4, 6 and 8 Hz, and carrier frequencies of 220 to 1500 Hz. One reported pitch-matching difference limens of about 2.5 to 2.8 cents. This comes from search summaries of the J. Acoust. Soc. Jpn. (E) 1983 paper and JASA papers on vibrato pitch; full texts were not read. — [J-Stage 1983 PDF](https://www.jstage.jst.go.jp/article/ast1980/4/2/4_2_73/_pdf); ["The pitch of short-duration vibrato tones" (ResearchGate)](https://www.researchgate.net/publication/232561016_The_pitch_of_short-duration_vibrato_tones); ["Pitch center of stringed instrument vibrato tones", JASA](https://pubs.aip.org/asa/jasa/article-abstract/100/3/1728/558307/Pitch-center-of-stringed-instrument-vibrato-tones?redirectedFrom=PDF)
- **[B, secondary] Typical vibrato.** Extent is about ±50 cents ("a quarter tone above and below", 100 cents peak to peak) and rate is 4.5 to 6.5 Hz. This is a tertiary source summarising the voice-science literature. — [Wikipedia: Vibrato](https://en.wikipedia.org/wiki/Vibrato)
- **[Local] What happens now.**
  - ±20-cent vibrato scored 97 to 99%.
  - ±50-cent centred vibrato scored 72 to 73% with a "27 to 29¢ average miss" and "35% held steady". The coaching said "Your long notes wobbled. Breathe low into your belly…", and a Match attempt was told to "Aim to land each note sooner". Both are wrong diagnoses.
  - The range test never completed with ±60-cent vibrato: its stability rule requires 85% of frames within ±50 cents of the median.
  - "The app cannot tell periodic vibrato (fine) from slow drift or irregular wobble."
  - Source: [app_audit_live.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_live.md)
- **[A] Temporal decoding for voicing and octave errors.** pYIN's HMM/Viterbi jointly chooses the pitch path and voiced/unvoiced state from multiple candidates per frame. This is the standard remedy for isolated octave jumps and flickering voicing that single-frame thresholding produces. — [pYIN (Mauch & Dixon 2014)](https://www.researchgate.net/publication/269295422_PYIN_A_fundamental_frequency_estimator_using_probabilistic_threshold_distributions)
- **[Code/Docs] Confidence outputs are standard in modern trackers.** MPM gives "clarity" from 0 to 1 ([pitchy](https://github.com/ianprime0509/pitchy/blob/main/README.md)). SwiftF0 gives "a confidence that the pitch is right" per frame ([swift-f0](https://github.com/lars76/swift-f0)). PESTO outputs confidence alongside pitch ([pesto](https://github.com/SonyCSLParis/pesto)). A 2026 preprint targets "accurate probability of voicing" specifically, which suggests voicing is still an open problem ([arXiv 2601.11768](https://arxiv.org/pdf/2601.11768)).
- **[Local] Current smoothing.** The app uses a median of the last 3 voiced frames within 100 ms. It has "no hysteresis, no octave-jump correction across frames, no vibrato-aware smoothing, and no confidence value exposed to the UI". Scoring then *folds* octaves, so octave errors are forgiven rather than corrected. — [app_audit_code.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md)

### Inferences
- **Recommended note-level pipeline.** Each step follows standard MIR and singing-research practice. No single source prescribes these exact parameters.
  1. Frame-level F0 plus confidence at a 10 to 16 ms hop.
  2. Voicing decision using both energy and periodicity, with hysteresis. For example, enter voiced at clarity or aperiodicity above X, leave at below Y, and require about 30 to 50 ms before switching.
  3. Octave-jump suppression: if the new estimate is about ±1200 cents from a running median while confidence is modest, keep the old octave for a few frames.
  4. For each target note, define the *landing time* as the first moment the trace stays within the near band for about 100 ms. Report it separately as the onset or scoop.
  5. Estimate the **note centre** as the mean (or a robust median) of F0 in cents over the stable portion. That runs from landing to about 90% of the note, or excludes the first and last 10 to 20% when landing is not found.
  6. Estimate **spread** as the SD, or the 10–90 percentile range, of the detrended F0 over the stable portion.
  7. Detect **vibrato** by finding a spectral peak of the detrended cents contour at 4 to 8 Hz, using an FFT or autocorrelation over at least 0.8 s. If it is periodic, report rate and extent and do not treat the extent as error. If the spread is large but not periodic, or the centre drifts steadily, flag "wobble" or "drift".
- Short notes (under about 300 ms) in songs and staccato cannot support vibrato or stable-portion analysis. Score them on the median of voiced frames, with a wider band.
- Consonants and breathy onsets produce unvoiced or low-confidence frames. They should be excluded, not counted as misses. A note with voiced coverage under about 30 to 40% should be reported as "not clearly heard" rather than "wrong".
- On the live lane, a light display smoother (for example a 3 to 5 frame median plus a one-pole filter) improves readability. Scoring should use the unsmoothed but decoded track so that smoothing does not hide the scoop.

### Gaps
- Not verified in this session: the d'Alessandro & Castellengo (1994) finding, from memory, that for *short* vibrato tones the perceived pitch is weighted toward the end of the tone.
- No study was found that validates specific trimming windows (for example the first 20% of a note) for beginner feedback. Singing-accuracy labs use various conventions (central portion, median F0), but the method sections were not retrieved.
- No data was found on how often YIN or MPM produce octave errors on breathy beginner voices recorded on phone mics.

---

## 3. Fair scoring: tolerance bands, timing windows, how karaoke games, apps and academic systems score, and separating intonation from timing and reporting tendency

### Takeaway
There are three separate things to measure:
- **Note accuracy.** Centre versus target, measured at note level and vibrato-aware.
- **Relative (interval) accuracy.** Did each step go the right size, even if the singer drifted in key?
- **Timing.** Onset and landing.

Expert ratings of untrained singers are explained mostly by *interval* deviation, contour errors and key changes, which together explain 81% of the variance. They are not explained by absolute frame-wise error. Tolerances differ by purpose:
- MIR detection metrics use 50 cents.
- Research uses 50 or 100 cents to *classify people*.
- Karaoke games use 1 to 5 semitones depending on difficulty and ignore octave.
- Commercial apps mostly show binary per-note correctness.

No study validates a specific per-note band for training. "Flat/sharp tendency" is only meaningful when it is consistent across notes and reported alongside *precision* (consistency). Imprecision is more common than a consistent bias.

### Cited Findings
- **[A] Expert judgements track intervals and tonality.** Larrouy-Maestri et al. (J Voice 2013) had 166 untrained singers sing "Happy Birthday", and 18 experts rated overall pitch accuracy.
  - Three acoustic measures were used: pitch *interval deviation*, number of *contour errors*, and number of *tonality modulations*. A tonality modulation is an interval error over 100 cents not followed by a corrective interval of at least 100 cents in the opposite direction.
  - The three together "explained 81% of the variance of the judges' scores".
  - Source: [PubMed 23280380](https://pubmed.ncbi.nlm.nih.gov/23280380/); [author PDF (ORBi)](https://orbi.uliege.be/bitstream/2268/137770/1/Larrouy-Maestri,%20L%C3%A9v%C3%AAque,%20Sch%C3%B6n,%20Giovanni,%20Morsomme,%20JV.pdf)
- **[A-] Listener tolerance.** Search summaries of this literature say some studies show tolerance for mistuning of "between 50 and 70 cents, or beyond a semitone". They also say listeners tolerate more mistuning in vocal timbres than in violin (the "vocal generosity effect", Hutchins, Roquet & Peretz 2012). Exact values were not retrieved. — [Larrouy-Maestri 2013 (ResearchGate)](https://www.researchgate.net/publication/234031781_The_Evaluation_of_Singing_Voice_Accuracy_A_Comparison_Between_Subjective_and_Objective_Methods); ["I know it when I hear it", Larrouy-Maestri 2018](https://journals.sagepub.com/doi/full/10.1177/2059204318784582)
- **[A] Accuracy versus precision.** Pfordresher et al. (JASA 2010, "Imprecise singing is widespread") separate *accuracy*, the average difference between sung and target pitch, from *precision*, the consistency of repeated attempts. They argue imprecision is the more widespread problem and use a 100-cent cutoff "justified on musical grounds". Rates of poor-pitch singing are "on the order of only 10%–20%" at that cutoff. — [JASA](https://pubs.aip.org/asa/jasa/article/128/4/2182/683506/Imprecise-singing-is-widespread); [PubMed](https://pubmed.ncbi.nlm.nih.gov/20968388/)
- **[A-] Stricter criteria change prevalence a lot.** A search summary says that with a ±50-cent criterion, "only 38% of untrained singers could match at least 90% of the pitches and 47%… failed to match even 50%". The exact originating paper was not verified; it is probably in the Dalla Bella or Demorest & Pfordresher literature. Dalla Bella (Music Perception 2015) frames poor-pitch singing as "a problem of measurement and sensitivity". — [Dalla Bella 2015 PDF](https://dallabella-lab.ca/wp-content/uploads/2023/01/Dalla-Bella_2015_Defining-Poor-Pitch-Singing-A-Problem-of-Measurement-and-Sensitivity.pdf); [Demorest & Pfordresher 2015](https://livelab.mcmaster.ca/app/uploads/2021/07/DemorestPfordresher_2015_MPSpecial.pdf). *The sibling note `pitch_accuracy_and_feedback_science.md` covers these thresholds in more depth.*
- **[A] Frame alignment versus notes in automatic assessment.** Molina et al. (ICASSP 2013) computed two measures in parallel:
  - F0 alignment of the sung contour to a reference via dynamic time warping (DTW). The cost matrix gives the instantaneous deviation and the overall F0 offset, and the total path cost serves as an intonation similarity score.
  - Automatic transcription followed by note-level melodic similarity.
  - Rhythm was scored from how far the optimal DTW path deviates from a straight line.
  - The correlations with expert ratings were not retrieved.
  - Sources: [Molina et al. 2013 PDF](https://emilio-molina.github.io/publications/Molina-et-al.-2013-Fundamental-frequency-alignment-vs.-note-based-melodic-similarity-for-singing-voice-assessment.pdf); [Molina thesis](https://emilio-molina.github.io/publications/Molina-2012-Automatic-scoring-of-singing-voice-based-on-melodic-similarity-measures.pdf); [APSIPA framework paper summarising Molina's DTW rhythm measure](https://www.nowpublishers.com/article/OpenAccessDownload/SIP-094)
- **[A-] Newer assessment work (titles and abstracts only).**
  - Gupta et al., "A technical framework for automatic perceptual evaluation of singing quality" (APSIPA 2018) — [Cambridge Core](https://www.cambridge.org/core/journals/apsipa-transactions-on-signal-and-information-processing/article/technical-framework-for-automatic-perceptual-evaluation-of-singing-quality/5F6AECB907FE842481D070850EDF1EFA)
  - "Tonality-Based Accompaniment-Guided Automatic Singing Evaluation" (Interspeech 2025) — [ISCA](https://www.isca-archive.org/interspeech_2025/hsieh25c_interspeech.pdf)
  - A 2025 analysis system for Chinese children's singing-pitch accuracy (J. New Music Research) — [T&F](https://www.tandfonline.com/doi/full/10.1080/09298215.2025.2561580)
  - Pfordresher & Greenspon (2025), "Effects of pitch range on singing accuracy training" — [SAGE](https://journals.sagepub.com/doi/10.1177/10298649241289542)
  - None of their methods or results were retrieved.
- **[B] SingStar.** It compared the singer's pitch (FFT) against hand-authored note tracks, with every note and syllable mapped by hand. **Octave was ignored** (C3 or C4 both count as C). Singing flat drew colour below the bar and sharp drew colour above it. — [Wikipedia: SingStar](https://en.wikipedia.org/wiki/SingStar); [AkitaOnRails 2026 engineering blog](https://akitaonrails.com/en/2026/04/05/turning-youtube-into-a-karaoke-app-frank-karaoke/)
- **[B] UltraStar Deluxe (open-source SingStar clone).** Its difficulty setting changes the pitch tolerance, but sources conflict. One manual gives Easy ±5, Medium ±3 and Hard ±1 semitones. Another gives Easy 2, Medium 1 and Hard 0 semitones. — [USDX documentation (SourceForge)](https://sourceforge.net/p/ultrastardx/svn/2658/tree/trunk/installer/dependencies/documents/documentation.pdf?format=raw); [USDX user guide (Scribd)](https://www.scribd.com/doc/230592516/Documentation-for-UStar). *Either way, karaoke games judge at semitone granularity, which is far looser than 30 cents.*
- **[C] Yousician.** A competitor's blog describes Yousician singing as showing binary per-note correctness, "less forgiving" at higher levels than Simply Sing, with no cents detail. By contrast, Singing Carrots shows the size and direction of the error in cents. This is a marketing comparison and not independently verified. — [Singing Carrots blog (2026)](https://singingcarrots.com/blog/yousician-vs-singing-carrots/); [American Songwriter review](https://americansongwriter.com/yousician-singing-review/)
- **[B] MIR evaluation convention.** Frame pitch is "correct" within 50 cents (for example pitch F1@50c). — [pitch-benchmark](https://github.com/lars76/pitch-benchmark)
- **[Local] Current scoring.**
  - Credit is frame-level: 1 inside `good` and 0.5 inside `near`, after a grace of min(0.2 s, 30% of the note).
  - The average miss mixes vibrato extent into the error.
  - Tips can be "confidently wrong", for example "61 cents sharp, relax your jaw" for wrong notes, and "land each note sooner" for vibrato, Strict mode or fast songs.
  - Sources: [app_audit_live.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_live.md); `js/score.js`

### Inferences
- **Score notes, not frames.** Compute each note's centre, spread, voiced coverage and landing time. Then derive the headline score from the fraction of notes whose *centre* is within the band. Frame-level "time in band" can remain a secondary "steadiness" figure that excludes the vibrato extent.
- **Score intervals as well as absolute pitch**, especially for unaccompanied songs sung line by line. A beginner who drifts 40 cents flat over a phrase but sings every interval correctly is doing something musically valuable, and expert judges weight intervals heavily (Larrouy-Maestri 2013). A practical approach is to estimate a per-phrase global offset (the median of note-centre errors) and report two things. "Tuning drift" is the offset and its trend. "Interval accuracy" is the note errors after removing the offset, plus the step-to-step interval errors. When a guide or accompaniment is sounding, keep absolute accuracy as the main score, because the key is given.
- **Tolerance bands.** No evidence supports one number, but the anchors are:
  - 50 cents as the MIR and "right note" boundary;
  - about 25 to 30 cents as a reasonable "in tune" band for a sustained note;
  - semitones in karaoke games.
  - The existing 15/30/50 presets are defensible. Two changes would help:
    - Make "Relaxed" the default for the first sessions, then offer to tighten it automatically once the singer's median absolute centre error is well inside the band for N sessions.
    - Widen bands for short notes (under 300 ms), leaps (landing takes longer) and extreme range. Keep them identical for vibrato notes, because the centre, not the frames, is scored.
- **Timing windows.** Score *landing time* (onset to within band) separately from pitch and never fold it into intonation. Tolerances of about 150 to 250 ms on landing are reasonable for beginners (inference). Latency uncertainty on iOS (section 4) also argues against tight timing judgements.
- **Tendency reporting.** Only say "you tend to sing flat" when both of these hold:
  - at least 8 to 10 voiced notes;
  - at least 70% of note centres have the same sign, and the mean is beyond about 15 to 20 cents (the thresholds are inference).
  - Report *precision* (the SD of note-centre errors, or the spread across repeats of the same note) next to it, following Pfordresher et al. 2010.
  - Before saying "sharp" or "flat" at all, exclude wrong-note errors (centres more than 50 to 60 cents off) and report them as "wrong note: sang E instead of D".
- **Octave folding** matches SingStar practice and suits mixed-gender use. It creates a vulnerability with guide-tone bleed; see section 5.

### Gaps
- The correlation of Molina's DTW measure versus note-based similarity with expert ratings was not retrieved.
- No published SingStar, Yousician or Smule tolerance in cents was found. Only UltraStar's semitone tolerances (conflicting) and SingStar's octave independence were found.
- No empirical study was found comparing learning outcomes under different per-note tolerance bands for adult beginners.

---

## 4. iOS Safari Web Audio / getUserMedia pitfalls (2025–2026)

### Takeaway
Current WebKit **does honour `echoCancellation: false` on iOS**. The source toggles the capture unit's echo cancellation on non-Mac platforms. It does not expose `noiseSuppression` or `autoGainControl` as separate constraints, so they cannot be controlled independently. The main practical hazards are:
- **Bluetooth.** AirPods fall back to the HFP headset profile while the mic is open: 16 kHz mono and call-quality playback, with about 130 to 300 ms of output latency.
- **No `outputLatency` in Safari.** Latency cannot be read; it must be measured.
- **Standalone PWA quirks.** Microphone permission is re-prompted per launch or page load (and on hash changes), MediaRecorder breaks after first use in a PWA (reported Aug 2025, unresolved), and Wake Lock works in Home Screen apps only from iOS 18.4.
- **iOS point-release regressions.** For example, iOS 26.1 beta 1 broke getUserMedia audio entirely.
- **Audio Session API.** `navigator.audioSession` (iOS 17+) should be set once to `play-and-record`.

### Cited Findings
- **[Code/Docs] WebKit capture constraints.**
  - WebKit's `CoreAudioCaptureSource` advertises support only for `deviceId`, `groupId`, `echoCancellation`, `volume` and `sampleRate` (`setSupportsEchoCancellation(true)`, `setSupportsVolume(true)`, `setSupportsSampleRate(true)`).
  - "No support for noiseSuppression or autoGainControl is mentioned anywhere in this file."
  - On non-Mac platforms (`#if !PLATFORM(MAC)`), a change to the constraint calls `unit->setEnableEchoCancellation(echoCancellation()); shouldReconfigure = true`.
  - Sources: [WebKit CoreAudioCaptureSource.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureSource.cpp); [BaseAudioCaptureUnit.cpp (GitHub code search)](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/BaseAudioCaptureUnit.cpp)
  - **Superseded older finding:** WebKit bug 179411 (c. 2017), "getUserMedia echoCancellation constraint has no affect", predates this code path. — [WebKit bug 179411](https://bugs.webkit.org/show_bug.cgi?id=179411)
- **[C/Docs] Voice processing versus raw I/O on Apple platforms.** Apple's VoiceProcessingIO (VPIO) unit provides echo cancellation, while RemoteIO is "the raw path with no AEC, no noise suppression and no AGC". WebKit switches from a remote IO unit to the VPIO unit when capture starts. On macOS this once caused a bug in which "audio to be rendered… start[ed] to be buffered", producing "higher pitch" playback. It was fixed by deferring the stop of the remote IO unit (WebKit bug 243651). — [WebKit commit 65ae54b](https://github.com/WebKit/WebKit/commit/65ae54bdedbb604855de7306576ed9572dd7bfe3); [BSFChat PR on a shared VPIO backend](https://github.com/BSFChat/client/pull/11)
- **[C] Residual echo with VPIO.** A 2026 field report on iOS voice agents found residual echo even with VPIO properly configured, "especially in quiet rooms". — [Barock.dev (Apr 2026)](https://barock.dev/2026/04/22/why-your-ios-voice-agent-still-hears-itself)
- **[C] Safari 26 on macOS.** `echoCancellation: false` reportedly yields a stereo track even with `channelCount: 1`; with `true` the track is mono. This comes from a search summary of an Apple Developer Forums thread and was not verified. — [Apple Developer Forums thread 804765](https://developer.apple.com/forums/thread/804765)
- **[Docs] Safari 26.4 (2026).** On macOS, getUserMedia can capture multiple microphones while managing echo cancellation. A `configurationchange` event fires when a microphone's echo-cancellation mode changes. Source: a search summary of the WebKit blog. — [WebKit Features for Safari 26.4](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/)
- **[C] iOS 26.1 beta regression.** In iOS 26.1 beta 1 (Sept 2025), `getUserMedia({audio:true})` failed with "No AVAudioSessionCaptureDevice device". It was reported fixed in beta 2 (Oct 2025). — [Apple Developer Forums 802555](https://developer.apple.com/forums/thread/802555)
- **[Docs] Audio Session API.**
  - `navigator.audioSession.type` accepts `auto`, `playback`, `transient`, `transient-solo`, `ambient` and `play-and-record`. `play-and-record` is "used for recording audio… cases microphone is being used".
  - The states are active, interrupted and inactive.
  - iOS 17 shipped it in Safari, and only Safari implements it (per a Nov 2025 summary).
  - Practitioner advice: feature-detect it, set it once at session start, and "don't try to flip it during a session — iOS gets confused".
  - Sources: [W3C audio-session explainer](https://github.com/w3c/audio-session/blob/main/explainer.md); [W3C Working Draft](https://www.w3.org/TR/2024/WD-audio-session-20241107); [MDN Navigator.audioSession](https://developer.mozilla.org/docs/Web/API/Navigator/audioSession); [Sam Eddy, "iOS Safari audio sessions"](https://samueleddy.com/writing/ios-safari-audio-sessions/) [C]
- **[C] Output routing.** Reports say that when the mic starts, iOS Safari can switch output from headphones to the loudspeaker. — [Medium article](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe); [Apple Developer Forums 669139 (Bluetooth headset)](https://developer.apple.com/forums/thread/669139)
- **[C] AirPods and Bluetooth mic.**
  - With the mic open, iOS routes AirPods through Bluetooth HFP, "playout is limited to 16 kHz mono".
  - iOS 26 added a *native-only* audio-session option, `.bluetoothHighQualityRecording` (WWDC25 session 251). The mic stays on HFP but playback upgrades to 48 kHz stereo; it is "only valid with .default" mode. A LiveKit issue reports it producing silence in practice.
  - No source says Safari or web pages use this option.
  - Sources: [LiveKit issue #467](https://github.com/livekit/client-sdk-react-native/issues/467); [GSMArena on AirPods studio-quality recording](https://www.gsmarena.com/newscomm-68177.php)
- **[C] Bluetooth output latency.** AirPods on iPhone are about 130 ms (AAC with Apple tweaks). SBC typically adds 200 to 300 ms. Apple's own latency estimates for AirPods can "differ from actual and change over time". These are low-quality aggregator sources plus an Apple forum thread. — [onlineaudiotest.com](https://onlineaudiotest.com/latency-test/); [Apple Developer Forums 679274](https://developer.apple.com/forums/thread/679274)
- **[Docs/C] `outputLatency`.** Safari implements `AudioContext.baseLatency` but not `outputLatency`; Chrome and Firefox do. This is per web.dev and a 2024–25 developer blog. Current Safari 26.x status was not verified. — [web.dev: audio output latency](https://web.dev/articles/audio-output-latency); [jamieonkeys](https://www.jamieonkeys.dev/posts/web-audio-api-output-latency/); [caniuse](https://caniuse.com/mdn-api_audiocontext_outputlatency)
- **[C/Docs] Standalone PWA permissions.**
  - Camera and mic permissions in iOS PWAs are not persistent and are "re-requested with every page load". Advice: build as a single-page app and avoid reloads.
  - WebKit bug 215884: "getUserMedia recurring permissions prompts in standalone when hash changes".
  - Older bug 185448: getUserMedia did not work at all in Home Screen apps; that is now resolved.
  - Sources: [Scandit FAQ](https://support.scandit.com/hc/en-us/articles/360008443011-Why-does-iOS-keep-asking-for-camera-permissions); [WebKit bug 215884](https://bugs.webkit.org/show_bug.cgi?id=215884); [WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448); [MagicBell PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- **[C] MediaRecorder in iOS PWA (Aug 2025).** It works in Safari every time, but in a Home Screen app it works once and "fails on subsequent app launches (requires phone restart)". A WebKit engineer (youennfablet) asked for a bug report with a reduced test case. No fix or workaround has been documented. — [Apple Developer Forums 797987](https://developer.apple.com/forums/thread/797987)
- **[Docs] Screen Wake Lock.** It works in Safari from iOS 16.4, but in Home Screen web apps it was broken until **iOS 18.4** (WebKit bug 254545). — [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545); [WebKit Features in Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/); [caniuse wake-lock](https://caniuse.com/wake-lock)
- **[Local] Latency and sample-rate risks in this app.**
  - The timestamp is `ctx.currentTime − need/2/sr − 0.02`, a fixed 20 ms input-delay guess. `outputLatency` and `baseLatency` are never used.
  - The `AudioContext` is created before `getUserMedia`, and "on some iOS versions the hardware rate changes when capture starts (44.1 ↔ 48 kHz, or 16/24 kHz with Bluetooth HFP)" while the detector trusts `ctx.sampleRate`.
  - Sources: [app_audit_code.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md); `js/audio.js`
- **[Local] Routing.** The app uses `history.pushState`, not hash changes (`js/app.js` line 234), so WebKit bug 215884 as titled should not trigger. Whether `pushState` in standalone mode causes re-prompts is untested.

### Inferences
- `echoCancellation:false` is the right choice for pitch accuracy, and WebKit honours it on iOS. Voice processing (AEC, NS and AGC, which are bundled in VPIO) is tuned for speech and can attenuate sustained tones or add gain pumping. The app should confirm the actual state with `track.getSettings().echoCancellation`, and read `getSettings().sampleRate` to build the detector at the true capture rate rather than `ctx.sampleRate`.
- Because iOS does not report output latency, measure the round trip once per route: play a short click or chirp through the speaker and time its arrival at the mic, with AEC off. Store the result per route label (speaker, wired, Bluetooth). With Bluetooth, the result may be unmeasurable if the phone mic is not in use, since the mic switches to the AirPods. In that case fall back to a manual "tap along" calibration, or recommend call-and-response.
- 16 kHz HFP capture is *not* a problem for F0 detection. Sung F0 stays below about 1.1 kHz, and SwiftF0 itself runs at 16 kHz. The real problems with AirPods are latency (the guide arrives 130 to 300 ms late against the lane), call-quality guide timbre, and mic placement.
- Handle `AudioContext` `interrupted` state (phone calls, Siri, alarms) and `devicechange` events. Rebuild the detector and re-measure latency when the route changes.

### Gaps
- Not verified: whether the iOS **ringer/silent switch** mutes Web Audio output when `audioSession.type = 'play-and-record'` is set. A blog on "avoiding unmuting iOS devices for the Web Audio API" exists but could not be read. — [nattog.dev](https://nattog.dev/blog/web-audio-ios-unmute)
- AudioWorklet stability and glitching on iPhone in 2026 were not checked.
- Whether Safari 26.x now exposes `outputLatency` was not checked.
- No measurement was found of VPIO's effect on sung F0 accuracy.
- No authoritative Apple statement was found on how Safari chooses HFP versus the built-in mic when AirPods are connected and getUserMedia starts.

---

## 5. Playing guide tones or piano without bleed into the mic (no headphones); call-and-response versus simultaneous modes

### Takeaway
Without headphones, anything the phone's speaker plays during the singing window reaches the mic. With AEC off, as it should be for pitch accuracy, a guide at the target pitch will be detected. Because scoring folds octaves, a guide an octave away will *also* score as correct. AEC (`echoCancellation:true`) would remove most, but not all, of the bleed, at the cost of speech-oriented processing of the voice. Call-and-response (hear, then sing) is the only bleed-free design without headphones. Simultaneous mode needs headphones, ideally wired, plus a check that they are actually in use.

### Cited Findings
- **[Local] Bleed risk in this app.** "With Headphones on but sound coming from the speaker, the guide plays at the target pitch during the sing window… With echo cancellation off, the mic hears it and can score it as the [singer]." The app does not check the headphones claim. — [app_audit_code.md, issue 2](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md)
- **[Local] Octave folding in scoring.** `foldDiff` credits any sung pitch within ±2 semitones of the target in another octave (`js/score.js`). Bleed an octave away from the target would therefore still be scored.
- **[Code/Docs + C] AEC on iOS.** Echo cancellation is the constraint WebKit toggles on iOS (section 4). VPIO removes speaker playback from the mic signal, but residual echo remains in practice. — [WebKit CoreAudioCaptureSource.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureSource.cpp); [Barock.dev 2026](https://barock.dev/2026/04/22/why-your-ios-voice-agent-still-hears-itself)
- **[C] Routing surprises.** Opening the mic can move output from headphones to the speaker on iOS Safari, so a "headphones" setting cannot be trusted as a statement about the actual route. — [Medium](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe); [Apple Developer Forums 669139](https://developer.apple.com/forums/thread/669139)
- **[A-] Pedagogy.** The sibling note on pitch-matching science covers why listen-then-sing (echo-first) and voice-like guides help beginners. — [pitch_accuracy_and_feedback_science.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/pitch_accuracy_and_feedback_science.md)

### Inferences
These are engineering proposals; no study was found that evaluates them.
- **Bleed check, about 2 seconds.** Before a simultaneous-mode lesson, ask the singer to stay silent while the app plays a short guide note, then measure the mic RMS and whether YIN locks onto the guide pitch. If it does, the sound is coming from the speaker: say so and switch to call-and-response automatically. Re-run the check whenever `devicechange` fires.
- **Guard during scoring.** In simultaneous mode, if a detected frame's pitch equals the currently playing guide pitch (±15 cents, any octave) *and* the mic level is at or below the measured bleed level, treat the frame as bleed, not voice. This does not help when the singer is exactly on pitch *and* quiet, which is why the upfront check matters more.
- **Speaker-safe support without bleed.**
  - Play only a tonic drone or chord that *excludes the target pitch class*, then filter detections at the drone's pitch classes. Alternatively, play accompaniment only between sung notes.
  - A narrow notch on the guide frequency is not feasible, because the target and the guide share a frequency.
  - Keep the call-and-response gap short (about 1 beat) so pitch memory is fresh.
- **Headphone mode:** recommend wired headphones (USB-C or Lightning EarPods) over AirPods, because of Bluetooth latency and HFP quality (section 4). If Bluetooth is detected (for example the input device label contains "AirPods" in `enumerateDevices` after permission), warn about lag and widen timing tolerances.
- Consider offering "Use echo cancellation (speaker mode)" as an advanced toggle. It would let speaker-mode users hear a quiet guide while singing, at a possible accuracy cost that the bleed check can quantify.

### Gaps
- No published evaluation was found of pitch-tracking accuracy with iOS VPIO enabled while a musical guide plays from the speaker.
- It was not verified whether `enumerateDevices()` in iOS Safari reliably exposes the active *output* route (audio output device enumeration support on iOS was not confirmed).

---

## 6. Privacy-preserving extras: optional local recording and playback, progress storage, data export

### Takeaway
Local-only recording is feasible. `MediaRecorder` on iOS writes `audio/mp4` (AAC). Since iOS 18.4 it also supports WebM/Opus, Ogg, fragmented MP4 and lossless formats. There is an unresolved report (Aug 2025) of MediaRecorder failing after first use in Home Screen apps. A safer path for this app is to capture PCM from the Web Audio graph it already runs and encode WAV in JavaScript. Progress data can stay local and be exported as a file or copied to the clipboard.

### Cited Findings
- **[Docs/C] MediaRecorder formats in Safari.** Safari wrote only `audio/mp4` and `video/mp4` (AAC and H.264) until Safari 18.4. Safari 18.4 (iOS 18.4, March 2025) added WebM recording with Opus audio (`MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` returns true), plus Ogg, fragmented MP4 and lossless audio (ALAC and PCM, first previewed in Safari Technology Preview). Always feature-detect with `isTypeSupported()`. — [WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/); [Addpipe: ALAC/PCM in Safari](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/); [Media Codings article](https://media-codings.com/articles/recording-cross-browser-compatible-media)
- **[C] PWA MediaRecorder bug.** See section 4. — [Apple Developer Forums 797987](https://developer.apple.com/forums/thread/797987)
- **[Local] Current privacy stance.** The pre-permission sheet says "Nothing is recorded or sent anywhere". Results can be copied as text via "Copy results for Claude", with a textarea fallback if the clipboard fails. — [app_audit_live.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_live.md); [app_audit_code.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/app_audit_code.md)

### Inferences
- Recording should be **opt-in per attempt** ("Record this try so I can listen back"), kept in memory by default, and optionally saved to IndexedDB with a visible "Delete all recordings" control. The copy should change from "Nothing is recorded" to "Recordings stay on this phone unless you share them".
- **Implementation.** Tap the existing `MediaStreamSource` with an AudioWorklet or `ScriptProcessor`-free buffer copy, downsample to 16 or 22 kHz mono, and encode as WAV (about 2 MB per minute at 16 kHz, 16-bit). This avoids the PWA MediaRecorder bug and gives sample-accurate alignment with the pitch trace, so playback can show the trace in sync. Fall back to MediaRecorder with `audio/mp4` only if needed.
- **Playback with trace** is a strong learning aid: it gives knowledge of performance, and listening back separates perception from production. It also lets the app re-score an attempt offline with a heavier model (pYIN full Viterbi, or SwiftF0/PESTO via ONNX) where lookahead does not matter.
- **Progress storage.** Keep per-note statistics (centre error, spread, landing time, vibrato flag, confidence) rather than audio. Offer a JSON/CSV export using a download link or the Web Share API, and a "Copy results for Claude" that includes the richer per-note metrics and device context (route, strictness, vibrato detected), so an AI coach does not misread vibrato or latency as faults.

### Gaps
- Not verified this session: Safari's storage-eviction rules for Home Screen web apps (whether the 7-day script-writable-storage cap applies to installed PWAs) and `navigator.storage.persist()` behaviour on iOS.
- The Web Share API's file-sharing support for JSON/CSV/WAV on iOS Safari was not checked.

---

## Implications for a self-guided singing app

Ordered roughly by value to an adult beginner practising alone on an iPhone. The evidence type is given in brackets.

1. **Switch from frame scoring to vibrato-aware note scoring.** For each note compute the centre (mean or median over the stable portion after landing), spread, landing time and voiced coverage. The headline score is the percentage of notes whose *centre* is within the band. Report steadiness separately, excluding periodic 4 to 8 Hz modulation.
   - *Evidence:* perceived pitch of vibrato is its mean [A-]; typical vibrato is ±50 cents at 4.5 to 6.5 Hz [B]; this app scores centred ±50-cent vibrato at 72 to 73% and misdiagnoses it as "wobble" [Local].
2. **Add a vibrato and wobble classifier** (a periodicity peak at 4 to 8 Hz with at least 0.8 s of stable voicing). Say "nice, even vibrato (±X cents, Y Hz)" rather than "breathe low" coaching. Relax the range test's stability rule when vibrato is periodic, since it currently never completes at ±60 cents.
   - *Evidence:* [Local] audit findings; vibrato norms [B].
3. **Score intervals and drift, not only absolute pitch, in unaccompanied song lines.** Remove a per-phrase offset, then score intervals. Report "drifted 40¢ flat over the line" separately from "intervals 85% accurate".
   - *Evidence:* interval deviation, contour errors and key modulations explain 81% of expert ratings of untrained singers (Larrouy-Maestri et al. 2013, N = 166 singers, 18 judges) [A].
4. **Only report sharp/flat tendency when it is consistent, and add precision.** Require at least 8 voiced notes and a consistent sign, and exclude wrong notes (more than 50 to 60 cents off, which are reported as note-name errors). Show the spread of note-centre errors ("consistency ±X¢") next to the average miss, and include both in "Copy results for Claude".
   - *Evidence:* accuracy versus precision, with imprecision the more widespread problem (Pfordresher et al. 2010) [A].
5. **Default beginners to a wider band and tighten adaptively.** Start at ±50 cents "in tune" (the MIR and "right note" boundary), and offer to tighten once the median centre error is comfortably inside the band. Widen bands for notes under 300 ms and for leaps. Keep the three presets as manual overrides.
   - *Evidence:* the 50-cent MIR convention [B]; listeners tolerate 50 to 70+ cents in voices and there is a vocal generosity effect [A-]; karaoke games judge in semitones [B]; no validated per-note band exists [gap].
6. **Separate timing from intonation.** Score landing time (onset to within band) on its own with about 150 to 250 ms tolerance for beginners. Never let latency or scoops reduce the pitch score, and never say "land sooner" when the centre was right but vibrato was wide.
   - *Evidence:* Molina et al. 2013 treat intonation and rhythm as separate measures [A]; iOS latency is unknowable without measurement [Docs/C]; the app currently gives a wrong "land sooner" tip [Local].
7. **Harden the detector cheaply before considering neural models.**
   - Run at a fixed 10 to 16 ms hop in an AudioWorklet, off the main thread.
   - Use an FFT-based YIN difference function.
   - Keep 2 to 3 period candidates per frame with a short fixed-lag Viterbi or hysteresis to suppress octave jumps.
   - Add voicing hysteresis and expose a confidence value, so the lane can fade low-confidence frames.
   - Build the detector at `track.getSettings().sampleRate`.
   - *Evidence:* YIN's fine error is 8 to 15 cents on singing (Babacan et al. 2013) [A]; pYIN's HMM decoding is the standard fix for octave and voicing errors (Mauch & Dixon 2014) [A]; main-thread YIN costs about 0.7 to 0.8 M operations per frame here [Local].
8. **Consider SwiftF0 (MIT, ONNX Runtime Web) or PESTO (LGPL, ONNX) as an optional "noisy room" mode or for post-attempt rescoring, not as the live default.** Their advantage is noise robustness (SwiftF0 is 91.8% at 10 dB SNR, more than 12 points above CREPE, which puts CREPE below about 80%), but they cost a runtime download, a 16 kHz resample and, for SwiftF0, 176 ms of lookahead. Avoid CREPE on phones (0.4× real time on CPU).
   - *Evidence:* SwiftF0 paper and repo [A-/Docs]; pitch-benchmark, whose author is SwiftF0's author [A-]; PESTO (ISMIR 2023, TISMIR 2025) [A].
9. **Make speaker-mode bleed impossible to score.**
   - Run a 2-second "stay quiet" bleed check before any lesson that plays a guide during singing. If it detects bleed, switch to call-and-response automatically.
   - In speaker mode, never play the target pitch class during the sing window.
   - Treat frames matching the live guide pitch (any octave) at bleed-level loudness as bleed.
   - *Evidence:* AEC is off (correctly) and WebKit honours it on iOS [Code]; the app's "headphones" claim is unchecked and octave folding would credit an octave-shifted guide [Local]; iOS may reroute output when the mic opens [C].
10. **Measure latency; don't assume it.** Run a one-time click-loopback calibration per route (speaker or wired), stored with the route label. For Bluetooth, warn that the guide lags about 130 to 300 ms and that call-quality audio is expected; recommend wired EarPods or call-and-response, and widen timing windows.
    - *Evidence:* Safari lacks `outputLatency` [Docs/C]; AirPods and HFP behaviour [C]; the app's fixed 20 ms assumption [Local].
11. **Plan for standalone-PWA quirks.**
    - Keep one mic stream open across lessons within a session, so the user is not re-prompted each lesson. Stop it when the app is backgrounded.
    - Avoid hash-based navigation.
    - Handle `interrupted` AudioContext state and `devicechange`.
    - Request Wake Lock only on iOS 18.4+ and degrade silently on older versions.
    - Keep a "mic not working?" help screen, because iOS point releases have broken getUserMedia outright (26.1 beta 1).
    - *Evidence:* WebKit bugs 215884 and 254545, Apple forums [Docs/C].
12. **If you add recording, do it locally, opt-in, as PCM→WAV from the existing graph** rather than MediaRecorder, with playback synced to the pitch trace, a one-tap delete, and honest copy ("stays on this phone"). Playback plus trace also enables offline rescoring with a heavier model.
    - *Evidence:* the MediaRecorder PWA failure report (Aug 2025) [C]; Safari 18.4 codec expansion [Docs].
13. **Enrich "Copy results for Claude"** with the following, so an AI coach does not misattribute vibrato, latency or bleed to technique:
    - per-note centre, spread, landing time and interval error;
    - vibrato detected (rate and extent);
    - detection confidence;
    - the audio route (speaker, wired or Bluetooth) and whether a bleed check passed;
    - strictness level.
    - *Evidence:* [Local] audit shows tips that are "confidently wrong" when these factors are not separated.
14. **Validate on real voices on the target device.** With consent, record 20 to 30 short attempts (low and high notes, breathy onsets, vibrato and non-vibrato, speaker and headphones) on the user's iPhone. Check octave errors, voicing and the scores produced before tuning thresholds.
    - *Evidence:* every published benchmark uses studio or simulated conditions; no peer-reviewed phone-mic Safari evaluation was found [gap]; the local audits used synthetic tones in Chromium [Local].
