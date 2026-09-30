# Range testing, voice classification, key selection and repertoire progression for adult beginner singers

Method note: I ran web searches only. The network proxy blocked every full-text fetch I tried (tandfonline, sciencedirect, pubmed/pmc, wikipedia, AMEB, rogerclarke.com, voicescience.org, university PDF hosts). So the findings below rest on search-result abstracts and snippets, not full papers. Where a claim comes from my own background knowledge and not a retrieved source, I say so and treat it as unverified.

Evidence labels used throughout:
- **[A]** peer-reviewed empirical evidence
- **[B]** established pedagogical consensus or tradition (pedagogy texts, exam boards, choral or worship practice)
- **[C]** marketing, blogs or anecdote

Context from the sibling code audit (`app_audit_code.md`), used only to draw implications:
- The app's range test captures one self-chosen "comfortable low" and one "comfortable high" note.
- It uses that pair directly as the full working band. There is no separate tessitura.
- Songs are centred by their lowest-to-highest span (`fitShift`).
- A voice-type label is derived from the range midpoint. It can mislabel: a male C3–C5 range reads as "Alto".
- The range is never re-tested or updated automatically.

## 1. Range vs tessitura vs comfortable range: measurement, typical untrained values, reliability of one quick test, re-testing

### Takeaway
Clinics and labs measure the *physiological* range with a voice range profile (VRP, or phonetogram): the singer glides or steps to their lowest and highest phonation at soft and loud levels. The comfortable singing range (and, inside it, tessitura) is narrower, and no clinical protocol measures it directly. For untrained adults, frequency limits on a VRP are fairly reliable on retest. Measured size still depends heavily on protocol, and range grows with training. Untrained poor-pitch singers also under-use range for reasons that are not physical. No evidence-based re-test interval exists.

