// Tests for songs without headphones (js/songs.js backing) and the speaker check (js/score.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, buildSong, backingVoicing, learnChunks, songData, defaultSpeed, SPEEDS, CHUNK } from '../js/songs.js';
import { importMusicXML } from '../js/import.js';
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
      // No clicks once the song is under way: one count-in, then the song in its own time.
      const firstSing = sing[0].t;
      for (const a of st.audio.filter((x) => x.kind === 'click')) assert.ok(a.t < firstSing - 1e-6, `click at ${a.t.toFixed(2)}`);
      // Sung notes keep the song's timing: no gaps put in between lines.
      const spb = 60 / song.bpm;
      const { mel } = songData(song);
      sing.forEach((e, i) => assert.ok(Math.abs(e.t - firstSing - (mel.notes[i].beat - mel.notes[0].beat) * spb) < 1e-6));
      // A line's first note may be played, very softly, only inside a rest of a beat or more.
      for (const c of st.audio.filter((a) => a.cue)) {
        assert.ok(c.level <= 0.1);
        const next = sing.find((e) => e.t > c.t);
        const prev = [...sing].reverse().find((e) => e.t < c.t);
        assert.ok(next && prev && next.phrase !== prev.phrase);
        assert.equal(c.m, next.m);
        assert.ok(c.t >= prev.t + prev.d + 0.15 && c.t + c.d <= next.t - 0.4);
        assert.ok(next.t - (prev.t + prev.d) >= (song.pulse || 1) * spb - 1e-6);
      }
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

// ---------- Learning chunks (line by line) ----------
let fakeId = 0;
// lines: [[melody, lyrics], ...], one per line of the song.
function songOf(lines, { bpm = 100, meter = 4, paraBefore = [] } = {}) {
  for (const [m, w] of lines) assert.equal(m.split(' ').filter((t) => !t.startsWith('r/')).length, w.split(' ').length, w);
  return {
    id: `fam-test-${++fakeId}`,
    title: 'Test',
    key: 'C',
    bpm,
    meter,
    melody: lines.map((l) => l[0]).join(' // '),
    lyrics: lines.map((l, i) => (paraBefore.includes(i) ? '\n' : '') + l[1]).join('\n'),
    chords: null,
  };
}
// Which lines each chunk covers, as [first, last] line numbers.
function chunkLinesOf(song) {
  const { mel } = songData(song);
  const lineOf = (noteIdx) => mel.phrases.findIndex(([s, e]) => noteIdx >= s && noteIdx < e);
  return learnChunks(song).map(([s, e]) => [lineOf(s), lineOf(e - 1)]);
}
const secsOf = (song, [s, e]) => {
  const { mel } = songData(song);
  const last = mel.notes[e - 1];
  return ((last.beat + last.beats - mel.notes[s].beat) * 60) / song.bpm;
};

test('learnChunks: the built-in songs keep their hand-made lines', () => {
  for (const song of SONGS) assert.deepEqual(learnChunks(song), songData(song).mel.phrases, song.id);
});

// Short karaoke-style lines, as pop songs come in: chunks join them up to the end of a sentence.
const POP = [
  ['C4/0.5 C4/0.5 D4/0.5 E4/0.5 G4/0.5 E4/0.5', 'We were dan- cing in the'], // 0: runs on (pickup "the")
  ['D4/0.5 D4/0.5 C4/0.5 D4/1.5 r/1', 'light of the moon,'], // 1: comma, held, rest
  ['E4/0.5 E4/0.5 F4/0.5 G4/0.5 A4/0.5 G4/0.5', 'sing- ing out our hearts and'], // 2: runs on
  ['G4/0.5 F4/0.5 E4/0.5 D4/0.5 C4/2 r/2', 'all the night is long.'], // 3: full stop, rest
  ['E4/0.5 E4/0.5 E4/0.5 F4/0.5 G4/0.5 A4/0.5', 'Hold me close and don\'t let'], // 4: runs on
  ['G4/0.5 E4/0.5 C4/1', 'go of the'], // 5: ends on a pickup
  ['D4/0.5 E4/0.5 F4/0.5 E4/0.5 D4/2 r/1', 'mu- sic in the sky.'], // 6: full stop
  ['C4/0.5 D4/0.5 E4/0.5 F4/0.5', 'Sun- shine com- ing'], // 7: runs on, next is a new verse in this test
  ['G4/0.5 G4/0.5 A4/0.5 G4/2', 'through the tall trees'],
];

test('learnChunks: short lines join up to a natural end', () => {
  const song = songOf(POP);
  const chunks = chunkLinesOf(song);
  assert.deepEqual(chunks, [
    [0, 1],
    [2, 3],
    [4, 6],
    [7, 8],
  ]);
  for (const c of learnChunks(song)) {
    const secs = secsOf(song, c);
    assert.ok(secs >= 3 && secs <= CHUNK.maxSecs, `${secs}`);
  }
});

