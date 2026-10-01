# Spoken (voice) guidance and voice control for pre-readers in a singing PWA on iPhone

Research date: 1 October 2026. Researcher notes for the report writer.

**How to read the source tags (important):** the network proxy blocked full-page fetches for most domains (nngroup.com, webkit.org, bugs.webkit.org, learn.microsoft.com, aws.amazon.com, developer.mozilla.org, joanganzcooneycenter.org, samueleddy.com, talkrapp.com, blog.addpipe.com, weboutloud.io). So:
- **[READ]** means I fetched and read the page itself (only developer.apple.com forum threads and github.com pages worked).
- **[SNIPPET]** means the claim comes from a web-search result summary of that URL, not from a full read. Treat these as likely but not verified word for word.
- **[VENDOR]** marks a vendor's own claim about its product or terms.
- **[CODE]** marks facts from the Note by Note source code (read-only inspection of `/home/user/note-by-note/js/`).
- Inferences are in the "Inferences" subsections and are my reasoning, not sourced facts.

---

## 1. What do well-regarded children's apps and UX research do for pre-readers?

### Takeaway
Research and leading apps agree on a pattern: for ages 3-5 (and many 6-8 year olds) instructions should be **very short spoken clips paired with a visual cue** (animation, highlight, icon), any on-screen text should be **tappable to hear it**, and **every sound must mean something**. Long spoken instructions annoy children. Some top apps (Sago Mini, Toca Boca) avoid instructions altogether with wordless, shallow, icon-first design.

