// Lesson content. Each lesson builds one or more "steps" in the singer's own key.
// A step is a timeline of events: "listen" notes the app plays, "sing" notes you sing.

import { fitTonic, keyLadder } from './music.js';

export class Builder {
  constructor(bpm = 90) {
    this.bpm = bpm;
    this.t = 0;
    this.events = [];
    this.audio = [];
    this.cues = [];
    this.tonic = null;
  }
  get spb() {
    return 60 / this.bpm;
  }
  sec(beats) {
    return beats * this.spb;
  }
  rest(beats) {
    this.t += this.sec(beats);
    return this;
  }
  cue(text) {
    this.cues.push({ t: this.t, text });
    return this;
  }
  // Exercises that climb through keys set the key before each round, and every note
  // after that carries it, so names, colours and do-re-mi follow the key change.
  key(tonic) {
    this.tonic = tonic;
    return this;
  }
  note(role, m, beats, extra = {}) {
    const d = this.sec(beats);
    this.events.push({ t: this.t, d, m, role, tonic: this.tonic, ...extra });
    // Sing notes only sound when the singer wears headphones (hp), so the mic never hears the guide.
    this.audio.push({ t: this.t, d, kind: 'guide', m, hp: role === 'sing' });
    this.t += d;
    return this;
  }
  listen(m, beats, extra) {
    return this.note('listen', m, beats, extra);
  }
  sing(m, beats, extra) {
    return this.note('sing', m, beats, extra);
  }
  glide(role, m1, m2, beats, extra = {}) {
    const d = this.sec(beats);
    this.events.push({ t: this.t, d, m: m1, m2, role, tonic: this.tonic, ...extra });
    this.audio.push({ t: this.t, d, kind: 'glide', m: m1, m2, hp: role === 'sing' });
    this.t += d;
    return this;
  }
  click(accent = false, offsetBeats = 0) {
    this.audio.push({ t: this.t + this.sec(offsetBeats), kind: 'click', accent });
    return this;
  }
  chord(ms, beats, vel = 0.07, hp = false, offsetBeats = 0) {
    const d = this.sec(beats);
    for (const m of ms) this.audio.push({ t: this.t + this.sec(offsetBeats), d, kind: 'piano', m, vel, hp });
    return this;
  }
  build(meta) {
    this.audio.sort((a, b) => a.t - b.t);
    return { ...meta, bpm: this.bpm, events: this.events, audio: this.audio, cues: this.cues, end: this.t };
  }
}

const QUOTE = (v) => `“${v}”`;

function pattern(T, degrees, last = 2) {
  return degrees.map((d, i) => ({ m: T + d, beats: i === degrees.length - 1 ? last : 1 }));
}

// Hear it, a beat to breathe (with a tick), then sing it back.
function echo(b, notes, { gap = 1, after = 1.5, chord = null } = {}) {
  const len = notes.reduce((s, n) => s + n.beats, 0);
  if (chord) b.chord(chord, len, 0.05);
  for (const n of notes) b.listen(n.m, n.beats);
  b.click(true);
  b.rest(gap);
  if (chord) b.chord(chord, len, 0.05, true);
  for (const n of notes) b.sing(n.m, n.beats);
  b.rest(after);
}

const triad = (T, minor = false) => [T - 12, T - 12 + (minor ? 3 : 4), T - 12 + 7];

// ---------- Step builders (shared by lessons and the daily warmup) ----------

function matchStep(range, degrees = [0, 4, 7, 2, 5, 9]) {
  const T = fitTonic(range, 0, 9);
  const b = new Builder(60);
  degrees.forEach((d, i) => {
    b.cue(`Note ${i + 1} of ${degrees.length}`);
    b.listen(T + d, 2);
    b.click(true);
    b.rest(1);
    b.sing(T + d, 3);
    b.rest(1.5);
  });
  return b.build({
    title: 'Match a note',
    vowel: 'ah',
    tonic: T,
    intro: `You’ll hear a note. When its bar reaches the line, sing it back on ${QUOTE('ah')}.`,
  });
}

function holdStep(range, holds, { vowel = 'ah', title = 'Hold it steady' } = {}) {
  const T = fitTonic(range, 0, 4);
  const b = new Builder(60);
  holds.forEach(([deg, secs], i) => {
    b.cue(`${secs} seconds · ${i + 1} of ${holds.length}`);
    b.listen(T + deg, 1.5);
    b.click(true);
    b.rest(1);
    b.sing(T + deg, secs, { hold: true });
    b.rest(2);
  });
  return b.build({
    title,
    vowel,
    tonic: T,
    intro: `Breathe in low, then hold each note on ${QUOTE(vowel)}. Keep the line flat and level to the end.`,
  });
}

function patternStep(range, { title, degrees, patterns, keys = 3, bpm = 90, vowel = 'ah', minor = false, span, last = 2, intro }) {
  const pats = patterns || [degrees];
  const hi = span != null ? span : Math.max(...pats.flat());
  const lo = Math.min(0, ...pats.flat());
  const tonics = keyLadder(range, lo, hi, keys);
  const b = new Builder(bpm);
  tonics.forEach((T, k) => {
    b.key(T).cue(tonics.length > 1 ? `Key ${k + 1} of ${tonics.length}` : '');
    for (const p of pats) echo(b, pattern(T, p, last), { chord: triad(T, minor) });
  });
  return b.build({ title, vowel, tonic: tonics[0], minor, intro });
}

