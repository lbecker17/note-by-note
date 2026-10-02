// Notes, keys, melodies and transposition.

const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1]); // F, B♭, E♭, A♭, D♭

// Movable-do syllables by semitone above the tonic
const SOLFA = ['do', 'di', 're', 'me', 'mi', 'fa', 'fi', 'sol', 'le', 'la', 'te', 'ti'];
// Colour family for each semitone: altered notes share the colour of the note they alter
export const DEGREE_FAMILY = ['do', 'do', 're', 'mi', 'mi', 'fa', 'fa', 'sol', 'la', 'la', 'ti', 'ti'];

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export const pc = (m) => ((Math.round(m) % 12) + 12) % 12;

export function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function prefersFlats(tonic, minor = false) {
  return FLAT_MAJOR_KEYS.has(pc(tonic + (minor ? 3 : 0)));
}

export function letterName(m, { flats = false, octave = true } = {}) {
  const r = Math.round(m);
  const name = (flats ? FLAT : SHARP)[pc(r)];
  return octave ? name + (Math.floor(r / 12) - 1) : name;
}

export function solfa(m, tonic) {
  return SOLFA[pc(Math.round(m) - tonic)];
}

export function family(m, tonic) {
  return DEGREE_FAMILY[pc(Math.round(m) - tonic)];
}

// Label a note for display, following the user's naming setting.
export function label(m, { tonic = null, flats = false, names = 'letters', octave = true } = {}) {
  if (names === 'solfa' && tonic != null) return solfa(m, tonic);
  return letterName(m, { flats, octave });
}

// "C4", "F#3", "Bb4" -> MIDI number
export function parsePitch(s) {
  const mt = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/.exec(s);
  if (!mt) throw new Error('Bad pitch ' + s);
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[mt[1].toLowerCase()];
  const acc = mt[2] === '#' || mt[2] === '♯' ? 1 : mt[2] === 'b' || mt[2] === '♭' ? -1 : 0;
  return (Number(mt[3]) + 1) * 12 + base + acc;
}

// Melody text: "C4/1 D4/0.5 r/1 | E4/2 // G4". Durations are in beats (default 1).
// "|" is a bar line (ignored), "//" starts a new phrase.
export function parseMelody(src) {
  const notes = [];
  const phraseStarts = [0];
  let beat = 0;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '|') continue;
    if (tok === '//') {
      if (notes.length && phraseStarts[phraseStarts.length - 1] !== notes.length) phraseStarts.push(notes.length);
      continue;
    }
    const [p, d] = tok.split('/');
    const beats = d ? Number(d) : 1;
    if (p === 'r') {
      beat += beats;
      continue;
    }
    notes.push({ m: parsePitch(p), beat, beats });
    beat += beats;
  }
  // A "//" after the last note starts no phrase.
  if (phraseStarts.length > 1 && phraseStarts[phraseStarts.length - 1] === notes.length) phraseStarts.pop();
  const phrases = phraseStarts.map((s, i) => [s, i + 1 < phraseStarts.length ? phraseStarts[i + 1] : notes.length]);
  return { notes, phrases, totalBeats: beat };
}

// Lyrics: one token per note. "~" continues the previous syllable,
// a trailing "-" joins to the next syllable.
export function parseLyrics(src) {
  return src.trim().split(/\s+/);
}

// A blank line in the words starts a new verse or section (imported songs mark karaoke
// paragraphs and sheet-music sections this way). Returns the indexes of the phrases
// (mel.phrases) that start one, not counting the first.
export function paraStarts(src, phrases) {
  const out = new Set();
  if (!src) return out;
  const blocks = src.trim().split(/\r?\n[ \t\r]*\n/);
  if (blocks.length < 2) return out;
  const at = new Map(phrases.map(([s], p) => [s, p]));
  let count = 0;
  for (let k = 0; k < blocks.length - 1; k++) {
    if (!blocks[k].trim()) continue;
    count += parseLyrics(blocks[k]).length;
    const p = at.get(count);
    if (p > 0) out.add(p);
  }
  return out;
}

