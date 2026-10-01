// Tests for js/tune.js. Run with: node --test tests/
// Every pitch line here is made up on the spot from a list of parts, sampled the way
// Free sing samples audio.read(): { t, m } at a steady frame rate, null when silent.

import test from 'node:test';
import assert from 'node:assert/strict';
import { findNotes, findKey, quantize, harmonize, arrange, describe, TEMPOS } from '../js/tune.js';
import { SONGS, songData } from '../js/songs.js';
import { parseMelody } from '../js/music.js';

// ---------- A tiny singer ----------

function random(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// parts: { p, d, gap?, vib?: [semitones, Hz], scoop?: [semitones below, seconds],
//          dev?: semitones off, slide?: semitones the note sags through (talk-singing),
//          oct?: [from, length] seconds an octave up, rmsDip?: [at, length],
//          lost?: [at, length] seconds the detector loses the pitch while the voice carries on,
//          echo?: seconds the detector still names the pitch after the note, at a whisper }
//        { rest: seconds } | { glide: [from, to], d } | { siren: [low, high], d }
// stalls: [[from, to]] stretches with no frames at all, as when the browser misses refreshes.
function sing(parts, { rate = 120, jitter = 0.04, seed = 1, sharp = 0, lead = 0.3, tail = 0.3, rms = false, wobble = 0, stalls = [] } = {}) {
  const rnd = random(seed);
  const pieces = [];
  const truth = [];
  let t = lead;
  for (const n of parts) {
    if (n.rest) {
      t += n.rest;
      continue;
    }
    const t0 = t;
    const t1 = t + n.d;
    if (n.glide) {
      const [a, b] = n.glide;
      pieces.push({ t0, t1, f: (u) => a + ((b - a) * u) / n.d });
    } else if (n.siren) {
      const [a, b] = n.siren;
      pieces.push({ t0, t1, f: (u) => a + ((b - a) * (1 - Math.cos((2 * Math.PI * u) / n.d))) / 2 });
    } else {
      const phase = rnd() * 2 * Math.PI;
      pieces.push({
        t0,
        t1,
        n,
        f: (u) => {
          let m = n.p + (n.dev || 0);
          if (n.vib) m += n.vib[0] * Math.sin(2 * Math.PI * n.vib[1] * u + phase);
          if (n.scoop && u < n.scoop[1]) m -= n.scoop[0] * (1 - u / n.scoop[1]);
          if (n.slide) m += n.slide * (0.5 - u / n.d);
          if (n.oct && u >= n.oct[0] && u < n.oct[0] + n.oct[1]) m += 12;
          return m;
        },
      });
      truth.push({ t0, t1, p: n.p });
    }
    t = t1 + (n.gap || 0);
  }
  const end = t + tail;
  const frames = [];
  let k = 0;
  for (let i = 0; i / rate < end; i++) {
    // wobble moves each timestamp a little, like a browser's frame clock
    const time = i / rate + (wobble ? (rnd() - 0.5) * wobble : 0);
    while (k < pieces.length && pieces[k].t1 <= time) k++;
    const pc = pieces[k];
    const on = pc && time >= pc.t0;
    let m = on ? pc.f(time - pc.t0) + sharp + (rnd() - 0.5) * 2 * jitter : null;
    let level = on ? 0.05 : 0.001;
    const lost = on && pc.n && pc.n.lost;
    if (lost && time - pc.t0 >= lost[0] && time - pc.t0 < lost[0] + lost[1]) m = null;
    const dip = on && pc.n && pc.n.rmsDip;
    if (dip && time - pc.t0 >= dip[0] && time - pc.t0 < dip[0] + dip[1]) level = 0.008;
    const before = k > 0 ? pieces[k - 1] : null;
    if (!on && before && before.n && before.n.echo && time < before.t1 + before.n.echo) {
      m = before.n.p + sharp;
      level = 0.003;
    }
    if (stalls.some(([a, b]) => time >= a && time < b)) continue;
    const f = { t: time, m };
    if (rms) f.rms = level;
    frames.push(f);
  }
  return { frames, truth };
}

const SCALE = [60, 62, 64, 65, 67, 69, 71, 72];
const ps = (res) => res.notes.map((n) => n.p);

// Every found note matches the truth in pitch, and its start is within `tol` seconds.
function matches(res, truth, tol = 0.05) {
  assert.deepEqual(ps(res), truth.map((n) => n.p));
  res.notes.forEach((n, i) => {
    assert.ok(Math.abs(n.t0 - truth[i].t0) <= tol, `note ${i} starts at ${n.t0}, expected ${truth[i].t0.toFixed(3)}`);
    assert.ok(Math.abs(n.t1 - truth[i].t1) <= Math.max(tol, 0.08), `note ${i} ends at ${n.t1}, expected ${truth[i].t1.toFixed(3)}`);
  });
}

function shapeOk(res) {
  let prevEnd = -Infinity;
  for (const n of res.notes) {
    assert.ok(n.t1 > n.t0, 'positive length');
    assert.ok(n.t0 >= prevEnd - 1e-9, 'in order, no overlap');
    assert.ok(n.conf >= 0 && n.conf <= 1, 'conf in range');
    assert.equal(n.p, Math.round(n.p));
    prevEnd = n.t1;
  }
  assert.ok(res.glideShare >= 0 && res.glideShare <= 1);
}

// ---------- findNotes ----------

test('findNotes: empty, all-null and broken input', () => {
  for (const input of [[], null, undefined, 'x', [{}, null, { t: 'a', m: 60 }]]) {
    const res = findNotes(input);
    assert.deepEqual(res.notes, []);
    assert.equal(res.sungSeconds, 0);
    assert.equal(res.glideShare, 0);
  }
  const silent = Array.from({ length: 600 }, (_, i) => ({ t: i / 60, m: null }));
  const res = findNotes(silent);
  assert.deepEqual(res.notes, []);
  assert.equal(res.sungSeconds, 0);
});

test('findNotes: one note', () => {
  const { frames, truth } = sing([{ p: 57, d: 1.2 }]);
  const res = findNotes(frames);
  matches(res, truth, 0.02);
  assert.ok(Math.abs(res.notes[0].m - 57) < 0.05);
  assert.ok(res.notes[0].conf > 0.8);
  assert.ok(Math.abs(res.sungSeconds - 1.2) < 0.03);
});

test('findNotes: clean legato melody at 120 Hz and 60 Hz', () => {
  for (const rate of [120, 60]) {
    const { frames, truth } = sing(SCALE.map((p) => ({ p, d: 0.4 })), { rate });
    const res = findNotes(frames);
    matches(res, truth, 0.03);
    shapeOk(res);
    assert.equal(res.glideShare, 0);
  }
});

test('findNotes: leaps, quick notes and staccato', () => {
  const leaps = sing([60, 72, 55, 67, 60].map((p) => ({ p, d: 0.35 })));
  matches(findNotes(leaps.frames), leaps.truth, 0.03);
  const quick = sing([60, 62, 64, 65, 67, 65, 64, 62].map((p) => ({ p, d: 0.15 })));
  matches(findNotes(quick.frames), quick.truth, 0.03);
  const staccato = sing(SCALE.map((p) => ({ p, d: 0.12, gap: 0.15 })));
  matches(findNotes(staccato.frames), staccato.truth, 0.03);
});

test('findNotes: vibrato up to ±60 cents at 4 to 7 Hz stays one note each', () => {
  for (const [depth, hz, d] of [[0.6, 4, 0.6], [0.6, 7, 0.5], [0.5, 5.5, 0.25]]) {
    const { frames, truth } = sing(SCALE.map((p) => ({ p, d, vib: [depth, hz] })), { seed: 5 });
    const res = findNotes(frames);
    matches(res, truth, 0.06);
    for (const n of res.notes) assert.ok(Math.abs(n.m - n.p) < 0.15, `centre ${n.m} near ${n.p}`);
  }
});

test('findNotes: scoops belong to the note they lead into', () => {
  const apart = sing(SCALE.map((p) => ({ p, d: 0.45, scoop: [2, 0.12], gap: 0.08 })));
  const res = findNotes(apart.frames);
  matches(res, apart.truth, 0.03);
  for (const n of res.notes) assert.ok(Math.abs(n.m - n.p) < 0.1, 'scoop does not drag the centre down');
  const legato = sing(SCALE.map((p) => ({ p, d: 0.45, scoop: [1.5, 0.1] })));
  matches(findNotes(legato.frames), legato.truth, 0.04);
});

test('findNotes: repeated notes split by a short silence or a dip', () => {
  const tune = [60, 60, 60, 62, 62, 64];
  const gaps = sing(tune.map((p) => ({ p, d: 0.3, gap: 0.065 })));
  matches(findNotes(gaps.frames), gaps.truth, 0.03);
  const dips = sing(tune.map((p) => ({ p, d: 0.3, scoop: [1.2, 0.07] })));
  matches(findNotes(dips.frames), dips.truth, 0.04);
  // A two-frame dropout inside a held note is not a new note.
  const { frames } = sing([{ p: 64, d: 1 }]);
  const mid = frames.findIndex((f) => f.t > 0.8);
  frames[mid].m = null;
  frames[mid + 1].m = null;
  assert.deepEqual(ps(findNotes(frames)), [64]);
});

test('findNotes: big scoops and wide dips still give one note each', () => {
  const tune = [60, 60, 60, 62, 62, 64];
  // Every note slides up four semitones over its first 0.2 s.
  const scooped = sing(tune.map((p) => ({ p, d: 0.4, scoop: [4, 0.2] })));
  matches(findNotes(scooped.frames), scooped.truth, 0.03);
  // A deep V between notes: down three semitones and back over 0.16 s.
  const parts = tune.map((p, i) => ({ p, d: 0.4, scoop: i ? [3, 0.08] : null }));
  const { frames, truth } = sing(parts);
  for (const f of frames) {
    const n = truth.find((x) => f.t >= x.t1 - 0.08 && f.t < x.t1);
    if (n && n !== truth[truth.length - 1] && f.m != null) f.m -= 3 * (1 - (n.t1 - f.t) / 0.08);
  }
  matches(findNotes(frames), truth, 0.03);
});

test('findNotes: a dip in level alone splits repeated notes when rms is there', () => {
  const { frames, truth } = sing([{ p: 62, d: 0.4, rmsDip: [0.36, 0.04] }, { p: 62, d: 0.4 }], { rms: true });
  const res = findNotes(frames);
  assert.deepEqual(ps(res), [62, 62]);
  assert.ok(Math.abs(res.notes[1].t0 - truth[1].t0) < 0.05);
  // Without rms it is one long note, and rms is never required.
  assert.deepEqual(ps(findNotes(frames.map(({ t, m }) => ({ t, m })))), [62]);
});

test('findNotes: short repeated notes split at a dip in level, as in "la la la"', () => {
  // Quick notes joined by a voiced consonant: the pitch never breaks, only the level dips.
  const tune = [67, 67, 67, 64, 64, 64, 60];
  const { frames, truth } = sing(tune.map((p) => ({ p, d: 0.16, rmsDip: [0.12, 0.04] })), { rms: true });
  matches(findNotes(frames), truth, 0.04);
  // A held note's level never falls that far, so it stays one note.
  assert.deepEqual(ps(findNotes(sing([{ p: 64, d: 2, vib: [0.5, 5.5] }], { rms: true }).frames)), [64]);
});

test('findNotes: missed screen refreshes are not breaks between notes', () => {
  // No frames at all for a fifth of a second (a stall) and for 70 ms (dropped frames): nobody
  // heard anything, so the notes carry on.
  const { frames, truth } = sing([{ p: 62, d: 1.5 }, { p: 64, d: 1 }], { rate: 60, stalls: [[0.9, 1.1], [2.2, 2.27]] });
  matches(findNotes(frames), truth, 0.03);
  // A heard silence of the same length is a break.
  assert.deepEqual(ps(findNotes(sing([{ p: 62, d: 0.7, gap: 0.2 }, { p: 62, d: 0.7 }], { rate: 60 }).frames)), [62, 62]);
  // So is a stall of more than 0.4 s: the note may well have been sung again in it.
  assert.deepEqual(ps(findNotes(sing([{ p: 62, d: 2 }], { stalls: [[1, 1.5]] }).frames)), [62, 62]);
});

test('findNotes: a moment the detector loses while the voice carries on stays one note', () => {
  // 120 ms with no pitch but the level of the singing: a breathy patch, not a break.
  const { frames } = sing([{ p: 60, d: 1.2, lost: [0.5, 0.12] }], { rms: true });
  assert.deepEqual(ps(findNotes(frames)), [60]);
  // Without the level there is no telling, and a gap that long is a break.
  assert.deepEqual(ps(findNotes(frames.map(({ t, m }) => ({ t, m })))), [60, 60]);
  // When the level falls away too, it is a break between two notes.
  assert.deepEqual(ps(findNotes(sing([{ p: 60, d: 0.55, gap: 0.12 }, { p: 60, d: 0.55 }], { rms: true }).frames)), [60, 60]);
});

test('findNotes: the detector\'s echo after a sound is not singing', () => {
  // A 50 ms blip that the detector holds on to for 100 ms more, at a whisper, is still a blip;
  // and a note ends where the singing stops, not where its echo does.
  const { frames, truth } = sing([{ p: 60, d: 0.4, gap: 0.3 }, { p: 67, d: 0.05, echo: 0.1, gap: 0.3 }, { p: 62, d: 0.4, echo: 0.15 }], { rms: true });
  const res = findNotes(frames);
  assert.deepEqual(ps(res), [60, 62]);
  assert.ok(Math.abs(res.notes[1].t1 - truth[2].t1) < 0.03, `ends at ${res.notes[1].t1}`);
});

test('findNotes: a lone short sound is a blip, the same note among others is staccato', () => {
  // On its own in silence, 90 ms of pitch is what the detector makes of a blip of about 70 ms.
  const lone = sing([{ p: 60, d: 0.5, gap: 0.6 }, { p: 67, d: 0.09, gap: 0.6 }, { p: 62, d: 0.5 }]);
  assert.deepEqual(ps(findNotes(lone.frames)), [60, 62]);
  // With neighbours a fraction of a second away it is a note.
  const quick = sing([60, 62, 64, 65, 67].map((p) => ({ p, d: 0.09, gap: 0.15 })));
  assert.deepEqual(ps(findNotes(quick.frames)), [60, 62, 64, 65, 67]);
});

test('findNotes: a deep wobble with the level holding steady is still one note', () => {
  // One vibrato trough falls a whole semitone. Without rms that looks like the note sung
  // again; with a steady level it is a wobble.
  const { frames } = sing([{ p: 64, d: 2, vib: [0.35, 5.5] }], { rms: true });
  for (const f of frames) if (f.m != null && Math.abs(f.t - 1.3) < 0.04) f.m -= 1 - Math.abs(f.t - 1.3) / 0.04;
  assert.deepEqual(ps(findNotes(frames)), [64]);
  assert.deepEqual(ps(findNotes(frames.map(({ t, m }) => ({ t, m })))), [64, 64]);
});

test('findNotes: a note that began while the browser stalled starts in the middle of the stall', () => {
  const parts = [{ p: 62, d: 0.5, gap: 0.4 }, { p: 65, d: 0.5 }];
  const onset = 0.3 + 0.5 + 0.4;
  const { frames } = sing(parts, { stalls: [[onset - 0.15, onset + 0.15]] });
  const res = findNotes(frames);
  assert.deepEqual(ps(res), [62, 65]);
  assert.ok(Math.abs(res.notes[1].t0 - onset) < 0.03, `starts at ${res.notes[1].t0}, sung at ${onset}`);
});

test('findNotes: short octave jumps are folded back', () => {
  const { frames, truth } = sing(SCALE.map((p, i) => ({ p, d: 0.4, oct: i % 2 ? [0.15, 0.01] : [0.2, 0.07] })));
  const res = findNotes(frames);
  matches(res, truth, 0.03);
});

test('findNotes: glides do not explode into notes', () => {
  const up = sing([{ p: 60, d: 0.4 }, { glide: [60, 72], d: 1 }, { p: 72, d: 0.4 }]);
  const res = findNotes(up.frames);
  matches(res, up.truth, 0.08);
  assert.ok(res.glideShare > 0.4 && res.glideShare < 0.65, `glideShare ${res.glideShare}`);
  const siren = findNotes(sing([{ siren: [55, 70], d: 2 }, { siren: [55, 70], d: 2 }]).frames);
  assert.equal(siren.notes.length, 0);
  assert.ok(siren.glideShare > 0.9);
  const swoop = sing([{ p: 64, d: 0.4, gap: 0.2 }, { glide: [70, 62], d: 0.4 }, { rest: 0.3 }, { p: 67, d: 0.4 }]);
  matches(findNotes(swoop.frames), swoop.truth, 0.03);
});

test('findNotes: blips are dropped', () => {
  const { frames } = sing([{ p: 60, d: 0.4, gap: 0.2 }, { p: 65, d: 0.05, gap: 0.2 }, { p: 62, d: 0.4 }]);
  assert.deepEqual(ps(findNotes(frames)), [60, 62]);
});

test('findNotes: a sharp singer gets the notes they meant, and drift is tolerated', () => {
  const sharp = sing(SCALE.map((p) => ({ p, d: 0.4 })), { sharp: 0.42 });
  const res = findNotes(sharp.frames);
  assert.deepEqual(ps(res), SCALE);
  assert.ok(Math.abs(res.tuning - 0.42) < 0.03);
  assert.ok(Math.abs(res.notes[0].m - 60.42) < 0.05, 'm stays as sung');
  const flat = findNotes(sing(SCALE.map((p) => ({ p, d: 0.4 })), { sharp: -0.35 }).frames);
  assert.deepEqual(ps(flat), SCALE);
  // Each note a little off in its own way still reads as the tune.
  const loose = sing(SCALE.map((p, i) => ({ p, d: 0.4, dev: [0.2, -0.25, 0.1, -0.15, 0.25, 0, -0.2, 0.15][i] })));
  assert.deepEqual(ps(findNotes(loose.frames)), SCALE);
});

test('findNotes: a loose singer still has a tuning, two notes that disagree have none', () => {
  // A singer 0.4 sharp overall, each note scattered by about 0.3: the scatter round the circle
  // is wide, but there are enough notes to find the middle of it.
  const rnd = random(11);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const tune = [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72, 67, 64, 62, 60, 62, 64, 62, 60, 67, 65, 64, 60];
  const parts = tune.map((p) => ({ p, d: 0.4, dev: 0.3 * gauss() }));
  const res = findNotes(sing(parts, { sharp: 0.4 }).frames);
  assert.ok(Math.abs(res.tuning - 0.4) < 0.15, `tuning ${res.tuning}`);
  const right = ps(res).filter((p, i) => p === tune[i]).length;
  assert.ok(res.notes.length === tune.length && right >= 21, `${right} of ${tune.length}`);
  // Two notes half a semitone apart in their offsets say nothing about tuning.
  const two = findNotes(sing([{ p: 72, d: 0.6, dev: -0.48, gap: 0.2 }, { p: 70, d: 0.6, dev: 0.04 }]).frames);
  assert.equal(two.tuning, 0);
  assert.deepEqual(ps(two), [72, 70]);
});

test('findNotes: a wobbly note between two semitones goes to the one the tune uses', () => {
  // C major sung loosely (each note off by about a quarter of a semitone); one D lands 0.6
  // sharp, nearer E flat, which the tune never uses.
  const rnd = random(3);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const tune = [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72, 67, 64, 62, 60];
  const devs = tune.map((p, i) => (i === 7 ? 0.6 : Math.max(-0.4, Math.min(0.4, 0.25 * gauss()))));
  const loose = findNotes(sing(tune.map((p, i) => ({ p, d: 0.4, gap: 0.08, dev: devs[i] }))).frames);
  assert.ok(Math.round(loose.notes[7].m - loose.tuning) === 63, 'plain rounding would say E flat');
  assert.deepEqual(ps(loose), tune);
  assert.ok(loose.notes.every((n) => Math.abs(n.p - n.m) <= 1));
  // An accurate singer's chromatic note is close to its own semitone, so it stays put.
  const chrom = [64, 65, 67, 64, 63, 64, 62, 60, 64, 65, 67, 72, 67, 64, 62, 60];
  const exact = findNotes(sing(chrom.map((p, i) => ({ p, d: 0.4, dev: i === 4 ? 0.3 : 0 }))).frames);
  assert.deepEqual(ps(exact), chrom);
});

test('findNotes: a loose child is read in the key the notes fit', () => {
  // Sung about a third of a semitone sharp, each note scattered by about a third more, so
  // many notes sit nearer the semitone above. Averaging how far notes sit from their nearest
  // semitone can't tell which way such a singer leans; the key the notes make together can.
  const tune = [67, 64, 64, 65, 62, 62, 60, 62, 64, 65, 67, 67, 67, 67, 64, 64, 65, 62, 62, 60, 64, 67, 67, 60];
  let right = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const rnd = random(seed);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const parts = tune.map((p) => ({ p, d: 0.35, gap: 0.1, dev: Math.max(-0.45, Math.min(0.45, 0.3 * gauss())) }));
    const res = findNotes(sing(parts, { sharp: 0.35, seed }).frames);
    assert.equal(res.notes.length, tune.length);
    assert.ok(res.notes.every((n) => Math.abs(n.p - n.m) <= 1));
    // So far off, the whole take might fairly be heard a semitone up: the tune is what counts.
    right += Math.max(...[-1, 0, 1].map((k) => ps(res).filter((p, i) => p + k === tune[i]).length));
  }
  assert.ok(right >= 0.97 * 10 * tune.length, `${right} of ${10 * tune.length}`);
});

