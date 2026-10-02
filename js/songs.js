// Public-domain songs. Melodies are written in a reference key and moved into
// the singer's range when a song is opened.
// Melody: "C4/1" = pitch/beats, "|" bar line, "//" phrase break.
// Lyrics: one token per note. "~" holds the previous syllable over another note,
// "-" joins the next syllable, "=" joins with a visible hyphen.
// Family songs imported from files (js/import.js) use the same format and live only on
// the phone. They may have chords: null (no piano chords, unless a harmonizer is set
// with setHarmonizer) and lyrics: null (sung on "la").

import { parseMelody, parseLyrics, parseChords, chordTones, parsePitch, fitShift, paraStarts } from './music.js';
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
  const data = { mel, lyr, chords, lo, hi, span: hi - lo, tonic: parsePitch(song.key + '4') };
  cache.set(song.id, data);
  return data;
}

// ---------- Learning chunks (line by line) ----------
// A song's lines can be short (karaoke files often break every few words), and stopping there
// cuts a sentence in half. Line by line groups whole lines into chunks that end where a singer
// would naturally pause: the end of a sentence or clause (. ! ? , ;), a rest or a held note of
// about a beat or more, or a new verse. Chunks aim for about 4 to 10 seconds and 6 to 16
// syllables; a chunk never ends inside a word or on a pickup note leading into the next line,
// and a line that is long on its own stays as it is. The built-in songs' lines are already
// chunk-sized, so they come out unchanged.
export const CHUNK = { minSecs: 4, maxSecs: 10, minSyl: 6, maxSyl: 16 };