### Cited Findings
- **[A] Sanchez, Oates, Dacakis & Holmberg (2014), *Logopedics Phoniatrics Vocology* 39(2):62–71.**
  - Sample: 63 vocally healthy **Australian** adults without voice training (30 men, 33 women, aged 21–65), using automatic recording of speech range profiles and VRPs.
  - Test-retest reliability, checked in a subgroup, was **high**.
  - Their VRPs were **larger than in several previous studies**. The authors frame this as a "methodological implication": measured range depends on protocol and equipment.
  - Sources: [T&F abstract](https://www.tandfonline.com/doi/full/10.3109/14015439.2013.777109); [Google Scholar record](https://scholar.google.com/scholar_lookup?title=Speech+and+voice+range+profiles+of+adults+with+untrained+normal+voices:+Methodological+implications&amp=&author=K.+Sanchez&amp=&author=J.+Oates&amp=&author=G.+Dacakis&amp=&author=E.+B.+Holmberg&amp=&publication_year=2014&amp=&journal=Logopedics+Phoniatrics+Vocology&amp=&pages=62-71&amp=&doi=10.3109/14015439.2013.777109&amp=&pmid=23590284). Numeric means were not retrievable (see Gaps).
- **[A] Normative VRP of the young female voice (*Journal of Voice*, 2021).**
  - Sample: 39 women aged 18–28 with healthy voices.
  - Mean range **34.7 ± 3.9 semitones**.
  - Mean minimum F0 **143.6 ± 21.7 Hz (about D3)** and maximum **1063.5 ± 160 Hz (about C6)**.
  - These are physiological extremes, including falsetto or whistle-type phonation. They are not a comfortable singing range. Training status was not stated in the snippet.
  - Source: [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0892199721001168).
- **[A] Sulter, Schutte & Miller (1995), *J Voice* 9(4):363–377.**
  - Sample: 224 subjects in four groups (sex × vocal training).
  - Trained singers had a **larger phonetogram area** because of extended soft phonation **and an extended frequency range**.
  - Men could produce softer phonations. Women produced louder phonations in parts of the comparable range.
  - Sources: [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0892199705801985); [summary via PMC citing study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3477434/).
- **[A] Reliability of repeated VRPs.**
  - A systematic review ("Reproducibility of Automated Voice Range Profiles", 2017) found high reliability, but "data are few and heterogeneous" ([PubMed](https://pubmed.ncbi.nlm.nih.gov/28647428/)).
  - Dual-microphone VRP test-retest: **frequency measures** and highest intensity had moderate-to-excellent ICCs with no significant test-retest difference. VRP area, minimum intensity and intensity range had poor-to-moderate reliability and **enlarged on retest**, i.e. practice or familiarity effects on the soft and dynamic dimensions ([ResearchGate](https://www.researchgate.net/publication/317021209_Test-Retest_Reliability_of_the_Dual-Microphone_Voice_Range_Profile); [ASHA JSLHR](https://pubs.asha.org/doi/10.1044/2017_JSLHR-S-16-0460)).
  - A 2025 randomised crossover study of **30 untrained** healthy adults found no sitting vs standing differences and **no training effect between repeated measurements** (r > 0.60) ([PubMed](https://pubmed.ncbi.nlm.nih.gov/40985577/)).
- **[A] Pfordresher & Greenspon (2025), *Musicae Scientiae* 29:240–255.**
  - "One symptom of poor singing is a **restriction of vocal pitch range** during pitch matching tasks that is **not reducible to physical vocal limitations**."
  - They trained one group on targets spanning an octave and another on a 7-semitone (perfect fifth) span. The only significant improvement was in the **wide-range group, for single-pitch matching** (not four-note melodies).
  - Source: [SAGE](https://journals.sagepub.com/doi/10.1177/10298649241289542).
  - One search summary gave the figure "45% to 72%" single-pitch accuracy for the wide-range group. I could not confirm it in the abstract, so treat it as unverified.
- **[A] Phonetogram change with training.** A *Journal of Voice* study tracked "Phonetogram Changes for Trained Singers Over a Nine-Month Period of Vocal Training" ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S089219970200070X)). Its findings were not retrievable here.
- **[B] Tessitura vs range.**
  - Voice teachers define tessitura as the band where a voice can sing for a long time without fatigue and with consistent tone. It is narrower than the full range ([John Henny](https://johnhenny.com/difference-range-tessitura/); [Scofield Studio](https://scofieldstudio.com/finding-the-sweet-spot-range-vs-tessitura/)).
  - A song "sitting" on a register transition or above the comfortable zone tires the voice even if the top note is reachable once ([The Unlimited Voice](https://www.theunlimitedvoice.com/blog/how-to-pick-the-right-song-key-for-your-voice); [Nadia Smelser](https://nadiasmelser.com/choosing-a-song-thats-technically-right-for-you-right-now/)).
- **[B] Congregational-singing tradition (a practical proxy for "untrained mixed voices").**
  - Keep melodies between **A3 and D5** (occasionally E♭5). "The average person will struggle with E and above."
  - Check **where the song spends most of its time**: even inside A3–D5, staying at one extreme is strenuous, and people "drop down an octave, or drop out altogether".
  - Greg Scheer (*The Art of Worship*) gives **B♭3–D5**.
  - Sources: [Reformed Worship](https://reformedworship.org/resource/highs-and-lows-singing); [Renewing Worship](https://www.renewingworshipnc.org/singing-in-keys-too-high/); [WorshipIdeas](https://worshipideas.com/resources/articles/choosing-the-right-key-for-congregational-singing).
  - These are written pitches. Men sing them an octave lower.
- **[C] Consumer range-test sites** claim:
  - Untrained adults' habitual singing range is about **12–18 semitones**, even when their physiological range is larger.
  - "Many untrained men are comfortable from about A2 to E4/F4" and "women from about A3 to C5".
  - These are unreferenced marketing figures ([vocalrangetester.com](https://vocalrangetester.com/average-vocal-range/); [vocalrangefinder.com](https://vocalrangefinder.com/blog/how-many-octaves-can-the-average-person-sing/)).
  - They advise a light warm-up before testing and not forcing the extremes ([Singing Carrots](https://singingcarrots.com/range-test); [SingWise](https://www.singwise.com/articles/how-to-determine-singing-range-and-vocal-fach-voice-type)).

### Inferences
- The app's test ("hold a comfortable low, then a comfortable high") is closer to a **comfortable-range** estimate than a VRP. That is the right target for key-setting, but it rests on one self-judged note at each end.
  - Novices' sense of "comfortable" is uncalibrated.
  - Poor-pitch singers restrict range for non-physical reasons (Pfordresher & Greenspon 2025).
  - So the first estimate is likely to be **too narrow** for many users and to widen with practice (Sulter 1995: training extends frequency range).
- VRP frequency limits are reliable on retest (dual-mic and 2025 studies), so a *measured extreme* is a steadier anchor than a *judged comfortable edge*. A stronger design measures the extremes with glides, then derives the comfortable band inside them, or checks the band against observed accuracy.
- The typical-range figures that are sourced at all come from worship practice [B] or marketing [C]. The only peer-reviewed normative data retrieved are physiological extremes (about 35 semitones in young women), not comfortable singing ranges.

### Gaps
- Numeric means (lowest/highest F0 and semitone span by sex and age) from Sanchez et al. 2014, Hunter/Švec/Titze 2006 ([J Voice 20(4):513–526](https://www.sciencedirect.com/science/article/abs/pii/S0892199705001049)) and similar untrained-norm studies could not be retrieved (paywall or proxy block).
- No peer-reviewed normative data on the **comfortable singing range or tessitura** of untrained adults was found. No study was found on how accurately self-selected "comfortable" limits match measured ones.
- No evidence-based **re-test interval** was found. The only relevant signal is that range expands with training over months (Sulter 1995; the nine-month phonetogram study, results unretrieved).
- From my own knowledge (unverified here): the Union of European Phoniatricians (Schutte & Seidner 1983) standardised VRP elicitation. Their protocol includes sustained tones across the range at softest and loudest levels.

## 2. Should beginners be classified by voice type? Risks of early classification; passaggio locations and exercise placement

### Takeaway
Mainstream classical pedagogy (Miller, McKinney) warns against classifying beginners. Range is the *least* reliable classifier for beginners because technique limits it. Classification needs tessitura, timbre, passaggio location and agility, judged by an expert over time. What an app does need is coarse information: whether the voice is lower (most men) or higher (most women and children), and roughly where the register transitions sit. It does not need a named Fach.

### Cited Findings
- **[B] Richard Miller.** Trying to determine a student's Fach early "could lead to false technical and repertoire expectations". It "is not the duty of the singing teacher to attempt Fach determination in the early stages". Once basic technical freedom is established, "her voice itself will determine the Fach" ([Carramão, Research Catalogue](https://www.researchcatalogue.net/view/3711502/3711501)).
- **[B] James McKinney** (*The Diagnosis and Correction of Vocal Faults*): "Range can be an effective criterion ... but it is most effective when used in conjunction with other factors. It is **least effective with beginning students and should not be applied too early**." Misclassification "can rob a voice of tonal beauty and freedom of production, can cause endless frustration and disappointment" ([same source](https://www.researchcatalogue.net/view/3711502/3711501); see also [Dillon, *Female Voice Classification and the Choral Director*](https://journals.library.mun.ca/index.php/singing/article/download/898/776/3084)).
- **[B] Classification factors.** Classification "depends primarily on ease of tessitura, range, timbre and agility". Pedagogues debate whether range should count at all, since a lack of technique "especially in young or beginner singers" limits range ([Academia: The Fach System](https://www.academia.edu/32108110/The_Fach_System_origin_function_and_the_dangers_of_perception); [Petersen Voice Studio](https://petersenvoicestudio.com/2016/08/25/issues-with-fach/)).
  - Voices keep settling into the late twenties and beyond, so even a Fach at 22–26 is "often premature" ([Gökçe Kütsal](https://www.gokcekutsal.com/post/fach-system-classical-singers)).
  - A voice-science outlet frames voice types as useful but "not everything" for beginners ([Voice Science 2024](https://www.voicescience.org/2024/11/opinion/voice-types-explained-a-beginners-guide-to-vocal-classification-and-why-its-not-everything/)).
- **[A] Classification in professionals is multi-factor.** Studies classifying Fach in professional opera singers use timbre parameters and machine learning on many features, not range alone ([Diagnostics 2023, random forest](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10528521/); [timbre parameters study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9605961/)). This supports the view that a two-note range midpoint cannot classify.
- **[B] Passaggio locations by voice type (Richard Miller, *The Structure of Singing*, via secondary summaries):**

  | Voice type | Primo passaggio | Secondo passaggio |
  |---|---|---|
  | Leggiero tenor | E4 | not stated in retrieved summary |
  | Lyric tenor | D4 | not stated in retrieved summary |
  | Spinto tenor | C4 | not stated in retrieved summary |
  | Heldentenor | C4 | not stated in retrieved summary |
  | Lyric baritone | B3 | E4 |
  | Dramatic baritone | B♭3 | E♭4 |
  | Bass-baritone | A3 | D4 |
  | Lyric bass | A♭3 | D♭4 |
  | Basso profondo | G3 | C4 |
  | Soprano | E♭4 | F♯5 |

  - For soprano: chest roughly G3–E♭4, middle or mixed register E♭4–F♯5.
  - Sources: [Wikipedia: Passaggio](https://en.wikipedia.org/wiki/Passaggio) (search snippet); [Infogalactic mirror](https://infogalactic.com/info/Passaggio); [Kayla Collingwood register map](https://www.kaylacollingwood.com/post/understanding-your-passaggi).
  - These are trained classical norms. Passaggio location also "can be deeply influenced by vocal technique" ([SingWise](https://www.singwise.com/articles/how-to-determine-singing-range-and-vocal-fach-voice-type)).

### Inferences
- The app currently shows a "Closest voice type" label from the range midpoint and passes it to Claude. That is exactly the early, range-only classification that Miller and McKinney caution against. It also produces sex-inappropriate labels: a man with C3–C5 is called "Alto".
  - Showing a Fach-like label risks false expectations. An AI coach may then reason from a wrong label.
  - A **lower voice / higher voice** distinction, plus an optional "I'd rather not say", captures what matters for octave placement and passaggio without a false classification.
- Passaggio implications for exercise placement:
  - For most **men**, the troublesome zone is roughly **C4–F4**, where the secondo passaggio of basses, baritones and tenors lies.
  - For most **women**, the lower transition (chest to middle) is around **E♭4–F4**, and the upper one around **F5–F♯5** for sopranos.
  - Early "hold it steady" and song material should avoid parking long notes right on these zones. Sirens and slides (already in the app) are the traditional tool for crossing them.
  - A lower/higher flag plus the measured range is enough to estimate these zones roughly.

### Gaps
- Miller's mezzo-soprano and contralto passaggio pitches, and the tenor secondo passaggio, were not in the retrieved snippets. (From my own knowledge, the tenor secondo passaggio is commonly placed around F4–G4. Unverified here.)
- No empirical study was found on the effects of labelling adult amateurs' voice type on motivation or self-concept. The warnings are pedagogical opinion [B].

## 3. Key selection: how teachers pick a key; what apps and karaoke do

### Takeaway
Teachers and exam boards treat the key as free to choose. The consensus rule is to put the song's *tessitura* (where most notes and time sit) in the comfortable middle, keep the highest note safely below the upper limit, and avoid long notes on register transitions. Karaoke and app algorithms mostly just fit the song's lowest-to-highest span into the singer's range, which is what Note by Note does now. No peer-reviewed evaluation of key-selection algorithms was found.

### Cited Findings
- **[B] ABRSM (UK exam board, used in Australia).** "Own-choice songs at all grades may be sung by any voice and in any key." Teachers "may make their own transpositions", and the key "should be chosen carefully to ensure it is appropriate for the candidate's voice". The syllabus lists each song's published keys **and vocal range** ([ABRSM Singing Performance Grades syllabus](https://www.abrsm.org/sites/default/files/2023-10/Singing%20Performance%20Grades%20Syllabus_0.pdf)).
- **[B] Congregational practice.**
  - Lowest note about A3, highest D5 (occasional E♭5).
  - Lower the key so the melody stays below about C5 when people aren't singing parts.
  - Judge by **where the song spends most time**, not just the extremes.
  - Sources: [Reformed Worship](https://reformedworship.org/resource/highs-and-lows-singing); [Renewing Worship](https://www.renewingworshipnc.org/singing-in-keys-too-high/); [Worship Leader](https://worshipleader.com/worship/using-singable-song-keys-for-better-congregational-worship/); [Worship Matters](https://worshipmatters.com/2009/05/11/finding-the-right-key-to-sing-in/).
- **[B/C] Voice-teacher guidance.** A song's tessitura matters more than its top note, and a chorus living above the comfortable zone tires the voice. Avoid keys that sit on a registration transition. Experiment with candidate keys "over a course of days" ([The Unlimited Voice](https://www.theunlimitedvoice.com/blog/how-to-pick-the-right-song-key-for-your-voice); [Nadia Smelser](https://nadiasmelser.com/choosing-a-song-thats-technically-right-for-you-right-now/); [SingMeter](https://www.singmeter.com/blog/tessitura-and-comfortable-range)).
- **[Patent / C] Karaoke and app algorithms.**
  - US patent 5,296,643 describes an automatic musical key adjustment system for karaoke ([USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5296643)).
  - Later "Key transposition" patents identify the song, retrieve its default key, compare **the song's key range with the performer's vocal range**, and transpose if they are incompatible ([US 9,818,385](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9818385); [US 10,127,897](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10127897)).
  - Consumer "key matcher" tools compute transpositions from −6 to +6 semitones and rank them by how much of the melody falls inside the singer's range, or by least overhang at either end ([CMUSE Song Key Matcher](https://www.cmuse.org/song-key-matcher), as summarised in search results).

### Inferences
- Note by Note's `fitShift` centres the *span* in the range. This is the karaoke-style "fit the extremes" approach.
- Pedagogy weights **where the melody spends its time** and protects the top. A better score for each candidate key would:
  1. Treat it as a hard constraint that the highest note ≤ comfortable high (ideally with a 1-semitone margin for beginners), and the lowest note ≥ comfortable low.
  2. Among keys that pass, pick the one whose **duration-weighted mean pitch** sits at or slightly below the centre of the comfortable band. Untrained voices tire faster at the top than at the bottom (worship guidance above).
  3. Penalise long or held notes on the estimated passaggio zone (see Q2) and in the top 2–3 semitones.
  4. Offer a one-tap "lower/higher" nudge, remembered per song. This matches the teacher advice to try keys across days, and ABRSM's freedom to transpose.
- When a song's span exceeds the comfortable band, span-centring pushes both ends out of range. The app should say so ("This song is wider than your comfortable range; the top note will be a stretch") rather than silently overflow.
  - Example: Waltzing Matilda spans 17 semitones (G3–C5 reference). That equals the whole A3–D5 congregational band, and exceeds a typical 12–15-semitone novice comfortable band [C].

### Gaps
- No peer-reviewed study was found comparing key-selection rules (span-centring vs tessitura-weighting) on beginners' accuracy or comfort.
- No published algorithm details for major singing apps (Yousician, Smule, Simply Sing, Singing Carrots) were retrievable. Claims about them would be speculation.

## 4. Repertoire progression for adults: beginner-song traits, nursery rhymes, public-domain sources, licensing

### Takeaway
Traits that make a song easy are well agreed in tradition:
- narrow span
- mostly stepwise motion
- moderate tempo
- short, regular phrases with clear breath points
- repetition
- familiarity

Evidence that lyrics add difficulty (below) supports learning tunes on a syllable first. Liking the song drives practice, and I found no evidence either way on whether nursery rhymes demotivate adults. In Australia, published works by authors who died before 1 January 1955 are public domain. That covers a large folk, hymn and spiritual repertoire, but some "folk-seeming" Australian favourites (notably *Kookaburra*) are still in copyright. Licensed pop is not realistic for a free app.

### Cited Findings
- **[A] Lyrics add load.** Berkowska & Dalla Bella (2009), *Ann NY Acad Sci* 1169:108–111.
  - Sample: 39 occasional singers sang three familiar melodies from memory and by imitation, both with lyrics and on /la/.
  - Accuracy **increased on the syllable**, with fewer pitch-interval and contour errors ([PubMed](https://pubmed.ncbi.nlm.nih.gov/19673763/)).
- **[A] Range breadth in training.** Pfordresher & Greenspon (2025): training on an octave span beat a fifth span for single-pitch matching ([SAGE](https://journals.sagepub.com/doi/10.1177/10298649241289542)).
  - This argues against keeping beginners in a very narrow band for too long. The "easy" narrow-span songs are a starting point, not a plateau.
- **[A] Children's studies (a different population; not directly transferable).**
  - With 4–9-year-old Portuguese children, songs taught **with text** gave consistent advantages, "particularly among younger children" (*Educ. Sci.* 2025, 15(8):984) ([doi](https://doi.org/10.3390/educsci15080984)). This conflicts with Berkowska 2009 for adults, which may reflect age or task differences.
  - Reifinger (2012, *JRME*), second graders: solfège with familiar patterns and a neutral syllable with unfamiliar ones gave the best contour accuracy ([SAGE](https://journals.sagepub.com/doi/abs/10.1177/0022429411435683)).
- **[B] AMEB Singing for Leisure (Australia).**
  - The first level, Preliminary, "suits students who have been learning for approximately **one year**". Candidates sing **four short pieces** chosen from contemporary and classical styles ([AMEB Preliminary](https://www.ameb.edu.au/singing-for-leisure-preliminary-for-leisure)).
  - The syllabus mixes classical, folk, jazz and pop. Candidates may use piano or **backing tracks**, and "no more than two unaccompanied solo songs" are allowed ([AMEB NSW Singing](https://www.ameb.nsw.edu.au/subjects/instruments/singing); [AMEB NSW Grade 1](https://www.ameb.nsw.edu.au/subjects/instruments/singing-for-leisure/singing-for-leisure-grade-1)).
  - Specific range limits per grade were not in the retrieved text.
- **[B/C] Teacher and blog guidance on beginner songs.**
  - Pick "simple tunes with repetitive lyrics and an easy-to-follow beat" with a predictable chorus ([VoiceLessons.com](https://www.voicelessons.com/blog/top-15-good-beginner-singing-songs); [JoAnn Chang](https://joanncchang.com/songs-for-beginner-singers/)).
  - "A student who loves what they're working on will practice more" ([Kayla Collingwood](https://www.kaylacollingwood.com/post/how-to-choose-songs-for-young-singers)).
  - All of this is opinion [C], but consistent.
- **[B] Australian copyright rule (the constraint for an Australian app).**
  - Published works whose creator died **before 1 January 1955** (and unpublished works whose creator died before 1950) are in the public domain. Sound recordings made before 1955 are too.
  - The 2005 AUSFTA change to life+70 was **not retrospective**, and copyright that expired before 2005 was not revived.
  - Sources: [National Library of Australia](https://www.library.gov.au/services/copyright-library-collections/how-long-does-copyright-last); [Arts Law Centre](https://www.artslaw.com.au/images/uploads/Duration%20of%20Copyright%20(G023v16).pdf); [SLSA](https://www.slsa.sa.gov.au/how-long-does-copyright-last).
- **[B] Waltzing Matilda.**
  - Words by Banjo Paterson (died 1941) came out of copyright in 1991.
  - Christina Macpherson, who wrote the original tune, died 1936 and never claimed copyright. Any copyright in that music would have expired in 1986 ([Trish's Oz](https://trishansoz.com/trishansoz/waltzing-matilda/waltzing-matilda-copyright.html)).
  - Ownership disputes have centred on later arrangements and trade marks ([Mondaq](https://www.mondaq.com/australia/trademark/443444/can-anyone-really-own-waltzing-matilda); [Stack Law](https://stacklaw.com.au/news/intellectual-property/can-anyone-really-own-waltzing-matilda)).
- **[B] Happy Birthday.**
  - In September 2015 a US federal judge held that the claimed copyright was not valid, and the song is treated as public domain in the US ([NSU copyright blog](https://library.nova.edu/blogs/copyright/happy-birthday)).
  - Patty Hill died in 1946 ([search summary of Patty Hill biography](https://en.wikipedia.org/wiki/Patty_Hill)).
  - **Conflict:** one source says the song entered the public domain in Australia "around 2016" by applying life+70. Under the NLA rule above (creator died before 1955, so life+50 expired before 2005), it would already have been public domain in Australia before 2005.
  - **Superseded:** older pages claiming the song "is protected by copyright" ([udel.edu handout](https://udel.edu/~pollack/Acct350/Handouts/Happy%20Birthday%20song.htm)) predate the 2015 ruling.
- **[B] Kookaburra Sits in the Old Gum Tree is NOT public domain.**
  - Written by Marion Sinclair (1932/1934). She died in 1988, and Larrikin Music owns the copyright.
  - In *Larrikin v EMI* (2009–2010) the Federal Court awarded Larrikin 5% of *Down Under* royalties.
  - Copyright runs until about 2058.
  - Sources: [ABC News](https://www.abc.net.au/news/2010-07-06/kookaburra-gets-last-laugh-in-men-at-work-case/893668); [ADB biography](https://adb.anu.edu.au/biography/sinclair-marion-15924); [Hearsay](https://hearsay.org.au/kookaburra-sits-in-the-old-gum-tree/).
- **[B] Licensed songs.**
  - APRA AMCOS: "Making lyric changes and arrangements of musical works are **not covered** by an APRA AMCOS licence". You must get permission from the publisher.
  - Streaming or embedding music in an app is "communication to the public" and may need APRA AMCOS licensing, plus separate rights for any commercial recordings.
  - Sources: [APRA AMCOS: releasing music](https://www.apraamcos.com.au/music-licences/select-a-licence/releasing-music); [Sprintlaw](https://sprintlaw.com.au/articles/music-rights-and-apra-amcos-what-australian-businesses-must-know/).

### Inferences
- **Difficulty should be multi-factor, not span-only.** The app's rule (≤9 semitones Easy, ≤14 Medium) misses other factors:
  - **Leaps.** Happy Birthday has an octave leap on "Happy *birth*-day dear…", and its 12-semitone span in the audit comes from that leap. Amazing Grace and Waltzing Matilda also have leaps.
  - **Phrase length and breath demand.** Waltzing Matilda has 91 notes in 8 lines.
  - **Tempo and syllable density.** Row Your Boat runs at a 6/8 eighth-note pulse of 192.
  - **Familiarity.**
  - A rough, defensible ordering for an adult:
    1. A stepwise 5-note-span tune on /la/.
    2. The same tune with words.
    3. Stepwise songs spanning about an octave.
    4. Songs with one isolated leap.
    5. Songs with repeated leaps or 12+ semitone spans and long phrases.
- **Nursery rhymes.** No evidence says they demotivate adults, but the tradition that liking drives practice [C] suggests adult-appropriate simple songs should sit beside them.
  - Twinkle, Mary and Row Your Boat work as short "pitch drills with words". The Easy tier should also offer adult-register material. Ode to Joy (which the app sings on solfa) and Amazing Grace already qualify.
- **Candidate public-domain additions for an Australian adult.** These come from my own background knowledge. **Verify each composer's and lyricist's death date against the pre-1955 rule and use only original, non-arranged versions.**
  - Australian: Click Go the Shears, Botany Bay, The Wild Colonial Boy, Advance Australia Fair (P. D. McCormick, died 1916; note that the official lyrics were changed in 1984 and 2021).
  - British and Irish folk: Scarborough Fair (traditional; avoid the Simon & Garfunkel arrangement), The Water Is Wide, Loch Lomond, Danny Boy (Weatherly, died 1929), Auld Lang Syne, Greensleeves.
  - Spirituals: Swing Low, Sweet Chariot; Michael, Row the Boat Ashore; When the Saints Go Marching In.
  - Stephen Foster (died 1864).
  - Christmas carols: Silent Night, Joy to the World.
  - Songs that **look** traditional but likely are **not** public domain in Australia (again unverified; check): Along the Road to Gundagai (Jack O'Hagan, 1922, died 1987), Morning Has Broken (lyrics by Eleanor Farjeon, died 1965), You Are My Sunshine (1939), Home Among the Gumtrees (1970s), and any modern hymn or worship-song arrangement.
- **Licensed pop in a free app** would need publisher permission, because the app makes its own melody-plus-piano arrangement and displays lyrics. APRA AMCOS does not cover arrangements. This is impractical for a hobby project.
  - A lawful middle ground: let users pick a pop song in their own music app and use Note by Note's "free sing" mode plus the key-finder, without the app reproducing the song.

### Gaps
- No empirical study was found on adult beginners' motivation with children's songs vs adult repertoire.
- AMEB, Trinity and ABRSM grade-by-grade **range and interval limits** for early grades could not be retrieved (full syllabus PDFs were blocked).
- A *Psychology of Music* paper specifically on singing "Happy Birthday" (Nichols, Hua & Wang, doi 10.1177/03057356221137932) was found but not retrievable. It may contain relevant data on the octave leap and starting pitch.
- Han (2021, *Psychology of Music*) on cognitive load when learning songs with visually presented lyrics ([SAGE](https://journals.sagepub.com/doi/abs/10.1177/0305735620959430)) is relevant to on-screen lyrics, but its results were not retrievable.

## 5. Lyrics vs vowels vs solfège; phrasing and breath marks; accompaniment vs a cappella

### Takeaway
For adult occasional singers there is direct evidence that a neutral syllable is sung more accurately than lyrics (Berkowska & Dalla Bella 2009). Solfège vs neutral syllable evidence is mixed and comes mostly from children. Evidence on accompaniment is thin and mixed. A piano reference helped collegiate singers find a starting pitch, and exam boards treat accompaniment as the norm. I found no empirical work on breath-mark placement in songs for beginners.

### Cited Findings
- **[A]** Berkowska & Dalla Bella (2009): /la/ beats lyrics for pitch-interval and contour accuracy in 39 occasional singers ([PubMed](https://pubmed.ncbi.nlm.nih.gov/19673763/)).
- **[A] Children only.**
  - Reifinger 2012: solfège helped with familiar patterns and a neutral syllable with unfamiliar ones ([SAGE](https://journals.sagepub.com/doi/abs/10.1177/0022429411435683)).
  - Earlier studies conflict: one favoured solfège over neutral syllables for sight-singing and another found no difference. Some researchers argue familiarity with patterns matters more than the syllable system (summarised in search results around [Reifinger](https://www.researchgate.net/publication/258156123_The_Acquisition_of_Sight-Singing_Skills_in_Second-Grade_General_Music_Effects_of_Using_Solfege_and_of_Relating_Tonal_Patterns_to_Songs)).
  - Text helped 4–9-year-olds ([Educ. Sci. 2025](https://doi.org/10.3390/educsci15080984)).
- **[A] Nápoles, Springer, Silvey & Adams (2019, *JRME*).** Collegiate singers were **most accurate when given the starting pitch on piano** and least accurate with a tuning fork (for a G starting pitch) ([SAGE](https://journals.sagepub.com/doi/10.1177/0022429419863034)).
- **[A] Accompaniment studies.** A 2021 *International Journal of Research in Choral Singing* study examined second graders' pitch matching a cappella vs with piano ([ACDA PDF](https://acda.org/wp-content/uploads/2021/06/IJRCSVol9Hinkley.pdf)). Its results were not retrievable.
- **[A] Live voice model.** "Accuracy of Pitch Matching Significantly Improved by Live Voice Model" (*J Voice*, 2013) is summarised by its title ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027)). A live, interactive voice model beat a recorded one. Details were not retrieved.
- **[B]** Exam practice assumes accompaniment (piano or backing track) and caps unaccompanied songs at two of four ([AMEB NSW](https://www.ameb.nsw.edu.au/subjects/instruments/singing)).
- **[B] Solfège tradition.** Movable-do sol-fa (Curwen, Kodály) is the long-standing tool for internalising scale-degree relationships, and it transfers across keys ([Berklee Online](https://online.berklee.edu/takenote/do-re-mi-and-you-ear-training-with-sol-fa/)).

### Inferences
- Line-by-line song learning should add a **"tune first on 'la' (or 'loo'), then with words"** step. This rests directly on Berkowska 2009 for adult occasional singers. It is the single best-evidenced change in this area.
- Solfège is a reasonable *option* (the app already offers letters or sol-fa and sings Ode to Joy on sol-fa). But the evidence doesn't justify forcing it on adults. Offer it as an ear-training layer and make /la/ the default for pitch-focused passes.
- Breath marks: with no evidence, fall back on tradition.
  - Mark breaths at the ends of lyric phrases and punctuation, and show them in the lane (a comma or tick in the gap).
  - Keep early songs' phrases short.
  - Long songs like Waltzing Matilda need planned breaths.
- Accompaniment:
  - Keep a piano start pitch and chords.
  - Allow muting chords and then guide, as a later "can you hold it alone?" level (fading support).
  - The evidence for which is better during learning is thin. The progression is pedagogical [B], not empirical.

### Gaps
- No adult study was found that compares singing with a unison guide, with chordal accompaniment only, and a cappella during self-guided learning.
- No empirical literature was found on teaching breath placement or phrasing in beginners' songs.

## 6. Gender and octave issues: men and female-register models, octave-equivalent display, presenting targets

### Takeaway
Pitch matching is easier when the target timbre is vocal, and easiest when it resembles one's own voice. Women match a female voice better than a male voice or instruments. Men naturally answer a woman's (or a treble-register) model an octave lower. So targets should be played and drawn in the singer's own octave, with octave errors forgiven but flagged. Evidence specifically on *adult men* matching female or treble models is thin; most of it comes from children's music-education research.

### Cited Findings
- **[A] Watts & Hall (2008), *Logopedics Phoniatrics Vocology* 33(2):74–82.**
  - Sample: 19 women matched target tones in female voice, male voice, violin and clarinet timbres at three F0s. Stimuli were resynthesised from a single recorded pitch with vibrato removed.
  - They were **significantly more accurate with the female-voice targets than with instrumental timbres**, and better with the female than the male voice.
  - Sources: [T&F](https://doi.org/10.1080/14015430802028434); [ResearchGate](https://www.researchgate.net/publication/5286228_Timbral_influences_on_vocal_pitch-matching_accuracy).
- **[A] Hutchins & Peretz (2012), *J Exp Psychol: General* 141:76–97.**
  - Single-pitch matching showed an advantage for **vocal timbres, and particularly the singer's own timbre**.
  - This was attributed to an easier auditory-to-motor mapping. Poor singers differed in whether they showed this timbre sensitivity.
  - Sources: [ResearchGate](https://www.researchgate.net/publication/51603187_A_Frog_in_Your_Throat_or_in_Your_Ear_Searching_for_the_Causes_of_Poor_Singing); [PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC4432667).
- **[A] Human vocal model on adults.** A review noted that the effects of a human vocal model on adult pitch matching are **inconsistent**: some studies found no difference between a male voice and sine tones for interval matching ([search summary of J Voice literature](https://www.sciencedirect.com/science/article/abs/pii/S0892199706001603)).
- **[C] Choir-leader anecdote (Chris Rowbury).**
  - When a woman sings a note for a man to copy, he "will automatically sing the note an octave lower".
  - In mixed unison, singers feel they are on "the same note" although they are an octave apart.
  - Sources: [From the front of the choir, 2016](https://blog.chrisrowbury.com/2016/05/how-male-singers-can-successfully-pitch.html); [2009](https://blog.chrisrowbury.com/2009/03/singing-same-note-differently.html).
- **[A] Children only.** Boys in all stages of voice change found the octave interval difficult (search summary; [Wikipedia: Voice change](https://en.wikipedia.org/wiki/Voice_change)). Studies on male falsetto vs chest-voice modelling for children exist (e.g. [Rowan thesis](https://rdw.rowan.edu/cgi/viewcontent.cgi?article=2517&context=etd)) but address children.

### Inferences
- Note by Note already plays guide tones in the singer's own octave and forgives octave errors (`foldDiff`), with an "Octave share > 50%" message. This fits the evidence and tradition.
- Refinements:
  - **Guide timbre.** A **voice-like** guide (a formant-filtered "ah" or "oo") is supported over a pure piano or sine tone by Watts & Hall 2008 and Hutchins & Peretz 2012. On iPhone speakers, low male-range fundamentals (about 100–150 Hz) are weak, so a harmonic-rich guide also helps audibility. The speaker limitation is my inference; no source was retrieved for it.
  - **Display.** Show note names *in the singer's octave* (a man sees "G3", not "G4"). Draw the lane in the octave actually sung. When the singer is an octave off, draw the octave-equivalent target faintly and tell them ("You're singing the same note one octave lower — that's fine").
  - **Voice-type labels** (see Q2) must never put a man in a female category or a woman in a male one. A lower/higher toggle drives octave placement.
  - **Presets.** "Lower voice A2–D4" and "Higher voice A3–D5" are octave-equivalent to the congregational A3–D5 guideline [B]. That is a sensible default when a user skips the test.

### Gaps
- No adult-male study was found on matching female vs male vs instrument models, or on octave-displaced targets. Watts & Hall used women only.
- No study was found on how pitch-tracking apps should display octave errors to learners.

## Implications for a self-guided singing app

Each item gives the change, then the evidence it rests on.

1. **Split "range" into two stored values: extremes and comfortable band.**
   - How: measure extremes with gentle glides (siren up and down on "oo" or a lip trill, then hold the top and bottom notes that are clean). Then ask for, or derive, a comfortable band inside them, for example by trimming 2–3 semitones off each extreme, or by asking the user to confirm.
   - Exercises and sirens may approach the extremes. Songs and held notes use the comfortable band.
   - Evidence: VRP practice measures extremes [A: Sanchez 2014; J Voice 2021 norms]. Tessitura is narrower than range [B]. VRP frequency limits are reliable on retest [A: dual-mic study; 2025 posture study], whereas self-judged "comfortable" edges have no validation data (gap).

2. **Add a short warm-up before the first range test, and re-test on a schedule or adapt the range from data.**
   - For example, prompt a re-test after 2–4 weeks of practice, or offer "Your range may have grown" when the user sings accurately within 1 semitone of an edge several times.
   - Evidence: range expands with training [A: Sulter 1995]. Poor-pitch singers restrict range for non-physical reasons [A: Pfordresher & Greenspon 2025]. Warm-up advice is [C]. **The cadence itself has no evidence base (gap), so present it as a suggestion.**

3. **Remove the Fach-style "Closest voice type" label, or demote it.** Replace it with "lower voice / higher voice", which the user chooses or which is inferred and confirmable. Pass that, not "Alto/Tenor", to the Claude report.
   - Evidence: Miller and McKinney advise against early classification. Range is least reliable for beginners [B]. The current midpoint rule mislabels men as "Alto" (code audit).

4. **Place keys by tessitura, not span.** Hard ceiling: highest note ≤ comfortable high minus 1 semitone for beginners. Floor: ≥ comfortable low. Then choose the key whose duration-weighted mean pitch sits at or just below the band's centre. Penalise long notes on the estimated passaggio zone (men about C4–F4; women about E♭4–F4 and F5–F♯5).
   - Evidence: congregational "where the song spends its time" rule [B]; teacher guidance [B/C]; Miller's passaggio norms [B].

5. **Add a per-song "Lower / Higher" key nudge, remembered per song.** Warn when a song's span exceeds the comfortable band rather than silently overflowing.
   - Evidence: ABRSM lets candidates sing any song in any key chosen for their voice [B]; teacher advice to trial keys over days [B/C]; karaoke-style key tools do the same [patents/C].

6. **Grade songs on several factors: span, largest leap, number of leaps, phrase length in beats, tempo and syllable density, and familiarity.** Re-order the list accordingly: Happy Birthday's octave leap and Waltzing Matilda's 17-semitone, 8-line length make them later songs.
   - Evidence: tradition [B/C]. **No empirical adult grading study was found (gap).**

7. **Add a "tune on 'la' first, then words" step to line-by-line learning.** Keep sol-fa as an optional layer.
   - Evidence: [A] Berkowska & Dalla Bella 2009, 39 adult occasional singers, with fewer interval and contour errors on /la/. Solfège evidence is mixed and from children [A: Reifinger 2012].

8. **Mark breaths in the lane and on lyrics, and allow looping or slowing a single line.** The code audit notes neither is possible now.
   - Evidence: tradition [B]. **No empirical work was found on breath marks (gap).**

9. **Offer fading support: guide plus chords → chords only → a cappella check.** Always give a clear piano or voice starting pitch.
   - Evidence: a piano starting pitch gave the best accuracy in collegiate singers [A: Nápoles et al. 2019]. Accompaniment is the exam norm [B: AMEB]. Evidence on which condition is best *for learning* is thin [gap].

10. **Use a voice-like guide timbre in the singer's octave.** Keep octave-forgiving scoring but show the octave explicitly, and name notes in the sung octave.
    - Evidence: [A] Watts & Hall 2008 (vocal > instrumental timbre; female voice best for women); [A] Hutchins & Peretz 2012 (own-timbre advantage); [C] the choir-leader observation that men answer a female model an octave lower.

11. **Don't keep beginners in a narrow band indefinitely.** Once a user is accurate, include octave-spanning pitch-matching and songs.
    - Evidence: [A] Pfordresher & Greenspon 2025: octave-span training improved single-pitch matching and a fifth-span did not.

12. **Expand repertoire only with verified Australian public-domain material.** The test: every composer and lyricist died before 1 January 1955, and the app uses its own arrangement.
    - Add adult-appropriate folk songs, hymns and spirituals, plus Australian songs such as Click Go the Shears and Botany Bay (verify first).
    - Explicitly **exclude** Kookaburra (Larrikin copyright to about 2058). Check Along the Road to Gundagai, Morning Has Broken and You Are My Sunshine before any use.
    - Don't add licensed pop: arrangements and lyric display need publisher permission.
    - Evidence: [B] NLA and Arts Law duration rules; *Larrikin v EMI*; APRA AMCOS licence scope.

13. **Enrich the "Copy results for Claude" report** with range extremes vs comfortable band, the chosen key and nudge history for each song, the song's highest note and tessitura relative to the band, and octave-displacement share.
    - An AI coach can then give tessitura-aware advice (for example "your misses cluster above D4, near your passaggio") instead of reasoning from a voice-type label.
    - Evidence: this follows from items 1–4 [inference].
