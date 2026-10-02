// Timing (notes a step behind), the tune without headphones (the speaker filter) and songs
// ending early: js/pitch.js Tracker times, js/audio.js lag guesses, js/score.js alignStep and
// fromSpeaker, js/timing.js, js/songs.js step ends and js/import.js piece defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Tracker } from '../js/pitch.js';
import { guessOutputLag, DEFAULT_OUTPUT, LAG_MAX } from '../js/audio.js';
import { STRICTNESS, scoreStep, alignStep, fromSpeaker, sameAsRef, summarize, speakerBleed, SPEAKER_CENTS, REF_FAR_CENTS, ALIGN_MAX } from '../js/score.js';
import { cleanSource } from '../js/library.js';
import { recordOf } from '../js/family.js';
import { TIMING, clickTimes, lagFrom, onsets } from '../js/timing.js';
import { SONGS, buildSong, songData, SPEEDS, learnChunks } from '../js/songs.js';
import { songSections, pieceOptions, defaultPiece, sliceSong } from '../js/import.js';
import { midiToHz } from '../js/music.js';

const RANGE = { low: 57, high: 74 };
const tol = STRICTNESS.standard;
const song = (id) => SONGS.find((s) => s.id === id);

// A tiny deterministic random source.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Frames (60 a second) of a child singing a step's sung notes, `lag` seconds late, with a
// little wobble (vibrato and jitter) and a short gap between notes.
function sungFrames(step, { lag = 0, seed = 1, cents = 0, from = null } = {}) {
  const r = rng(seed);
  const sing = step.events.filter((e) => e.role === 'sing');
  const out = [];
  const t0 = (from != null ? from : sing[0].t) - 0.5;
  const t1 = sing[sing.length - 1].t + sing[sing.length - 1].d + 0.6;
  for (let t = t0; t < t1; t += 1 / 60) {
    const st = t - lag; // what the child is singing now: the note they heard lag ago
    const ev = sing.find((e) => st >= e.t + 0.03 && st < e.t + e.d);
    if (!ev) {
      out.push({ t, m: null });
      continue;
    }
    const vib = 0.18 * Math.sin(2 * Math.PI * 5.5 * t);
    out.push({ t, m: ev.m + cents / 100 + vib + (r() - 0.5) * 0.08 });
  }
  return out;
}

// ---------- 1. Timing ----------

test('Tracker: a median belongs to the middle reading, so a pitch change is not stamped late', () => {
  const tr = new Tracker();
  const dt = 1 / 60;
  const voiced = (hz) => ({ hz, ap: 0.05, rms: 0.1 });
  let t = 0;
  // Settle the noise floor with silence, then A3, then a step to C#4 at a known time.
  for (let i = 0; i < 30; i++, t += dt) tr.push({ hz: 0, ap: 1, rms: 0.0005 }, t);
  const out = [];
  for (let i = 0; i < 20; i++, t += dt) out.push({ m: tr.push(voiced(midiToHz(57)), t), at: tr.at, t });
  const change = t;
  for (let i = 0; i < 20; i++, t += dt) out.push({ m: tr.push(voiced(midiToHz(61)), t), at: tr.at, t });
  const firstNew = out.find((o) => o.m != null && Math.abs(o.m - 61) < 0.1);
  const lastOld = [...out].reverse().find((o) => o.m != null && Math.abs(o.m - 57) < 0.1);
  // The newest reading showing the new pitch arrives one frame after it began...
  assert.ok(firstNew.t > change + dt / 2, 'the median switches a frame late');
  // ...but it is stamped with the moment the new pitch was first read.
  assert.ok(Math.abs(firstNew.at - change) < 1e-9, `stamped ${firstNew.at - change}`);
  assert.ok(lastOld.at < change);
});

test('output lag: the browser’s figure when there is one, else the platform’s usual, capped', () => {
  assert.equal(guessOutputLag(null), 0);
  assert.ok(Math.abs(guessOutputLag({ baseLatency: 0.01, outputLatency: 0.032 }) - 0.042) < 1e-9);
  // Safari 15: no outputLatency at all.
  assert.equal(guessOutputLag({ baseLatency: undefined }, true), DEFAULT_OUTPUT.ios);
  assert.equal(guessOutputLag({}, false), DEFAULT_OUTPUT.other);
  assert.equal(guessOutputLag({ baseLatency: 0.006, outputLatency: 0 }, true), DEFAULT_OUTPUT.ios);
  assert.equal(guessOutputLag({ baseLatency: 0.01, outputLatency: 2 }), LAG_MAX);
});