const END_STOP = /[.!?]["'’”»)\]]*$/;
const END_PAUSE = /[,;]["'’”»)\]]*$/;
const END_COLON = /[:—–]["'’”»)\]]*$/;

// For each line of the song: where it starts and ends (beats), its syllables, and how good a
// place its end is to stop: { natural, bonus, never }.
function lineEnds(song, data) {
  const { mel, lyr } = data;
  const beat = song.pulse || 1;
  const paras = paraStarts(song.lyrics, mel.phrases);
  const P = mel.phrases.length;
  // The last syllable sung in a line (skipping "~" holds), and its lyric token.
  const lastSyl = ([s, e]) => {
    let k = e - 1;
    while (k > s && mel.notes[k].hold) k--;
    return k;
  };
  const tokAt = (k) => (song.lyrics ? String(lyr[k] || '') : '');
  // Words that mark their sentences: there, a line ending with no punctuation is more likely
  // mid-sentence, so a rest or held note alone is a weaker place to stop (but still a natural one).
  const marked = mel.phrases.filter((ph) => END_STOP.test(tokAt(lastSyl(ph))) || END_PAUSE.test(tokAt(lastSyl(ph)))).length;
  const punctuated = marked >= Math.max(2, 0.3 * P);
  return mel.phrases.map(([s, e], p) => {
    const notes = mel.notes.slice(s, e);
    const last = notes[notes.length - 1];
    const a = notes[0].beat;
    const z = last.beat + last.beats;
    const syl = notes.filter((n) => !n.hold).length;
    const info = { a, z, syl, natural: true, bonus: 0, never: false };
    if (p === P - 1) return info;
    // The last syllable sung, and how long it lasts (with any "~" holds).
    const k = lastSyl([s, e]);
    const tok = tokAt(k);
    const held = z - mel.notes[k].beat;
    const gap = mel.notes[e].beat - z;
    const nextHold = mel.notes[e].hold;
    // A word that carries on into the next line ("sun- / shine", or a "~" hold over the break).
    if (/[-=]$/.test(tok) || nextHold) {
      info.never = true;
      info.natural = false;
      return info;
    }
    let bonus = 0;
    let natural = false;
    const add = (b, nat = false) => {
      bonus += b;
      if (nat) natural = true;
    };
    const stop = END_STOP.test(tok) || END_PAUSE.test(tok);
    if (END_STOP.test(tok)) add(4, true);
    else if (END_PAUSE.test(tok)) add(3, true);
    else if (END_COLON.test(tok)) add(2);
    const w = punctuated && !stop ? 0.5 : 1;
    if (gap >= 2 * beat - 1e-6) add(5 * w, true);
    else if (gap >= 0.9 * beat) add(4 * w, true);
    else if (gap >= 0.45 * beat) add(1.5 * w);
    if (held >= 1.5 * beat - 1e-6) add(3 * w, true);
    else if (held >= beat - 1e-6) add(1 * w);
    if (paras.has(p + 1)) add(6, true);
    // A short note running straight into the next line, with nothing to say it ends: a pickup.
    const pickup = !natural && last.beats < 0.75 * beat && gap < 0.45 * beat;
    info.natural = natural;
    info.bonus = natural ? bonus - (w < 1 ? 1.5 : 0) : bonus - (pickup ? 12 : 4);
    return info;
  });
}

// lines: from lineEnds. spb: seconds per beat. Returns [[firstLine, lastLine], ...] (inclusive),
// chosen to cost least: every chunk costs a little, too short or too long costs more, and each
// place a chunk ends earns its bonus (or pays for a poor place to stop).
export function chunkLines(lines, spb) {
  const n = lines.length;
  const C = CHUNK;
  const cost = (i, j) => {
    const secs = (lines[j].z - lines[i].a) * spb;
    let syl = 0;
    for (let k = i; k <= j; k++) syl += lines[k].syl;
    let c = 1;
    if (secs < C.minSecs) c += (C.minSecs - secs) * 2.5;
    if (secs < 1.5) c += 8;
    if (syl < C.minSyl) c += (C.minSyl - syl) * 0.6;
    if (j > i) {
      // Only lines put together can be too long: a long line on its own stays as it is.
      if (secs > C.maxSecs) c += (secs - C.maxSecs) * 1.5;
      if (syl > C.maxSyl) c += (syl - C.maxSyl) * 0.25;
      if (secs > 2 * C.maxSecs) c += 40;
    }
    return c;
  };
  const best = new Float64Array(n + 1).fill(Infinity);
  const from = new Int32Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    // A chunk can end after line j-1 unless the word carries on (the last line always can).
    if (j < n && lines[j - 1].never) continue;
    const endBonus = j < n ? lines[j - 1].bonus : 0;
    for (let i = j - 1; i >= 0 && j - i <= 24; i--) {
      if (best[i] === Infinity) continue;
      const v = best[i] + cost(i, j - 1) - endBonus;
      if (v < best[j]) {
        best[j] = v;
        from[j] = i;
      }
    }
  }
  if (best[n] === Infinity) return [[0, n - 1]];
  const out = [];
  for (let j = n; j > 0; j = from[j]) out.push([from[j], j - 1]);
  return out.reverse();
}

// The song's learning chunks as note ranges [[start, end), ...] (like mel.phrases).
export function learnChunks(song) {
  const data = songData(song);
  if (data.chunks) return data.chunks;
  const { mel } = data;
  const lines = lineEnds(song, data);
  data.chunks = chunkLines(lines, 60 / song.bpm).map(([i, j]) => [mel.phrases[i][0], mel.phrases[j][1]]);
  return data.chunks;
}

// ---------- Speed ----------
// The child picks how fast to sing a song: Slow, Steady or Normal (the song's own tempo).
export const SPEEDS = { slow: 0.75, steady: 0.9, normal: 1 };
export const SPEED_LABEL = { slow: 'Slow', steady: 'Steady', normal: 'Normal' };
// Quick songs start at Steady. The pulse counts: "Row, Row" at 192 eighths is 64 dotted beats.
export function defaultSpeed(song) {
  return song.bpm / (song.pulse || 1) > 110 ? 'steady' : 'normal';
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

// ---------- Backing for singing without headphones ----------
// The phone's speaker and mic are a hand's width apart, so whatever the backing plays, the mic
// hears too. A note at the pitch the child should be singing (or that pitch in another octave)
// would be read as their voice and scored. So each backing note leaves out the pitch class of
// every melody note it overlaps, and the backing sits under the melody, played softly.
const pcOf = (m) => ((Math.round(m) % 12) + 12) % 12;

// avoid: a Set of pitch classes to leave out. low: the lowest melody note (MIDI) as sung.
// Returns { bass, chord }: a bass note (MIDI, or null if every chord tone is to be avoided) and the
// chord tones still allowed, as a close voicing just under the melody. For a low voice the chords
// stay at E3 or above (lower is a rumble on a phone), so they can reach into the melody's range,
// but never onto the sung note's pitch class.
export function backingVoicing(ch, avoid, low) {
  const tones = chordTones(ch);
  const top = Math.max(low - 1, 52);
  const place = (pc, hi) => {
    let m = hi;
    while (pcOf(m) !== pc) m--;
    return m;
  };
  const chord = tones.filter((pc) => !avoid.has(pc)).map((pc) => place(pc, top)).sort((a, b) => a - b);
  // Root, else the fifth, else the third.
  const bassPc = [tones[0], tones[2], tones[1]].find((pc) => !avoid.has(pc));
  let bass = bassPc == null ? null : place(bassPc, top - 12);
  if (bass != null && bass < 36) bass += 12;
  return { bass, chord };
}

// speed: a share of the song's tempo (SPEEDS); everything (notes, backing, count-in, the lane and
// the scoring) follows it, since they all work from the same times.
export function buildSong(song, range, { mode = 'learn', headphones = false, speed = 1 } = {}) {
  const data = songData(song);
  const { mel, chords } = data;
  const shift = fitShift(range, data.lo, data.hi);
  const low = data.lo + shift;
  const b = new Builder(song.bpm * speed);
  const spb = b.spb;
  const phraseCount = mel.phrases.length;
  const pulse = song.pulse || 1;

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

  // Pitch classes of the sung notes sounding between t0 and t1 (a little after, for the piano's ring).
  const sungPcs = (t0, t1) => {
    const out = new Set();
    for (const ev of b.events) if (ev.role === 'sing' && ev.t < t1 + 0.15 && ev.t + ev.d > t0) out.add(pcOf(ev.m));
    return out;
  };

  // Without headphones: a soft bass note on the strong beats and a chord on every beat (every
  // dotted beat in 6/8), each leaving out whatever the child is singing at that moment.
  // nohp: skipped if headphones are switched on mid-run (then the guide and the full chords play).
  const backing = (fromBeat, toBeat, startT) => {
    const bassEvery = song.meter >= 4 && song.meter % 2 === 0 ? song.meter / 2 : song.meter;
    for (const ch of chords) {
      const moved = { ...ch, root: (((ch.root + shift) % 12) + 12) % 12 };
      for (let x = ch.beat; x < ch.beat + ch.beats - 1e-6; x += pulse) {
        if (x < fromBeat - 1e-6 || x >= toBeat - 1e-6) continue;
        const end = Math.min(ch.beat + ch.beats, toBeat);
        const t = startT + (x - fromBeat) * spb;
        const d = Math.min(pulse, end - x) * spb * 0.9;
        for (const m of backingVoicing(moved, sungPcs(t, t + d), low).chord) {
          b.audio.push({ t, d, kind: 'piano', m, vel: 0.028, nohp: true, backing: true });
        }
        if (Math.abs((x - ch.beat) % bassEvery) < 1e-6) {
          const bd = Math.min(bassEvery, end - x) * spb * 0.9;
          const { bass } = backingVoicing(moved, sungPcs(t, t + bd), low);
          if (bass != null) b.audio.push({ t, d: bd, kind: 'piano', m: bass, vel: 0.05, nohp: true, backing: true });
        }
      }
    }
  };

  // part: the line (or learning chunk) a note belongs to, for the words on screen and the
  // progress strip. Syllables are numbered within it.
  const placeNotes = (notes, role, startT, fromBeat, partOf) => {
    let part = -1;
    let si = -1;
    for (const n of notes) {
      const p = partOf(n);
      if (p !== part) {
        part = p;
        si = -1;
      }
      if (!n.hold || si < 0) si++;
      const t = startT + (n.beat - fromBeat) * spb;
      const d = n.beats * spb;
      b.events.push({ t, d, m: n.m + shift, role, phrase: p, si, text: n.text, join: n.join, melisma: !!n.hold });
      b.audio.push({ t, d, kind: 'guide', m: n.m + shift, hp: role === 'sing', level: role === 'sing' ? 0.16 : 0.22 });
    }
  };
  const byLine = (n) => n.phrase;

  // One count-in, at the very start.
  const countIn = (beats) => {
    for (let i = 0; i < beats; i += pulse) b.audio.push({ t: b.t + i * spb, kind: 'click', accent: i === 0 });
    b.t += beats * spb;
  };

  let parts = phraseCount;
  if (mode === 'learn') {
    const chunks = learnChunks(song);
    parts = chunks.length;
    chunks.forEach(([s, e], p) => {
      const notes = mel.notes.slice(s, e);
      const from = notes[0].beat;
      const last = notes[notes.length - 1];
      const to = last.beat + last.beats;
      b.cue(`Line ${p + 1} of ${parts}`);
      const listenAt = b.t;
      placeNotes(notes, 'listen', listenAt, from, () => p);
      chordAudio(from, to, listenAt, false, 0.05);
      b.t += (to - from) * spb;
      // A breath, with ticks that set up the beat for your turn.
      const gap = Math.max(2, pulse * 2);
      for (let i = 0; i < gap; i += pulse) b.audio.push({ t: b.t + i * spb, kind: 'click', accent: i === 0 });
      b.t += gap * spb;
      const singAt = b.t;
      placeNotes(notes, 'sing', singAt, from, () => p);
      chordAudio(from, to, singAt, true, 0.05);
      b.t += (to - from) * spb + 1.5 * spb;
    });
  } else {
    // Sing it through: the whole song in its own time, after one count-in.
    countIn(song.meter);
    const start = b.t;
    placeNotes(mel.notes, 'sing', start, 0, byLine);
    mel.phrases.forEach(([s], p) => b.cues.push({ t: start + mel.notes[s].beat * spb - 0.01, text: `Line ${p + 1} of ${phraseCount}` }));
    if (headphones) {
      // hp: if headphones are switched off mid-run these stop too (they can hold the sung note).
      chordAudio(0, mel.totalBeats, start, true, 0.07);
    } else {
      backing(0, mel.totalBeats, start);
      lineCues(start);
    }
    b.t = start + mel.totalBeats * spb + 1;
  }

  // Without headphones, a line that starts after a real rest (a beat or more, and long enough in
  // seconds) gets its first note played very softly in that rest, to help find it: no ticks, and
  // it ends well before the line (and after the last line's note has died away).
  function lineCues(start) {
    for (let p = 1; p < phraseCount; p++) {
      const s = mel.phrases[p][0];
      const prev = mel.notes[s - 1];
      const restBeats = mel.notes[s].beat - (prev.beat + prev.beats);
      if (restBeats < pulse - 1e-6) continue;
      const t0 = start + (prev.beat + prev.beats) * spb + 0.2;
      const t1 = start + mel.notes[s].beat * spb - 0.45;
      const d = Math.min(0.5, t1 - t0);
      if (d < 0.25) continue;
      b.audio.push({ t: t0, d, kind: 'guide', m: mel.notes[s].m + shift, level: 0.08, nohp: true, cue: true });
    }
  }

  const step = b.build({
    title: song.title,
    tonic: data.tonic + shift,
    vowel: null,
    song: true,
    mode,
    speed,
    phrases: parts,
    intro:
      mode === 'learn'
        ? 'Line by line: hear each part, then sing it back.'
        : headphones
          ? 'Sing the whole song with the piano and the guide melody.'
          : 'Sing the whole song with a soft piano.',
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