test('findNotes: a singer who drifts between phrases is followed, phrase by phrase', () => {
  // Four phrases, each after a breath, each sung a little higher than the last. Every phrase
  // is read in the tuning it was sung in; once the singer has drifted more than half a
  // semitone from where they began, the notes follow them into the new key.
  const phrase = [60, 62, 64, 65, 67, 65, 64, 62, 60];
  const parts = [];
  [0, 0.3, 0.6, 0.9].forEach((drift, k) => {
    phrase.forEach((p, i) => parts.push({ p, d: 0.3, gap: i === phrase.length - 1 ? 0.8 : 0.05, dev: drift }));
  });
  const res = findNotes(sing(parts).frames);
  const want = [0, 0, 1, 1].flatMap((shift) => phrase.map((p) => p + shift));
  assert.deepEqual(ps(res), want);
  assert.ok(Math.abs(res.tuning) < 0.15, `starts in tune: ${res.tuning}`);
  // Without breaths there is nowhere for the tuning to move: one tuning for the whole take.
  const joined = findNotes(sing(phrase.concat(phrase).map((p, i) => ({ p, d: 0.3, gap: 0.05, dev: i < 9 ? 0 : 0.3 }))).frames);
  assert.deepEqual(ps(joined), phrase.concat(phrase));
});

