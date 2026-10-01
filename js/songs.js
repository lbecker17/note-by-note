// Public-domain songs. Melodies are written in a reference key and moved into
// the singer's range when a song is opened.
// Melody: "C4/1" = pitch/beats, "|" bar line, "//" phrase break.
// Lyrics: one token per note. "~" holds the previous syllable over another note,
// "-" joins the next syllable, "=" joins with a visible hyphen.
// Family songs imported from files (js/import.js) use the same format and live only on
// the phone. They may have chords: null (no piano chords, unless a harmonizer is set
// with setHarmonizer) and lyrics: null (sung on "la").

import { parseMelody, parseLyrics, parseChords, chordTones, parsePitch, fitShift } from './music.js';
import { Builder } from './lessons.js';

export const SONGS = [
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    credit: 'Words by Sarah Josepha Hale, 1830',
    key: 'C',
    bpm: 108,
    meter: 4,
    melody: `E4 D4 C4 D4 | E4 E4 E4/2 | D4 D4 D4/2 | E4 G4 G4/2 //
             E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4/4`,
    lyrics: `Ma- ry had a lit- tle lamb, lit- tle lamb, lit- tle lamb,
             Ma- ry had a lit- tle lamb, its fleece was white as snow.`,
    chords: `C/4 | C/4 | G/4 | C/4 | C/4 | C/4 | G/4 | C/4`,
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    credit: 'Words by Jane Taylor, 1806 · French melody, 1761',
    key: 'C',
    bpm: 100,
    meter: 4,
    melody: `C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2 //
             G4 G4 F4 F4 | E4 E4 D4/2 | G4 G4 F4 F4 | E4 E4 D4/2 //
             C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2`,
    lyrics: `Twin- kle, twin- kle, lit- tle star, How I won- der what you are!
             Up a- bove the world so high, Like a dia- mond in the sky.
             Twin- kle, twin- kle, lit- tle star, How I won- der what you are!`,
    chords: `C/4 | F/2 C/2 | F/2 C/2 | G/2 C/2 | C/2 F/2 | C/2 G/2 | C/2 F/2 | C/2 G/2 |
             C/4 | F/2 C/2 | F/2 C/2 | G/2 C/2`,
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    credit: 'Ludwig van Beethoven, 1824 · sung on the note names',
    key: 'C',
    bpm: 108,
    meter: 4,
    melody: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/0.5 D4/2 //
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2 //
             D4 D4 E4 C4 | D4 E4/0.5 F4/0.5 E4 C4 | D4 E4/0.5 F4/0.5 E4 D4 | C4 D4 G3/2 //
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2`,
    lyrics: `mi mi fa sol sol fa mi re do do re mi mi re re
             mi mi fa sol sol fa mi re do do re mi re do do
             re re mi do re mi fa mi do re mi fa mi re do re sol
             mi mi fa sol sol fa mi re do do re mi re do do`,
    chords: `C/4 | C/2 G/2 | C/4 | C/2 G/2 | C/4 | C/2 G/2 | C/4 | G/2 C/2 |
             G/2 C/2 | G/2 C/2 | G/4 | C/2 G/2 | C/4 | C/2 G/2 | C/4 | G/2 C/2`,
  },
  {
    id: 'jacques',
    title: 'Are You Sleeping',
    credit: 'Traditional French round (Frère Jacques)',
    key: 'C',
    bpm: 104,
    meter: 4,
    melody: `C4 D4 E4 C4 | C4 D4 E4 C4 // E4 F4 G4/2 | E4 F4 G4/2 //
             G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 | G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 //
             C4 G3 C4/2 | C4 G3 C4/2`,
    lyrics: `Are you sleep- ing, are you sleep- ing, Bro- ther John, Bro- ther John?
             Morn- ing bells are ring- ing, morn- ing bells are ring- ing,
             Ding, dang, dong. Ding, dang, dong.`,
    chords: `C/4 | C/4 | C/4 | C/4 | C/4 | C/4 | C/2 G/2 | C/4`,
  },
  {
    id: 'row',
    title: 'Row, Row, Row Your Boat',
    credit: 'Traditional, 1852',
    key: 'C',
    bpm: 192,
    meter: 6,
    pulse: 3,
    melody: `C4/3 C4/3 | C4/2 D4/1 E4/3 | E4/2 D4/1 E4/2 F4/1 | G4/6 //
             C5/1 C5/1 C5/1 G4/1 G4/1 G4/1 | E4/1 E4/1 E4/1 C4/1 C4/1 C4/1 | G4/2 F4/1 E4/2 D4/1 | C4/6`,
    lyrics: `Row, row, row your boat, gent- ly down the stream.
             Mer- ri- ly, mer- ri- ly, mer- ri- ly, mer- ri- ly, life is but a dream.`,
    chords: `C/6 | C/6 | C/6 | C/6 | C/6 | C/6 | G/6 | C/6`,
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    credit: 'Mildred and Patty Hill, 1893',
    key: 'C',
    bpm: 96,
    meter: 3,
    melody: `G3/0.75 G3/0.25 | A3 G3 C4 | B3/2 // G3/0.75 G3/0.25 | A3 G3 D4 | C4/2 //
             G3/0.75 G3/0.25 | G4 E4 C4 | B3 A3 // F4/0.75 F4/0.25 | E4 C4 D4 | C4/2`,
    lyrics: `Hap- py birth- day to you, Hap- py birth- day to you,
             Hap- py birth- day dear friend, ~ Hap- py birth- day to you.`,
    chords: `-/1 | C/3 | G/3 | G/3 | C/3 | C/3 | F/3 | C/2 G/1 | C/2`,
  },
  {
    id: 'grace',
    title: 'Amazing Grace',
    credit: 'Words by John Newton, 1779 · tune New Britain, 1829',
    key: 'G',
    bpm: 84,
    meter: 3,
    melody: `D4 | G4/2 B4/0.5 G4/0.5 | B4/2 A4 | G4/2 E4 | D4/2 //
             D4 | G4/2 B4/0.5 G4/0.5 | B4/2 A4 | D5/5 //
             B4 | D5/2 B4/0.5 G4/0.5 | B4/2 A4 | G4/2 E4 | D4/2 //
             D4 | G4/2 B4/0.5 G4/0.5 | B4/2 A4 | G4/5`,
    lyrics: `A- ma- zing ~ grace how sweet the sound
             that saved a ~ wretch like me.
             I once was ~ lost but now am found,
             was blind but ~ now I see.`,
    chords: `-/1 | G/3 | G/3 | C/3 | G/3 | G/3 | G/2 D/1 | D/3 | D/2 G/1 |
             G/3 | G/2 D/1 | C/3 | G/3 | G/3 | G/2 D/1 | G/3 | G/2`,
  },
  {
    id: 'matilda',
    title: 'Waltzing Matilda',
    credit: 'Words by Banjo Paterson, 1895 · music by Marie Cowan, 1903',
    key: 'C',
    bpm: 100,
    meter: 4,
    melody: `C4/0.5 D4/0.5 | E4 E4 D4 D4 | C4/0.5 D4/0.5 E4/0.5 C4/0.5 A3/0.5 B3/0.5 C4 //
             G3 C4/0.5 E4/0.5 G4 G4/0.5 G4/0.5 | G4 F4/0.5 E4/0.5 D4 //
             C4/0.5 D4/0.5 | E4 E4/0.5 E4/0.5 D4 D4 | C4/0.5 D4/0.5 E4/0.5 C4/0.5 A3/0.5 B3/0.5 C4 //
             G3 C4/0.5 E4/0.5 G4 F4/0.5 E4/0.5 | D4 D4/0.5 D4/0.5 C4/2 //
             G4 G4/0.5 G4/0.5 G4 E4 | C5 C5/0.5 C5/0.5 B4 A4 //
             G4 G4/0.5 G4/0.5 A4 G4/0.5 G4/0.5 | G4 F4/0.5 E4/0.5 D4 //
             C4/0.5 D4/0.5 | E4 E4/0.5 E4/0.5 D4 D4 | C4/0.5 D4/0.5 E4/0.5 C4/0.5 A3/0.5 B3/0.5 C4 //
             G3 C4/0.5 E4/0.5 G4 F4/0.5 E4/0.5 | D4 D4/0.5 D4/0.5 C4/2`,
    lyrics: `Once a jol- ly swag- man camped by a ~ bil- la- bong,
             Un- der the shade of a cool- i- bah tree,
             And he sang as he watched and wait- ed till his bil- ly boiled,
             You'll come a= waltz- ing Ma- til- da with me.
             Waltz- ing Ma- til- da, waltz- ing Ma- til- da,
             You'll come a= waltz- ing Ma- til- da with me,
             And he sang as he watched and wait- ed till his bil- ly boiled,
             You'll come a= waltz- ing Ma- til- da with me.`,
    chords: `-/1 | C/2 G/2 | C/2 F/2 | C/4 | G/4 | C/2 G/2 | C/2 F/2 | C/4 | G/2 C/2 |
             C/4 | F/4 | C/2 F/2 | G/4 | C/2 G/2 | C/2 F/2 | C/4 | G/2 C/2`,
  },
];