test('learnChunks: never ends inside a word, on a hold or a pickup', () => {
  const song = songOf([
    ['C4 D4 E4 F4 G4/0.5', 'Hap- py lit- tle sun-'],
    ['G4/0.5 A4 G4/2 r/2', 'shine to- day.'],
    ['C4 D4 E4/2', 'Here we go'],
    ['E4/2 r/2', '~'],
    ['C4 D4 C4/2 r/2', 'all to- day.'],
  ]);
  const ends = chunkLinesOf(song).map((c) => c[1]);
  assert.ok(!ends.includes(0), 'not inside "sun- shine"');
  assert.ok(!ends.includes(2), 'not before a hold');
  assert.equal(ends[ends.length - 1], 4);
});

test('learnChunks: a blank line (new verse) ends a chunk, a long line stays as it is', () => {
  const verse = [
    ['C4/0.5 D4/0.5 E4/0.5 F4/0.5 C4/0.5 D4/0.5 E4/0.5 F4/0.5', 'Sun- shine com- ing up a- bove the'],
    ['G4/0.5 G4/0.5 A4/0.5 G4/0.5 G4/0.5 G4/0.5 A4/0.5 G4/0.5', 'hills and through the tall trees and in'],
    ['G4/0.5 G4/0.5 A4/0.5 G4/0.5 G4/0.5 G4/0.5 A4/0.5 G4/0.5', 'through the leaves on- to the grass to'],
  ];
  const plain = songOf(verse);
  assert.deepEqual(chunkLinesOf(plain), [[0, 2]]);
  const marked = songOf(verse, { paraBefore: [2] });
  assert.deepEqual(chunkLinesOf(marked), [
    [0, 1],
    [2, 2],
  ]);
  const long = songOf([
    ['C4 D4 E4 F4 G4 A4 G4 F4 E4 D4 C4 D4 E4 F4 G4 A4 G4 F4 E4 D4 C4/4', 'la la la la la la la la la la la la la la la la la la la la la.'],
    ['C4 D4 E4/2', 'Here we go.'],
    ['C4 D4 E4/2', 'There we go.'],
  ]);
  assert.deepEqual(chunkLinesOf(long), [
    [0, 0],
    [1, 2],
  ]);
});

test('Line by line plays each chunk: words on screen and progress follow the chunk', () => {
  const song = songOf(POP);
  const [st] = buildSong(song, RANGES[0], { mode: 'learn' });
  const chunks = learnChunks(song);
  assert.equal(st.phrases, chunks.length);
  assert.equal(st.cues[0].text, `Line 1 of ${chunks.length}`);
  const listen = st.events.filter((e) => e.role === 'listen');
  chunks.forEach(([s, e], p) => {
    const evs = listen.filter((x) => x.phrase === p);
    assert.equal(evs.length, e - s);
    assert.deepEqual(
      evs.map((x) => x.si),
      evs.map((_, i) => i)
    );
  });
});

// ---------- Speed ----------
test('defaultSpeed: Steady for quick songs, Normal otherwise', () => {
  const by = Object.fromEntries(SONGS.map((s) => [s.id, defaultSpeed(s)]));
  assert.equal(by.row, 'normal', '192 eighths is 64 dotted beats');
  assert.equal(by.mary, 'normal');
  assert.equal(defaultSpeed({ bpm: 128, meter: 4 }), 'steady');
  assert.equal(defaultSpeed({ bpm: 110, meter: 4 }), 'normal');
  assert.deepEqual(SPEEDS, { slow: 0.75, steady: 0.9, normal: 1 });
});

for (const mode of ['learn', 'along']) {
  for (const headphones of [false, true]) {
    test(`speed stretches every time (${mode}, headphones ${headphones})`, () => {
      const song = SONGS[7];
      const [n] = buildSong(song, RANGES[0], { mode, headphones, speed: 1 });
      for (const k of ['steady', 'slow']) {
        const f = SPEEDS[k];
        const [s] = buildSong(song, RANGES[0], { mode, headphones, speed: f });
        assert.equal(s.speed, f);
        assert.equal(s.events.length, n.events.length);
        s.events.forEach((e, i) => {
          assert.ok(Math.abs(e.t - n.events[i].t / f) < 1e-6);
          assert.ok(Math.abs(e.d - n.events[i].d / f) < 1e-6);
        });
        const clicks = s.audio.filter((a) => a.kind === 'click');
        assert.equal(clicks.length, n.audio.filter((a) => a.kind === 'click').length);
        assert.ok(Math.abs(s.end - n.end / f) < 0.5 / f + 1e-6);
        if (mode === 'along') {
          const first = s.events[0].t;
          assert.ok(clicks.every((c) => c.t < first));
        }
      }
    });
  }
}