test('findNotes: a note sung on a slide is one note', () => {
  // Talk-singing: the voice sags through two semitones over a long note, with no steady
  // part, between two steady notes. It is still one note, its pitch the middle.
  const { frames, truth } = sing([{ p: 60, d: 0.5, gap: 0.08 }, { p: 64, d: 1.5, slide: 2, gap: 0.08 }, { p: 67, d: 0.5 }]);
  const res = findNotes(frames);
  matches(res, truth, 0.05);
  assert.ok(Math.abs(res.notes[1].m - 64) < 0.25, `centre ${res.notes[1].m}`);
  // A real step to the next note is not a slide.
  const step = sing([{ p: 64, d: 0.6 }, { p: 65, d: 0.6 }, { p: 64, d: 0.6 }]);
  matches(findNotes(step.frames), step.truth, 0.05);
});

test('findNotes: a slow scoop that lands on a note is part of it', () => {
  // A child's scoop up a whole semitone that takes a quarter of a second to arrive.
  const { frames, truth } = sing([{ p: 60, d: 0.5, gap: 0.15 }, { p: 64, d: 0.7, scoop: [1, 0.25], gap: 0.15 }, { p: 62, d: 0.5 }]);
  matches(findNotes(frames), truth, 0.03);
});

test('findNotes: a repeated note sung again a little off is still two notes', () => {
  // The second A comes back higher than the first, enough that the two look like different
  // levels; both are A, and the dip in level between them says the note was sung again.
  const tune = [{ p: 64, d: 0.4 }, { p: 66, d: 0.4 }, { p: 68, d: 0.4 }, { p: 69, d: 0.45, dev: -0.3 }, { p: 69, d: 0.45, dev: 0.3, rmsDip: [0, 0.05] }, { p: 68, d: 0.4 }, { p: 66, d: 0.4 }, { p: 64, d: 0.6 }];
  const { frames } = sing(tune, { rms: true });
  assert.deepEqual(ps(findNotes(frames)), tune.map((n) => n.p));
});