test('measured: a steady lag used to cost notes; lined up, it scores like singing on time', () => {
  const [st] = buildSong(song('matilda'), RANGE, { mode: 'through', speed: SPEEDS.normal });
  const scoreAt = (lag, align) => {
    const frames = sungFrames(st, { lag, seed: 3 });
    const notes = align ? alignStep(st, frames, tol).notes : scoreStep(st, frames, tol);
    return summarize([{ step: st, notes }]);
  };
  const onTime = scoreAt(0, false).score;
  const rows = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map((lag) => ({ lag, before: scoreAt(lag, false).score, after: scoreAt(lag, true).score }));
  // Without lining up, 150 ms behind (an iPad with a slow speaker, or Bluetooth) loses a lot.
  const at150 = rows.find((r) => r.lag === 0.15);
  assert.ok(at150.before < onTime - 0.1, JSON.stringify(rows));
  for (const r of rows) assert.ok(r.after >= onTime - 0.03, `lag ${r.lag}: ${r.after} vs ${onTime}`);
});

test('alignStep: finds a steady lag, stays put when on time, and never moves past ±ALIGN_MAX', () => {
  const [st] = buildSong(song('twinkle'), RANGE, { mode: 'through' });
  // The smallest move that scores best: a note's grace at its start already absorbs part of a lag.
  const worth = (notes) => summarize([{ step: st, notes }]).score;
  const onTime = alignStep(st, sungFrames(st, { lag: 0, seed: 7 }), tol);
  assert.equal(onTime.shift, 0);
  const late = alignStep(st, sungFrames(st, { lag: 0.17, seed: 5 }), tol);
  assert.ok(late.shift > 0 && late.shift <= 0.17 + 0.02, `shift ${late.shift}`);
  assert.ok(worth(late.notes) >= worth(onTime.notes) - 0.02);
  const early = alignStep(st, sungFrames(st, { lag: -0.12, seed: 6 }), tol);
  assert.ok(early.shift < 0 && early.shift >= -0.12 - 0.02, `shift ${early.shift}`);
  assert.ok(worth(early.notes) >= worth(onTime.notes) - 0.02);
  const far = alignStep(st, sungFrames(st, { lag: 0.6, seed: 8 }), tol);
  assert.ok(Math.abs(far.shift) <= ALIGN_MAX + 1e-9);
  // Silence: nothing to line up.
  assert.equal(alignStep(st, sungFrames(st).map((f) => ({ t: f.t, m: null })), tol).shift, 0);
  // Every sung note is still scored, each against its own time.
  assert.equal(late.notes.length, st.events.filter((e) => e.role === 'sing').length);
});

test('alignStep: a wrong-note run is not rescued by moving it', () => {
  const [st] = buildSong(song('mary'), RANGE, { mode: 'through' });
  const frames = sungFrames(st, { lag: 0, seed: 9, cents: 250 }); // two and a half semitones off
  const { notes } = alignStep(st, frames, tol);
  assert.ok(summarize([{ step: st, notes }]).score < 0.15);
});

// ---------- 2. The tune without headphones ----------

// What the speaker plays while singing, as the player records it (heard clock).
const tunePlaying = (st) => st.events.filter((e) => e.role === 'sing').map((e) => ({ s: e.t, d: e.d, a: e.t - 0.08, z: e.t + e.d + 0.2, m: e.m }));

test('fromSpeaker: machine-exact readings on a playing note (any octave) are the speaker', () => {
  const playing = [{ s: 1, d: 1, a: 0.92, z: 2.2, m: 60 }];
  assert.equal(fromSpeaker(60.004, 1.5, playing), true);
  assert.equal(fromSpeaker(72 - 0.02, 1.5, playing), true, 'an octave up');
  assert.equal(fromSpeaker(60 + (SPEAKER_CENTS + 1) / 100, 1.5, playing), false);
  assert.equal(fromSpeaker(60.004, 2.5, playing), false, 'after the note');
  assert.equal(fromSpeaker(null, 1.5, playing), false);
  // A slide: the target moves.
  const glide = [{ s: 0, d: 1, a: -0.08, z: 1.2, m: 60, m2: 62 }];
  assert.equal(fromSpeaker(61, 0.5, glide), true);
  assert.equal(fromSpeaker(60, 0.5, glide), false);
});

test('sameAsRef: matches the app’s own output read the same way; looser only for readings that miss anyway', () => {
  assert.equal(sameAsRef(60.12, [60.11]), true);
  assert.equal(sameAsRef(60.12, [60.05]), false, '7 cents apart, near the note: kept');
  assert.equal(sameAsRef(43.0, [43.15], true), true, 'a chord read as a low note, a miss anyway');
  assert.equal(sameAsRef(43.0, [43.0 + (REF_FAR_CENTS + 5) / 100], true), false);
  assert.equal(sameAsRef(60, [55, 72.01]), true, 'any reading in the span, any octave');
  assert.equal(sameAsRef(60, []), false);
  assert.equal(sameAsRef(null, [60]), false);
});