// Parse once and cache.
const cache = new Map();

// For songs with chords: null. fn(mel, song) returns a chords string or parsed chords
// ([{ root, quality, beat, beats }]); without one those songs play no piano chords.
let harmonizer = null;
export function setHarmonizer(fn) {
  harmonizer = fn;
  cache.clear();
}

export function songData(song) {
  if (cache.has(song.id)) return cache.get(song.id);
  const mel = parseMelody(song.melody);
  const lyr = song.lyrics ? parseLyrics(song.lyrics) : mel.notes.map(() => 'la');
  if (lyr.length !== mel.notes.length) {
    console.warn(`${song.id}: ${mel.notes.length} notes but ${lyr.length} lyric tokens`);
  }
  let chords = [];
  if (song.chords) chords = parseChords(song.chords);
  else if (harmonizer) {
    const h = harmonizer(mel, song);
    chords = typeof h === 'string' ? parseChords(h) : Array.isArray(h) ? h : [];
  }
  let lo = Infinity, hi = -Infinity;
  for (const n of mel.notes) {
    lo = Math.min(lo, n.m);
    hi = Math.max(hi, n.m);
  }
  // Syllables: each note gets the index of the syllable it sings within its phrase.
  mel.phrases.forEach(([s, e], p) => {
    let si = -1;
    for (let i = s; i < e; i++) {
      const tok = lyr[i] || '';
      const n = mel.notes[i];
      n.phrase = p;
      if (tok === '~' && si >= 0) {
        n.si = si;
        n.hold = true;
        continue;
      }
      si++;
      n.si = si;
      if (tok.endsWith('=')) {
        n.text = tok.slice(0, -1) + '-';
        n.join = true;
      } else if (tok.endsWith('-')) {
        n.text = tok.slice(0, -1);
        n.join = true;
      } else {
        n.text = tok;
        n.join = false;
      }
    }
  });
  const data = { mel, chords, lo, hi, span: hi - lo, tonic: parsePitch(song.key + '4') };
  cache.set(song.id, data);
  return data;
}