function sirenStep(range, rounds = 3, { title = 'Sirens' } = {}) {
  const b = new Builder(60);
  const mid = (range.low + range.high) / 2;
  const half = Math.max(3, (range.high - range.low) / 2 - 1);
  for (let r = 0; r < rounds; r++) {
    const w = rounds === 1 ? half : half * (0.55 + (0.45 * r) / (rounds - 1));
    const a = Math.round(mid - w);
    const z = Math.round(mid + w);
    b.cue(`Slide ${r + 1} of ${rounds}`);
    b.glide('listen', a, z, 2);
    b.glide('listen', z, a, 2);
    b.click(true);
    b.rest(1);
    b.glide('sing', a, z, 2);
    b.glide('sing', z, a, 2);
    b.rest(1.5);
  }
  return b.build({
    title,
    vowel: 'ng',
    tonic: Math.round(mid - half),
    intro: `Slide smoothly up and down like a siren. Hum on ${QUOTE('ng')} or do a lip trill. No breaks in the sound.`,
  });
}

function staccatoStep(range, keys = 3) {
  const b = new Builder(100);
  const tonics = keyLadder(range, 0, 7, keys);
  tonics.forEach((T, k) => {
    b.key(T).cue(`Key ${k + 1} of ${tonics.length}`);
    const degs = [0, 4, 7, 4, 0];
    for (const d of degs) {
      b.listen(T + d, 0.5);
      b.rest(0.5);
    }
    b.click(true);
    b.rest(1);
    for (const d of degs) {
      b.sing(T + d, 0.5);
      b.rest(0.5);
    }
    b.rest(1.5);
  });
  return b.build({
    title: 'Short and sharp',
    vowel: 'ha',
    tonic: tonics[0],
    intro: `Short, bouncy notes on ${QUOTE('ha')}. Let your belly kick each one out, then stop cleanly.`,
  });
}

// A new little tune every time: listen, then echo it.
function echoGameStep(range, rounds = 8) {
  const T = fitTonic(range, 0, 9);
  const pool = [0, 2, 4, 7, 9];
  const b = new Builder(84);
  for (let r = 0; r < rounds; r++) {
    const len = r < 4 ? 3 : 4;
    const degs = [pool[Math.random() < 0.6 ? 0 : 2 + Math.floor(Math.random() * 2)]];
    while (degs.length < len) {
      const prev = degs[degs.length - 1];
      const options = pool.filter((p) => p !== prev && Math.abs(p - prev) <= 5);
      degs.push(options[Math.floor(Math.random() * options.length)]);
    }
    b.cue(`Tune ${r + 1} of ${rounds}`);
    echo(b, pattern(T, degs, 2), { chord: triad(T) });
  }
  return b.build({
    title: 'Echo game',
    vowel: 'la',
    tonic: T,
    intro: `Short new tunes every time. Listen, then echo each one on ${QUOTE('la')}.`,
  });
}

// ---------- Lessons ----------

