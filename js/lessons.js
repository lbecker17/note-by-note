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

// swell: each note grows and shrinks (the player's cue says so); intro and cue override the defaults.
function holdStep(range, holds, { vowel = 'ah', title = 'Hold it steady', intro, cue, swell = false } = {}) {
  const T = fitTonic(range, 0, 4);
  const b = new Builder(60);
  holds.forEach(([deg, secs], i) => {
    b.cue(cue ? cue(secs, i, holds.length) : `${secs} seconds · ${i + 1} of ${holds.length}`);
    b.listen(T + deg, 1.5);
    b.click(true);
    b.rest(1);
    b.sing(T + deg, secs, swell ? { hold: true, swell: true } : { hold: true });
    b.rest(2);
  });
  return b.build({
    title,
    vowel,
    tonic: T,
    intro: intro || `Breathe in, then hold each note on ${QUOTE(vowel)}. Keep the line level to the end.`,
  });
}

// descendKeys: each round starts a little lower instead of a little higher.
function patternStep(range, { title, degrees, patterns, keys = 3, bpm = 90, vowel = 'ah', minor = false, span, last = 2, intro, descendKeys = false }) {
  const pats = patterns || [degrees];
  const hi = span != null ? span : Math.max(...pats.flat());
  const lo = Math.min(0, ...pats.flat());
  let tonics = keyLadder(range, lo, hi, keys);
  if (descendKeys) tonics = tonics.slice().reverse();
  const b = new Builder(bpm);
  tonics.forEach((T, k) => {
    b.key(T).cue(tonics.length > 1 ? `Key ${k + 1} of ${tonics.length}` : '');
    for (const p of pats) echo(b, pattern(T, p, last), { chord: triad(T, minor) });
  });
  return b.build({ title, vowel, tonic: tonics[0], minor, intro });
}

// The singer's working band: the stored range with up to `top` semitones taken off the top,
// so slides and patterns stay clear of the very highest note. Narrow ranges keep more room to move.
export function safeBand(range, top = 2) {
  const span = range.high - range.low;
  const cut = span >= 12 ? top : span >= 8 ? 1 : 0;
  return { low: range.low, high: range.high - cut };
}

// Up-and-down slides around the middle of the band. widths are fractions of the band's half-span,
// one per round, so they can start small and widen; a slide never leaves the band.
function sirenStep(range, { widths = [0.4, 0.6, 0.8, 1], title = 'Sirens', vowel = 'hum', intro = '' } = {}) {
  const b = new Builder(60);
  const mid = (range.low + range.high) / 2;
  const half = (range.high - range.low) / 2;
  widths.forEach((f, r) => {
    const w = Math.max(1.5, half * f);
    const a = Math.max(range.low, Math.round(mid - w));
    const z = Math.min(range.high, Math.round(mid + w));
    b.cue(widths.length > 1 ? `Slide ${r + 1} of ${widths.length}` : '');
    b.glide('listen', a, z, 2);
    b.glide('listen', z, a, 2);
    b.click(true);
    b.rest(1);
    b.glide('sing', a, z, 2);
    b.glide('sing', z, a, 2);
    b.rest(1.5);
  });
  return b.build({ title, vowel, tonic: Math.round(mid - half), intro });
}

// A slow, smooth slide from the upper middle of the band down to the lower middle.
function slideDownStep(range, rounds = 3, { title = 'Slow slide down', vowel = 'oo', intro = '' } = {}) {
  const b = new Builder(60);
  const span = range.high - range.low;
  const z = range.high - Math.round(span * 0.2);
  const a = range.low + Math.round(span * 0.25);
  for (let r = 0; r < rounds; r++) {
    b.cue(`Slide ${r + 1} of ${rounds}`);
    b.glide('listen', z, a, 3);
    b.click(true);
    b.rest(1);
    b.glide('sing', z, a, 3);
    b.rest(1.5);
  }
  return b.build({ title, vowel, tonic: a, intro });
}

// A step with nothing to sing: picture cards with a countdown. The player shows them instead of
// the lane, doesn't score them, and the warm-up check skips them.
function moveStep(cards, { title = 'Wake up your body', intro = '' } = {}) {
  const end = cards.reduce((sum, c) => sum + c.secs, 0);
  return { kind: 'move', title, intro, cards, events: [], audio: [], cues: [], end, vowel: null, tonic: 60 };
}

