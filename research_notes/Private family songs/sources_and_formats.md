# Private family songs: where to buy current songs as files, and what an importer must handle

Research date: 1 October 2026. Research method note: this session's network proxy blocked direct page fetches for almost every shop, legal and spec site (midi.com.au, musicnotes.com, sheetmusicdirect.com, musescore.com/.org, w3.org, midi.org, austlii, Wikipedia). Shop and legal findings below therefore come from search-engine extracts of those pages (cited to the page the extract came from). Format findings were verified first-hand from primary sources on GitHub: the W3C MusicXML 4.1 schema and docs, the mido MIDI library docs and source, and two karaoke parsers. The two public test files were downloaded and inspected.

## 1. Which shops sell licensed karaoke MIDI files (.kar / MIDI with lyrics) of current songs to Australian buyers, and what do their licences allow?

### Takeaway
**Hit Trax (midi.com.au)** is the clear first choice. It is Australian, AMCOS-licensed, prices in AUD, releases new songs weekly, and sells MIDI Karaoke files with embedded lyrics and a removable melody guide. Its terms limit use to personal, non-commercial use and forbid copying or transferring files, but they explicitly allow changing a purchased file "for your personal vocal range". The licence allows using the file in a player app. Sending a copy to a second family phone is not allowed on the terms' plain wording. midifiles.com is similar, but it allows passing a file on only if you stop using it yourself. Karaoke Version (Recisio) appears not to sell MIDI at all.