export const LESSONS = {
  range: {
    id: 'range',
    title: 'Find your range',
    blurb: 'Sing a low note and a high note. Every lesson then moves into your key.',
    glyph: { type: 'range' },
    special: 'range',
  },
  match: {
    id: 'match',
    title: 'Match a note',
    blurb: 'Hear a note, then sing it back.',
    glyph: { type: 'dots', pts: [0, 4, 7, 2] , separate: true },
    build: (range) => [matchStep(range)],
  },
  hold: {
    id: 'hold',
    title: 'Hold it steady',
    blurb: 'One note at a time, level from start to finish.',
    glyph: { type: 'hold' },
    build: (range) => [holdStep(range, [[0, 4], [2, 6], [4, 8]])],
  },
  steps: {
    id: 'steps',
    title: 'Step up, step down',
    blurb: 'Move to the next note and back.',
    glyph: { type: 'dots', pts: [0, 2, 4, 2, 0] },
    build: (range) => [
      patternStep(range, {
        title: 'Step up, step down',
        patterns: [[0, 2, 0], [0, 2, 4, 2, 0], [4, 2, 0]],
        keys: 2,
        bpm: 80,
        vowel: 'ah',
        intro: `Three short patterns that move by step. Listen, then sing them back on ${QUOTE('ah')}.`,
      }),
    ],
  },
  five: {
    id: 'five',
    title: 'Five-note scale',
    blurb: 'Do to sol and back, one key higher each time.',
    glyph: { type: 'dots', pts: [0, 2, 4, 5, 7, 5, 4, 2, 0] },
    build: (range) => [
      patternStep(range, {
        title: 'Five-note scale',
        degrees: [0, 2, 4, 5, 7, 5, 4, 2, 0],
        keys: 4,
        bpm: 96,
        vowel: 'mee',
        intro: `Up five notes and back down on ${QUOTE('mee')}. Each round starts a little higher.`,
      }),
    ],
  },
  scale: {
    id: 'scale',
    title: 'The full scale',
    blurb: 'All eight notes, up and down.',
    glyph: { type: 'dots', pts: [0, 2, 4, 5, 7, 9, 11, 12] },
    build: (range) => [
      patternStep(range, {
        title: 'The full scale',
        degrees: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
        keys: 2,
        bpm: 100,
        vowel: 'ah',
        intro: `Do re mi fa sol la ti do, and back down. Sing it on ${QUOTE('ah')} or on the note names.`,
      }),
    ],
  },
  leaps: {
    id: 'leaps',
    title: 'Leaps',
    blurb: 'Jump a third or a fifth and land cleanly.',
    glyph: { type: 'dots', pts: [0, 4, 0, 7, 0] },
    build: (range) => [
      patternStep(range, {
        title: 'Leaps',
        patterns: [[0, 4, 0], [0, 7, 0], [0, 4, 7, 4, 0], [0, 7, 4, 0]],
        keys: 2,
        bpm: 76,
        vowel: 'oo',
        intro: `Jumps between notes. Hear the landing note in your head before you sing it. Sing on ${QUOTE('oo')}.`,
      }),
    ],
  },
  arps: {
    id: 'arps',
    title: 'Arpeggios',
    blurb: 'Do, mi, sol, do. The notes of a chord.',
    glyph: { type: 'dots', pts: [0, 4, 7, 12, 7, 4, 0] },
    build: (range) => [
      patternStep(range, {
        title: 'Arpeggios',
        patterns: [[0, 4, 7, 12, 7, 4, 0]],
        keys: 3,
        bpm: 88,
        vowel: 'nay',
        intro: `Up the chord to the top note and back on ${QUOTE('nay')}. Keep the top note light.`,
      }),
    ],
  },
  minor: {
    id: 'minor',
    title: 'Minor mood',
    blurb: 'The same scale with a darker third.',
    glyph: { type: 'dots', pts: [0, 2, 3, 5, 7, 5, 3, 2, 0] },
    build: (range) => [
      patternStep(range, {
        title: 'Minor mood',
        patterns: [[0, 2, 3, 5, 7, 5, 3, 2, 0], [0, 3, 7, 3, 0]],
        keys: 2,
        bpm: 90,
        vowel: 'ah',
        minor: true,
        intro: `A minor scale, then a minor chord. The third note is a half step lower than in major.`,
      }),
    ],
  },
  echo: {
    id: 'echo',
    title: 'Echo game',
    blurb: 'A new set of short tunes every time.',
    glyph: { type: 'dots', pts: [0, 4, 2, 7] },
    build: (range) => [echoGameStep(range)],
  },
  longer: {
    id: 'longer',
    title: 'Longer holds',
    blurb: '8, 10 and 12 seconds on one breath.',
    glyph: { type: 'hold', long: true },
    build: (range) => [holdStep(range, [[0, 8], [2, 10], [4, 12]], { title: 'Longer holds', vowel: 'oo' })],
  },
  sirens: {
    id: 'sirens',
    title: 'Sirens',
    blurb: 'Slide from low to high and back without a break.',
    glyph: { type: 'glide' },
    build: (range) => [sirenStep(range, 3)],
  },
  staccato: {
    id: 'staccato',
    title: 'Short and sharp',
    blurb: `Quick, detached notes on ${QUOTE('ha')}.`,
    glyph: { type: 'dots', pts: [0, 4, 7, 4, 0], separate: true },
    build: (range) => [staccatoStep(range)],
  },
};

export const UNITS = [
  { id: 'start', title: 'Start here', lessons: ['range', 'match', 'hold'] },
  { id: 'pitch', title: 'Pitch', lessons: ['steps', 'five', 'scale', 'leaps', 'arps', 'minor', 'echo'] },
  { id: 'breath', title: 'Breath and control', lessons: ['longer', 'sirens', 'staccato'] },
];

export const ORDER = UNITS.flatMap((u) => u.lessons);

export const WARMUP = {
  id: 'warmup',
  title: 'Daily warm-up',
  blurb: 'Sirens, scales, an arpeggio and a long note. About three minutes.',
  minutes: 3, // the one place the warm-up's length lives: Today, Songs and the lock all read it
  build: (range) => [
    sirenStep(range, 3, { title: 'Sirens' }),
    patternStep(range, {
      title: 'Five-note scale',
      degrees: [0, 2, 4, 5, 7, 5, 4, 2, 0],
      keys: 4,
      bpm: 100,
      vowel: 'mee',
      intro: `Up five notes and back on ${QUOTE('mee')}.`,
    }),
    patternStep(range, {
      title: 'Arpeggio',
      patterns: [[0, 4, 7, 4, 0]],
      keys: 4,
      bpm: 92,
      vowel: 'nay',
      intro: `Do, mi, sol and back on ${QUOTE('nay')}.`,
    }),
    holdStep(range, [[2, 6], [4, 8]], { title: 'Long notes', vowel: 'ah' }),
  ],
};