function staccatoStep(range, keys = 3, { title = 'Short and sharp', intro, degs = [0, 4, 7, 4, 0] } = {}) {
  const b = new Builder(100);
  const tonics = keyLadder(range, 0, Math.max(...degs), keys);
  tonics.forEach((T, k) => {
    b.key(T).cue(`Key ${k + 1} of ${tonics.length}`);
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
    title,
    vowel: 'ha',
    tonic: tonics[0],
    intro: intro || `Short, bouncy notes on ${QUOTE('ha')}. Let your belly kick each one out, then stop cleanly.`,
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
    blurb: 'Slide up and down without a break. Gentle, never pushed.',
    glyph: { type: 'glide' },
    // Four rounds that widen gradually, and the top stays a semitone under your highest note.
    build: (range) => [
      sirenStep(safeBand(range, 1), {
        widths: [0.4, 0.6, 0.8, 1],
        vowel: 'hum',
        intro: 'Hum with your lips closed, or do motorboat lips, and slide up and down like a siren. Only go as high as feels easy. If it feels tight or scratchy, make the slide smaller, or stop and have a drink of water.',
      }),
    ],
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
  { id: 'breath', title: 'Breath skills', lessons: ['longer', 'sirens', 'staccato'] },
];

export const ORDER = UNITS.flatMap((u) => u.lessons);

// ---------- Daily warm-up ----------
// About 4 minutes: body and breath, small hum slides, a light "oo" pattern from high to low,
// a five-note scale, today's challenge (a control move that changes by weekday), then one big
// siren once the voice is warm.
// Everything sung stays inside safeBand(range, 2), so nothing touches the very top note.

export const MOVE_CARDS = [
  { id: 'shoulders', title: 'Shoulder rolls', say: 'Roll your shoulders up, back and down. Slowly, three times.', secs: 12 },
  { id: 'jaw', title: 'Loose jaw', say: 'Rub your cheeks in little circles. Let your jaw hang loose.', secs: 10 },
  { id: 'yawn', title: 'Yawn and sigh', say: 'Big yawn, then a gentle sigh from high to low.', secs: 10 },
  { id: 'breath', title: 'Slow hiss', say: `Breathe in through your nose. Then hiss ${QUOTE('sssss')} slowly until the air runs out. Shoulders stay down.`, secs: 18 },
];

// One control move a day, by Date#getDay() (0 is Sunday), so "Tuesday is bouncy day".
export const CONTROL_BY_DAY = ['slide', 'hold', 'bounce', 'swell', 'hold', 'bounce', 'swell'];

export const CONTROL_TITLES = {
  hold: 'Hold it steady',
  bounce: `Bouncy ${QUOTE('ha')}`,
  swell: 'Grow and shrink',
  slide: 'Slow slide down',
};

// band: the warm-up's safe band. tight: too narrow for five-note shapes.
export const CONTROLS = {
  hold: (band) =>
    holdStep(band, [[2, 5], [4, 6]], {
      vowel: 'oo',
      title: CONTROL_TITLES.hold,
      intro: `Today’s challenge. Breathe in, then hold each note on ${QUOTE('oo')}. Keep the line level right to the end.`,
    }),
  bounce: (band, tight) =>
    staccatoStep(band, 2, {
      title: CONTROL_TITLES.bounce,
      degs: tight ? [0, 2, 4, 2, 0] : [0, 4, 7, 4, 0],
      intro: `Today’s challenge. Short, bouncy notes on ${QUOTE('ha')}. Start each one cleanly and stop it cleanly.`,
    }),
  swell: (band) =>
    holdStep(band, [[2, 6], [4, 6]], {
      vowel: 'ah',
      title: CONTROL_TITLES.swell,
      swell: true,
      cue: (secs, i, n) => `Soft, louder, then soft · ${i + 1} of ${n}`,
      intro: 'Today’s challenge. Start soft, grow a little louder, then fade away. Keep the line steady. Watch the level bar grow and shrink.',
    }),
  slide: (band) =>
    slideDownStep(band, 3, {
      title: CONTROL_TITLES.slide,
      intro: `Today’s challenge. Slide slowly down on ${QUOTE('oo')}, smooth like a lift, no bumps.`,
    }),
};

export const controlFor = (date = new Date()) => CONTROL_BY_DAY[date.getDay()];

export function buildWarmup(range, date = new Date()) {
  const band = safeBand(range, 2);
  const ctl = controlFor(date);
  const tight = band.high - band.low < 7;
  return [
    moveStep(MOVE_CARDS, {
      intro: 'Warm-ups get your voice ready, like stretching before sport. Sing gently, at a medium volume. If your throat feels scratchy or sore, stop and have a drink of water.',
    }),
    sirenStep(band, {
      widths: [0.4, 0.55, 0.7],
      title: 'Hum slides',
      vowel: 'hum',
      intro: 'Hum with your lips closed, or do motorboat lips. Slide up and down like a siren, small and gentle. Only go as high as feels easy.',
    }),
    patternStep(band, {
      title: `Light ${QUOTE('oo')} down`,
      degrees: tight ? [4, 2, 0] : [7, 5, 4, 2, 0],
      keys: 3,
      bpm: 100,
      vowel: 'oo',
      descendKeys: true,
      intro: `Light and soft on ${QUOTE('oo')}, from high to low. Each round starts a little lower.`,
    }),
    patternStep(band, {
      title: 'Five-note scale',
      degrees: tight ? [0, 2, 4, 2, 0] : [0, 2, 4, 5, 7, 5, 4, 2, 0],
      keys: 4,
      bpm: 100,
      vowel: 'mee',
      intro: `Up five notes and back on ${QUOTE('mee')}. Each round starts a little higher.`,
    }),
    CONTROLS[ctl](band, tight),
    sirenStep(band, {
      widths: [1],
      title: 'Big siren',
      vowel: 'hum',
      intro: 'One big slide to finish. Go as high as feels easy, and no higher.',
    }),
  ];
}

export const WARMUP = {
  id: 'warmup',
  title: 'Daily warm-up',
  blurb: 'Wake up, slide, scale, and today’s challenge. About 4 minutes.',
  minutes: 4, // the one place the warm-up's length lives: Today, Songs and the lock all read it
  controlTitle: (date = new Date()) => CONTROL_TITLES[controlFor(date)],
  build: (range, date = new Date()) => buildWarmup(range, date),
};