### Cited Findings
**UX research and guidelines**
- Nielsen Norman Group's report "UX Design for Children (Ages 3-12)", 4th edition, has 156 research-based guidelines and covers audio (background, rollover, sound effects) and "written instructions that young users understand". [SNIPPET] — [NN/g report page](https://www.nngroup.com/reports/children-on-the-web/)
- NN/g splits children into 3-5 (pre-readers), 6-8 (beginning readers) and 9-12 (moderately skilled readers). [SNIPPET] — [NN/g report page](https://www.nngroup.com/reports/children-on-the-web/)
- NN/g findings, as summarised by search: "A few seconds of clearly recorded audio in age-appropriate language should be used for non-readers", and "children became irritated when long audio clips used to provide explicit directions slowed them down". [SNIPPET; I could not open the report to confirm the wording or which edition] — [NN/g report page](https://www.nngroup.com/reports/children-on-the-web/); [NN/g "Designing for Kids: Cognitive Considerations"](https://www.nngroup.com/articles/kids-cognition/)
- Sesame Workshop, "Best Practices: Designing Touch Tablet Experiences for Preschoolers" (2012, based on more than 50 studies): most content begins with a character or friendly adult narrator who greets the child and states the objective and how to do it; every sound in the interface should have a specific meaning and function; avoid background music with videos for children 5 and under; use sound effects and vocalisation to draw attention to important content. [SNIPPET; note the 2012 date] — [Sesame Workshop PDF](https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf); [AppleInsider coverage, Dec 2012](https://appleinsider.com/articles/12/12/24/sesame-workshop-wants-to-improve-ipad-apps-for-kids-with-free-developer-guidelines)
- For pre-literate children "all instruction must be given in audio, video, or animation, since children can't read". [SNIPPET] — [Bruckman, Bandlow & Forte, "HCI for Kids", HCI Handbook chapter](https://sites.cc.gatech.edu/fac/Amy.Bruckman/papers/chapters/hci-for-kids.pdf)
- Touchscreen design guidance for young children (search summary of a result set that included the Soni et al. IDC 2019 framework): "Provide audio prompts with visual support because children do not pay attention to audio prompts alone"; "Keep essential audio, e.g., specific interaction suggestions, at the end of the sentence, not at the beginning"; use audio or visual cues instead of text prompts. [SNIPPET; I could not confirm which document each line comes from] — [Soni et al., "A Framework of Touchscreen Interaction Design Recommendations for Children" (IDC 2019)](https://init.cise.ufl.edu/wp-content/uploads/sites/378/2019/04/TIDRC-Framework-soni-et-al-IDC19-final.pdf)
- Juan Pablo Hourcade's "Child-Computer Interaction" is the standard textbook; a free first-edition PDF exists. I could not read it, so I have no verified quote from it on instructions. — [Hourcade book PDF](https://homepage.divms.uiowa.edu/~hourcade/book/child-computer-interaction-first-edition.pdf)

**What specific apps do**
- **Khan Academy Kids:** icon- and animation-first interface with little text; every text element can be tapped to hear it read aloud; correct and incorrect answers use a "ding" and a gentle "bong", chosen to be language-agnostic; a guide character (Kodi Bear) gestures and encourages. [SNIPPET, secondary source, not Khan Academy itself] — [edu.com guide to Khan Academy Kids](https://www.edu.com/blog/understanding-khan-academy-kids-a-complete-guide-for-k-2-teachers-and-parents)
- **Duolingo ABC** (ages 3-8): relies heavily on audio narration and animation, large buttons, audio prompts; free with no login. [SNIPPET, review sites] — [Common Sense Education review](https://www.commonsense.org/education/reviews/duolingo-abc-learn-to-read); [Duolingo blog](https://blog.duolingo.com/a-good-read-building-duolingo-abc-for-android/)
- **Endless Reader** (Originator, ages 3-7): after the child drags words into place, a narrator reads the sentence aloud and a short video illustrates it. [SNIPPET] — [Cool Mom Tech](https://coolmomtech.com/2020/07/reading-apps-preschoolers-little-kids/); [Brightly](https://www.readbrightly.com/best-reading-apps-for-4-8-year-olds/)
- **Sago Mini:** many apps "play out like a storybook without words or narration". **Toca Boca:** minimal options per screen, shallow menus, consistent design. [SNIPPET, secondary] — [Sago Mini (Wikipedia)](https://en.wikipedia.org/wiki/Sago_Mini); [Ungrammary, designing for kids](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps)
- **PBS KIDS:** producers must evaluate game UI for accessibility, including screen-reader metadata and text-to-speech elements; games offer audio controls and voice-overs. [SNIPPET, magazine coverage] — [Parenting Special Needs Magazine](https://www.parentingspecialneeds.org/article/pbs-kids-focus-is-on-content-accessibility-for-all/); [Ability Magazine](https://abilitymagazine.com/accessibility-and-inclusion-pbs-kids-a-role-model-for-all-media/)
- **Yousician** (rated 4+ by Common Sense Media): an in-app guide narrates how the app works, and an intro video introduces a real-person teacher whose voice guides quests and songs. **Simply Piano** shows an intro video explaining each exercise. [SNIPPET] — [Common Sense Media, Yousician](https://www.commonsensemedia.org/app-reviews/yousician-your-personal-music-teacher); [Skoove, best piano apps 2026](https://www.skoove.com/blog/best-piano-apps/)
- **Lingokids:** KidSAFE-certified, "PlayLearning" method; I found no specific detail on its narration design. — [Common Sense Media, Lingokids](https://www.commonsensemedia.org/app-reviews/lingokids-play-and-learn)

### Inferences
- The common pattern is: **(1)** a short spoken line when a screen opens (2-4 seconds), **(2)** a visual pointer at the thing to tap, **(3)** a speaker button to hear it again, **(4)** consistent meaningful sounds for "your turn", "well done" and "try again". Note by Note already has the visual cue text ("Listen", "Your turn: sing on 'ah'") and the screen structure that would carry this.
- Teens and confident readers are the group the NN/g "long audio irritates" finding warns about, so narration should be short, skippable and off by default for them.
- The NN/g "essential words at the end" rule suggests phrasing like "When the line turns blue... sing!" rather than "Sing when the line turns blue".

### Gaps
- I could not open the NN/g report, the Sesame PDF or Hourcade's book, so exact wording, sample sizes and dates within them are unverified.
- No first-party design writeups from Khan Academy Kids, Lingokids or Duolingo ABC about narration rules (replay button placement, auto-play policy) were found; the app details above come from reviewers.
- I found no published guideline specific to *music* apps for pre-readers.

---

## 2. In a singing app, should instructions be spoken, and by whose voice? How do music teachers instruct 4-7 year olds?

### Takeaway
Music teachers of young children **show rather than tell**: they sing a short pattern and the child echoes it, keep talk to a minimum, and often give directions musically. The voice that *models singing* matters a lot: children match pitch best to a **child's voice**, then an adult female, then an adult male, and less vibrato helps. For *spoken* (non-sung) instructions, modern neural TTS has tested as well as a human voice for learning in adults, but I found no equivalent study in young children.

### Cited Findings
**How music teachers instruct young children**
- Echo songs (teacher sings a phrase, children echo it), call-and-response, pitch-matching games and making up songs are standard tools for young children's singing. [SNIPPET] — [MusicplayOnline blog, "Helping Children Develop the Singing Voice"](https://blog.musicplay.ca/helping-children-develop-the-singing-voice); [The Singing Classroom, echo songs](https://songs.thesingingclassroom.com/echo-songs)
- Young children sing short patterns more accurately than whole songs; they benefit from focused listening before being asked to sing; if a child echoes in a different key, the teacher can match the child's key and echo back so the child experiences unison. [SNIPPET] — [Ashley Danyew, episode 035](https://www.ashleydanyew.com/episodes/035)
- Edwin Gordon recommended singing many short songs without words (on a neutral syllable such as "bah") and short rhythm chants to young children; John Feierabend's "First Steps in Music" combines Gordon and Kodály and starts with pitch-exploration warm-ups, then echo songs. [SNIPPET] — [Gordon Institute for Music Learning, Early Childhood](https://giml.org/mlt/earlychildhood/); [John Feierabend (Wikipedia)](https://en.wikipedia.org/wiki/John_Feierabend); [The Improving Musician](https://theimprovingmusician.com/early-childhood-music-new/)
- Elementary music teachers are commonly advised to "talk less, teach more", replacing verbal explanation with modelling and gesture. [SNIPPET, practitioner blog, opinion] — [Frau Musik, "Talk less and teach more"](https://fraumusik.com/talk-less-teach-more-music/)

**Whose voice models the singing**
- Green (1990, Journal of Research in Music Education): 282 children in grades 1-6 were tested individually with adult female, adult male and child vocal models. There were more correct responses to the child model, then the female, then the male model. Errors were more often flat for the adult models and more often sharp for the child model. [SNIPPET] — [Green 1990, JRME (DOI)](https://doi.org/10.2307/3345186); [LSU dissertation record](https://repository.lsu.edu/gradschool_disstheses/4357/)
- Children are reported to sing more accurately when the model has less vibrato. [SNIPPET; I could not tell which study in the result set this came from] — [search result set including Nichols 2015, "Critical Variables in Singing Accuracy Test Construction"](https://bpb-us-e1.wpmucdn.com/sites.psu.edu/dist/6/96535/files/2018/12/Nichols-2015-1v9qoj8.pdf)
- Demorest, Nichols & Pfordresher (2018, Psychomusicology) studied "the effect of focused instruction on young children's" singing; I have only the title, not the findings. — [PDF](https://www.acsu.buffalo.edu/~pqp/pdfs/DemorestNicholsPfordresher_2018_PsyMus.pdf)

**Human voice versus text-to-speech for spoken instructions**
- Mayer's "voice principle" holds that people learn more deeply from a human voice than a machine voice. Craig & Schroeder (2017) found a modern TTS engine performed as well as or better than a human voice (more learning on transfer, same credibility ratings); their 2018 follow-up found no differences in perceptions, learning or efficiency. [SNIPPET; participants were not young children] — [Craig & Schroeder 2017, Computers & Education](https://dl.acm.org/doi/10.1016/j.compedu.2017.07.003); [Craig & Schroeder 2018](https://www.researchgate.net/publication/327795958_Text-to-Speech_Software_and_Learning_Investigating_the_Relevancy_of_the_Voice_Effect); [ERIC, "The voice effect in multimedia instruction revisited"](https://files.eric.ed.gov/fulltext/EJ1341358.pdf)

**What Note by Note already does** [CODE]
- Lessons already work as call-and-response when headphones are off: the cue reads "Listen", then "Your turn" / "Your turn: sing on 'ah'" / "Your turn: slide with it" (`js/app.js` lines ~717-724). The headphone toggle copy says "Headphones off: you'll hear each part first, then sing" (`js/app.js` ~896).

### Inferences
- In a singing app, the *task itself* should be taught by sound (the app's guide notes), which Note by Note already does. Spoken narration is best kept to **navigation and framing**: "Tap the big button", "Listen...", "Your turn!", "Great singing!". Two or three words, matching the on-screen cue text, fit both the teacher practice ("talk less") and the NN/g finding.
- A **sung** "your turn" (for example the same two-note motif every time) is closer to how teachers work than a spoken sentence, needs no words, no licence and no translation, and teens will tolerate it.
- Green (1990) suggests that if the app ever adds a recorded *sung* model (rather than the synthetic guide tone), a child or a light, non-vibrato adult female voice would be better for young kids than an adult male voice. A parent recording spoken prompts is fine; a parent recording the *sung models* is riskier, because an off-pitch model would teach the wrong note.
- Because the app transposes into each child's range, a recorded sung model would need to be pitch-shifted or re-recorded per key, which is much harder than the current synthesized guide. Spoken prompts do not have this problem.

### Gaps
- No study found comparing TTS and human narration *for children aged 4-7*.
- No study found on children's pitch matching to a synthesized guide tone versus a human model (the background report's `pitch_detection_and_scoring_tech.md` / `singing_app_landscape.md` may have related material).
- Demorest, Nichols & Pfordresher (2018) findings not obtained.

---

## 3. Implementation on iOS Safari / standalone PWA (2026): speechSynthesis, pre-generated clips, parent-recorded prompts

### Takeaway
On iPhone the **most reliable path is short pre-made audio clips played through the app's existing Web Audio context** (the same path the piano uses). `speechSynthesis` works in Safari but has a long list of iOS problems: it needs a tap, it can freeze its queue, voices cannot be chosen reliably, Siri voices are not exposed, and once the mic is on it is treated as "system speech" that can come out quiet or from the earpiece. Clips can come from a free on-device generator (Piper with a CC0 Australian voice), from a cloud TTS (Azure, Polly, Google: generated once, then shipped), or from a parent recording their own voice on the phone with MediaRecorder and IndexedDB.

### Cited Findings
**Web Speech API speechSynthesis on iOS**
- iOS Safari only speaks when `speak()` is called inside a user gesture; calls from timers, page load, API responses or React effects are silently dropped. Reported for iPhone and iPad in Safari and Chrome (issue opened 28 April 2025, closed via PR #368). [READ] — [easy-speech issue #366](https://github.com/leaonline/easy-speech/issues/366)
- A September 2026 fix for an app on iPad/iOS Safari: speech failed on first use; the fix adds a global first-tap listener that unlocks both AudioContext and speechSynthesis, and restores audio when the tab returns. Speaking an empty string or an utterance with `volume = 0` makes `onend` never fire and **freezes the speech queue**; the workaround is `speechSynthesis.cancel()` then an "unlock" utterance of `'.'` at volume 0.01 and rate 10. (PR created 6 September 2026.) [READ] — [Multi-Voice-Timer PR #8](https://github.com/Outtech105k/Multi-Voice-Timer/pull/8)
- Safari 27 beta reportedly fixed a bug where `speechSynthesis.cancel()` removed utterances queued by *later* `speak()` calls (reported September 2026). [SNIPPET from a release aggregator; not checked against Apple's release notes; may have changed recently] — [Releasebot, Safari updates Sept 2026](https://releasebot.io/updates/apple/safari)
- Older iOS/Safari behaviour: an utterance can be garbage-collected before it finishes so its event handlers never run; in iOS 14, `cancel()` fired the utterance's `error` handler instead of `end`. [SNIPPET] — [talkrapp, "Lessons Learned Using the javascript speechSynthesis API"](https://talkrapp.com/speechSynthesis.html)
- If Safari is backgrounded while speaking, the synthesizer can stop working until the page is reloaded. [SNIPPET] — [Apple Developer Forums thread 49875](https://developer.apple.com/forums/thread/49875); [WebOutLoud, "The State of Speech Synthesis in Safari"](https://weboutloud.io/bulletin/speech_synthesis_in_safari/)
- Voices: on iOS `getVoices()` can return many voices (55 in one report) of which only some (36) are actually selectable, effectively one voice per locale; Siri voices that the system uses are not in the `getVoices()` list; downloaded Siri voice packs are not reported. "Karen" is an en-AU voice. [SNIPPET] — [talkrapp](https://talkrapp.com/speechSynthesis.html); [Apple Developer Forums 723503, "not all voices installed listed"](https://developer.apple.com/forums/thread/723503); [Apple Developer Forums 676726](https://developer.apple.com/forums/thread/676726)
- **Audio routing with the mic on:** when AudioContext and getUserMedia are both used, WebKit puts the session into play-and-record without a "default to speaker" option. iOS treats speechSynthesis as "system speech" (an accessibility path), which gets demoted: it can play quietly or through the earpiece. The author's fix was to stop using speechSynthesis and play TTS audio bytes through the AudioContext (the media path), which plays through the speaker. [SNIPPET; a developer's blog, not Apple documentation] — [Sam Eddy, "iOS Safari audio sessions: fifteen commits to a working voice mode"](https://samueleddy.com/writing/ios-safari-audio-sessions/)
- Conflicting report: other developers say that starting getUserMedia on iOS Safari forces output *from headphones to the built-in speaker*. [SNIPPET] — [Medium summary](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe); [WebKit bug 218012](https://bugs.webkit.org/show_bug.cgi?id=218012)
- Note by Note already sets `navigator.audioSession.type = 'play-and-record'` before getUserMedia and plays all sound through one AudioContext with a compressor (`js/audio.js` lines ~33-100). [CODE]
- iOS audio input is fragile across OS updates: in the iOS 26.1 beta (September 2025) getUserMedia audio failed with "No AVAudioSessionCaptureDevice device"; fixed in iOS 26.1 beta 2 (October 2025). [READ] — [Apple Developer Forums 802555](https://developer.apple.com/forums/thread/802555)

**Pre-generated clips (generated once, shipped as files)**
- *Azure AI Speech:* free F0 tier includes 0.5 million neural TTS characters per month. [SNIPPET; third-party pricing summary; check the official page] — [texttolab pricing summary](https://texttolab.com/blog/azure-text-to-speech-pricing); [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)
- *Azure output rights:* a Microsoft Q&A answer says Microsoft's Product Terms allow customers using the **paid** tier with prebuilt neural voices to use generated audio, including commercially; requirements include rights to the input text, disclosure that the content is synthetic, and not using output to train a competing TTS service. A separate Q&A thread is titled "Please clarify the conflicting information regarding permission to use the free tier of Azure Speech for commercial purposes". [SNIPPET; Q&A answers are not the Product Terms and may be community/AI-written; free-tier rights are disputed] — [Microsoft Q&A 5987029](https://learn.microsoft.com/en-nz/answers/questions/5987029/can-audio-generated-with-azure-text-to-speech-be-p); [Microsoft Q&A 5805156](https://learn.microsoft.com/en-us/answers/questions/5805156/please-clarify-the-conflicting-information-regardi); [Microsoft Q&A 5596131 on caching/redistribution](https://learn.microsoft.com/en-us/answers/questions/5596131/azure-ai-speech-terms-on-caching-redistribution-of)
- *Amazon Polly:* Polly output can be stored, cached, replayed and redistributed (for example as MP3/OGG) at no extra charge; AWS describes "no restrictions on storage and reuse of voice output". [VENDOR, SNIPPET] — [Amazon Polly FAQ](https://aws.amazon.com/polly/faqs/); [re:Post, Polly voice licence](https://repost.aws/questions/QU1slb0Zf6R5unDpAp9UCT7A/amazon-polly-s-voice-license)
- *Google Cloud TTS:* you can use the audio files you create to power your applications or media in compliance with the Google Cloud Terms of Service; you may not use output to train a competing TTS system. Chirp 3 HD voices support en-AU. A blog claims "rebundling as a media library is not" covered, but that is an unofficial source. [SNIPPET] — [Google Cloud TTS basics](https://docs.cloud.google.com/text-to-speech/docs/basics); [Chirp 3 HD docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd); [bicov.pro blog (low confidence)](https://bicov.pro/blog/new-google-text-to-speech-commercial-use)
- *ElevenLabs:* Free plan output may not be used commercially and must credit "elevenlabs.io" or "11.ai" (in the title) when shared publicly; all paid plans (Starter about US$5/month and up) include a commercial licence. [SNIPPET, third-party summaries of the terms] — [terms.law summary](https://terms.law/ai-output-rights/elevenlabs/); [bigvu pricing 2026](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/)
- *OpenAI TTS:* usage policies require a clear disclosure to end users that the TTS voice they hear is AI-generated, not human. [SNIPPET] — [OpenAI text-to-speech guide](https://platform.openai.com/docs/guides/text-to-speech)
- *Piper (free, runs offline on a computer):* the original Piper repo was archived in October 2025 (MIT); development moved to OHF-Voice/piper1-gpl under GPL-3.0. Each voice model carries its own licence and many are non-commercial. [SNIPPET] — [Cekura, Piper licensing](https://www.cekura.ai/discover/piper-tts); [rhasspy/piper discussion #271](https://github.com/rhasspy/piper/discussions/271)
- *Australian Piper voice:* `piper-en_AU` trains a Piper voice from public-domain LibriVox recordings by 10 accent-checked Australian narrators (about 31 hours); code is CC0-1.0 and the model is described as public domain; the trained model is on Hugging Face as `DataCraftsmanAustralia/piper-en_AU-librivox-medium` (22,050 Hz, one speaker ID per narrator); usage is `echo 'text' | python -m piper -m voices/en_AU-librivox-medium.onnx -f out.wav`. The repo has only 2 commits; quality is not independently reviewed. [READ] — [DataCraftsmanAustralia/piper-en_AU](https://github.com/DataCraftsmanAustralia/piper-en_AU)

**Shipping and caching clips**
- Safari's `<audio>` element makes HTTP Range requests; when a service worker serves media offline it must answer with a valid 206 Partial Content response, and the full file should be cached as a 200 response first. On iOS, streaming a large file through a service worker has crashed pages (300 MB GPU-process limit). [SNIPPET] — [Phil Nash, "Service workers: beware Safari's range request" (2018)](https://philna.sh/blog/2018/10/23/service-workers-beware-safaris-range-request/); [lukleh/besedy issue #162](https://github.com/lukleh/besedy/issues/162)
- Home-screen web apps are exempt from WebKit's 7-day deletion of script-writable storage (IndexedDB, Cache API, service worker registrations); since iOS 17 the quota is based on disk size; `navigator.storage.persist()` requests eviction exemption. [SNIPPET] — [WebKit Tracking Prevention](https://webkit.org/tracking-prevention/); [WebKit, Safari 17 beta features (WWDC23)](https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/)

**Parent-recorded prompts on the device**
- MediaRecorder works on iOS Safari 14.5+, producing MP4/AAC audio; Safari 18.4 (March 2025) added WebM/Opus recording. [SNIPPET] — [testmuai MediaRecorder support](https://www.testmuai.com/learning-hub/mediarecorder-browser-support/); [WebKit, MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/); [addpipe, ALAC/PCM in Safari TP](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/)
- An older report says the MediaRecorder `stop` event did not fire on iPad Safari (works on Mac). [SNIPPET; old thread] — [Apple Developer Forums 662277](https://developer.apple.com/forums/thread/662277)

### Inferences
- **Play every voice clip through the existing AudioContext** (`fetch` → `decodeAudioData` → `AudioBufferSourceNode` into the master bus). This avoids: the speechSynthesis gesture rule (the context is already unlocked by the first tap), the "system speech" demotion with the mic on, the Range-request/service-worker problem (no `<audio>` element is involved), and voice-selection problems. It also puts narration under the app's own compressor and volume.
- **Size estimate (my calculation, not sourced):** a 2-3 second mono clip at 32-48 kbit/s is about 8-18 KB. Thirty to forty prompts would be well under 1 MB, small enough to precache in the service worker.
- "No build step" can be kept: generating clips is a one-off job on a computer (Piper locally, or a cloud TTS console), and the resulting files are committed like images. Only re-run when the wording changes.
- **Licensing ranking for a public GitHub repo** (the clips will be publicly downloadable from GitHub Pages and from the repo): Piper en_AU (CC0, no account, no disclosure duty, but unknown quality) and Amazon Polly (vendor says unrestricted reuse) look lowest-risk; Azure and Google look fine on paid tiers but the free-tier position is less clear; ElevenLabs free tier would need visible attribution and forbids commercial use; OpenAI requires an "AI voice" disclosure. A one-line "Voice: computer-generated" note in Settings/About covers the disclosure duties cheaply.
- **speechSynthesis is still useful as a fallback** for dynamic text that cannot be pre-recorded (song titles, a range like "C4 to G5", a score), but only *before the mic is on* and only from a tap handler. The Multi-Voice-Timer unlock trick (`cancel()` then a `'.'` utterance at volume 0.01) is the current community workaround; never speak an empty string.
- Parent recordings must **never be committed to the public repo**: a parent's or child's voice in a public repo is permanently downloadable and could be used for voice cloning. Keep them in IndexedDB on each phone. Since each child has their own iPhone, the parent would record on each phone, or the app could offer export/import of a small zip of clips via the share sheet (more work).

### Gaps
- Could not verify which en-AU voices iOS 26 exposes to `speechSynthesis` (Karen? Lee? enhanced versions?) or whether speech works offline on iOS (it uses on-device voices, so it probably does, but I found no source).
- Could not verify Azure en-AU neural voice names (for example Natasha, William) or Polly en-AU neural voices (for example Olivia) from official pages.
- Could not read Microsoft Product Terms, AWS Service Terms or Google Cloud Service Specific Terms directly; all licence statements above are from summaries or vendor marketing.
- No source found on whether speechSynthesis behaves differently in standalone (home-screen) mode versus Safari tabs; SpeechRecognition is documented as blocked in standalone mode (section 5), but I found no equivalent statement for synthesis.
- Quality of the Piper en_AU voice for child-friendly prompts is untested.

---

## 4. Avoiding interference: narration must never be heard by the pitch detector or play while the child sings

### Takeaway
Note by Note already has the right mechanism for the guide notes (they only sound during "listen" phases or with headphones, and pitch frames during listen phases are hidden), so narration should follow exactly the same rules. Because the mic runs with echo cancellation **off**, anything played through the speaker while the mic is analysing will be picked up and can be drawn as the child's voice.

### Cited Findings
- Lessons are built so that "sing" notes only sound when the singer wears headphones, "so the mic never hears the guide" (`js/lessons.js` line 38). Pitch frames that fall in a "listen" event, or within 0.3 s after one, are hidden (`js/app.js` ~684). [CODE]
- The app requests the mic with `echoCancellation: false, noiseSuppression: false, autoGainControl: false` (`js/audio.js` ~80-82). [CODE]
- The app's own Settings copy warns that "Bluetooth drops to call quality while the mic is on" and recommends wired headphones (`js/app.js` ~185). [CODE]
- Safari allows only one getUserMedia capture at a time; a newer request for the same media type mutes the earlier track, with no programmatic unmute (workaround: clone the track). [SNIPPET] — [webrtcHacks, Guide to Safari WebRTC](https://webrtchacks.com/guide-to-safari-webrtc/)
- With mic and AudioContext both active, iOS speechSynthesis output can be demoted (quiet or earpiece), whereas AudioContext output stays on the media path. [SNIPPET] — [Sam Eddy](https://samueleddy.com/writing/ios-safari-audio-sessions/)

### Inferences
- **Timing rules for narration (proposed):**
  1. Narration plays only when the mic is off, or during a "listen" phase, never during a "sing" phase.
  2. Treat a narration clip as a "listen" event, so the existing frame-hiding (plus the 0.3 s tail) also covers it.
  3. Stop narration immediately when the child taps Start/Sing (stop the AudioBufferSourceNode).
  4. In Free sing, narrate only before the mic starts; never while it is on.
- Spoken voice has a clear pitch, so the detector would draw it as a line and could score it; that is why rule 2 matters. Headphones remove the problem when the guide is heard through them, but the app cannot assume small children wear headphones.
- Using the AudioContext path (not speechSynthesis) keeps narration on the same output route and volume as the piano, so children hear prompts at the same level as notes.
- If voice commands were ever added, Safari's single-capture rule means a SpeechRecognition session could mute the pitch-detection mic, or the reverse (see section 5).

### Gaps
- I found no measurement of how much speaker output leaks into the iPhone mic with echo cancellation off at typical volume; the app's real-world behaviour should be tested on the children's phones.
- Unverified which output route (speaker vs earpiece) iOS 26 uses for AudioContext output in play-and-record mode; the app's existing piano playback is the best test.

---

## 5. Voice commands ("start", "again", "next") with webkitSpeechRecognition on iOS

### Takeaway
Not worth it for Note by Note. It **does not work in home-screen (standalone) web apps** on iOS, it competes with the pitch-detection mic, Safari sends the audio to **Apple's servers**, and speech recognisers get young children's speech wrong roughly half the time.

### Cited Findings
- Safari exposes SpeechRecognition as `webkitSpeechRecognition` since Safari 14.1 (macOS) and 14.5 (iOS/iPadOS). Safari 26.0 restricted it to secure contexts. [SNIPPET] — [caniuse, Speech Recognition](https://caniuse.com/speech-recognition); [WebKit, Safari 26.0 features](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- `webkitSpeechRecognition` works in Safari but **not** when the web app is added to the iOS Home Screen (developer report, March 2024, no replies). [READ] — [Apple Developer Forums 748048](https://developer.apple.com/forums/thread/748048)
- WebKit bug 225298 states the SpeechRecognition API "is not available in SafariViewController and web apps added to Home Screen for now". [SNIPPET; bug page could not be opened, so its current status is unverified] — [WebKit bug 225298](https://bugs.webkit.org/show_bug.cgi?id=225298)
- Other iOS browsers expose `webkitSpeechRecognition` but it fails with `service-not-allowed`; on iPhone/iPad Safari there are reports that the mic never stops and no result is returned. [SNIPPET] — [Apple Developer Forums 699881](https://developer.apple.com/forums/thread/699881)
- Using SpeechRecognition mutes the mic track everywhere else on the page (reported for WebRTC calls). [SNIPPET] — [WebKit bug 180748](https://bugs.webkit.org/show_bug.cgi?id=180748)
- In Safari, recognition audio goes to Apple's servers; the first-use permission prompt tells the user speech data will be sent to Apple. One source says on-device recognition can run once a language pack is installed. [SNIPPET; the sources partly conflict on on-device processing] — [AssemblyAI, Web Speech API and its limits](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api); [addpipe, Deep dive into the Web Speech API](https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/); [Apple, Siri, Dictation & Privacy](https://www.apple.com/legal/privacy/data/en/ask-siri-dictation/)
- Apple's newer on-device SpeechAnalyzer (iOS 26, 2025) has no Web Speech API surface; webkitSpeechRecognition does not use it or give its offline guarantee. [SNIPPET] — [addpipe, Apple SpeechAnalyzer](https://blog.addpipe.com/apple-speechanalyzer-api/)
- Child speech recognition: a 2025 JASA Express Letters paper reports voice assistant technology "continues to underperform on children's speech"; summaries report a voice assistant responded correctly to only about half of queries from children aged 5-10, word error rates above 40% for younger children, and up to 35% WER for kindergarteners (4-6). [SNIPPET; figures come from several studies mixed together in summaries] — [JASA Express Letters 5(3) 035201 (2025)](https://pubs.aip.org/asa/jel/article/5/3/035201/3338215/Voice-assistant-technology-continues-to); [The Learning Agency, child speech recognition gap](https://the-learning-agency.com/guides-resources/closing-the-child-speech-recognition-gap-evidence-limitations-and-paths-forward/)

**Privacy and law (Australia first)**
- The OAIC released an exposure draft of the Children's Online Privacy Code on 31 March 2026; consultation closed 5 June 2026; the code must be registered by 10 December 2026. It covers under-18s and includes best-interests assessment, stronger consent, age assurance and a right to delete; breach is a breach of the Privacy Act. [SNIPPET] — [Attorney-General media release, 31 March 2026](https://ministers.ag.gov.au/media-centre/draft-childrens-online-privacy-code-released-31-03-2026); [OAIC consultation page](https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-children,-young-people,-parents-and-carers); [Allens, April 2026](https://www.allens.com.au/insights-news/insights/2026/04/draft-childrens-online-privacy-code-proposed-protections-to-have-material-impact-on-online-services/)
- The code is proposed to apply to APP entities providing social media, relevant electronic or designated internet services likely to be accessed by children; the Privacy Act small-business exemption (annual turnover AUD 3 million or less) would still apply. [SNIPPET] — [Baker McKenzie, May 2026](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft)
- US: the FTC's amended COPPA Rule was published 22 April 2025. [SNIPPET] — [Federal Register, COPPA Rule 2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)

### Inferences
- The home-screen block alone rules voice commands out, because every child uses the app from the Home Screen.
- Even in a Safari tab, recognition would fight the pitch-detection mic, and wrong recognitions ("next" heard as noise) would confuse a 4-year-old more than a big button would.
- Sending children's voice audio to Apple would break the app's current promise on the mic screen: "Nothing is recorded or sent anywhere" (`js/app.js` ~136). As a family hobby app with no turnover and no collection, the draft Australian code probably would not apply, but its best-interests standard is a sensible benchmark, and the promise to the kids matters more.
- A large "Again" button and a "hear it again" speaker icon do the same job with no privacy cost.

### Gaps
- Whether WebKit bug 225298 has been fixed in iOS 26/27 could not be verified (bug tracker blocked). A quick test on a Home Screen install would settle it.
- Whether the US COPPA definition of personal information covers children's voice recordings was not re-verified in this session (I recall it does, but have no source here).
- The final text of the Australian Children's Online Privacy Code (due by 10 December 2026) was not yet available.

---

## 6. Settings design: auto-on for young kids vs a toggle, "hear it again", captions

### Takeaway
Use a **per-phone "Read to me" setting** (each child has their own iPhone), **on** for the youngest and **off** for teens, plus a **speaker button on every screen** that replays that screen's prompt. Keep the on-screen text as the "caption": narration should say exactly what the screen says, in a few words.

### Cited Findings
- Long instructional audio irritates children; a few seconds of clear audio is recommended for non-readers. [SNIPPET] — [NN/g report page](https://www.nngroup.com/reports/children-on-the-web/)
- Khan Academy Kids lets children tap any text to hear it read. [SNIPPET, secondary] — [edu.com](https://www.edu.com/blog/understanding-khan-academy-kids-a-complete-guide-for-k-2-teachers-and-parents)
- PBS KIDS games provide audio control options and voice-overs among accessibility settings. [SNIPPET] — [Parenting Special Needs Magazine](https://www.parentingspecialneeds.org/article/pbs-kids-focus-is-on-content-accessibility-for-all/)
- Sesame Workshop: a friendly narrator greets and states the goal; every sound must have a meaning. [SNIPPET] — [Sesame Workshop PDF](https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf)
- iOS will not start speechSynthesis output without a user gesture. [READ] — [easy-speech #366](https://github.com/leaonline/easy-speech/issues/366)
- Settings are per device and stored locally (the app has a Settings sheet with toggles such as Headphones and "How strict"; `js/app.js` ~185-189). [CODE]

### Inferences
- **Default:** ask once at first run, with pictures rather than words (for example a small child and a bigger child), or let the parent switch "Read to me" on in Settings. Default off avoids annoying teens; the parent sets it on for the 4-7 year olds' phones.
- **Auto-play rule:** when "Read to me" is on, play the screen's prompt when the screen opens *from a tap* (the navigation tap is the gesture, and the AudioContext is already running). Play each auto-prompt once per screen visit; the speaker button replays it.
- **Speaker button:** same place on every screen (for example top right next to Headphones), large target, a speaker icon that animates while talking.
- **Captions:** keep the existing short cue text; highlight it while the voice speaks it. Children learning to read benefit from seeing the words as they hear them (my inference, consistent with Endless Reader's read-aloud design).
- **Sound vocabulary:** one consistent earcon or sung motif each for "listen", "your turn", "well done", "try again", in line with Sesame's "every sound has a meaning".
- **Free sing:** a single spoken line before the mic starts ("Tap the microphone, then sing anything you like!") and nothing while the mic is on.

### Gaps
- No research found on the best default (opt-in vs opt-out) for narration in apps shared by mixed ages; the recommendation above is design judgement.
- No data on whether 4-year-olds reliably find and use a "hear it again" button; worth watching the owner's children use it.

---

## Implications for Note by Note

### Takeaway
Add short spoken prompts, but play them as **audio clips through the existing Web Audio engine**, never while the mic is scoring, behind a per-phone "Read to me" switch with a "hear it again" button. Skip voice commands. The cheapest high-value first step is a set of meaningful sounds/sung cues plus 20-40 two-to-four-second spoken clips.

### Cited Findings
- The app already separates "listen" and "sing" phases and hides pitch frames during listen phases (`js/app.js` ~684, `js/lessons.js` line 38); all audio goes through one AudioContext (`js/audio.js`); the mic screen promises "Nothing is recorded or sent anywhere" (`js/app.js` ~136). [CODE]
- Evidence and sources for each point are in sections 1-6 above.

### Inferences
**Options ranked (best first).** Value = benefit for 4-7 year olds. Cost = money. Effort = for a plain-JS PWA with no build step. Risk = privacy and legal.

1. **Meaningful earcons and a sung "your turn" motif** (Listen / Your turn / Well done / Try again).
   - Value: medium-high. Works without reading or language, mirrors teacher practice, and teens won't mind it.
   - Cost: $0.
   - Effort: low. Synthesize with the existing guide/piano waves and hook into the existing cue changes.
   - Risk: none.
2. **Pre-generated spoken clips (about 20-40 prompts, 2-4 s each) played via AudioContext, with a "Read to me" toggle and a speaker button on each screen.**
   - Value: high. This is the core fix for pre-readers.
   - Cost: $0 with Piper en_AU (CC0), or a few cents with Polly/Azure/Google.
   - Effort: medium. Write the prompt list, generate the files once on a computer, commit them, and add a small `voice.js` that preloads, decodes and plays them and respects the listen/sing rules. Precache in the service worker. Clips total under 1 MB (estimate).
   - Risk: low. Prefer Piper CC0 or Polly for a public repo. Add an "AI-generated voice" line in About (required by OpenAI; Microsoft reportedly expects disclosure). Avoid the ElevenLabs free tier, which needs public attribution and is non-commercial.
3. **"Record your own voice" for parents** (each prompt recorded on the phone with MediaRecorder and stored in IndexedDB; falls back to option 2 clips).
   - Value: high for the youngest. A familiar voice, and the owner chooses the wording.
   - Cost: $0.
   - Effort: medium-high. Needs a recording UI per prompt, re-record, storage, `navigator.storage.persist()`, testing for the iPad `stop` event bug, and repeating on each child's phone (or building export/import).
   - Risk: low if the recordings never leave the phone. Keep them **out of the public repo**, and do not include them in "Copy results for Claude".
4. **speechSynthesis fallback for dynamic text** (song names, range read-out), mic-off screens only.
   - Value: low-medium.
   - Cost: $0.
   - Effort: low, but fragile: it needs a tap, voice choice is unreliable, it can freeze, and it plays quietly or from the earpiece when the mic is on.
   - Risk: none (on-device). Use only where pre-recording is impossible.
5. **Icon-first tidy-up of navigation** (big pictures for Warm-up, Songs, Free sing, Start/Stop; fewer choices per screen, as Toca Boca and Sago Mini do).
   - Value: medium. It complements narration.
   - Cost: $0.
   - Effort: low-medium.
   - Risk: none.
6. **Voice commands via webkitSpeechRecognition: not recommended.**
   - Value: low. Children's speech is often misrecognised.
   - Effort: medium, and it does not work in Home Screen mode, which every child uses.
   - Risk: medium. Children's audio is sent to Apple, it breaks the "nothing is sent anywhere" promise, and it conflicts with the pitch mic.

**Must-follow rules for any narration**
- Never play narration while a "sing" phase is being scored. Treat clips as "listen" events so the existing frame-hiding covers them, and stop narration as soon as Start is tapped.
- Play through the AudioContext (not `<audio>` or speechSynthesis), so the gesture rules, routing and service-worker Range quirks don't apply.
- Keep each prompt to a few words that match the on-screen cue, with the key action word last.
- Test on the children's actual iPhones, in Home Screen mode, with and without headphones, at normal volume.

### Gaps
- Real-device tests are needed for: speaker leakage into the mic with echo cancellation off, output route in play-and-record mode on iOS 26/27, and speechSynthesis behaviour in standalone mode.
- Licence terms (Azure Product Terms, AWS Service Terms, Google Service Specific Terms, ElevenLabs ToS) should be read first-hand before choosing a cloud voice. The Piper en_AU model's CC0 status should be checked on its Hugging Face card.