### Cited Findings
**Hit Trax (Australia, midi.com.au)**
- Hit Trax MIDI files are licensed through AMCOS, and royalties are paid to songwriters and producers on every download — [Hit Trax AMCOS page](https://www.midi.com.au/amcos/)
- Its MIDI Karaoke files "are identical to standard MIDI files" except that they "include embedded 'scrolling' lyrics by default and can also include an optional removable MIDI melody guide", and they work "on all MIDI software, apps and MIDI File Players" — [Hit Trax MIDI Karaoke](https://www.midi.com.au/midi-karaoke/)
- A song with embedded lyrics is labelled "Karaoke Lyrics" under its title, and clicking the title lists other inclusions such as a melody guide. Free lyric text files come with almost every download — [Hit Trax support/FAQ](https://www.midi.com.au/support/); [Hit Trax Lyrics](https://www.midi.com.au/Lyrics/)
- New releases include embedded scrolling lyrics, melody lines, lyric sheets, instrument track sheets and MP3 mixes, and Hit Trax releases new tracks each week — [Hit Trax new releases](https://www.midi.com.au/new-releases/)
- Price: buying 3 or more titles gives 40% off, which a search extract put at **A$5.99 each** for 3 tracks. The single-title price was not visible in the extracts — [Hit Trax prices](https://www.midi.com.au/prices/)
- Hit Trax's custom-track listing describes its standard inclusions as "melody guide in the MIDI File version, backing melody guide…, karaoke embedded lyrics in MIDI File (English songs only)" — [AirGigs: Hit Trax custom MIDI](https://www.airgigs.com/custom-backing-tracks/38511/Custom-MIDI-File-Backing-Tracks---by-Hit-Trax)
- Licence: the services are "for your personal, performance and non-commercial use". You "may not modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell" anything obtained. Exception: you "can modify purchased items in 'The Library' for your personal vocal range and performance arrangement" — [Hit Trax Terms of Use](https://www.midi.com.au/terms-of-use/)
- "The Library" means MIDI Files, MIDI Karaoke, MP3 backing tracks, demo files and lyrics. Copying it "to any other server or location for further reproduction or redistribution is expressly prohibited" — [Hit Trax Terms and Conditions](https://www.midi.com.au/terms-and-conditions/)

**midifiles.com (Europe)**
- Files are "intended exclusively for the user's private use as a simple accompaniment". "Duplication, rental, lending, exchange" and public performance are forbidden. Customers may not pass files to third parties "unless the customer ceases to use the files with final effect". The provider pays the royalties due — [midifiles.com legal notice](https://www.midifiles.com/en/legal-notice)
- It offers professional MIDI files for karaoke in GM, XG, GS and GM2 formats, with new releases added regularly — [midifiles.com](https://midifiles.com/en)

**Other sellers (licence terms not checked)**
- MidiFiles24/Musicmedia24 sells a "New MIDI Files 2025" collection that includes current chart hits with karaoke lyrics — [midifiles24.eu](https://midifiles24.eu/en/collections/new-collection)
- Regional Karaoke ([regionalkaraoke.com](https://www.regionalkaraoke.com/midi-files)), Karaoke Island ([karaokeisland.com](https://www.karaokeisland.com/midi.php?reset=)) and Midisale ([midisale.com](https://midisale.com/midi-files)) also sell MIDI files of current hits.
- Etsy has packs of "50000+ Karaoke Midi/kar Files" and "12,000" files — [Etsy listing](https://www.etsy.com/listing/4300062332/50000-karaoke-midikar-files-for-party); [Etsy listing](https://www.etsy.com/listing/1859780805/midi-kar-pack-12000-karaoke-and-music)

**Karaoke Version (Recisio)**
- Its catalogue is MP3 Custom Backing Tracks (about US$2.99), instrumental versions (US$1.99) and karaoke videos. Search found no MIDI file section — [Karaoke Version](https://www.karaoke-version.com/). Extended licences apply only to Custom Backing Tracks — [Karaoke Version licensing help](https://www.karaoke-version.com/help/self-licensing.html)

### Inferences
- **Importing into another app on your own phone**: Hit Trax says its files work "on all MIDI software, apps and MIDI File Players". Opening a purchased file in a practice app is the intended use, not a prohibited "copy". Note by Note moving the song into a child's range is covered by the explicit "personal vocal range" permission. Storing only the extracted melody and words, not the backing arrangement, keeps the stored copy smaller and less able to replace the product.
- **Sending a copy to a second family phone**: Hit Trax lists "copy… distribute, transmit… transfer" as prohibited, so a literal reading forbids it. midifiles.com allows a transfer only if the sender stops using the file, which matches "move", not "copy". The licence-clean options are to buy a second copy for the second child, or to make Note by Note's send action a **move** that deletes the song from the sending phone.
- Bulk Etsy packs of tens of thousands of songs at a flat price are almost certainly not licensed by publishers. Recommend against them.
- Hit Trax prices in AUD, pays Australian AMCOS royalties and labels lyrics and melody guide clearly for each song. That makes it the best fit for an Australian family.

### Gaps
- Hit Trax's single-title price, file extension (.mid vs .kar) and the channel its melody guide uses could not be read directly (site blocked to this session).
- I found no seller called "Tim's MIDI", no current MIDI products from Sunfly (a karaoke CD+G/MP3+G label), and no Zenph karaoke MIDI products. Zenph appears defunct. Midi-Karaoke.info was not found in search results.
- Licence terms for MidiFiles24, Regional Karaoke, Karaoke Island and Midisale were not checked.
- No shop's terms mention family members or multiple household devices.

## 2. Which shops sell licensed sheet music downloadable as MusicXML (or MSCZ/MIDI) for current songs?

### Takeaway
Among mainstream licensed stores, only **MuseScore.com community scores** (with a paid PRO subscription) let you download current pop songs as MusicXML or MIDI. MuseScore's "Official Scores", Musicnotes, Sheet Music Direct (Hal Leonard), Sheet Music Plus and Noteflight Marketplace all deliver PDFs or their own viewer formats, and several explicitly forbid export or adaptation. Community arrangements vary in quality, and not all of them have lyrics under the vocal line.

### Cited Findings
**MuseScore.com**
- MuseScore.com offers downloads of over 1.5 million scores in MuseScore, MusicXML, PDF, MIDI and MP3 formats. Public-domain scores download free, while copyrighted scores need a PRO subscription (quoted as US$49/year) — [Wikipedia: MuseScore](https://en.wikipedia.org/wiki/MuseScore). **Conflicting prices:** US$5/month or US$40/year — [SoftwareSuggest](https://www.softwaresuggest.com/musescore/pricing); about US$6.99/month in the earlier Note by Note report, via [MuseScore forum](https://musescore.org/en/node/366450). Check at checkout.
- MuseScore.com holds "blanket licenses" with a number of publishers that cover user uploads of their songs. Uploads not covered are made private or unlisted — [MuseScore forum: copyright compliance and personal use](https://musescore.org/en/node/332569)
- "Usage of Content is limited to your personal, noncommercial use… you have no right to provide any files obtained through the Service to any other party" — [Muse Group Terms of Service](https://www.mu.se/content/terms-of-service)
- Official Scores, licensed from publishers such as Hal Leonard, are bought separately, and "Official Scores are downloadable in PDF format, ONLY" — [MuseScore forum: Downloading "Official Scores"](https://musescore.org/en/node/367216); [MuseScore forum: PDF downloads only?](https://musescore.org/en/node/371058)
- PRO+ lets you view, play and practise Official Scores but not print or download them, with up to 42% off Official Score purchases — [pract.is review](https://pract.is/blog/musescore-pro-review-paid-plans); [MuseScore forum](https://musescore.org/en/node/380205)

**Musicnotes**
- Licence for personal, non-commercial use only. You may not "sublicense, assign or transfer" your rights. "Duplication, adaptation, arranging and/or transmission" needs written consent. Under the legacy viewer licence, full view and print work only on the purchasing computer — [Musicnotes Viewer EULA](https://www.musicnotes.com/download/viewer/viewer_EULA.asp)
- You can sign in on multiple devices, and the library syncs. Publishers allow one successful print per purchase, except Musicnotes Editions — [Musicnotes help: Print your purchased sheet music](https://help.musicnotes.com/hc/en-us/articles/360018605611-Print-Your-Purchased-Sheet-Music); [Musicnotes Editions printing](https://help.musicnotes.com/hc/en-us/articles/201635636-Can-I-print-more-than-one-copy-of-a-Musicnotes-Editions-digital-file)
- There is no MusicXML export. One user's workaround was PDF plus optical music recognition (OMR) software — [MakeMusic forum](https://forum.makemusic.com/default.aspx?f=5&m=448244). forScore can import Musicnotes purchases as PDFs — [forScore](https://forscore.co/kb/musicnotes/)

**Sheet Music Direct (Hal Leonard)**
- Buyers may print each copy once and view it on screen while it remains in the catalogue. They may not "redistribute the sheet music in any form or file format" or alter the file, except through authorised alterations such as transposition in the site's viewer — [Sheet Music Direct terms](https://www.sheetmusicdirect.com/help/terms)

**Noteflight Marketplace (Hal Leonard catalogue)**
- Editable copies of purchased scores can be printed and saved as PDF "but still cannot be exported as XML, MIDI, or shared". Buying a score "does not permit you to adapt a work using another notation program" — [Noteflight Marketplace purchasing](https://www.noteflight.com/marketplace-purchasing-and-selling)

**Sheet Music Plus**
- Downloads are "flattened, password protected PDF files". Sharing the file or printing extra copies is not allowed — [Sheet Music Plus: About Digital Downloads](https://help.sheetmusicplus.com/hc/en-us/articles/28884343289357-About-Digital-Downloads)

### Inferences
- Converting a PDF from Musicnotes, Sheet Music Direct, Sheet Music Plus or MuseScore Official Scores to MusicXML with OMR software would breach those shops' terms ("alter", "adapt", "any form or file format"). Note by Note should not suggest it.
- MuseScore community scores are the one realistic MusicXML route. Tell parents to choose a score whose vocal line has lyrics, for example arrangements labelled "voice", "vocal" or "piano-vocal".
- MuseScore's "no right to provide any files… to any other party" raises the same family-sharing question as Hit Trax's terms. Whether a parent's "personal use" covers their own children's phones is unclear.

### Gaps
- MuseScore's exact 2026 PRO price in AUD, and whether PRO downloads are limited per month, were not confirmed.
- I could not find how many current charting songs on MuseScore have lyrics in the vocal line, or how quickly new hits appear.
- Musicnotes' current Terms of Use (as opposed to the legacy viewer licence) could not be read.

## 3. Australian law: private practice copies made from a purchased file

### Takeaway
Australia's private-copying exceptions are narrow and tied to format. s 43C covers books, newspapers and periodicals, and s 109A covers sound recordings. Each allows a private copy in a different format and explicitly allows lending that copy to a member of your family or household. A karaoke MIDI or MusicXML file is probably neither a "book" nor a "sound recording", so these exceptions probably don't apply. In practice, **the shop's licence terms govern** what the family may do.

### Cited Findings
- s 43C (books, newspapers, periodicals) allows a "main copy" for private and domestic use in a form different from the original, if the original is not an infringing copy. Lending the main copy "to a member of the lender's family or household for the member's private and domestic use" does not breach the dealing restrictions. "Private and domestic use" means such use "on or off domestic premises" — [Copyright Act 1968 s 43C (AustLII)](https://www5.austlii.edu.au/au/legis/cth/consol_act/ca1968133/s43c.html)
- s 109A (sound recordings) lets the owner of a non-infringing copy of a sound recording make another copy for private and domestic use, using a device they own. Selling or hiring either copy voids the exception, but lending either copy to a family or household member for their private and domestic use does not — [Copyright Act 1968 s 109A (AustLII)](https://www.austlii.edu.au/au/legis/cth/consol_act/ca1968133/s109a.html)
- Format-shifting exceptions were added in 2007 for books, newspapers and periodicals, photographs, videotapes and sound recordings. The book exception allows one copy in each format — [University of Melbourne: personal use](https://copyright.unimelb.edu.au/shared/using-copyright-material/personal-use); [ALRC DP79 current law](https://www.alrc.gov.au/publication/copyright-and-the-digital-economy-dp-79/9-private-and-domestic-use/current-law-2/)
- Australia has no general fair-use exception — [Copyright Agency](https://www.copyright.com.au/about-copyright/exceptions/). Fair dealing for research or study is judged case by case — [libcopyright.org.au](https://libcopyright.org.au/exceptions-to-copyright/)

### Inferences
- A MIDI file holds instructions (notes, timings, text), not recorded sound, so it is unlikely to be a "sound recording" for s 109A. A MusicXML file is unlikely to be a "book" for s 43C. Converting a purchased file into Note by Note's format is therefore best treated as **permitted only by the licence**. Hit Trax's express permission to modify for "personal vocal range" is a helpful fit.
- Family lending in s 43C and s 109A shows that Parliament accepts family sharing for those formats. It does not legally extend to MIDI or MusicXML, and shop contracts can be stricter.
- The publisher of a public app could be said to "authorise" copying that users do with it (the earlier Note by Note report raised this). Reasonable steps against that include: no upload, a PIN, notices, and importing only from files the user supplies. A move-based family transfer (rather than copy) is a further reasonable step.
- Practical risk: everything stays on family phones and nothing is communicated to the public, so enforcement risk is very low. The main real exposure is a licence breach against the shop.

### Gaps
- No source settled whether a MIDI or MusicXML file is a "book" or a "sound recording" under the Act, or whether a shop's terms can override s 43C or s 109A. Arts Law or the Australian Copyright Council could settle this.
- s 47C (back-up copies of computer programs) and s 43B (temporary copies) were not researched. They likely don't help.

## 4. File-format details an importer needs

### Takeaway
Standard MIDI Files are chunked binary files. The importer must handle formats 0, 1 and 2, PPQ and SMPTE timing, running status, a tempo map gathered from all tracks, and unknown chunks such as Yamaha XF. Karaoke lyrics come in two styles: Soft Karaoke .kar text events (0x01) with "/" and "\" markers and "@" headers, or RP-017 lyric events (0x05) with carriage return/line feed. They arrive in assorted 8-bit encodings, and the melody must be found by matching notes to lyric times. MusicXML gives lyrics per note with verse numbers, hyphenation (syllabic) and melisma lines (extend), but the importer must resolve ties, grace notes, chords, voices, repeats and voltas, pickups and transposition, and unzip .mxl via META-INF/container.xml.

### Cited Findings
**Standard MIDI File (SMF) structure**
- Header chunk: "MThd", length, format, number of tracks, division. Format 0 has one track. Formats 1 and 2 have one or more tracks — [CCRMA: Standard MIDI File Structure](https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html); [SMF 1.1 spec mirror](https://midimusic.github.io/tech/midispec.html)
- Types: 0 is a single track, 1 has tracks that "all start at the same time", and 2 has independent tracks (multiple songs) — [mido docs: MIDI files](https://github.com/mido/mido/blob/main/docs/files/midi.rst)
- Division: if bit 15 is 0, bits 14–0 are ticks per quarter note. If bit 15 is 1, the high byte holds −24, −25, −29 or −30 (frames per second, where −29 means 30 drop-frame) and the low byte holds ticks per frame — [CCRMA](https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html); [SMF spec mirror](https://midimusic.github.io/tech/midispec.html)
- Tempo (meta FF 51) is in microseconds per quarter note. The default is 500000, which is 120 bpm in 4/4. Typical resolution is 96–480 ticks per quarter note, sometimes more — [mido docs](https://github.com/mido/mido/blob/main/docs/files/midi.rst); [mido meta types](https://github.com/mido/mido/blob/main/docs/meta_message_types.rst)
- Time signature (FF 58): numerator, denominator stored as a power of 2, clocks per click (default 24), 32nd notes per beat (default 8) — [mido meta.py](https://github.com/mido/mido/blob/main/mido/midifiles/meta.py)
- Key signature (FF 59): signed sharps/flats count −7..+7 plus mode byte (0 major, 1 minor) — [mido meta.py](https://github.com/mido/mido/blob/main/mido/midifiles/meta.py)
- Meta types used: text 0x01, copyright 0x02, track name 0x03, instrument 0x04, lyrics 0x05 ("typically one syllable per meta message"), marker 0x06, cue 0x07, end of track 0x2F, tempo 0x51, SMPTE offset 0x54, time signature 0x58, key signature 0x59 — [mido meta message types](https://github.com/mido/mido/blob/main/docs/meta_message_types.rst)
- Running status: a data byte (<0x80) where a status byte is expected reuses the previous status. mido notes "Meta messages don't set running status" — [mido midifiles.py](https://github.com/mido/mido/blob/main/mido/midifiles/midifiles.py). pykaraoke "only save[s] running status for voice messages" — [pykar.py](https://github.com/kelvinlawson/pykaraoke/blob/master/pykar.py)
- Tempo changes may appear in any track and apply to all tracks, so the whole file must be parsed before ticks become times — [pykar.py comments](https://github.com/kelvinlawson/pykaraoke/blob/master/pykar.py)
- mido decodes meta text as Latin-1 by default, with a configurable charset — [mido meta.py](https://github.com/mido/mido/blob/main/mido/midifiles/meta.py)

**Karaoke lyric conventions**
- .kar ("Soft Karaoke") was created in 1993 by Tune 1000 for its Soft Karaoke product. It is essentially a Type 1 MIDI file with lyrics as timed text meta events — [Mixage: Karaoke formats](https://www.mixagesoftware.com/en/midikit/help/HTML/karaoke_formats.html); [Karawin: karaoke file types](https://www.karawin.fr/defenst.php)
- .kar header text events:
  - The first track contains "@KMIDI KARAOKE FILE".
  - The first event of the second track is "@LENGL", giving the language.
  - "@T" lines (up to three) give the title.
  - "@I" lines give information.

  Syllables are separate text events. "\" at the start means clear the screen (new paragraph), and "/" means next line — [Mixage](https://www.mixagesoftware.com/en/midikit/help/HTML/karaoke_formats.html); [Karawin](https://www.karawin.fr/karhelpenst.php)
- The "Tune1000 format" used by Roland arrangers and some Technics/Farfisa keyboards must be format 0 (single track) — [Mixage](https://www.mixagesoftware.com/en/midikit/help/HTML/karaoke_formats.html)
- pykaraoke's real-world handling:
  - Text (0x01) and lyric (0x05) events are collected separately. When a track has both, the type with more events wins, and tracks named "Words" are preferred.
  - Events containing " SYX", "Track-", "%-" or "%+" are ignored. NUL and CR characters are stripped.
  - "@T" lines become titles and "@I" lines info. Other "@" lines are ignored.
  - In 0x05 events, "\n" is a paragraph and "\r" a line break, while "\" and "/" are also accepted "because some midi files don't play by the rules".
  - Missing spaces between words are detected and repaired.
  - Encoding is a user setting.

  Source: [pykar.py](https://github.com/kelvinlawson/pykaraoke/blob/master/pykar.py) (LGPL 2.1)
- Karapython detects .kar files by the exact text "@KMIDI KARAOKE FILE" and records the karaoke track, syllables and times — [Karapython](https://github.com/hsocasnavarro/Karapython) (MIT)
- RP-017 (MIDI Association): each syllable is one Lyric meta event, in ASCII only. Carriage return (0x0D) ends a line and line feed (0x0A) ends a paragraph — [MIDI Association: SMF Lyric Meta Event Definition](https://midi.org/smf-lyric-meta-event-definition)
- RP-026 (Language and Display Extensions) allows a text prefix such as "{@LATIN}" or "{@JP}" (Shift-JIS). A Japanese MIDI forum says "{@UTF-16LE}"/"{@UTF-16BE}" are also allowed, contradicting another extract that limits RP-026 to Latin-1 and Shift-JIS — [MIDI Association RP-026](https://midi.org/community/midi-specifications/smf-language-and-display-extensions-jun-99-rp-026); [OpenMIDIProject forum](https://osdn.net/projects/openmidiproject/forums/21795/34267/)
- Yamaha XF files are MIDI files with extra "XFIH" and "XFKM" chunks. Lyrics can sit inside XFKM, after a "$Lyrc:…:JP" cue marker, which standard parsers skip. The example decodes text as cp932 (Shift-JIS) — [xfmido (PyPI)](https://pypi.org/project/xfmido/); [Yamaha XF spec](https://jp.yamaha.com/files/download/other_assets/7/321757/xfspc.pdf)

**Where the melody lives**
- In General MIDI, channel 10 is reserved for percussion — [Wikipedia: General MIDI](https://en.wikipedia.org/wiki/General_MIDI)
- Channel conventions conflict. A Yamaha XG/XF guide lists channel 1 as "Melody lead", channel 4 as "Additional chords for Vocalists" and channel 15 as an arranged vocal track. A search extract also stated "Channel 4 in karaoke-land is the melody channel" — [bonmidi FAQ](https://www.bonmidi-music.de/Information/FAQ). Another extract said karaoke melodies are "often assigned to channel 4" (source unclear) — [MIDI Association forum](https://midi.org/community/midi-specifications/how-many-midi-karaoke-formats-exist)
- Karaoke editors ask the user to enter the melody channel (1–16) — [GNMIDI karaoke editor](https://www.gnmidi.com/handbook/english/karaoke_editor.htm)

**MusicXML (W3C MusicXML 4.1 draft schema, verified first-hand)**
- `<lyric>` attributes:
  - `number` "specifies the lyric line when multiple lines are present".
  - `name` gives the lyric type, such as "verse" or "chorus".
  - `time-only` "specifies which lyrics are to be sung which times through a repeated section".

  Children: `syllabic`, `text`, then optionally `elision` + `syllabic` + `text` repeated, then `extend`, `end-line`, `end-paragraph`. Alternatives to text are `laughing` and `humming` — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `syllabic` values: single, begin, end, middle (single-syllable word, word start, word end, mid-word). "Two text elements that are not separated by an elision element are part of the same syllable" — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `elision` joins syllables on one note, usually displayed as a no-break space, underscore or undertie (U+203F) — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `extend` marks melisma lines, with type start/stop/continue since 3.0. Before 3.0 it "was always treated as the start". The W3C example puts `<extend type="start"/>` on the sung syllable and `<lyric><extend type="stop"/></lyric>` on the last note of the melisma — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd); [W3C extend example](https://github.com/w3c/musicxml/blob/gh-pages/docs/src/data/examples/musicxml/extend-element-lyric.md); [W3C lyric example](https://github.com/w3c/musicxml/blob/gh-pages/docs/src/data/examples/musicxml/lyric-element.md)
- `end-line` and `end-paragraph` "come from RP-017 for Standard MIDI File Lyric meta-events" for karaoke display — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Ties: `<tie>` gives the sound and `<tied>` the notation. Tie type is start or stop — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Grace notes have no `<duration>`. Their attributes are steal-time-previous, steal-time-following, make-time and slash — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `<chord/>` marks an extra chord tone with the preceding note. Its duration "does not move the musical position" — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `<backup>` and `<forward>` "are required to coordinate multiple voices in one part, including music on multiple staves". Durations are always positive and never cross barlines — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Repeats: `<repeat direction="forward|backward" times=…>`. `<ending number="1" | "1,2" type="start|stop|discontinue">` gives which times through each ending is played. `<sound>` carries dacapo, segno/dalsegno, coda/tocoda and tempo, in quarter notes per minute — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Pickups: "For a pickup measure, the number attribute is typically set to '0' and the implicit attribute is typically set to 'yes'" — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Transposition: `<transpose>` holds `diatonic`, `chromatic` (semitones from written to sounding pitch), `octave-change` and `double`. The number attribute can limit it to one staff — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- Chord symbols: `<harmony>` contains `<root><root-step><root-alter>`, a `<kind>` (major, minor and so on, with an optional text spelling), optional bass, degrees and frame, and a type of explicit/implied/alternate — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- `divisions` should be integers "for MIDI interoperability" — [musicxml.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/musicxml.xsd)
- .mxl container:
  - The archive is a zip (DEFLATE) with UTF-8 file names.
  - META-INF/container.xml lists `<rootfiles><rootfile full-path=… media-type=…>`, and "the MusicXML root must be described in the first `<rootfile>`".
  - A missing media-type means MusicXML.
  - The first entry should be an uncompressed `mimetype` file holding `application/vnd.recordare.musicxml`, but files older than 3.1 may lack it.
  - Recommended suffixes are .mxl (compressed) and .musicxml (uncompressed).

  Sources: [W3C tutorial: Compressed .MXL Files](https://github.com/w3c/musicxml/blob/gh-pages/docs/src/pages/tutorial/compressed-mxl-files.md); [container.xsd](https://github.com/w3c/musicxml/blob/gh-pages/schema/container.xsd)
- First-hand check of MuseScore-exported .mxl files (OpenScore Lieder): the zip holds only `META-INF/container.xml` and `score.xml`, with **no mimetype entry**, and the rootfile has **no media-type**. The DOCTYPE is MusicXML 4.0 Partwise. Vocal parts are named "Voice" or "Singstimme" (German), so part names are not reliable in English — [OpenScore Lieder repo](https://github.com/OpenScore/Lieder)

### Inferences
- Importer heuristics for MIDI:
  1. Read chunks by length and skip unknown ones (XFIH/XFKM). Optionally parse XFKM for lyrics.
  2. Treat note-on with velocity 0 as note-off.
  3. For SMPTE division, seconds = ticks ÷ (fps × ticks per frame), with −29 meaning 29.97 fps.
  4. Build one tempo map from every track, and treat format 2 as "first song only".
- For lyrics, collect 0x01 and 0x05 per track. Skip "@"-header and "%"/SYX junk. Prefer a track named "Words" or "Lyrics", then whichever event type has more syllables. Treat "/" and CR as new line, and "\" and LF as new paragraph. These markers become the app's natural "line by line" boundaries.
- Decode text in this order:
  1. Honour any "{@…}" prefix.
  2. Try strict UTF-8.
  3. If that fails, decode as Windows-1252 (a superset of Latin-1's printable range).
  4. Offer Shift-JIS if many bytes fall in 0x81–0x9F/0xE0–0xEF.

  Show a "words look wrong? try another alphabet" control in the preview.
- Pick the melody by scoring each non-drum channel and track (excluding channel 10):
  - the share of lyric events that land within about ±40 ms (or a 1/32 note) of one of its note-ons;
  - monophony;
  - a vocal-like range;
  - a name containing "melody", "vocal", "voice", "lead", "guide" or "melodie";
  - tie-breakers for channel 4, then channel 1.

  If the best score is weak, let the parent audition and choose.
- Match each syllable to the nearest melody note-on at or just after its time. Extra notes with no syllable become melisma continuations. Extra syllables merge into the previous note. Within a chord, keep the top note.
- MusicXML heuristics:
  - Choose the part, then the voice, with the most `<lyric>` elements.
  - Merge tied notes, keeping the lyric on the first.
  - Drop grace notes, or fold them into the next note.
  - Ignore `<chord/>` notes except the top one.
  - Use `<backup>`/`<forward>` to track time per voice.
  - Expand repeats and endings, then on pass *n* use lyric number *n* if present (or `time-only`), otherwise verse 1.
  - Keep pickup measures short, without padding.
  - Add `chromatic` + 12×`octave-change` to get sounding pitch.
  - Use `<harmony>` as optional accompaniment chords.
  - Use `end-line`/`end-paragraph`, rests over one beat, or phrase marks to split lines.
- Note by Note moves every song into the child's range, so octave mistakes (treble-8vb tenor parts, transposing instruments) don't matter much. Getting intervals and rhythm right matters most.
- Don't require a `mimetype` entry or a media-type in .mxl files, and fall back to the first `*.musicxml`/`*.xml` outside META-INF.

### Gaps
- The primary MIDI 1.0 SMF specification and the full RP-017 and RP-026 texts could not be read directly (midi.org blocked). The details above come from search extracts and widely used parsers.
- No primary source established a single industry "melody channel" convention for karaoke MIDI. Hit Trax's own melody-guide channel is unknown.
- How MusicXML encodes octave-transposing clefs (treble 8vb) relative to `<transpose>` was not researched.
- Whether iOS Safari's `DecompressionStream('deflate-raw')` is available for unzipping .mxl without a library was not checked.

## 5. Legally free test files for a public test suite

### Takeaway
**OpenScore Lieder** (CC0 1.0, on GitHub, with ready .mxl files) is the best source of MusicXML with lyrics. Two of its songs stress almost every importer edge case: Bishop's "Home, Sweet Home" and Brahms's "Wiegenlied" Op. 49 No. 4. I found no public-domain or CC0 .kar file with a clear licence. Generate the karaoke-MIDI fixtures from the CC0 MusicXML instead, and dedicate them to CC0.

### Cited Findings
- The OpenScore Lieder corpus is "a collection of over 1,200 nineteenth century songs" available "under the open CC0 licence". The GitHub mirror's LICENSE.txt is CC0 1.0 Universal. Each song folder holds .mscx, .mscz, **.mxl** and a lyrics .txt, and the scores are proofread by a professional team — [OpenScore Lieder (GitHub)](https://github.com/OpenScore/Lieder)
- First-hand inspection, "Home, Sweet Home" (Henry Bishop, d. 1855; words John Howard Payne, d. 1852), file `scores/Bishop,_Henry/_/Home,_Sweet_Home/lc6486038.mxl`. **Verify these deaths and publication dates against the two-country public-domain test before using any song**:
  - English words, 99 measures, pickup measure 0 marked implicit, 4 more implicit measures.
  - 2/4 and 6/8 time, E major (4 sharps).
  - Voice part: 172 lyrics (one verse line), 23 grace notes, ties, 4 volta `<ending>`s and repeats.
  - Piano part: 84 `<chord/>` tones and voices 1/5/6.

  Sources: [GitHub folder](https://github.com/OpenScore/Lieder/tree/main/scores/Bishop,_Henry/_/Home,_Sweet_Home); [MuseScore page](https://musescore.com/score/6486038)
- First-hand inspection, Brahms "Wiegenlied" Op. 49 No. 4, file `lc5701612.mxl`:
  - German words, 19 measures, 3/4 time, E-flat major.
  - Pickup measure 0 implicit.
  - **Two verses (`<lyric number="1">` and `"2"`)**, repeat barlines, 3 grace notes, `<extend>` melismas.
  - The vocal part is named "Singstimme".

  Sources: [GitHub folder](https://github.com/OpenScore/Lieder/tree/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied); [MuseScore page](https://musescore.com/openscore-lieder-corpus/scores/5701612)
- The corpus also includes English songs by Amy Beach, Frank Bridge, Stanford, Elgar, Quilter, Parry and others — [OpenScore Lieder (GitHub)](https://github.com/OpenScore/Lieder)
- Mutopia: all music may be freely copied and modified, under CC licences (CC BY-SA requires a same-licence notice) or as public domain — [Mutopia legal](https://www.mutopiaproject.org/legal.html); sources at [Mutopia GitHub](https://github.com/MutopiaProject/MutopiaProject)
- LilyPond's MIDI output has a `Lyric_performer` in the Lyrics context, so LilyPond-made MIDI can carry lyric events — [LilyPond internals: Lyric_performer](https://lilypond.org/doc/v2.23/Documentation/internals/lyric_005fperformer)
- CPDL: its own licence (GPL-based copyleft) lets you download, print, copy and distribute, and requires modified versions to stay under the same licence. CC licences are also accepted, and some editions carry other terms — [CPDL: copyright rules](https://www.cpdl.org/wiki/index.php/ChoralWiki:Copyrights); [ChoralWiki:CPDL](https://www.cpdl.org/wiki/index.php/ChoralWiki:CPDL)
- The W3C MusicXML repository includes tutorial files with lyrics (e.g. `tutorial-apres-un-reve.musicxml`, Fauré) and test files (`repeats-jumps.musicxml`, `beams-ties.musicxml`). Contributions fall under the W3C Community Contributor License Agreement — [w3c/musicxml](https://github.com/w3c/musicxml)
- mido (MIT licence) can write lyric meta events to generate karaoke-MIDI fixtures — [mido](https://github.com/mido/mido)

### Inferences
- Suggested public fixtures:
  - (a) Home, Sweet Home .mxl as-is, for repeats, voltas, grace notes, ties, time change and pickup.
  - (b) Wiegenlied .mxl, for two verses and repeat lyrics.
  - (c) An unzipped .musicxml copy of one of them, to test the .mxl and .musicxml paths.
  - (d) Generated .kar files made from (a), with a CC0 notice: one Soft-Karaoke style (0x01 text, "@" headers, "/" and "\", Windows-1252 "é"), one RP-017 style (0x05, CR/LF), one with the melody on channel 4 and a doubling decoy on channel 1, one using SMPTE division and running status, and one with a fake "XFKM" chunk.
- Choose English songs by composers and lyricists who died before 1955 and were published by 1930. That satisfies both the Australian and US public-domain tests in the earlier report.

### Gaps
- I found no ready-made public-domain/CC0 .kar file with a verifiable licence. Wikimedia Commons' support for .kar or MusicXML uploads was not checked.
- Whether Mutopia's own MIDI downloads actually include lyric events was not verified.
- The licence of the W3C tutorial sample files themselves (as opposed to the spec) was not confirmed. Prefer OpenScore.

## 6. Implications for Note by Note

### Takeaway
Recommend that parents buy **Hit Trax MIDI Karaoke** files (marked "Karaoke Lyrics" with a melody guide) or **MuseScore.com PRO community scores** as MusicXML. Import them with a tolerant parser that saves only the melody and words. Because iOS cannot open custom file types in a web app, **send to another family phone** must work as "save to Files, then Add from file". For licence safety, it should **move** the song by default rather than copy it.

### Cited Findings
- iOS Safari does not apply `accept` file-extension filters. Files of unknown types can appear greyed out and unselectable in the picker — [MDN browser-compat-data issue #26043](https://github.com/mdn/browser-compat-data/issues/26043); [caniuse: accept](https://caniuse.com/input-file-accept)
- The File Handling API (`file_handlers`) is Chromium-only and desktop-only, so iOS web apps can't register to open a file type such as .nbn. The basic file picker and Web Share do work in iOS web apps — [web.dev: OS integration](https://web.dev/learn/pwa/os-integration/); [10LOC: File Handling API](https://10loc.dev/posts/file-handling-api-browser-files); [MagicBell: PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- Hit Trax permits changes "for your personal vocal range" but forbids copying or transfer. midifiles.com permits passing a file on only if you stop using it. MuseScore says you may not provide downloaded files "to any other party" — [Hit Trax ToU](https://www.midi.com.au/terms-of-use/); [midifiles.com](https://www.midifiles.com/en/legal-notice); [Muse Group ToS](https://www.mu.se/content/terms-of-service)

### Inferences
**Recommended shops and file types**
1. Hit Trax MIDI Karaoke (.mid/.kar with embedded lyrics and a melody guide). Australian, AMCOS-licensed, AUD, new songs weekly.
2. MuseScore.com community scores via PRO, downloaded as **MusicXML** (pick one with lyrics on the vocal line). MIDI from MuseScore usually has no lyrics.
3. Do not suggest Musicnotes, Sheet Music Direct, Noteflight, Sheet Music Plus or MuseScore Official Scores (PDF only, and export or adaptation is barred), or bulk Etsy packs.

**Importer heuristics (summary)**
- Sniff content rather than trusting the extension:
  - "MThd" means MIDI.
  - "PK" means .mxl zip.
  - "<?xml" or "<score-partwise" means MusicXML.
  - Your own magic string or JSON key means .nbn.

  Use no `accept` attribute, or a very broad one, so iOS never greys out .kar, .mxl or .nbn files.
- For MIDI and MusicXML, follow the heuristics in section 4.
- Always show a preview before saving: title, first two lyric lines, a "play melody" button, a melody-track picker if confidence is low, and an encoding fix.
- Save only: title, artist, source shop, purchase note, tempo/meter/key, the melody as notes, syllables per note, and line breaks. Discard backing tracks and the original file.
- Use the format's own line markers ("/", "\", CR/LF, end-line) to set the app's "line by line" phrases. Fall back to rests or about 8–12 syllables per line.

**.nbn family transfer**
- Make ".nbn" a small JSON (optionally gzip'd) holding the stored fields plus a format version and "for family use only" text. iOS can't launch the app from it, so the receiving parent saves it in Files and then uses Add from file.
- Make the default **"Move to another family phone"**: send via the share sheet, then after "Did it arrive?" delete it here. Offer "Also keep a copy here" behind the PIN, with a reminder to check the shop's terms.

**Plain-English "How to add a song" (for the grown-up)**
1. **Buy the song.** On the iPhone, open Safari and buy one of these:
   - at **midi.com.au (Hit Trax)**, a song that says **"Karaoke Lyrics"** and lists a **melody guide**;
   - or, with a MuseScore PRO subscription, a **musescore.com** arrangement that shows the words under the singer's notes. Choose **Download → MusicXML**.
2. **Save it to Files.** When Safari asks, tap **Download**. The file goes to **Files → Downloads** (or iCloud Drive → Downloads). If it's a .zip, tap it once in Files to unzip it.
3. **Add it in Note by Note.** Open Note by Note, tap **Grown-ups**, enter your PIN, then tap **Family songs → Add a song from a file** and choose the file.
4. **Check it.** Tap **Play melody** and check that the tune and the words look right. If the tune is wrong, tap **Try another melody track**. If letters look odd, tap **Fix the words**.
5. **Choose the child and save.** The app moves the song into that child's singing range automatically.
6. **To give it to a brother's or sister's phone:** in Family songs, open the song and tap **Move to another family phone**. Send it by AirDrop or Messages to your own family's phone only. On that phone, save the file to Files, then use **Add a song from a file**.
7. **To remove a song:** open Family songs, then the song, then **Delete** (PIN needed).

**Exact in-app notice text**
- On the Add screen: "Only add a song file that you bought or have permission to use. Family songs are saved only on this phone. Note by Note never uploads them, and they are never part of the public app or website."
- On the Send screen: "Only send songs to phones belonging to your own family. Song shops usually allow personal use only, and some don't allow extra copies. Moving the song (not copying it) is the safest choice. Never post song files online or share them outside your family."
- In the Family songs list footer: "These songs are private to your family. They stay on this phone and are never shared by the app."

### Gaps
- What happens when an unknown .nbn file arrives by AirDrop or Messages on an iPhone (whether it goes to Files automatically, and whether the picker shows it as selectable with no `accept`) needs testing on a real device.
- Whether Safari's Web Share can send a file with an unknown extension like .nbn was not confirmed. Sending it as `application/json` may be safer.
- Whether a parent's "personal use" licence covers their own children's phones is not settled by any shop's terms found. A short email to Hit Trax could settle it, and Australian-based support makes that easy.