// Applies the player's filter (app.js frame()) to frames.
const filter = (frames, playing) =>
  frames.map((f) => (fromSpeaker(f.m, f.t, playing) ? { ...f, raw: f.m, m: null, skip: true } : f));

test('tune playing: a child’s voice still scores; the filtered frames are not misses', () => {
  const [st] = buildSong(song('twinkle'), RANGE, { mode: 'through' });
  const playing = tunePlaying(st);
  const frames = sungFrames(st, { seed: 11 });
  const plain = summarize([{ step: st, notes: scoreStep(st, frames, tol) }]);
  const kept = filter(frames, playing);
  const skipped = kept.filter((f) => f.skip).length;
  const withTune = summarize([{ step: st, notes: scoreStep(st, kept, tol) }]);
  assert.ok(skipped / frames.filter((f) => f.m != null).length < 0.25, `skipped ${skipped}`);
  assert.ok(Math.abs(withTune.score - plain.score) < 0.05, `${withTune.score} vs ${plain.score}`);
  assert.ok(withTune.coverage > 0.6);
});

test('tune playing: the speaker alone is not scored as singing', () => {
  const [st] = buildSong(song('twinkle'), RANGE, { mode: 'through' });
  const playing = tunePlaying(st);
  const r = rng(12);
  // The tune as the mic hears it: on the note within a fraction of a cent, except where the
  // analysis window straddles two notes (measured in Chromium: 5 to 20 cents off for a frame or two).
  const frames = [];
  for (let t = 0; t < st.end; t += 1 / 60) {
    const ev = st.events.find((e) => e.role === 'sing' && t >= e.t && t < e.t + e.d);
    const edge = ev && (t - ev.t < 0.035 || ev.t + ev.d - t < 0.02);
    frames.push({ t, m: ev ? ev.m + (edge ? 0.12 : (r() - 0.5) * 0.004) : null });
  }
  const kept = filter(frames, playing);
  const sum = summarize([{ step: st, notes: scoreStep(st, kept, tol) }]);
  assert.ok(sum.coverage < 0.05, `coverage ${sum.coverage}`);
  assert.ok(sum.score < 0.05, `score ${sum.score}`);
  assert.equal(sum.landed, 0);
  // The same with dropouts inside the notes (quiet moments where nothing was read).
  const gappy = filter(frames.map((f, i) => (i % 3 === 0 ? { t: f.t, m: null } : f)), playing);
  const sum2 = summarize([{ step: st, notes: scoreStep(st, gappy, tol) }]);
  assert.ok(sum2.coverage < 0.05 && sum2.landed === 0, `coverage ${sum2.coverage}`);
  // ...and the whole-run check still names it, from the readings as heard.
  const asHeard = kept.map((f) => (f.skip ? { ...f, m: f.raw } : f));
  assert.equal(speakerBleed([{ step: st, frames: asHeard }]).bleed, true);
});

test('songs keep the tune for the player to play without headphones (sung notes carry a guide)', () => {
  for (const mode of ['learn', 'through']) {
    const [st] = buildSong(song('mary'), RANGE, { mode, headphones: false });
    const sing = st.events.filter((e) => e.role === 'sing');
    const guides = st.audio.filter((a) => a.kind === 'guide' && a.hp);
    assert.equal(guides.length, sing.length, mode);
  }
  const [off] = buildSong(song('mary'), RANGE, { mode: 'through', tune: false });
  const [on] = buildSong(song('mary'), RANGE, { mode: 'through', tune: true });
  assert.match(on.intro, /tune/);
  assert.doesNotMatch(off.intro, /tune/);
});

// ---------- The Timing check ----------

test('timing check: the median of how late the answers were; too few or too scattered is refused', () => {
  const { all, counted } = clickTimes(10);
  assert.equal(all.length, TIMING.leadIn + TIMING.count);
  assert.equal(counted.length, TIMING.count);
  const r = rng(13);
  const taps = counted.map((c) => c + 0.12 + (r() - 0.5) * 0.04);
  const got = lagFrom(counted, [...taps, 3, 50]);
  assert.ok(got.ok && Math.abs(got.lag - 0.12) < 0.02, JSON.stringify(got));
  assert.equal(lagFrom(counted, taps.slice(0, 3)).why, 'few');
  const wild = counted.map((c, i) => c + (i % 2 ? 0.02 : 0.35));
  assert.equal(lagFrom(counted, wild).why, 'uneven');
  // Early answers never make a negative lag.
  assert.equal(lagFrom(counted, counted.map((c) => c - 0.05)).lag, 0);
});

