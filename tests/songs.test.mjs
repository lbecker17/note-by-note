// Tests for songs without headphones (js/songs.js backing) and the speaker check (js/score.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, buildSong, backingVoicing } from '../js/songs.js';
import { speakerBleed, MACHINE_CENTS } from '../js/score.js';

const pc = (m) => ((Math.round(m) % 12) + 12) % 12;
const RANGES = [
  { low: 57, high: 74 }, // a child
  { low: 60, high: 79 }, // a higher voice
  { low: 45, high: 62 }, // a lower voice
  { low: 52, high: 67 },
];

test('backingVoicing leaves out the avoided pitch classes', () => {
  const C = { root: 0, quality: '', beat: 0, beats: 4 };
  const all = backingVoicing(C, new Set(), 60);
  assert.deepEqual(all.chord.map(pc).sort(), [0, 4, 7]);
  assert.equal(pc(all.bass), 0);
  assert.ok(all.chord.every((m) => m < 60), 'chord sits under the melody');
  assert.ok(all.bass < Math.min(...all.chord));
  const noC = backingVoicing(C, new Set([0]), 60);
  assert.deepEqual(noC.chord.map(pc).sort(), [4, 7]);
  assert.equal(pc(noC.bass), 7, 'bass moves to the fifth');
  const none = backingVoicing(C, new Set([0, 4, 7]), 60);
  assert.deepEqual(none.chord, []);
  assert.equal(none.bass, null);
  const low = backingVoicing({ root: 7, quality: '7', beat: 0, beats: 4 }, new Set([11]), 45);
  assert.ok(low.chord.every((m) => m >= 41) && low.bass >= 36, 'not a rumble for low voices');
  assert.ok(!low.chord.some((m) => pc(m) === 11));
});

for (const song of SONGS) {
  for (const range of RANGES) {
    test(`${song.id} ${range.low}-${range.high}: no-headphones backing never holds the sung pitch class`, () => {
      const [st] = buildSong(song, range, { mode: 'along', headphones: false });
      const sing = st.events.filter((e) => e.role === 'sing');
      const lowSung = Math.min(...sing.map((e) => e.m));
      const backing = st.audio.filter((a) => a.backing);
      assert.ok(backing.length > 0);
      // What the speaker plays (everything not kept for headphones) never holds the sung note.
      for (const a of st.audio.filter((x) => x.kind !== 'click' && !x.hp)) {
        const over = sing.filter((e) => e.t < a.t + a.d + 0.15 && e.t + e.d > a.t);
        for (const e of over) assert.notEqual(pc(a.m), pc(e.m), `${a.kind} ${a.m} at ${a.t.toFixed(2)} vs sung ${e.m}`);
      }
      for (const a of backing) assert.ok(a.m < lowSung || a.m >= 41, `register ${a.m}`);
      if (lowSung > 53) for (const a of backing) assert.ok(a.m < lowSung, `${a.m} under ${lowSung}`);
      // Each line's first note is played in the rest before it.
      const cues = st.audio.filter((a) => a.cue);
      const starts = [...new Set(sing.map((e) => e.phrase))].map((p) => sing.find((e) => e.phrase === p));
      assert.equal(cues.length, starts.length);
      cues.forEach((c, i) => {
        assert.equal(c.m, starts[i].m);
        assert.ok(c.t + c.d <= starts[i].t - 0.4, 'cue ends well before the line');
      });
    });
  }
  test(`${song.id}: headphones and line-by-line keep the guide`, () => {
    const [hp] = buildSong(song, RANGES[0], { mode: 'along', headphones: true });
    assert.ok(hp.audio.some((a) => a.kind === 'guide' && a.hp));
    assert.ok(!hp.audio.some((a) => a.nohp));
    const [learn] = buildSong(song, RANGES[0], { mode: 'learn', headphones: false });
    const listen = learn.events.filter((e) => e.role === 'listen');
    assert.ok(listen.length > 0);
    for (const e of listen) assert.ok(learn.audio.some((a) => a.kind === 'guide' && !a.hp && a.t === e.t && a.m === e.m));
  });
}

// ---------- speakerBleed ----------
function framesFor(step, fn, rate = 60) {
  const out = [];
  for (const ev of step.events) {
    if (ev.role !== 'sing') continue;
    for (let t = ev.t; t < ev.t + ev.d; t += 1 / rate) out.push({ t, m: fn(ev, t) });
  }
  return out;
}

function random(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

test('speakerBleed flags the guide played back, not a voice', () => {
  const [st] = buildSong(SONGS[0], RANGES[0], { mode: 'along', headphones: true });
  const machine = speakerBleed([{ step: st, frames: framesFor(st, (ev) => ev.m + 0.002) }]);
  assert.equal(machine.bleed, true);
  assert.ok(machine.exact < MACHINE_CENTS);
  const rnd = random(3);
  let jit = 0;
  // A good, steady singer: a few cents of drift and a light vibrato on long notes.
  const voice = speakerBleed([
    {
      step: st,
      frames: framesFor(st, (ev, t) => {
        jit = jit * 0.95 + (rnd() - 0.5) * 0.02;
        return ev.m + jit + (ev.d >= 0.8 ? 0.12 * Math.sin(2 * Math.PI * 5.5 * t) : 0);
      }),
    },
  ]);
  assert.equal(voice.bleed, false);
  // Nothing heard: no verdict.
  assert.equal(speakerBleed([{ step: st, frames: [] }]).bleed, false);
});