// Chords: "C/4 G/2 Am/2". Returns [{root, quality, beat, beats}]
export function parseChords(src) {
  const out = [];
  let beat = 0;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [sym, d] = tok.split('/');
    const beats = d ? Number(d) : 1;
    if (sym !== '-' && sym !== 'r') {
      const mt = /^([A-G])([#b]?)(m|7|m7|maj7)?$/.exec(sym);
      if (!mt) throw new Error('Bad chord ' + sym);
      const root = parsePitch(mt[1] + (mt[2] || '') + '4') % 12;
      out.push({ root, quality: mt[3] || '', beat, beats });
    }
    beat += beats;
  }
  return out;
}

export function chordTones(ch) {
  const third = ch.quality.startsWith('m') && ch.quality !== 'maj7' ? 3 : 4;
  const tones = [0, third, 7];
  if (ch.quality === '7' || ch.quality === 'm7') tones.push(10);
  if (ch.quality === 'maj7') tones.push(11);
  return tones.map((t) => (ch.root + t) % 12);
}

// Choose a tonic so notes at offsets lo..hi above it sit inside the range, centred.
export function fitTonic(range, lo, hi) {
  const minT = range.low - lo;
  const maxT = range.high - hi;
  return Math.round((minT + maxT) / 2);
}

// Tonics climbing by semitone that keep the pattern inside the range.
export function keyLadder(range, lo, hi, count) {
  const minT = range.low - lo;
  const maxT = range.high - hi;
  if (maxT < minT) return [Math.round((minT + maxT) / 2)];
  const n = Math.min(count, maxT - minT + 1);
  const start = minT + Math.floor((maxT - minT + 1 - n) / 2);
  return Array.from({ length: n }, (_, i) => start + i);
}

// Semitone shift that centres a melody (lowest..highest) in the singer's range.
export function fitShift(range, low, high) {
  const want = (range.low + range.high) / 2;
  const have = (low + high) / 2;
  return Math.round(want - have);
}

// ---------- Tempo changes ----------
// A song plays at song.bpm, and a family song can change tempo on the way: song.tempos is
// "136:118 276:124" (from beat 136 at 118 beats a minute, from beat 276 at 124...), in the
// song's own beats. Returns the changes, in order, after beat 0.
export function parseTempos(src) {
  const out = [];
  if (typeof src !== 'string') return out;
  for (const tok of src.trim().split(/\s+/)) {
    if (!tok) continue;
    const [b, t] = tok.split(':').map(Number);
    if (!(b > 0) || !(t > 0) || !Number.isFinite(b) || !Number.isFinite(t)) continue;
    if (out.length && b <= out[out.length - 1].beat) continue;
    out.push({ beat: b, bpm: t });
  }
  return out;
}

// Seconds from beat 0 to a beat, and the tempo at a beat, for a song (its bpm and tempos).
export function tempoMap(song) {
  const segs = [{ beat: 0, bpm: song.bpm, sec: 0 }];
  for (const c of parseTempos(song.tempos)) {
    const p = segs[segs.length - 1];
    segs.push({ beat: c.beat, bpm: c.bpm, sec: p.sec + ((c.beat - p.beat) * 60) / p.bpm });
  }
  const seg = (beat) => {
    let k = segs.length - 1;
    while (k > 0 && segs[k].beat > beat + 1e-9) k--;
    return segs[k];
  };
  const lo = Math.min(...segs.map((s) => s.bpm));
  const hi = Math.max(...segs.map((s) => s.bpm));
  return {
    changes: segs.length > 1,
    lo,
    hi,
    bpmAt: (beat) => seg(beat).bpm,
    sec(beat) {
      if (beat <= 0) return (beat * 60) / song.bpm;
      const s = seg(beat);
      return s.sec + ((beat - s.beat) * 60) / s.bpm;
    },
  };
}

// ---------- Notes with no words of their own ----------
// In a song's words "~" holds the previous syllable over another note (a melisma). Sheet music
// and karaoke files also have notes with no words that a singer doesn't sing: an instrumental
// riff in the tune's part, or a piano's accompaniment note in a rest of the tune. A run of "~"
// notes is sung only when it is
// - short (at most 4 notes and 2 quarter notes long) and singable: no leap over a fifth, and at
//   most one leap over a minor third, or
// - a longer melisma that moves by step (nearly all moves of 2 semitones or less, none over a
//   fourth), up to 24 notes and 4 bars of 4/4,
// and in both cases stays within 4 semitones of the line's sung notes. Others are not sung.
// notes: [{ m, beat, beats, hold }] (hold: no words of its own), phrases: [[start, end), ...],
// quarter: quarter notes in a beat (0.5 in a 6/8 song counted in eighths).
// Returns a Set of the note indexes not to sing (a line that loses all its notes is gone).
export const MELISMA = { shortNotes: 4, shortQuarters: 2, longNotes: 24, longQuarters: 16, range: 4 };
export function unsungHolds(notes, phrases, quarter = 1) {
  const out = new Set();
  // The range of each line's sung notes, and the line of each note.
  const lineOf = new Int32Array(notes.length);
  const ranges = phrases.map(([s, e], p) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = s; i < e; i++) {
      lineOf[i] = p;
      if (notes[i].hold) continue;
      lo = Math.min(lo, notes[i].m);
      hi = Math.max(hi, notes[i].m);
    }
    return [lo, hi];
  });
  for (let i = 0; i < notes.length; i++) {
    if (!notes[i].hold) continue;
    let j = i;
    while (j < notes.length && notes[j].hold) j++;
    // The run holds the syllable before it, and is measured against that syllable's line (a
    // hold can carry on over a line break).
    const [lo, hi] = i > 0 ? ranges[lineOf[i - 1]] : [Infinity, -Infinity];
    if (i === 0 || !melismaOk(notes, i, j, lo, hi, quarter)) for (let k = i; k < j; k++) out.add(k);
    i = j - 1;
  }
  return out;
}

function melismaOk(notes, i, j, lo, hi, quarter) {
  const M = MELISMA;
  const count = j - i;
  const quarters = (notes[j - 1].beat + notes[j - 1].beats - notes[i].beat) * quarter;
  const moves = [];
  for (let k = i; k < j; k++) moves.push(Math.abs(notes[k].m - notes[k - 1].m));
  for (let k = i; k < j; k++) if (notes[k].m < lo - M.range || notes[k].m > hi + M.range) return false;
  const big = Math.max(...moves);
  if (count <= M.shortNotes && quarters <= M.shortQuarters + 1e-6) {
    if (big <= 7 && moves.filter((x) => x > 3).length <= 1) return true;
  }
  if (count <= M.longNotes && quarters <= M.longQuarters + 1e-6 && big <= 5) {
    return moves.filter((x) => x <= 2).length >= 0.85 * moves.length;
  }
  return false;
}
