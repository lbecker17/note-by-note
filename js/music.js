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
