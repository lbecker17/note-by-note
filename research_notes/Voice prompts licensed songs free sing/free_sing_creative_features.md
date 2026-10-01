# Free sing: creative features for a children's singing app (ages 4 to teens), grounded in music-education research and the creative apps kids love

Research date: 1 October 2026. Researcher notes for the report writer.

**How to read the source tags (important):** the network proxy blocked full-page fetches for almost every domain I tried (ellendissanayake.com, help.bandlab.com, suno.com, the-decoder.com, hekupu.ac.nz, my.chartered.college, dornsife.usc.edu, frontiersin.org). Only github.com pages could be opened.
- **[READ]** means I fetched and read the page itself.
- **[SNIPPET]** means the claim comes from a web-search result summary of that URL, not a full read. Treat these as likely but not verified word for word.
- **[VENDOR]** marks a vendor's own claim about its product or terms.
- **[CODE]** marks facts from the Note by Note source code, inspected read-only (`/home/user/note-by-note/js/app.js`).
- **[LOCAL]** marks facts carried over from the earlier research notes in `/home/user/note-by-note/research_notes/Note by Note singing app review/`.
- Inferences are in the "Inferences" subsections. They are my reasoning, not sourced facts.

**What Free sing does today [CODE]:** `freeCtrl()` (app.js around line 1206) shows the header "Free sing / No score. Just your voice." and the cue "Sing anything. The line follows your pitch and the names on the left show where you are." It draws the live pitch line in the lane, which keeps the last 600 frames, and shows a note-name and cents readout plus a level bar. It has a Start/Done button and the wake lock. It stores nothing, plays nothing back, and gives no feedback once the child stops.

**A note on "score":** the user's question "Can we record/score the made-up song?" can mean **rating** it (a score) or **writing it down** (a musical score or notation). Both are covered below.

---

## 1. What does research say about children's invented songs and improvisation, how do teachers respond, and should a made-up song be "scored"?

### Takeaway
Invented ("spontaneous", "improvised") song is a normal, research-recognised part of childhood. It starts at about 18 months and is most active until about age 7. Researchers treat it as an early form of creativity used for play, identity, storytelling and communication. Researchers such as Young argue that adult-led "performance" models of music teaching have overlooked it. Pitch skills develop in a known order:
- ages 2 to 3: contour only;
- age 4: scale steps within a phrase, but the key shifts between phrases;
- ages 5 to 6: a stable key.

So **"staying in key" is not a fair test for under-5s or 6s**. Two findings support feedback that does not grade the song itself:
- Process praise sustains persistence better than person praise.
- Singers imitate their own recordings more accurately than other people's, and poor-pitch singers gain most from this.

Instead of grading the song, the feedback can reflect it back to the child, celebrate the process and invite a repeat.