test('findNotes: a note change hidden in a stall starts in the stall', () => {
  // Legato, so nothing marks the change but the pitch, and the browser missed the moment.
  const parts = [{ p: 62, d: 0.6 }, { p: 65, d: 0.6 }];
  const onset = 0.3 + 0.6;
  const res = findNotes(sing(parts, { stalls: [[onset - 0.15, onset + 0.15]] }).frames);
  assert.deepEqual(ps(res), [62, 65]);
  assert.ok(Math.abs(res.notes[1].t0 - onset) < 0.06, `starts at ${res.notes[1].t0}, sung at ${onset}`);
  // But a note that is only just swelling up after the stall began right there.
  const late = sing([{ p: 62, d: 0.6, gap: 0.25 }, { p: 65, d: 0.6 }], { rms: true, stalls: [[0.75, 1.15]] });
  for (const f of late.frames) if (f.m != null && f.t >= 1.15 && f.t < 1.19) f.rms = 0.01;
  assert.ok(findNotes(late.frames).notes[1].t0 > 1.1);
});

test('findNotes: talking is not a tune', () => {
  // Syllables of speech between consonants: short, each sliding through its own pitch, and
  // nothing ever held.
  const rnd = random(8);
  const parts = [];
  for (let k = 0; k < 14; k++) {
    const start = 57 + 5 * rnd();
    const slide = (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd());
    parts.push({ glide: [start, start + slide], d: 0.12 + 0.1 * rnd() });
    parts.push({ rest: k % 5 === 4 ? 0.4 : 0.07 + 0.05 * rnd() }); // consonants, and a breath
  }
  const res = findNotes(sing(parts).frames);
  assert.equal(res.notes.length, 0);
  assert.ok(res.sungSeconds > 1);
  // The same quick rhythm sung on steady notes is a tune.
  const sung = sing([60, 62, 64, 62, 60, 64, 65, 67].map((p) => ({ p, d: 0.18, gap: 0.06 })));
  assert.deepEqual(ps(findNotes(sung.frames)), sung.truth.map((n) => n.p));
});