test('timing check: sung onsets are found after quiet', () => {
  const reads = [];
  for (let t = 0; t < 3; t += 1 / 60) {
    const k = Math.floor(t / 0.7);
    const into = t - k * 0.7;
    reads.push({ t, m: into >= 0.15 && into < 0.4 ? 60 : null });
  }
  const on = onsets(reads);
  assert.equal(on.length, 5);
  on.forEach((t, k) => assert.ok(Math.abs(t - (k * 0.7 + 0.15)) < 1 / 50));
});

// ---------- 3. Songs ending early ----------

test('every song, speed and mode: all notes sung, and the step runs past the last one', () => {
  for (const s of SONGS) {
    const data = songData(s);
    for (const [name, sp] of Object.entries(SPEEDS)) {
      for (const mode of ['learn', 'through']) {
        for (const headphones of [false, true]) {
          const [st] = buildSong(s, RANGE, { mode, headphones, speed: sp });
          const sing = st.events.filter((e) => e.role === 'sing');
          const where = `${s.id} ${name} ${mode} ${headphones}`;
          assert.equal(sing.length, data.mel.notes.length, where);
          const last = sing[sing.length - 1];
          assert.ok(last.t + last.d <= st.end - 0.4, where);
          for (const a of st.audio) assert.ok(a.t + (a.d || 0) <= st.end + 1e-9, where);
          // The sung notes keep the song's own rhythm, scaled by the speed.
          const spb = 60 / (s.bpm * sp);
          const lastNote = data.mel.notes[data.mel.notes.length - 1];
          assert.ok(Math.abs(last.d - lastNote.beats * spb) < 1e-9, where);
          if (mode === 'learn') {
            // Line by line: every chunk, including the last, is heard and then sung.
            const chunks = learnChunks(s);
            assert.equal(new Set(sing.map((e) => e.phrase)).size, chunks.length, where);
            assert.equal(st.events.filter((e) => e.role === 'listen').length, data.mel.notes.length, where);
          }
        }
      }
    }
  }
});

// A long family song, as an import gives it: 24 lines in three verses.
function longSong() {
  const line = 'C4 D4 E4 F4 | G4 A4 G4/2 //';
  const melody = Array.from({ length: 24 }, () => line).join('\n').replace(/\/\/$/, '');
  const words = 'la la la la la la la';
  const lyrics = Array.from({ length: 24 }, (_, i) => (i > 0 && i % 8 === 0 ? '\n' : '') + words).join('\n');
  return { id: 'fam-test', title: 'Long', key: 'C', bpm: 100, meter: 4, melody, lyrics, chords: null };
}

test('import: a long song that fits is kept whole by default; a part only when it must be', () => {
  const s = longSong();
  const { sections, stats, long } = songSections(s);
  assert.equal(long, true);
  const opts = pieceOptions({ sections, stats, long, fits: true });
  assert.equal(opts[0].whole, true);
  assert.equal(defaultPiece(opts), 0, 'the whole song, not lines 1–8');
  // Too long to keep whole: the first verse and chorus.
  const part = pieceOptions({ sections, stats, long, fits: false });
  const pick = part[defaultPiece(part)];
  assert.ok(!pick.whole && pick.from === 0 && pick.to < stats.lines - 1);
  // A part really stops after its last line.
  const cut = sliceSong(s, pick.from, pick.to);
  assert.equal(songSections(cut).stats.lines, pick.to - pick.from + 1);
});

test('a kept part is remembered with the song (and survives the family account), junk is dropped', () => {
  const src = { kind: 'midi', fileName: 'a.mid', importedAt: '2026-10-02T00:00:00Z', part: { from: 0, to: 7, of: 20 } };
  assert.deepEqual(cleanSource(src).part, { from: 0, to: 7, of: 20 });
  assert.equal(cleanSource({ ...src, part: { from: 5, to: 2, of: 20 } }).part, undefined);
  assert.equal(cleanSource({ ...src, part: { from: 0, to: 30, of: 20 } }).part, undefined);
  assert.equal(cleanSource({ ...src, part: 'all' }).part, undefined);
  assert.equal(cleanSource(null), null);
  const s = longSong();
  const row = { id: 'fam-0000000000a', song: { ...s, id: 'fam-0000000000a' }, source: src, added_at: '2026-10-02T00:00:00Z' };
  assert.deepEqual(recordOf(row).source.part, { from: 0, to: 7, of: 20 });
});