### Cited Findings
**What invented song is and why it matters**
- Invented song "emerges as a component of children's musical and play activity at approximately 18 months of age and is sustained through to approximately the age of seven", and children's invented song-making "is foundational in the development of creative thought and activity in music". [SNIPPET] — [Barrett, "Inventing songs, inventing worlds: the 'genesis' of creative thought and activity in young children's lives" (Int. J. Early Years Education, 2006), via ResearchGate](https://www.researchgate.net/publication/43515220_Inventing_songs_inventing_worlds_The_'genesis'_of_creative_thought_and_activity_in_young_children's_lives); [PDF copy, not openable](https://www.ellendissanayake.com/links/CIEY_A_187919_O1.pdf)
- Toddlers use invented song "in their identity work, as a means of communication with themselves and others, and as a means of exploring and expressing their understanding of the world". [SNIPPET] — same Barrett sources; see also [Barrett 2016, "Attending to 'culture in the small'", Research Studies in Music Education](https://dx.doi.org/10.1177/1321103X15603557)
- Patricia Shehan Campbell's *Songs in Their Heads* (1998) moved the field away from searching for universals and towards qualitative study of children's everyday musical lives. Campbell argued that music holds meaning for children "because it is useful to them". Children used music "as an activity in its own right and as a means of enhancing other activity". [SNIPPET] — [Waikato thesis, "Spontaneous singing and musical agency in the everyday home"](https://researchcommons.waikato.ac.nz/server/api/core/bitstreams/648d6f71-6391-48c3-bbad-08b34d96cc65/content)
- Jon-Roar Bjørkvold (*The Muse Within*, 1992) studied the songs of 4 to 7 year olds in three Oslo kindergartens. He described three types of children's song:
  - **"fluid/amorphous" songs**, which grow out of babbling and have "fanciful glissandi, micro-intervals, and free rhythms … quite different from what we adults traditionally identify as song";
  - **"song formulas"**, which are chant-like and used in play with others;
  - **"standard songs"**, which are known songs that children adapt for their own play and purposes.
  - [SNIPPET] — [Internet Archive record of *The Muse Within*](https://archive.org/details/musewithincreati0000bjrk); [Frontiers in Psychology 2018 article citing Bjørkvold](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01680/full)
- Susan Young (Exeter) argued that "the persistence of a 'performance model' of early childhood music education has detracted attention from children's spontaneous musical activity". Her observations of 2 and 3 year olds in day care and nursery show improvised singing woven into movement and play with objects. [SNIPPET] — [Young 2006, "Seen but Not Heard: Young Children, Improvised Singing and Educational Practice", Contemporary Issues in Early Childhood 7(3)](https://journals.sagepub.com/doi/10.2304/ciec.2006.7.3.270)
- Further recent studies of home spontaneous singing, found by title only (not read):
  - [Dean 2021, "Spontaneous singing in early childhood: an examination of young children's singing at home", RSME](https://doi.org/10.1177/1321103x20924139)
  - ["Young children, solitude and singing: self-directed singing and personal agency in three- and four-year-old children at home", Early Child Development and Care 191(12)](https://www.tandfonline.com/doi/abs/10.1080/03004430.2020.1865941)
  - [Sole 2017, "Crib song: insights into functions of toddlers' private spontaneous singing", Psychology of Music](https://journals.sagepub.com/doi/10.1177/0305735616650746)

**Developmental order of pitch skills (this decides which feedback is fair)**
- Gardner, Davidson & McKernon (1980) found the following. [SNIPPET; secondary summary in a Psychology of Music article] — [Gudmundsdottir et al., Psychology of Music (open-access copy)](https://opinvisindi.is/server/api/core/bitstreams/a18143f5-912b-4529-9274-ca19ada70eb1/content); also [ResearchGate: "Adults recognize toddlers' song renditions"](https://www.researchgate.net/publication/318292033_Adults_recognize_toddlers'_song_renditions)
  - 2 and 3 year olds "reproduced the contours of short phrases, but with considerable variation in the pitches".
  - 4 year olds "could maintain scale steps within phrases, but they might shift to different keys at phrase boundaries".
  - "only 5-year-olds maintained the key throughout extended melodies".
  - "Key-stability emerges no earlier than 5 to 6 years of age". The order in which children acquire song elements is "words first, followed by rhythm, pitch, and tonality".
  - The singing range of children under 5 "has been described as very small (McKernon, 1979), no larger than seven semitones".
- Davidson's (1985) "contour scheme" account: young children compress a song's intervals to fit their small range while keeping its approximate contour. [SNIPPET] — same source as above.

**Improvisation in Kodály and Orff teaching**
- Call-and-response is a standard entry to vocal improvisation: "singing questions to students and asking for them to sing an answer". [SNIPPET] — [Teaching With Orff, "Venturing into Vocal Improvisation"](https://teachingwithorff.com/vocal-improvisation/)
- Kodály-based teaching has students "improvise question-and-answer motives using known melodic patterns". Both Kodály and Orff use the pentatonic scale before the diatonic. Pentatonic C-D-E-G-A lets children "create beautiful music beginning and ending on C without having to worry about making mistakes". The Orff approach teaches in four stages: "imitation, exploration, literacy, and improvisation". [SNIPPET] — [Lumen/SUNY "Music and the Child", Chapter 4: Approaches to Music Education](https://courses.lumenlearning.com/suny-music-and-the-child/chapter/chapter-4-approaches-to-music-education-2/)
- A mixed-methods developmental study of children improvising song endings exists. [SNIPPET; title only, PDF blocked] — [Ilari et al. 2017, "Improvised song endings in a developmental perspective", Psychology of Music](https://dornsife.usc.edu/brainandmusic/wp-content/uploads/sites/265/2023/10/Improvised_song_endings_in_a_developmetal_perspective_a_mixed-methods_study-_Ilari_et_al._2017.pdf)

**Instruction, feedback and self-imitation (evidence for pitch value)**
- A meta-analysis of 34 studies of instruction for children aged 5 to 11 found an overall effect size of g = 0.43. **Feedback** gave the largest effect among teaching conditions, and **8 year olds** showed the largest effect by age. [SNIPPET] — ["The effects of instruction on the singing ability of children ages 5 to 11: A meta-analysis" (academia.edu copy)](https://www.academia.edu/33946857/The_effects_of_instruction_on_the_singing_ability_of_children_ages_5_to_11_A_meta_analysis). I believe the author is C. Svec (Psychology of Music, c. 2017), but I did not verify this.
- Demorest, Nichols & Pfordresher (2018) gave young children daily focused singing instruction. The instructed group improved significantly more on pitch matching, but "performance on the familiar song task did not improve for either group". [SNIPPET] — [Psychology of Music 2018](https://journals.sagepub.com/doi/10.1177/0305735617713120); [PDF](https://www.acsu.buffalo.edu/~pqp/pdfs/DemorestNicholsPfordresher_2018_PsyMus.pdf)
- **Self-imitation advantage:** "both accurate and poor-pitch singers were better able to imitate sung recordings of themselves than sung recordings of other singers, but this self-advantage was enhanced for poor-pitch singers". The effect was not explained by self-recognition, timbre or absolute pitch, and "the advantage remains when recordings are transposed". [SNIPPET] — [Pfordresher & Mantell 2014, "Singing with yourself", Cognitive Psychology 70:31–57 (PDF)](http://www.acsu.buffalo.edu/~pqp/pdfs/Pfordresher&Mantell_2014_CogPsy.pdf); [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0010028514000036)

**Praise and feedback style for young children**
- Kamins & Dweck (1999) studied 5 and 6 year olds. After **person** praise, children showed lower persistence on a later setback task (M = 0.97, SD = 0.61) than after **process** praise (M = 1.53, SD = 0.61). After person praise or criticism they gave more "helpless" responses, including self-blame. "Person feedback, even when positive, can create vulnerability and a sense of contingent self-worth." [SNIPPET] — [Kamins & Dweck 1999, "Person versus process praise and criticism" (PDF)](https://people.uncw.edu/hungerforda/infancy/pdf/person%20versus%20process%20praise%20and%20criticism.pdf); see also [Brummelman et al., "Person praise backfires in children with low self-esteem" (APA PDF)](https://www.apa.org/pubs/journals/releases/xge-a0031917.pdf)

### Inferences
- **Should a made-up song be scored? Not with a grade, and not for under-8s.**
  - Before about age 5 to 6, an invented song is not built to stay in one key (Gardner et al.; Bjørkvold's "fluid" songs). A "key accuracy" or "in-tune %" score would mostly measure age, not effort.
  - A grade also turns a play activity into a test, which is the "performance model" Young criticises.
  - What the evidence does support is **reflective, process-focused feedback**: show the song back, name what the child did ("You used 7 different notes", "Your tune went up like a rocket and came home"), and invite a repeat ("Can you sing it again?").
- **The strongest pitch-learning hook in Free sing is "sing it again".**
  - The meta-analysis finds feedback is the most effective teaching condition.
  - Pfordresher & Mantell show self-imitation is easier than imitating others, and especially helps poor-pitch singers.
  - So asking a child to repeat their *own* tune, then showing how closely the two takes match, is research-aligned practice that never needs a "correct" target.
- **Teacher-style responses an app can copy (inference from the Orff/Kodály sources and the spontaneous-song literature):**
  - **echo** (the app plays the child's tune back);
  - **join in** (the app adds a drone or a harmony);
  - **extend** (the app asks a musical question and the child sings an answer);
  - **notate** (show the tune as note blocks or a staff, so it becomes "a real song I wrote");
  - **keep** (save it to the child's song book).
- **Age shift.** Invented song is most active to about 7. Older children and teens are more likely to want a "real song" outcome (backing track, effects, polish), as the popularity of BandLab and GarageBand among teens suggests. This is my inference; I found no study of teens' spontaneous singing in this session.

### Gaps
- The full texts of Barrett 2006, Young 2006, Ilari et al. 2017, Dean 2021 and Sole 2017 could not be opened. I have no verified quotes on **how teachers should respond** to invented songs (for example "record and play back", "notate", "don't correct"). The Chartered College article ["We made it up ourselves! In praise of children as composers"](https://my.chartered.college/impact_article/we-made-it-up-ourselves-in-praise-of-children-as-composers/) and the NZ article ["Waiting around the corner: Playing with songs in early childhood practice"](https://www.hekupu.ac.nz/article/waiting-around-corner-playing-songs-early-childhood-practice) look directly relevant but were blocked.
- Kathryn Whiteman's work on children's spontaneous singing and the Kodály "improvise to known patterns" research were not found in an openable form.
- I found no study showing that **improvisation itself** improves children's pitch accuracy. The evidence for pitch gains comes from instruction, feedback and self-imitation studies, not improvisation studies.
- I did not verify research on rating children's creativity, such as Amabile's Consensual Assessment Technique or Hickey's work on rating children's compositions. It would bear on whether any "creativity score" is defensible.

---

## 2. Which creative music apps and toys do children and teens love, and which mechanics make them sticky?

### Takeaway
The tools children return to share a small set of mechanics:
- **instant results with no skill barrier** (Chrome Music Lab, Toca Band, Blob Opera);
- **hearing your own voice transformed** (Voice Spinner, GarageBand's Chipmunk, Robot and Monster);
- **characters that perform your music** (Incredibox, Toca Band, Blob Opera);
- **hidden combinations that unlock rewards** (Incredibox bonuses);
- **automatic harmony** (Blob Opera);
- **record, keep and share** (Incredibox mixes, Yoto Make Your Own cards).

The social apps teens use for singing (Smule, StarMaker, BandLab, TikTok) carry stranger-contact risks and age limits. Several are closed to under-16s in Australia.

### Cited Findings
**Free, no-account web tools**
- **Chrome Music Lab** (Google): a free site with 13 experiments, including Song Maker, Rhythm, Spectrogram, Chords, Kandinsky, Melody Maker, **Voice Spinner**, Harmonics and Piano Roll.
  - **Song Maker:** "tap squares on a grid to make notes, then add drums. It's easy enough for a preschooler, yet compelling enough that adults get lost in it too."
  - **Voice Spinner** "records a few seconds of voice, then plays it back at different speeds."
  - Teachers value that it is "free with no signup means no student data collected".
  - Limitation: "an exploration tool, not a curriculum".
  - [SNIPPET] — [minibopmusic teacher's guide](https://minibopmusic.com/blog/what-is-chrome-music-lab); [Common Sense Education review](https://www.commonsense.org/education/reviews/chrome-music-lab); [Midnight Music, 50+ lesson ideas](https://midnightmusic.com/2018/09/50-lesson-ideas-for-the-chrome-music-lab/)
- **Song Maker accepts sung input:** "you can sing your note into your mic, or even use a MIDI keyboard", and "rows are pitch, columns are time". Settings include scale (**major, chromatic or pentatonic**), starting pitch, range, beats per bar and subdivision. South Australia's Department for Education lists Song Maker as a learning-at-home arts activity. [SNIPPET] — [SA Dept for Education, "Chrome Music Lab: Song Maker"](https://www.education.sa.gov.au/our-learning-sa/learning-home-activities/arts/chrome-music-lab-song-maker); [Control Alt Achieve](https://www.controlaltachieve.com/2018/12/chrome-music-lab.html); [AvenueAR guide (2024)](https://avenuear.com/2024/06/01/chrome-music-lab-guide/)
- **Blob Opera** (David Li with Google Arts & Culture, December 2020): an ML model trained on 16 hours of singing by four opera singers (tenor, bass, mezzo, soprano). Users drag blobs up and down for pitch and forwards and backwards for vowels, and "another machine learning model lets the blobs respond to and harmonise your input in real time". [SNIPPET] — [Experiments with Google: Blob Opera](https://experiments.withgoogle.com/blob-opera); [Google Arts & Culture](https://artsandculture.google.com/experiment/blob-opera/AAHWrq360NcGbw?hl=en); [New Atlas](https://newatlas.com/computers/google-blob-opera-machine-learning-experiment/)

**Character and loop apps**
- **Incredibox** (So Far So Good).
  - Common Sense Media rates it **9+**: "beginners will feel like pros right away". The free demo "quickly directs its users to its paid app".
  - **Bonus mechanic:** "a specific combination of five sounds" unlocks "an animated bonus of a few seconds", with three bonuses per musical style.
  - **Record:** "around 3 minutes" per recording. Saved mixes get "a unique URL", and listeners vote mixes into a "Top 50".
  - [SNIPPET] — [Common Sense Media review](https://www.commonsensemedia.org/website-reviews/incredibox); [Wikipedia: Incredibox](https://en.wikipedia.org/wiki/Incredibox); [Incredibox FAQ](https://www.incredibox.com/info/faq)
- **Toca Band:** Common Sense rates it **3+**. Children place characters on a stage and move them to change the music. The app "is limited to one song and has no in-app record/save function". [SNIPPET] — [Common Sense Media: Toca Band](https://www.commonsensemedia.org/app-reviews/toca-band); [Common Sense Education](https://www.commonsense.org/education/reviews/toca-band)

**Voice transformation**
- **GarageBand for iPhone:** its Audio Recorder "Voice" preset offers effects including **Chipmunk/Helium, Robot and Monster**, described as "essentially Photo Booth for audio". [SNIPPET] — [Macworld](https://www.macworld.com/article/212224/garageband_ipad_04.html); [cryan.com, 25 GarageBand vocal effects (Dec 2024)](https://www.cryan.com/blog/20241213.jsp)
- Many voice-changer apps rated 4+ exist on the App Store, which suggests a mass-market appetite. [SNIPPET] — [App Store: Voice Recorder and Voice Changer](https://apps.apple.com/us/app/voice-recorder-and-voice-changer-calling-effects/id1106815280?uo=4)

**Keepsake and family audio**
- **Yoto Make Your Own cards:** blank cards that hold "up to 6 hours of recording per card". Parents record in the Yoto app or upload MP3s, for example "your family's favorite lullabies". [SNIPPET, retailer and parent blogs] — [Amazon listing](https://amazon.com/Yoto-Children-Friendly-Audio-Card/dp/B09N7W47CL); [Look Hear Australia guide](https://lookhearaustralia.com.au/making-your-own-yoto-cards-fast-and-detailed-guide-%F0%9F%8E%B5%F0%9F%93%9A/); [Made for Mums](https://www.madeformums.com/reviews/how-to-make-your-own-yoto-cards/)

**Teen production and social singing apps (age limits apply)**
- **BandLab:**
  - Age limits: "users from Australia, Indonesia, and Malaysia must be at least 16 years old". Elsewhere the minimum is 13, with parental consent from 13 to the age of majority. "Chats and comments cannot be utilised by users between the ages of 13 to 18."
  - SongStarter "generates royalty-free compositions that users can tweak".
  - Safety reviewers flag strangers' direct messages and explicit content.
  - [SNIPPET + VENDOR; BandLab help pages blocked] — [BandLab Minor Safety](https://help.bandlab.com/hc/en-us/articles/52223951629465-Minor-Safety); [BandLab: why features are age-restricted](https://help.bandlab.com/hc/en-us/articles/43054754867481-Why-Certain-Features-are-Age-Restricted); [SaferKid rating](https://www.saferkid.com/app-reviews-for-parents/bandlab-music)
- **Smule:** the terms say 13+. Common Sense Media rates it 16+ and SaferKid says no one under 18, citing "high anonymity, low privacy, connections with strangers, and direct messaging". **StarMaker:** officially 13+, with SaferKid recommending 18+. [SNIPPET] — [Common Sense Media: Smule](https://www.commonsensemedia.org/app-reviews/smule-the-1-singing-app); [SaferKid: Smule](https://www.saferkid.com/app-reviews-for-parents/sing-karaoke-by-smule); [ScreenWise: StarMaker](https://screenwiseapp.com/media/starmaker-app)
- **Australian Social Media Minimum Age (from 10 December 2025):** eSafety told Facebook, Instagram, Snapchat, Threads, **TikTok**, X, **YouTube**, Kick and Reddit that they are age-restricted platforms. Twitch was added later. Discord, GitHub, LEGO Play, Roblox, Steam, Google Classroom, Messenger, WhatsApp and **YouTube Kids** were told they are not. BandLab, Smule and StarMaker do not appear in either published list. [SNIPPET] — [eSafety media release](https://www.esafety.gov.au/newsroom/media-releases/platforms-on-notice-to-comply-with-social-media-minimum-age); [eSafety March 2026 compliance update (PDF)](https://www.esafety.gov.au/sites/default/files/2026-03/SocialMediaMinimumAgeComplianceUpdateMarch2026.pdf); [Clayton Utz, May 2026](https://www.claytonutz.com/insights/2026/may/social-media-minimum-age-restrictions-the-net-widens-enforcement-begins-and-gaming-platforms-in-the-frame)

### Inferences
- The mechanics that fit a private, no-server PWA are those that need no other people:
  - instant playback;
  - voice "costumes" (speed or pitch changes, robot effect, echo, reverse);
  - turning the tune into coloured note blocks (Song Maker's grid, but filled from the child's own singing);
  - auto-harmony and backing (a simple, rule-based Blob Opera or SongStarter);
  - characters that sing the child's tune back;
  - collectible "unlocks" (Incredibox-style hidden combos), for example a hidden animation when a tune "comes home" to its starting note or uses all five pentatonic notes.
- Social mechanics (public charts, likes, duets with strangers) are what make Smule, StarMaker and BandLab risky. They should be replaced by **family-only sharing** through the iOS share sheet and an optional "Yoto card" export of saved songs.
- For **4 to 7 year olds** the anchors are Toca Band and Chrome Music Lab: no reading, characters, instant sound. For **8 to 12** the anchors are Incredibox and Song Maker: building, unlocking, saving. For **teens** they are GarageBand and BandLab: polish, effects, "make it sound like a real track".

### Gaps
- I did not verify current (2026) App Store ratings or review counts for Toca Band, Incredibox, GarageBand, Smule or StarMaker. The Common Sense ratings may be several years old.
- I found no published research on *why* children find hearing their own voice transformed engaging. The claim rests on product popularity, not studies.
- Chrome Music Lab **Shared Piano** was not researched.
- I did not check whether Smule or StarMaker have changed their Australian age gates since the Social Media Minimum Age began.

---

## 3. What feedback is meaningful for an invented song with no target, and which is valid and kind for young children?

### Takeaway
Several measures can be computed on the phone without a target melody. The table shows which ages each one is valid for.

| Measure | Valid from | Notes |
|---|---|---|
| Range used, number of different notes, song length, contour shape (up, down, arch) | All ages | Celebrate rather than grade |
| "Sing it again" self-match, contour only | 4+ | |
| "Sing it again" self-match, intervals | 6+ | Evidence supports it (self-imitation advantage) |
| "Stayed in one key" (pitch-class histogram plus Krumhansl–Schmuckler key-finding) | About 6+ | Developmentally invalid under 5 to 6; also unreliable on very short tunes |
| Steadiness of long notes | All ages | Must be vibrato-aware |
| Harmony and echo games | About 7 to 8+ | Ostinato and round skills come around early primary |

### Cited Findings
- **Key-finding.** The Krumhansl–Schmuckler model "compares the distribution of pitch classes in a piece with an ideal distribution or 'key profile' for each key". The distribution, built from note durations, "is compared with each of the 24 possible key profiles using Pearson's correlation; the highest correlation is selected as the implied key". The profiles come from Krumhansl and Kessler's probe-tone ratings. [SNIPPET + READ for GitHub implementations] — [ZGMTH, "Are Pitch-Class Profiles Really 'Key for Key'?"](https://www.gmth.de/zeitschrift/artikel/513.aspx); [GitHub: Corentin-Lcs/music-key-finder](https://github.com/Corentin-Lcs/music-key-finder); [GitHub: zwaltman/keyedin](https://github.com/zwaltman/keyedin)
- **Developmental validity of "stay in key".** The ages are the Gardner, Davidson & McKernon findings set out in section 1:
  - 4 year olds keep scale steps within phrases but may shift key at phrase boundaries;
  - "only 5-year-olds maintained the key throughout extended melodies";
  - key stability emerges "no earlier than 5 to 6";
  - the range of under-5s is no more than about 7 semitones.
  - [SNIPPET] — [Gudmundsdottir et al., Psychology of Music](https://opinvisindi.is/server/api/core/bitstreams/a18143f5-912b-4529-9274-ca19ada70eb1/content)
- **Self-repetition as feedback.** Self-imitation is easier than imitating another voice, and the advantage survives transposition. A transposed comparison of take 1 with take 2 is therefore fair. [SNIPPET] — [Pfordresher & Mantell 2014](http://www.acsu.buffalo.edu/~pqp/pdfs/Pfordresher&Mantell_2014_CogPsy.pdf)
- **Interval and contour errors drive human judgements.** Interval deviation, contour errors and key modulations explain 81% of expert ratings of untrained singers (Larrouy-Maestri et al. 2013). [LOCAL] — [pitch_detection_and_scoring_tech.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/pitch_detection_and_scoring_tech.md)
- **Vibrato.** Perceived pitch is the mean of the vibrato, and typical vibrato is about ±50 cents at 4.5 to 6.5 Hz. A naive "steadiness" score misreads vibrato as wobble. [LOCAL] — same file, "Implications" items 1 and 2.
- **Harmony readiness.** "By the age of seven or eight, children are ready for some type of vocal multiple part performing", and some are ready "by late 1st or 2nd grade". Rhythmic ostinati can start around Grade 1. Part-singing builds from canons and ostinati to partner songs and descants. Children not yet ready "can be prepped … through layered speech pieces, rhythmic … patterns". [SNIPPET, textbook and practitioner sources] — [LibreTexts / Sarrazin, "Music and the Older Child"](https://socialsci.libretexts.org/Bookshelves/Early_Childhood_Education/Music_and_the_Child_(Sarrazin)/01:_Chapters/1.09:_Music_and_the_Older_Child); [WELS, "Building Part-Singing Skills in Children's Choirs"](https://wels.net/building-part-singing-skills-in-childrens-choirs/)
- **Audio-to-notes transcription in the browser.**
  - **[READ]** Spotify's **Basic Pitch** TypeScript library is Apache-2.0 licensed and runs in the browser. It resamples all input to 22,050 Hz and outputs note events and MIDI with pitch bends. It "works best on one instrument at a time". — [GitHub: spotify/basic-pitch-ts](https://github.com/spotify/basic-pitch-ts)
  - **[SNIPPET]** The model weights are "about 1 MB", and a 30-second clip takes "a few seconds" in the browser. — [DEV Community: running basic-pitch in the browser](https://dev.to/partfit3d/running-spotifys-basic-pitch-in-the-browser-for-audio-to-midi-44bc); [Spotify Engineering, "Meet Basic Pitch" (June 2022)](https://engineering.atspotify.com/2022/6/meet-basic-pitch)

### Inferences
**Feedback ladder by age.** Each band includes everything in the bands before it.
- **4 to 5:** no numbers. Use stickers and process praise:
  - "You sang for 20 seconds!"
  - "Your tune went up and down like a roller-coaster" (contour);
  - "You used 5 different notes";
  - "Can you sing it again?", then a star if the contour of take 2 broadly matches take 1 (up and down in the same places).
  - Keep the live pitch line, but make it playful: a character rides it.
- **6 to 7:**
  - "Same tune again!": interval match between take 1 and take 2 after transposing (DTW alignment of note segments), shown as 1 to 3 stars, never a percentage.
  - "Your tune came home": the last long note is the detected tonic or the starting note.
- **8 to 12:**
  - Show the detected key ("Your song is in G major") and how much of the tune stayed in it.
  - Show range in note names.
  - Steadiness of the longest note, vibrato-aware.
  - Offer harmony and echo games: the app sings the child's tune back while they hold a drone, or the app adds a third above.
- **Teens:** an optional "musician stats" panel: key, range, interval match between takes, steadiness, and a pitch-correct preview ("this is how it sounds snapped to the key"). They can still turn all numbers off.

**Implementation notes**
- Note by Note already has a frame-level pitch tracker (`audio.read()` returns MIDI m). Note segmentation can be built from stable-pitch runs. Key-finding needs only a duration-weighted pitch-class histogram, roughly 30 lines of JS.
- Basic Pitch (Apache-2.0, TF.js) is an optional upgrade for offline transcription of a recording. It would add a large dependency to a no-build app, and the existing tracker is probably good enough for monophonic children's voices.
- **Reliability guard:** with fewer than about 8 to 10 sung notes, or with a "fluid" song full of glides, key-finding will be noisy. In that case say nothing about key rather than guess. This is my inference; I found no published minimum note count for children's melodies.
- **Kindness rule:** never show red or "wrong" marks in Free sing. Off-key notes in an invented song are not errors. If the app does colour notes by key for 8+, use "home notes" versus "adventure notes" rather than right versus wrong.

### Gaps
- No study found that validates automatic key-finding or self-match scores on **children's** invented songs. Krumhansl–Schmuckler was developed on composed tonal music.
- I found no evidence on how reliably young children (4 to 5) can deliberately repeat their own invented tune. "Sing it again" may frustrate the youngest. Test with the owner's 4 year old before showing any repeat score.
- Basic Pitch's accuracy on children's singing voices was not checked.

---

## 4. Safety and wellbeing: recording limits, praise without grades, privacy of children's recordings, family-only sharing

### Takeaway
On-device-only recording of the owner's own children, with easy delete and sharing only through the iOS share sheet, is low-risk. It is consistent with where Australian children's privacy law is heading: the OAIC Children's Online Privacy Code exposure draft (31 March 2026) is due for registration by 10 December 2026, with commencement not yet known. The risks rise sharply when a child's voice is **sent to a third-party AI service**:
- Suno Voices builds a voice model from your singing.
- US COPPA now lists **voiceprints** as biometric personal information (compliance date 22 April 2026).
- Suno bars under-13s entirely.

Vocal-health limits for children have no evidence-based numbers, so session caps should be presented as gentle conventions.

### Cited Findings
**Australia**
- **OAIC Children's Online Privacy Code, exposure draft (31 March 2026)** [SNIPPET; law-firm summaries and the OAIC release title] — [OAIC media release](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code); [Baker McKenzie (May 2026)](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft); [Allens (Apr 2026)](https://www.allens.com.au/insights-news/insights/2026/04/draft-childrens-online-privacy-code-proposed-protections-to-have-material-impact-on-online-services/); [Attorney-General media release, 31 Mar 2026](https://ministers.ag.gov.au/media-centre/draft-childrens-online-privacy-code-released-31-03-2026)
  - **Scope:** apps, games, educational tools and websites likely to be accessed by children, plus services "primarily concerned with the activities of children".
  - **Proposed obligations:**
    - consent for collection, use and disclosure of a child's personal information;
    - collection only where "strictly necessary";
    - parental consent for under-15s;
    - consideration of the child's best interests;
    - letting children request deletion.
  - **Timing:** submissions closed **5 June 2026**. The Code is due to be **registered by 10 December 2026**, and "it is not clear at this stage when the Code will be in force". A breach would be a breach of the Privacy Act.
- **Social Media Minimum Age (from 10 December 2025):** TikTok, YouTube, Instagram, Snapchat and others are age-restricted for under-16s, while YouTube Kids is not. BandLab applies 16+ for Australian users itself. [SNIPPET] — see section 2 sources: [eSafety](https://www.esafety.gov.au/newsroom/media-releases/platforms-on-notice-to-comply-with-social-media-minimum-age); [BandLab Minor Safety](https://help.bandlab.com/hc/en-us/articles/52223951629465-Minor-Safety)

**United States (relevant where US services are used)**
- **COPPA amended Rule:** published 22 April 2025, effective 23 June 2025, compliance by **22 April 2026**.
  - "Personal information" now includes **biometric identifiers**, defined to include **voiceprints**.
  - The **audio file exception** lets operators collect a child's voice recording "solely to respond to a child's request" without notice or parental consent, provided it contains no other personal information. (Under the FTC's 2017 policy, the recording must also be deleted promptly; I recall this but did not verify it here.)
  - [SNIPPET] — [BBB National Programs](https://bbbprograms.org/media/insights/blog/coppa-amended); [Hunton](https://www.hunton.com/privacy-and-information-security-law/ftc-publishes-final-coppa-rule-amendments); [FTC final rule PDF](https://www.ftc.gov/system/files/ftc_gov/pdf/coppa_sbp_1.16_0.pdf)

**Third-party "turn my song into a real song" services**
- **Suno age rules [VENDOR, SNIPPET]:** under the Terms of Service (revised 10 August 2026, effective 3 September 2026), users must be 18+, or **13+ with parent or guardian consent**. "Users under 13 years of age are not permitted to register for an account, access, or use the service in any capacity." — [Suno Terms of Service](https://suno.com/terms-of-service); [Suno Help: Minimum Age](https://help.suno.com/en/articles/9720001)
- **Suno Voices** (launched with **v5.5, March 2026**) [SNIPPET; secondary blogs plus Suno's product page, which was blocked]:
  - You "record or upload a sample of your own singing, and Suno builds a voice you can then use as the lead vocalist on generated tracks".
  - A consent and verification step has you "record a randomly generated phrase" that is matched against the sample.
  - The input can be a hummed melody, a voice memo or an a cappella recording.
  - Sources: [Suno: Voices](https://suno.com/products/voices); [Dubspot blog (2026)](https://blog.dubspot.com/suno-voices-your-own-voice-2026); [The Decoder](https://the-decoder.com/suno-5-5-lets-users-sing-their-own-ai-generated-songs-with-a-personalized-voice-feature/)
- **Suno licensing and downloads (2025–26).**
  - Warner Music Group settled with Suno and signed a licensing deal in **November 2025**. [SNIPPET] — [Music Ally, 25 Nov 2025](https://musically.com/2025/11/25/ai-music-firm-suno-strikes-first-licensing-deal-with-warner-music-group/)
  - Download caps: Pro **20 songs a month**, Premier **60 a month**, free tier reportedly "7 lifetime downloads". [SNIPPET] — [Music Business World](https://www.musicbusinessworldwide.com/suno-limits-subscribers-downloads-per-month/); [MuseGen, "Suno's New Download Limits (Sept. 3, 2026)"](https://www.musegen.ai/blog/suno-download-limits-what-changed-alternatives)
  - A **v6 model released 9 September 2026**, trained on licensed Warner, BMG and Believe/TuneCore catalogues, is reported only by an **unofficial site (sunnoai.com)**. Treat it as unverified. [SNIPPET] — [sunnoai.com/v6](https://sunnoai.com/v6/)
- **Udio:** settled with Universal Music Group on **29 October 2025** and **suspended downloads on 30 October 2025**, becoming a "walled garden". It has since signed deals with Warner, Merlin and Kobalt, and hopes to restore some downloads "later in 2026". [SNIPPET] — [RouteNote](https://routenote.com/blog/udio-stops-user-downloads-after-umg-deal-heres-why/); [WebProNews](https://www.webpronews.com/udio-halts-ai-song-downloads-after-copyright-settlement-with-umg-warner/)

**Recording and sharing on iPhone (technical)**
- **iOS Safari recording [LOCAL]:**
  - `MediaRecorder` on iOS writes `audio/mp4` (AAC). WebM/Opus was added in iOS 18.4.
  - In Home Screen apps, MediaRecorder reportedly "works once and fails on subsequent app launches (requires phone restart)" (August 2025, unresolved).
  - The safer route is to capture PCM from the existing Web Audio graph and encode WAV in JS, which takes about 2 MB per minute at 16 kHz mono.
  - Source: [pitch_detection_and_scoring_tech.md §4 and §6](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/pitch_detection_and_scoring_tech.md), which cites [Apple Developer Forums 797987](https://developer.apple.com/forums/thread/797987)
- **Web Share API Level 2** (file sharing, including audio) arrived in **Safari 15 / iOS 15**. Use `navigator.canShare({files})` to test before calling `navigator.share()`. [SNIPPET] — [Bits and Pieces: Sharing files from iOS 15 Safari](https://blog.bitsrc.io/sharing-files-from-ios-15-safari-to-apps-using-web-share-c0e98f6a4971?gi=c8e0ed092d48); [MDN navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share); [W3C Web Share](https://www.w3.org/TR/web-share/)
- **On-device pitch shifting and correction [READ]:** `audiojs/pitch-shift` (`@audio/shift`) is **MIT-licensed**. It offers PSOLA ("for monophonic voice") and a formant-preserving vocoder that avoids the "chipmunk" effect. It advertises an in-browser demo, but AudioWorklet support is not documented. — [GitHub: audiojs/pitch-shift](https://github.com/audiojs/pitch-shift)
- **Other pitch-shifting libraries [SNIPPET]:** VexWarp (MIT, phase vocoder) and SoundTouchJS (with a phase-vocoder AudioWorklet package; licence not checked) also exist. — [GitHub: 0xfe/vexwarp](https://github.com/0xfe/vexwarp); [GitHub: cutterbl/SoundTouchJS](https://github.com/cutterbl/SoundTouchJS)

**Vocal load**
- No evidence-based "safe minutes per day" exists for untrained singers. A 15 to 30 minute cap is a pedagogical convention. The app can detect relative level, so it can warn about long stretches near clipping and tell users not to shout high notes. [LOCAL] — [vocal_health_and_warmups.md](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/vocal_health_and_warmups.md)

**Praise:** process praise beats person praise for persistence in 5 and 6 year olds (Kamins & Dweck 1999; section 1).

### Inferences
**Privacy design for Note by Note**
- Recording is **opt-in per take**, held in memory first. **Keep** stores it in IndexedDB on that phone only.
- Provide one-tap **Delete** per song and **Delete all my songs** in settings.
- Recordings are **never** sent over the network, never committed to the **public GitHub repo**, and never included in "Copy results for Claude". That export should carry only text stats such as key, range and notes used.
- Update the privacy copy from "Nothing is recorded" to "Your songs stay on this phone unless you share them".

**Sharing**
- Use the iOS share sheet (Web Share L2) so a parent can AirDrop or Message a song to family, or save it to Files for a **Yoto Make Your Own card**.
- The share sheet cannot limit who receives the file. For under-13s, put Share behind a simple **grown-up gate** (for example, press and hold for 2 seconds, or a parent PIN). This is my design suggestion, not a legal requirement.
- Most public platforms are closed to under-16s in Australia anyway.

**Legal position (inference, not legal advice)**
- A free family app that stores recordings only on the device it records on, with no server and no accounts, probably collects no personal information "by" an entity in the Privacy Act sense.
- So the Code is better used as a **design checklist** than as a binding rule here: best interests, minimum data, easy deletion, no third-party sharing by default.
- I believe the Privacy Act's small-business exemption (turnover of A$3 million or less) would also apply, but I did not verify its current status or whether the 2024–26 reforms have changed it.

**AI voice services**
- Do **not** integrate Suno, Udio, BandLab or similar services into the app:
  - Children under 13 cannot use Suno at all.
  - Voices creates a model of the child's voice on a US server, which is a voiceprint-like biometric under COPPA's new definition.
  - A public, static GitHub Pages site cannot hold API keys.
  - Licensing and download terms changed repeatedly in 2025–26 (Udio downloads ended in October 2025; Suno download caps from September 2026).
- A parent could choose to use Suno Voices with a consenting teen (13 to 17) outside the app.

**Session and volume limits (suggested defaults, not evidence-based)**
- Cap a single Free sing take at about **60 to 90 seconds** for under-8s and **3 minutes** for older children. This keeps files small and matches Incredibox's roughly 3-minute recordings.
- After about 20 minutes of total singing, show a soft "Time to rest your voice" nudge.
- Warn about long stretches near clipping ("Sing softer: the mic can hear you!").
- Keep playback volume moderate, and avoid sudden loud effects in voice costumes.

### Gaps
- I could not open the OAIC exposure draft itself. Whether it treats **voice recordings** or **voiceprints** specifically, and its exact scope test, are unverified.
- Not verified: Safari's storage-eviction rules for Home Screen apps (whether IndexedDB recordings can be purged), and `navigator.storage.persist()` on iOS. This matters if children expect their song book to last. [LOCAL gap carried forward]
- Not verified: which audio MIME types iOS Safari's `navigator.canShare` accepts. WAV and M4A are likely; test on device.
- Not verified: the Suno Voices plan tier and any separate age rule for Voices; the official status of Suno v6; whether Suno or Udio offer any public API (I believe neither offers an official public API, but did not verify).
- No source found on children's AI voice clones in Australian law (for example eSafety guidance on voice deepfakes of minors).

---

## 5. Which 6 to 10 features to build first, and for which ages: Implications for Note by Note

### Takeaway
Build a **"My Songs" loop**:
1. Sing.
2. Hear it back.
3. See it as notes.
4. Sing it again.
5. Dress it up (voice costumes, backing, harmony).
6. Keep it on this phone and share it with family.

Everything runs on the device in plain JS with no server. This is the closest match to both the research (process feedback, self-imitation, improvisation via question and answer) and the mechanics children love (instant playback, voice transformation, characters, unlocks).

For the user's last question ("turn their made-up song into an actual song with their voice"):
- The **recommended route** is on-device: the app detects the key, adds chords and a beat **under the child's real recording**, and offers optional gentle pitch-snap for older kids.
- The **not-recommended route** is a cloud AI voice clone such as Suno Voices. Suno bars under-13s, needs parental consent for 13 to 17, voice data counts as biometric under US COPPA, and a static site has no secure place for API keys.

### Cited Findings (what each option rests on; details and links are in sections 1 to 4)
- Self-imitation advantage, largest for poor-pitch singers, and holding under transposition: [Pfordresher & Mantell 2014](http://www.acsu.buffalo.edu/~pqp/pdfs/Pfordresher&Mantell_2014_CogPsy.pdf).
- Feedback is the strongest instructional factor (g = 0.43 overall, across 34 studies): [meta-analysis](https://www.academia.edu/33946857/The_effects_of_instruction_on_the_singing_ability_of_children_ages_5_to_11_A_meta_analysis).
- Key stability only from about 5 to 6; under-5 range of about 7 semitones or less: [Gudmundsdottir et al. citing Gardner, Davidson & McKernon](https://opinvisindi.is/server/api/core/bitstreams/a18143f5-912b-4529-9274-ca19ada70eb1/content).
- Process praise rather than person praise: [Kamins & Dweck 1999](https://people.uncw.edu/hungerforda/infancy/pdf/person%20versus%20process%20praise%20and%20criticism.pdf).
- Question-and-answer pentatonic improvisation, with "no wrong notes": [Teaching With Orff](https://teachingwithorff.com/vocal-improvisation/); [SUNY Music and the Child ch. 4](https://courses.lumenlearning.com/suny-music-and-the-child/chapter/chapter-4-approaches-to-music-education-2/).
- Part-singing readiness at about 7 to 8: [LibreTexts / Sarrazin](https://socialsci.libretexts.org/Bookshelves/Early_Childhood_Education/Music_and_the_Child_(Sarrazin)/01:_Chapters/1.09:_Music_and_the_Older_Child).
- Mechanics:
  - Voice Spinner and GarageBand voice effects: [minibopmusic](https://minibopmusic.com/blog/what-is-chrome-music-lab); [Macworld](https://www.macworld.com/article/212224/garageband_ipad_04.html)
  - Song Maker sing-to-grid: [SA Dept for Education](https://www.education.sa.gov.au/our-learning-sa/learning-home-activities/arts/chrome-music-lab-song-maker)
  - Blob Opera auto-harmony: [Experiments with Google](https://experiments.withgoogle.com/blob-opera)
  - Incredibox bonus unlocks and 3-minute recordings: [Wikipedia](https://en.wikipedia.org/wiki/Incredibox)
  - Yoto Make Your Own cards: [Look Hear Australia](https://lookhearaustralia.com.au/making-your-own-yoto-cards-fast-and-detailed-guide-%F0%9F%8E%B5%F0%9F%93%9A/)
- Tech:
  - Web Share L2 since iOS 15: [Bits and Pieces](https://blog.bitsrc.io/sharing-files-from-ios-15-safari-to-apps-using-web-share-c0e98f6a4971?gi=c8e0ed092d48)
  - MIT PSOLA and formant pitch-shift library: [audiojs/pitch-shift](https://github.com/audiojs/pitch-shift)
  - Apache-2.0 browser transcription: [spotify/basic-pitch-ts](https://github.com/spotify/basic-pitch-ts)
  - MediaRecorder PWA bug and the WAV-from-Web-Audio route: [LOCAL](/home/user/note-by-note/research_notes/Note%20by%20Note%20singing%20app%20review/pitch_detection_and_scoring_tech.md)
- Law:
  - [OAIC Code exposure draft](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code)
  - [COPPA voiceprints](https://bbbprograms.org/media/insights/blog/coppa-amended)
  - [Suno minimum age](https://help.suno.com/en/articles/9720001)
  - [eSafety SMMA list](https://www.esafety.gov.au/newsroom/media-releases/platforms-on-notice-to-comply-with-social-media-minimum-age)

### Inferences: ranked options for a plain-JS, no-build, no-server PWA

Ratings: Value = learning value plus fun; Effort = S, M or L for one developer in plain JS; Cost is A$0 for every option (no services); Risk = privacy and legal.

| # | Feature | Ages | Value | Effort | Privacy/legal risk | Why |
|---|---|---|---|---|---|---|
| 1 | **Record and listen back with the pitch trace replayed in sync.** Opt-in per take; capped at about 90 s (under 8) or 3 min; WAV from the existing Web Audio graph, not MediaRecorder | All | Very high | M | Low (on device) | Foundation for everything else; knowledge of performance; the "instant playback" hook in every loved app |
| 2 | **"Sing it again" self-echo game.** The app plays take 1 (own voice, or a piano or character version), the child sings it again, and gets stars for a contour match (4 to 5) or an interval match after transposition (6+) | 4+ (stars), 6+ (intervals) | Very high | M | Low | Strongest evidence: self-imitation advantage plus feedback effect; needs no "correct" target |
| 3 | **"See my song": note blocks.** The tune is segmented into notes and shown as a Song Maker-style coloured grid or sol-fa blocks, replayable on piano, xylophone or a "blob voice"; later, optional staff notation for 8+ | All | High | M | None | Answers "score the song" in the *notation* sense; makes it "a real song I wrote"; Song Maker's proven mechanic |
| 4 | **Kind feedback cards instead of a score.** Process praise and facts ("You sang for 25 s", "7 different notes", "Your tune came home"); a hidden-unlock sticker or animation for, say, a tune that ends on its first note or uses all 5 pentatonic notes; optional "musician stats" (key, range, steadiness) for 10+ and teens | All, tiered | High | S | None | Process praise research; Incredibox-style unlocks; avoids grading invented songs |
| 5 | **Voice costumes on playback.** Chipmunk, giant, robot, echo, cave reverb, backwards, slow and fast, done with `playbackRate`, a delay/convolver, buffer reversal, and an MIT PSOLA or formant shift for "same speed, different pitch" | 4 to 12 especially | High (fun), low to medium (skill) | S to M | Low | Voice Spinner and GarageBand "Photo Booth for audio"; very sticky; cheap |
| 6 | **Question and answer (improvise to the app).** A character sings a 2-bar pentatonic "question" in the child's range; the child sings an "answer"; the app plays both back together. Feedback: "your answer came home" for 6+, pure praise under 6 | 5+ | High | M | None | Core Orff and Kodály improvisation entry; scaffolds invention for children who freeze at "sing anything" |
| 7 | **"Make it a song": on-device backing under the real voice.** Key-finding (Krumhansl–Schmuckler on a duration histogram), one chord per bar chosen from melody notes (I, IV, V, vi), a simple piano and drum loop synthesised in Web Audio and mixed with the child's recording; export as one file. Optional **gentle pitch-snap** (PSOLA toward the nearest key note, strength slider) for 10+ and teens | 6+ (backing), 10+ (pitch-snap) | Very high (the user's main ask) | L | Low (on device) | Delivers "an actual song with their voice" with no AI service, no account and no upload; SongStarter or GarageBand-like payoff |
| 8 | **Harmony buddy.** The app holds a drone or sings a third or sixth above the child's recorded tune (Blob Opera-style); for 8+, "layer 2": the child sings a harmony or ostinato over their own recording (two-track overdub) | Drone 6+, layering 8+ | Medium to high | M to L | Low | Part-singing readiness about 7 to 8; Blob Opera's auto-harmony mechanic. Note: speaker bleed into the mic during overdubs needs headphones or call-and-response |
| 9 | **My Songs book plus family share.** Name the song, pick an emoji cover; IndexedDB on the device; Delete and Delete all; Share via the iOS share sheet behind a grown-up hold for under-13s; "Save for Yoto card" hint | All | High (keeps them coming back) | M | Low to medium (sharing leaves the device: parent-gated) | Keepsake and collection mechanic (Incredibox mixes, Yoto); matches the OAIC draft's spirit (deletion, best interests) |
| 10 | **Song starters for pre-readers.** Spoken and picture prompts ("Sing about your pet", "Sing what you had for breakfast", "Sing like a sleepy dragon"), plus an optional backing groove to sing over | 4 to 8 | Medium | S | None | Invented song serves storytelling and identity (Barrett, Campbell); ties in with the separate voice-prompts research |

**Order of build**
- Do 1, 4 and 5 first: one week of work in total, and immediately fun.
- Then 2 and 3, the core learning value.
- Then 6 and 9.
- Do 7 and 8 last, as the "wow" features for older children.

Items 1 to 6 together turn Free sing from a pitch display into a creative loop with a sound learning rationale.

**Not recommended for this app**

| Option | Value | Cost | Risk | Reason |
|---|---|---|---|---|
| Integrate Suno, Udio or another AI song or voice-clone service | Very high wow | Subscription per child; API not public or needs a server | **High** | Under-13s barred by Suno; 13 to 17 need parental consent; voiceprints are biometric PI under COPPA; terms and downloads changed repeatedly in 2025–26; a public static site cannot hide keys |
| Link to BandLab, Smule, StarMaker or TikTok for sharing | Medium | Free | **High** | Stranger contact and explicit content; BandLab 16+ in Australia; TikTok and YouTube age-restricted for under-16s since 10 Dec 2025 |
| Basic Pitch ML transcription | Low extra value over the existing tracker for solo voice | Free (Apache-2.0) | Low | About 1 MB of weights plus TensorFlow.js in a no-build app; keep as a later offline-accuracy upgrade only |

**Copy and settings changes that go with this:**
- Free sing header: "No score. Just your voice." becomes "Make up a song. Hear it back."
- Privacy line: "Your songs stay on this phone unless you share them."
- A setting: "Show numbers in Free sing: Off (default under 10) / On".
- "Copy results for Claude" gains a short text summary of Free sing sessions (minutes sung, range, keys detected, self-match stars) and **never** audio.

### Gaps
- Effort estimates are my judgement and were not prototyped. Item 7 (backing plus pitch-snap) is the riskiest technically on iPhone, because of CPU for PSOLA on long takes and audio-session behaviour when playing and recording.
- No user testing with children of these exact mechanics. The age bands are drawn from developmental research and app age ratings, not from trials of these features.
- Whether GarageBand for iOS imports a MIDI or WAV export cleanly (a "send my song to GarageBand" path for teens) was not verified.
- Whether iOS keeps IndexedDB song books for Home Screen apps long-term was not verified. If it doesn't, offer "Save to Files" as the backup.