test('findNotes: uneven frame times and noisy pitch', () => {
  const { frames, truth } = sing(SCALE.map((p) => ({ p, d: 0.35, gap: 0.08 })), { rate: 60, wobble: 0.006, jitter: 0.12, seed: 9 });
  const res = findNotes(frames);
  matches(res, truth, 0.05);
  shapeOk(res);
});

test('findNotes: the app songs, sung with a little vibrato and scoop', () => {
  for (const song of SONGS) {
    const { mel } = songData(song);
    const spb = 60 / song.bpm;
    const parts = mel.notes.map((n) => ({ p: n.m, d: n.beats * spb - 0.07, gap: 0.07, vib: [0.25, 5.5], scoop: [0.8, 0.06] }));
    const { frames, truth } = sing(parts, { jitter: 0.08, seed: 3 });
    const res = findNotes(frames);
    assert.deepEqual(ps(res), truth.map((n) => n.p), song.id);
  }
});

test('findNotes: deterministic, and quick on a 3-minute take', () => {
  const rnd = random(4);
  const parts = [];
  for (let t = 0; t < 180; ) {
    const p = {
      p: 55 + Math.floor(rnd() * 15),
      d: [0.25, 0.4, 0.6, 1.2][Math.floor(rnd() * 4)],
      vib: rnd() < 0.5 ? [0.5, 5] : null,
      gap: rnd() < 0.3 ? 0.3 : 0,
    };
    parts.push(p);
    t += p.d + p.gap;
  }
  const { frames } = sing(parts, { jitter: 0.08 });
  assert.ok(frames.length > 21000);
  const t0 = performance.now();
  const res = findNotes(frames);
  const key = findKey(res.notes);
  const q = quantize(res.notes, { bpm: TEMPOS.medium });
  const chords = harmonize(q, key);
  const song = arrange(q, chords, key, { countIn: true });
  describe(res.notes, key);
  const ms = performance.now() - t0;
  // The budget is well under 100 ms; this bound only catches a big slowdown on a busy machine.
  assert.ok(ms < 400, `took ${ms.toFixed(0)} ms`);
  assert.ok(res.notes.length > 150);
  assert.ok(song.events.length > 1000);
  assert.deepEqual(findNotes(frames), res);
});