export function difficulty(song) {
  const { span } = songData(song);
  if (span <= 9) return 'Easy';
  if (span <= 14) return 'Medium';
  return 'Harder';
}

// Chord voicing: bass note plus a close triad sitting just under the melody,
// kept above C3 so low voices don't get a muddy rumble from a phone speaker.
function voiceChord(ch, lowMelody) {
  const tones = chordTones(ch);
  const floor = Math.max(lowMelody - 7, 48);
  let bass = floor - 5;
  while (((bass % 12) + 12) % 12 !== ch.root) bass--;
  if (bass < 36) bass += 12;
  const notes = [bass];
  for (const pcl of tones) {
    let m = floor;
    while (((m % 12) + 12) % 12 !== pcl) m++;
    notes.push(m);
  }
  return notes;
}

export function buildSong(song, range, { mode = 'learn', headphones = false } = {}) {
  const data = songData(song);
  const { mel, chords } = data;
  const shift = fitShift(range, data.lo, data.hi);
  const low = data.lo + shift;
  const b = new Builder(song.bpm);
  const spb = b.spb;
  const phraseCount = mel.phrases.length;

  const chordAudio = (fromBeat, toBeat, startT, hp, vel) => {
    for (const ch of chords) {
      const a = Math.max(ch.beat, fromBeat);
      const z = Math.min(ch.beat + ch.beats, toBeat);
      if (z <= a) continue;
      const moved = { ...ch, root: (((ch.root + shift) % 12) + 12) % 12 };
      for (const m of voiceChord(moved, low)) {
        b.audio.push({ t: startT + (a - fromBeat) * spb, d: (z - a) * spb, kind: 'piano', m, vel, hp });
      }
    }
  };

  const placeNotes = (notes, role, startT, fromBeat) => {
    for (const n of notes) {
      const t = startT + (n.beat - fromBeat) * spb;
      const d = n.beats * spb;
      b.events.push({ t, d, m: n.m + shift, role, phrase: n.phrase, si: n.si, text: n.text, join: n.join, melisma: !!n.hold });
      b.audio.push({ t, d, kind: 'guide', m: n.m + shift, hp: role === 'sing', level: role === 'sing' ? 0.16 : 0.22 });
    }
  };

  const countIn = (beats) => {
    const pulse = song.pulse || 1;
    for (let i = 0; i < beats; i += pulse) b.audio.push({ t: b.t + i * spb, kind: 'click', accent: i === 0 });
    b.t += beats * spb;
  };

  if (mode === 'learn') {
    mel.phrases.forEach(([s, e], p) => {
      const notes = mel.notes.slice(s, e);
      const from = notes[0].beat;
      const last = notes[notes.length - 1];
      const to = last.beat + last.beats;
      b.cue(`Line ${p + 1} of ${phraseCount}`);
      const listenAt = b.t;
      placeNotes(notes, 'listen', listenAt, from);
      chordAudio(from, to, listenAt, false, 0.05);
      b.t += (to - from) * spb;
      // A breath, with ticks that set up the beat for your turn.
      const pulse = song.pulse || 1;
      const gap = Math.max(2, pulse * 2);
      for (let i = 0; i < gap; i += pulse) b.audio.push({ t: b.t + i * spb, kind: 'click', accent: i === 0 });
      b.t += gap * spb;
      const singAt = b.t;
      placeNotes(notes, 'sing', singAt, from);
      chordAudio(from, to, singAt, true, 0.05);
      b.t += (to - from) * spb + 1.5 * spb;
    });
  } else {
    countIn(song.meter);
    const start = b.t;
    placeNotes(mel.notes, 'sing', start, 0);
    // Without headphones the piano stays soft so the mic hears you, not the speaker.
    chordAudio(0, mel.totalBeats, start, false, headphones ? 0.07 : 0.035);
    mel.phrases.forEach(([s], p) => b.cues.push({ t: start + mel.notes[s].beat * spb - 0.01, text: `Line ${p + 1} of ${phraseCount}` }));
    b.t = start + mel.totalBeats * spb + 1;
  }

  const step = b.build({
    title: song.title,
    tonic: data.tonic + shift,
    vowel: null,
    song: true,
    mode,
    phrases: phraseCount,
    intro:
      mode === 'learn'
        ? 'Line by line: hear each line, then sing it back.'
        : headphones
          ? 'Sing the whole song with the piano and the guide melody.'
          : 'Sing the whole song with a soft piano. Headphones let you hear the melody too.',
  });
  return [step];
}

// Contour of the first line, for the song's little picture in the list.
export function songGlyph(song) {
  const { mel } = songData(song);
  const [s, e] = mel.phrases[0];
  const pts = mel.notes.slice(s, Math.min(e, s + 9)).map((n) => n.m - mel.notes[s].m);
  return { type: 'dots', pts, tonic: 0, songTonicOffset: mel.notes[s].m - parsePitch(song.key + '4') };
}