// ---------- An imported pop song ----------
// Sheet music written karaoke-style: short bursts of words between rests and breath marks, each
// starting with a capital, sentences running across them. (Tune: "Oh! Susanna", Stephen Foster,
// 1848; made-up words.) The importer cuts it into short lines; Line by line joins them up.
function popXml() {
  const B = [
    [['C4', 0.5, 'I'], ['D4', 0.5, 'had']],
    [['E4', 0.5, 'a'], ['G4', 1.5, 'dream', 1], ['r', 1], ['G4', 0.5, 'Last'], ['A4', 0.5, 'night']],
    [['G4', 0.5, 'that'], ['E4', 0.5, 'we', 1], ['C4', 0.5, 'Were'], ['D4', 0.5, 'on'], ['E4', 0.5, 'the'], ['E4', 0.5, 'ra-'], ['D4', 0.5, 'di-'], ['C4', 0.5, 'o']],
    [['D4', 2, 'play-'], ['C4', 0.5, 'ing,'], ['r', 1], ['D4', 0.5, 'And']],
    [['E4', 0.5, 'ev-'], ['G4', 0.5, 'ery-'], ['G4', 0.5, 'bo-'], ['A4', 0.5, 'dy'], ['G4', 1, 'danced'], ['r', 1]],
    [['E4', 0.5, 'In'], ['C4', 0.5, 'the'], ['D4', 0.5, 'kitch-'], ['E4', 0.5, 'en', 1], ['E4', 0.5, 'All'], ['D4', 0.5, 'night'], ['D4', 0.5, 'and'], ['D4', 0.5, 'all']],
    [['C4', 2, 'day.'], ['r', 1], ['F4', 0.5, 'Oh,'], ['F4', 0.5, 'don’t']],
    [['A4', 1.5, 'stop', 1], ['r', 1], ['A4', 0.5, 'The'], ['G4', 0.5, 'mu-'], ['G4', 0.5, 'sic']],
    [['E4', 0.5, 'now,'], ['C4', 0.5, 'just'], ['D4', 1.5, 'keep'], ['r', 1], ['C4', 0.25, 'It'], ['D4', 0.25, 'turned']],
    [['E4', 0.5, 'up', 1], ['G4', 0.5, 'Till'], ['G4', 0.5, 'the'], ['A4', 0.5, 'sun'], ['G4', 1, 'comes'], ['r', 1]],
    [['C4', 0.5, 'O-'], ['D4', 0.5, 'ver'], ['E4', 0.5, 'the'], ['E4', 0.5, 'sleep-'], ['D4', 0.5, 'y'], ['D4', 0.5, 'lit-'], ['D4', 0.5, 'tle'], ['D4', 0.5, 'old']],
    [['C4', 2, 'town.'], ['r', 2]],
  ];
  const TYPE = { 0.25: '16th', 0.5: 'eighth', 1: 'quarter', 1.5: 'quarter', 2: 'half' };
  let join = false;
  let x = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Kitchen Radio</work-title></work><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1">';
  B.forEach((bar, i) => {
    x += `<measure number="${i}"${i ? '' : ' implicit="yes"'}>`;
    if (!i) x += '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes><sound tempo="126"/>';
    for (const [p, beats, text, breath] of bar) {
      const d = beats * 4;
      if (p === 'r') {
        x += `<note><rest/><duration>${d}</duration></note>`;
        continue;
      }
      const j = text.endsWith('-');
      const syl = join ? (j ? 'middle' : 'end') : j ? 'begin' : 'single';
      join = j;
      x += `<note><pitch><step>${p[0]}</step><octave>${p[1]}</octave></pitch><duration>${d}</duration><type>${TYPE[beats]}</type>${beats === 1.5 ? '<dot/>' : ''}`;
      x += `${breath ? '<notations><articulations><breath-mark/></articulations></notations>' : ''}<lyric number="1"><syllabic>${syl}</syllabic><text>${j ? text.slice(0, -1) : text}</text></lyric></note>`;
    }
    x += '</measure>';
  });
  return x + '</part></score-partwise>';
}

test('an imported pop song with short lines learns in sentence-sized chunks', () => {
  const { song } = importMusicXML(new TextEncoder().encode(popXml()), { fileName: 'Kitchen Radio.musicxml' });
  const { mel, lyr } = songData(song);
  assert.ok(mel.phrases.length >= 6, `short lines: ${mel.phrases.length}`);
  const chunks = learnChunks(song);
  assert.ok(chunks.length < mel.phrases.length);
  for (const c of chunks) {
    const secs = secsOf(song, c);
    assert.ok(secs >= 4 && secs <= 10, `${secs.toFixed(2)} s`);
    const last = lyr[c[1] - 1];
    const gap = c[1] < mel.notes.length ? mel.notes[c[1]].beat - (mel.notes[c[1] - 1].beat + mel.notes[c[1] - 1].beats) : 99;
    assert.ok(/[.,;!?]$/.test(last) || gap >= 1, `ends at "${last}"`);
    assert.ok(!/[-=]$/.test(last));
  }
  // Every chunk ends where a sentence or clause does, and the slower speeds keep the same chunks.
  assert.deepEqual(
    chunks.map((c) => lyr[c[1] - 1]),
    ['ing,', 'day.', 'town.']
  );
  for (const k of Object.keys(SPEEDS)) {
    const [st] = buildSong(song, RANGES[0], { mode: 'learn', speed: SPEEDS[k] });
    assert.equal(st.phrases, chunks.length);
  }
});