// ---------- findKey ----------

const keyOf = (src) => {
  const { notes } = parseMelody(src);
  return findKey(notes.map((n) => ({ p: n.m, beats: n.beats })));
};

test('findKey: the app songs', () => {
  for (const song of SONGS) {
    const { mel, tonic } = songData(song);
    const k = findKey(mel.notes.map((n) => ({ p: n.m, beats: n.beats })));
    assert.equal(k.tonic, tonic % 12, song.id);
    assert.equal(k.mode, 'major', song.id);
    assert.equal(k.enough, true, song.id);
    assert.ok(k.confidence > 0.5 && k.confidence <= 1);
  }
});

test('findKey: minor tunes', () => {
  let k = keyOf('A3 B3 C4 D4 E4 F4 G4 A4 G4 F4 E4 D4 C4 B3 A3/2');
  assert.deepEqual([k.tonic, k.mode, k.enough], [9, 'minor', true]);
  k = keyOf('A3 C4 E4 A4 G#4/2 A4 E4 | F4 E4 D4 C4 | B3 G#3 A3/2');
  assert.deepEqual([k.tonic, k.mode], [9, 'minor']);
  k = keyOf('E4 E4 B4 B4 | A4 G4 F#4 E4 | D4 E4 F#4 G4 | A4/2 B4/2 | B4 A4 G4 F#4 | E4 D4 E4/2');
  assert.deepEqual([k.tonic, k.mode], [4, 'minor']);
});

test('findKey: says when there is not enough to go on, but still guesses', () => {
  const short = keyOf('G4 A4 B4 A4 G4');
  assert.equal(short.enough, false);
  assert.equal(short.tonic, 7);
  const chromatic = keyOf('C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4');
  assert.equal(chromatic.enough, false);
  assert.ok(chromatic.confidence < 0.3);
  assert.deepEqual(findKey([]), { tonic: 0, mode: 'major', confidence: 0, enough: false });
  const one = findKey([{ t0: 0, t1: 1, m: 62.1, p: 62, conf: 1 }]);
  assert.equal(one.enough, false);
  assert.ok(Number.isInteger(one.tonic) && one.tonic >= 0 && one.tonic < 12);
});

test('findKey: works on found notes, transposed', () => {
  const tune = [67, 67, 74, 74, 76, 76, 74, 72, 72, 71, 71, 69, 69, 67];
  const { frames } = sing(tune.map((p, i) => ({ p, d: i === 6 || i === 13 ? 0.8 : 0.4 })));
  const k = findKey(findNotes(frames).notes);
  assert.deepEqual([k.tonic, k.mode, k.enough], [7, 'major', true]);
});

// ---------- quantize ----------

// Notes from a rhythm in beats, at a tempo, starting late and a little loose.
function played(rhythm, bpm, { start = 0.73, loose = 0.03, seed = 2 } = {}) {
  const rnd = random(seed);
  const spb = 60 / bpm;
  return rhythm.map(([beat, beats, p]) => ({
    t0: start + beat * spb + (rnd() - 0.5) * 2 * loose,
    t1: start + (beat + beats) * spb - 0.05 + (rnd() - 0.5) * 2 * loose,
    m: p,
    p,
    conf: 0.9,
  }));
}

const RHYTHM = [[0, 1, 60], [1, 1, 62], [2, 0.5, 64], [2.5, 0.5, 65], [3, 1, 67], [5, 2, 67], [7, 0.5, 65], [7.5, 1.5, 64], [10, 2, 60]];

test('quantize: recovers a rhythm at each tempo, with rests', () => {
  for (const bpm of Object.values(TEMPOS)) {
    const q = quantize(played(RHYTHM, bpm), { bpm });
    assert.equal(q.bpm, bpm);
    assert.equal(q.beatsPerBar, 4);
    assert.deepEqual(q.notes, RHYTHM.map(([beat, beats, p]) => ({ beat, beats, p })));
    // offset is the time of beat 0
    assert.ok(Math.abs(q.offset - 0.73) < 0.05);
  }
});

test('quantize: never overlaps, never zero length, keeps order', () => {
  // Two quick notes inside one eighth, and a note that ends after the next begins.
  const notes = [
    { t0: 0.5, t1: 0.95, p: 60 },
    { t0: 1.0, t1: 1.08, p: 62 },
    { t0: 1.09, t1: 1.3, p: 64 },
    { t0: 1.3, t1: 2.4, p: 65 },
    { t0: 2.0, t1: 2.6, p: 67 },
  ];
  const q = quantize(notes, { bpm: 96, beatsPerBar: 3 });
  assert.equal(q.beatsPerBar, 3);
  let end = -Infinity;
  for (const n of q.notes) {
    assert.ok(n.beats >= 0.5);
    assert.ok(n.beat >= end);
    assert.equal(n.beat * 2, Math.round(n.beat * 2));
    end = n.beat + n.beats;
  }
  assert.deepEqual(quantize([], { bpm: 96 }), { bpm: 96, beatsPerBar: 4, offset: 0, notes: [] });
});

test('quantize: notes sung short of their slot keep their length, and rests stay', () => {
  // Every note sung for 80% of its slot (a consonant or a breath before the next one).
  const bpm = 96;
  const spb = 60 / bpm;
  const rhythm = [[0, 1, 60], [1, 1, 62], [2, 2, 64], [5, 1, 65], [6, 1, 67], [7, 1, 65]];
  const notes = rhythm.map(([beat, beats, p]) => ({ t0: 0.5 + beat * spb, t1: 0.5 + (beat + 0.8 * beats) * spb, m: p, p, conf: 0.9 }));
  const q = quantize(notes, { bpm });
  assert.deepEqual(q.notes.map((n) => n.beat), [0, 1, 2, 5, 6, 7]);
  assert.deepEqual(q.notes.map((n) => n.beats).filter((b, i) => i !== 2 && i !== 5), [1, 1, 1, 1]);
  // Before the rest the note is as long as it was sung, and the rest is still there.
  assert.ok(q.notes[2].beats >= 1.5 && q.notes[2].beat + q.notes[2].beats < 5);
});

test('quantize: the first note is always on beat 0', () => {
  const rnd = random(7);
  for (let k = 0; k < 200; k++) {
    let t = 0.3 + rnd();
    const notes = [];
    for (let i = 0; i < 6; i++) {
      const d = 0.1 + rnd() * 0.5;
      notes.push({ t0: t, t1: t + d, p: 60 + i, conf: rnd() });
      t += d + rnd() * 0.2;
    }
    const q = quantize(notes, { bpm: [72, 96, 120][k % 3] });
    assert.equal(q.notes[0].beat, 0);
    assert.ok(q.notes.every((n) => n.beat >= 0 && n.beats > 0));
    // offset is still the time of beat 0, near the first note's start
    assert.ok(Math.abs(q.offset - notes[0].t0) <= 30 / q.bpm);
  }
});

test('quantize: a dotted rhythm becomes two eighths rather than a squash', () => {
  const q = quantize(played([[0, 0.75, 55], [0.75, 0.25, 55], [1, 1, 57], [2, 1, 55]], 96, { loose: 0 }), { bpm: 96, beatsPerBar: 3 });
  assert.deepEqual(q.notes.map((n) => n.beat), [0, 0.5, 1, 2]);
});

// ---------- harmonize ----------

const qOf = (src, bpb = 4) => ({
  bpm: 96,
  beatsPerBar: bpb,
  offset: 0,
  notes: parseMelody(src).notes.map((n) => ({ beat: n.beat, beats: n.beats, p: n.m })),
});
const C_MAJOR = { tonic: 0, mode: 'major', confidence: 1, enough: true };

test('harmonize: I IV V vi, one chord a bar, home at both ends', () => {
  const q = qOf('C4 E4 G4 E4 | F4 A4 C5 A4 | G4 B4 D5 B4 | C5/4');
  const ch = harmonize(q, C_MAJOR);
  assert.deepEqual(ch.map((c) => c.numeral), ['I', 'IV', 'V', 'I']);
  assert.deepEqual(ch.map((c) => [c.bar, c.beat, c.beats]), [[0, 0, 4], [1, 4, 4], [2, 8, 4], [3, 12, 4]]);
  assert.deepEqual(ch.map((c) => c.root), [0, 5, 7, 0]);
  assert.deepEqual(ch.map((c) => c.quality), ['', '', '', '']);
});

test('harmonize: two chords when the bar clearly asks, V before the last I', () => {
  const ch = harmonize(qOf('C4 E4 B3 D4 | E4 G4 C5 A4 | D4 F4 B3/2 | C4/4'), C_MAJOR);
  assert.deepEqual(ch.filter((c) => c.bar === 0).map((c) => c.numeral), ['I', 'V']);
  assert.equal(ch[ch.length - 1].numeral, 'I');
  assert.equal(ch[ch.length - 2].numeral, 'V');
  // Spans tile the song with no gaps.
  let beat = 0;
  for (const c of ch) {
    assert.equal(c.beat, beat);
    beat += c.beats;
  }
  assert.equal(beat, 16);
});

test('harmonize: Twinkle gets the nursery chords', () => {
  const twinkle = SONGS.find((s) => s.id === 'twinkle');
  const { mel } = songData(twinkle);
  const q = { bpm: 100, beatsPerBar: 4, offset: 0, notes: mel.notes.map((n) => ({ beat: n.beat, beats: n.beats, p: n.m })) };
  const ch = harmonize(q, C_MAJOR);
  const bars = (b) => ch.filter((c) => c.bar === b).map((c) => c.numeral).join(' ');
  assert.equal(bars(0), 'I');
  assert.equal(bars(1), 'IV I');
  assert.equal(bars(2), 'IV I');
  assert.equal(bars(3), 'V I');
});

test('harmonize: a two-bar tune starts at home and comes home', () => {
  const ch = harmonize(qOf('C4 D4 E4 G4 | D4 B3 C4/2'), C_MAJOR);
  assert.equal(ch[0].numeral, 'I');
  assert.equal(ch[ch.length - 1].numeral, 'I');
  const one = harmonize(qOf('G4 E4 D4/2'), C_MAJOR);
  assert.deepEqual(one.map((c) => [c.numeral, c.beat, c.beats]), [['I', 0, 4]]);
});

test('harmonize: minor keys use i iv V VI', () => {
  const ch = harmonize(qOf('A3 C4 E4 C4 | D4 F4 A4 F4 | E4 G#4 B4 G#4 | A4/4'), { tonic: 9, mode: 'minor', confidence: 1, enough: true });
  assert.deepEqual(ch.map((c) => c.numeral), ['i', 'iv', 'V', 'i']);
  assert.deepEqual(ch.map((c) => c.quality), ['m', 'm', '', 'm']);
  assert.deepEqual(ch.map((c) => c.root), [9, 2, 4, 9]);
});

test('harmonize: empty, rests and a missing key', () => {
  assert.deepEqual(harmonize({ bpm: 96, beatsPerBar: 4, notes: [] }, C_MAJOR), []);
  const ch = harmonize(qOf('G4/2 r/6 | E4 D4 C4/2'));
  assert.equal(ch.length, 3);
  assert.equal(ch[0].numeral, 'I');
  assert.equal(ch[2].numeral, 'I');
});

// ---------- arrange ----------

test('arrange: pop has drums, gentle has none, both follow the tune', () => {
  const q = qOf('C4 E4 G4 E4 | F4 A4 C5 A4 | G4 B4 D5 B4 | C5/4');
  const ch = harmonize(q, C_MAJOR);
  const spb = 60 / q.bpm;
  for (const style of ['pop', 'gentle']) {
    const song = arrange(q, ch, C_MAJOR, { style });
    const kinds = new Set(song.events.map((e) => e.kind));
    assert.equal(kinds.has('kick') && kinds.has('snare') && kinds.has('hat'), style === 'pop');
    assert.ok(kinds.has('melody') && kinds.has('chord') && kinds.has('bass'));
    const mel = song.events.filter((e) => e.kind === 'melody');
    assert.deepEqual(mel.map((e) => [e.t, e.d, e.m]), q.notes.map((n) => [n.beat * spb, n.beats * spb, n.p]));
    let t = -Infinity;
    for (const e of song.events) {
      assert.ok(e.t >= t, 'sorted by time');
      t = e.t;
      assert.ok(e.d > 0 && e.vel > 0 && e.vel <= 1);
      if (e.kind === 'chord') assert.ok(e.ms.length === 3 && e.ms.every((m) => m >= 55 && m <= 72), `chord ${e.ms}`);
      if (e.kind === 'bass') assert.ok(e.m >= 40 && e.m < 52);
      assert.ok(e.t + e.d <= song.duration + 1e-9);
    }
    assert.ok(song.duration >= 16 * spb);
    assert.equal(song.bpm, 96);
  }
});

test('arrange: chord notes are the chord, and a count-in comes first', () => {
  const q = qOf('A3 C4 E4 C4 | E4 G#4 B4 G#4 | A4/4');
  const key = { tonic: 9, mode: 'minor', confidence: 1, enough: true };
  const ch = harmonize(q, key);
  const song = arrange(q, ch, key, { countIn: true });
  const spb = 60 / q.bpm;
  const clicks = song.events.filter((e) => e.kind === 'click');
  assert.deepEqual(clicks.map((e) => e.t), [0, spb, 2 * spb, 3 * spb]);
  assert.equal(clicks[0].accent, true);
  assert.equal(song.events.find((e) => e.kind === 'melody').t, 4 * spb);
  for (const e of song.events.filter((x) => x.kind === 'chord')) {
    const c = ch.find((x) => x.beat * spb + 4 * spb <= e.t + 1e-9 && e.t < (x.beat + x.beats) * spb + 4 * spb - 1e-9);
    const third = c.quality === 'm' ? 3 : 4;
    const want = [c.root, (c.root + third) % 12, (c.root + 7) % 12];
    assert.deepEqual(e.ms.map((m) => m % 12).sort((a, b) => a - b), want.sort((a, b) => a - b));
  }
  // Without chords, arrange picks them itself.
  assert.ok(arrange(q, null, key).events.some((e) => e.kind === 'chord'));
  assert.deepEqual(arrange({ bpm: 96, beatsPerBar: 4, notes: [] }, [], key).events, []);
});

// ---------- describe ----------

const notesOf = (pitches) => pitches.map((p, i) => ({ t0: 1 + i * 0.5, t1: 1.45 + i * 0.5, m: p, p, conf: 1 }));

test('describe: the shape of a tune', () => {
  assert.equal(describe(notesOf([60, 62, 64, 65, 67])).shape, 'up');
  assert.equal(describe(notesOf([67, 65, 64, 62, 60])).shape, 'down');
  assert.equal(describe(notesOf([60, 64, 67, 72, 67, 64, 60])).shape, 'up-down');
  assert.equal(describe(notesOf([67, 64, 60, 64, 67])).shape, 'down-up');
  assert.equal(describe(notesOf([60, 67, 60, 67, 60, 67])).shape, 'wave');
  assert.equal(describe(notesOf([62, 62, 63, 62, 62])).shape, 'flat');
  assert.equal(describe(notesOf([60, 62, 64, 65, 67, 66])).shape, 'up');
});

test('describe: plain facts', () => {
  const d = describe(notesOf([60, 64, 67, 64, 60, 60]));
  assert.deepEqual(d, { seconds: 3, notes: 6, distinct: 3, low: 60, high: 67, span: 7, endsHome: true, shape: 'up-down' });
  const away = describe(notesOf([60, 62, 67]), { tonic: 7, mode: 'major', enough: false });
  assert.equal(away.endsHome, false);
  assert.equal(describe(notesOf([60, 62, 67]), { tonic: 7, mode: 'major', enough: true }).endsHome, true);
  assert.equal(describe(notesOf([60, 72])).endsHome, true, 'same note an octave up is home');
  assert.deepEqual(describe([]), { seconds: 0, notes: 0, distinct: 0, low: null, high: null, span: 0, endsHome: false, shape: 'flat' });
});

// ---------- All together ----------

test('a sung tune becomes a song', () => {
  const ode = parseMelody(`E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/0.5 D4/2 |
                          E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2`);
  const bpm = TEMPOS.fast;
  const spb = 60 / bpm;
  // Sung a minor third lower (in A), a little legato, with a touch of vibrato and scoop.
  const parts = ode.notes.map((n) => ({ p: n.m - 3, d: n.beats * spb - 0.06, gap: 0.06, vib: [0.2, 5], scoop: [1, 0.05] }));
  const { frames } = sing(parts, { seed: 8, jitter: 0.06 });
  const found = findNotes(frames);
  assert.equal(found.notes.length, ode.notes.length);
  const key = findKey(found.notes);
  assert.deepEqual([key.tonic, key.mode, key.enough], [9, 'major', true]);
  const q = quantize(found.notes, { bpm });
  assert.deepEqual(q.notes.map((n) => [n.beat, n.beats]), ode.notes.map((n) => [n.beat, n.beats]));
  const ch = harmonize(q, key);
  assert.equal(ch[0].numeral, 'I');
  assert.equal(ch[ch.length - 1].numeral, 'I');
  for (const style of ['pop', 'gentle']) {
    const song = arrange(q, ch, key, { style, countIn: true });
    assert.ok(song.duration > 32 * spb);
  }
  const d = describe(found.notes, key);
  assert.equal(d.notes, ode.notes.length);
  assert.equal(d.endsHome, true);
});
