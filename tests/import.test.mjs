// Tests for the private family-song importers: js/midi.js, js/xml.js, js/musicxml.js,
// js/unzip.js, js/import.js and js/nbn.js. Run with: node --test tests/
// Every file here is built byte by byte from public-domain tunes (Twinkle, Ode to Joy and
// New Britain, the "Amazing Grace" tune) with made-up words. No copyrighted song data.

import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, crc32 as zlibCrc32 } from 'node:zlib';
import { parseMidi } from '../js/midi.js';
import { parseXML, decodeXmlBytes, decodeEntities } from '../js/xml.js';
import { readMusicXML, musicxmlMelody } from '../js/musicxml.js';
import { crc32 } from '../js/unzip.js';
import { decodeCp1252, cutText, UNSAFE_CHARS } from '../js/text.js';
import { importSongFile, importMidi, importMusicXML, sliceSong, songSections, karaokeSyllables, parseChordSymbol, ImportError, IMPORT_LIMITS } from '../js/import.js';
import { readFamilySongFile, writeFamilySongFile, validateSong, familySongFileName, cleanFileName, songId, FAMILY_CREDIT } from '../js/nbn.js';
import { buildSong, songData, songGlyph, setHarmonizer, SONGS } from '../js/songs.js';
import { parseMelody, parseLyrics } from '../js/music.js';

// ---------- MIDI files, byte by byte ----------

const PPQ = 480;
const enc = new TextEncoder();
const vlq = (n) => {
  const out = [n & 0x7f];
  for (n = Math.floor(n / 128); n > 0; n = Math.floor(n / 128)) out.unshift((n & 0x7f) | 0x80);
  return out;
};
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n) => [(n >> 8) & 255, n & 255];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const latin1 = (s) =>
  [...s].map((c) => {
    const x = c.charCodeAt(0);
    assert.ok(x < 256, 'Latin-1 only');
    return x;
  });
const utf8 = (s) => [...enc.encode(s)];
const chunk = (id, body) => [...ascii(id), ...be32(body.length), ...body];
const meta = (type, data) => [0xff, type, ...vlq(data.length), ...data];
const tempoEv = (bpm) => {
  const us = Math.round(60e6 / bpm);
  return meta(0x51, [(us >> 16) & 255, (us >> 8) & 255, us & 255]);
};
const timeSigEv = (n, d) => meta(0x58, [n, Math.log2(d), 24, 8]);
const keySigEv = (sf, mi = 0) => meta(0x59, [sf & 255, mi]);
const nameEv = (s) => meta(0x03, utf8(s));
const textEv = (bytes) => meta(0x01, bytes);
const lyricEv = (bytes) => meta(0x05, bytes);
const programEv = (ch, p) => [0xc0 | ch, p];

// events: [tick, bytes]. running: leave out a channel status byte equal to the last one
// (a meta or sysex event in between resets it, as the standard says).
function trackBytes(events, { running = false, endOfTrack = true } = {}) {
  const sorted = events.map((e, i) => [e[0], e[1], i]).sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const out = [];
  let last = 0;
  let status = 0;
  for (const [tick, bytes] of sorted) {
    out.push(...vlq(tick - last));
    last = tick;
    if (bytes[0] < 0xf0) {
      out.push(...(running && bytes[0] === status ? bytes.slice(1) : bytes));
      status = bytes[0];
    } else {
      out.push(...bytes);
      status = 0;
    }
  }
  if (endOfTrack) out.push(0, 0xff, 0x2f, 0);
  return out;
}
const smf = (format, division, tracks) => new Uint8Array([...chunk('MThd', [...be16(format), ...be16(tracks.length), ...be16(division & 0xffff)]), ...tracks.flatMap((t) => chunk('MTrk', t))]);

// A tune: [[midi, beats], ...] (or ['r', beats]) from beat `at` on channel ch -> note events.
// Note-offs are note-ons with velocity 0, so running status covers whole runs of notes.
function tune(items, { ch = 0, at = 0, ppq = PPQ, vel = 90, legato = 0.9 } = {}) {
  const ev = [];
  const starts = [];
  let b = at;
  for (const [m, beats] of items) {
    if (m !== 'r') {
      ev.push([Math.round(b * ppq), [0x90 | ch, m, vel]], [Math.round((b + beats * legato) * ppq), [0x90 | ch, m, 0]]);
      starts.push(b);
    }
    b += beats;
  }
  return { ev, starts, end: b };
}

const [C4, D4, E4, F4, G4, A4, B4, C5, D5] = [60, 62, 64, 65, 67, 69, 71, 72, 74];
const up = (items, k) => items.map(([m, d]) => [m === 'r' ? 'r' : m + k, d]);
// Twinkle, Twinkle (French melody, 1761), line by line.
const TW1 = [[C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2]];
const TW2 = [[F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2]];
const TW3 = [[G4, 1], [G4, 1], [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 2]];
const TW4 = [[G4, 1], [G4, 1], [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [C4, 1]]; // last word held over D and C
// Ode to Joy (Beethoven, 1824), first line.
const ODE = [[E4, 1], [E4, 1], [F4, 1], [G4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 1], [C4, 1], [D4, 1], [E4, 1], [E4, 1.5], [D4, 0.5], [D4, 2]];

const RANGE = { low: 55, high: 72 };
const tokens = (s) => s.trim().split(/\s+/);
const notesOnly = (melody) => tokens(melody).filter((t) => t !== '|' && t !== '//');

// Every imported song must be a song the app can open and play, line by line and sung through.
function assertPlayable(song) {
  const v = validateSong(song);
  assert.ok(v.ok, v.error);
  assert.deepEqual(v.song, song, 'a valid import passes validation unchanged');
  const mel = parseMelody(song.melody);
  if (song.lyrics) assert.equal(parseLyrics(song.lyrics).length, mel.notes.length, 'one lyric token per note');
  const data = songData(song);
  for (const n of data.mel.notes) assert.ok(n.hold || (typeof n.text === 'string' && n.text.length > 0 && n.text !== '~'), `note text "${n.text}"`);
  for (const [s] of data.mel.phrases) assert.ok(!data.mel.notes[s].hold, 'no line starts on a held syllable');
  for (const mode of ['learn', 'along']) {
    const [step] = buildSong(song, RANGE, { mode });
    const sing = step.events.filter((e) => e.role === 'sing');
    assert.equal(sing.length, mel.notes.length, `${mode}: every note is sung`);
    for (const e of step.events) assert.ok(Number.isFinite(e.t) && e.d > 0);
    assert.ok(step.end > 0);
  }
}

// ---------- MIDI reader ----------

test('MIDI: format 0, running status, Lyric events with hyphens and CR line ends', () => {
  const ppq = 480;
  const mel = tune([...TW1, ...TW2], { ch: 1 });
  // A chord accompaniment on another channel of the same track.
  const acc = [];
  for (let bar = 0; bar < 4; bar++) for (const m of [48, 52, 55]) acc.push([bar * 4 * ppq, [0x90, m, 60]], [(bar * 4 + 4) * ppq - 10, [0x80, m, 0]]);
  const words = ['Shi-', 'ny ', 'sun, ', 'a ', 'na-', 'ïve ', 'star,\r', 'Glow-', 'ing ', 'bright ', 'in ', 'morn-', 'ing ', 'far.\r'];
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * ppq), lyricEv(utf8(w))]);
  const bytes = smf(0, ppq, [trackBytes([[0, nameEv('Shiny Sun')], [0, tempoEv(100)], [0, timeSigEv(4, 4)], [0, programEv(1, 73)], ...mel.ev, ...acc, ...lyr], { running: true })]);

  const midi = parseMidi(bytes);
  assert.equal(midi.format, 0);
  assert.deepEqual(midi.division, { type: 'ppq', ppq });
  assert.equal(midi.encoding, 'utf-8');
  const t = midi.tracks[0];
  assert.equal(t.name, 'Shiny Sun');
  assert.equal(t.notes.filter((n) => n.ch === 1).length, 14);
  assert.equal(t.notes.length, 14 + 12);
  const first = t.notes.find((n) => n.ch === 1);
  assert.deepEqual([first.tick, first.endTick, first.m, first.beat], [0, 432, 60, 0]);
  assert.ok(Math.abs(t.notes.find((n) => n.ch === 1 && n.tick === 4 * ppq).sec - 2.4) < 1e-9, 'beat 4 at 100 bpm is 2.4 s');
  assert.deepEqual(
    t.texts.filter((x) => x.kind === 'lyric').map((x) => x.text),
    words
  );

  const r = importMidi(bytes, { fileName: 'shiny-sun.mid' });
  assert.equal(r.song.title, 'Shiny Sun');
  assert.equal(r.song.credit, FAMILY_CREDIT);
  assert.match(r.song.id, /^fam-[0-9a-z]{11}$/);
  assert.equal(r.song.key, 'C');
  assert.equal(r.song.bpm, 100);
  assert.equal(r.song.meter, 4);
  assert.equal(r.song.melody, 'C4 C4 G4 G4 | A4 A4 G4/2 //\nF4 F4 E4 E4 | D4 D4 C4/2');
  assert.equal(r.song.lyrics, 'Shi- ny sun, a na- ïve star,\nGlow- ing bright in morn- ing far.');
  assert.equal(r.song.chords, null);
  assert.equal(r.source.kind, 'midi');
  assert.equal(r.source.fileName, 'shiny-sun.mid');
  assert.equal(r.long, false);
  assert.equal(r.sections.length, 1);
  assert.equal(r.choices.find((c) => c.chosen).id, 't1c2');
  assertPlayable(r.song);
});

// A karaoke (.kar) file: format 1, the words as Text events in their own track with "\" and
// "/" markers, Latin-1 bytes, a tempo change, the tune on channel 6 in a track called "Flute",
// a busy piano, a bass line and drums on channel 10.
function karFile() {
  const ppq = 96;
  const melody = up([...TW1, ...TW2, ...TW3, ...TW4], 12);
  const mel = tune(melody, { ch: 5, ppq, legato: 0.95 });
  const sylls = [
    '\\Sun', 'ny', ' days', ' at', ' ca', 'fé', ' glow,',
    '/Bir', 'dies', ' sing', ' ü', 'ber', 'all', ' snow.',
    '\\Hap', 'py', ' moon', ' a', 'bove', ' the', ' sea,',
    '/Smi', 'ling', ' down', ' on', ' you', ' and', ' me.',
  ];
  const sylNotes = mel.starts.filter((_, i) => i !== 28); // the last note holds "me."
  assert.equal(sylls.length, 28);
  assert.equal(sylNotes.length, 28);
  const words = [
    [0, textEv(ascii('@KMIDI KARAOKE FILE'))],
    [0, textEv(ascii('@V0100'))],
    [0, textEv(latin1('@TSunny Café Song'))],
    [0, textEv(ascii('@TA Family'))],
    ...sylls.map((s, i) => [Math.round(sylNotes[i] * ppq), textEv(latin1(s))]),
  ];
  const piano = [];
  const bass = [];
  const drums = [];
  for (let bar = 0; bar < 8; bar++) {
    const b0 = bar * 4;
    [48, 52, 55].forEach((m) => piano.push([b0 * ppq, [0x90, m, 50]], [(b0 + 2) * ppq, [0x90, m, 0]], [(b0 + 2) * ppq, [0x90, m, 50]], [(b0 + 4) * ppq - 1, [0x90, m, 0]]));
    for (let k = 0; k < 8; k++) {
      const m = [60, 64, 67, 72][k % 4];
      piano.push([(b0 + k / 2) * ppq, [0x90, m, 40]], [(b0 + k / 2 + 0.45) * ppq, [0x90, m, 0]]);
      drums.push([(b0 + k / 2) * ppq, [0x99, k % 2 ? 42 : 36, 80]], [(b0 + k / 2 + 0.1) * ppq, [0x99, k % 2 ? 42 : 36, 0]]);
    }
    for (let k = 0; k < 4; k++) bass.push([(b0 + k) * ppq, [0x92, 36 + (k % 2) * 7, 70]], [(b0 + k + 0.9) * ppq, [0x92, 36 + (k % 2) * 7, 0]]);
  }
  return smf(1, ppq, [
    trackBytes([[0, nameEv('Tempo')], [0, tempoEv(100)], [0, timeSigEv(4, 4)], [0, keySigEv(0)], [8 * ppq, tempoEv(90)]]),
    trackBytes([[0, nameEv('Words')], ...words]),
    trackBytes([[0, nameEv('Piano')], [0, programEv(0, 0)], ...piano]),
    trackBytes([[0, nameEv('Flute')], [0, programEv(5, 73)], ...mel.ev], { running: true }),
    trackBytes([[0, nameEv('Drums')], ...drums], { running: true }),
    trackBytes([[0, nameEv('Bass')], [0, programEv(2, 33)], ...bass], { running: true }),
  ]);
}

test('MIDI: .kar karaoke file with Latin-1 words, markers, tempo change and a busy band', () => {
  const bytes = karFile();
  const midi = parseMidi(bytes);
  assert.equal(midi.format, 1);
  assert.equal(midi.tracks.length, 6);
  assert.equal(midi.encoding, 'windows-1252');
  assert.equal(midi.tracks[1].texts.find((x) => x.text.startsWith('@T')).text, '@TSunny Café Song');
  assert.deepEqual(
    midi.tempos.map((t) => [t.tick, Math.round(t.bpm)]),
    [[0, 100], [768, 90]]
  );
  // Seconds follow the tempo map: beat 8 at 100 bpm is 4.8 s, then 90 bpm.
  const flute = midi.tracks[3].notes;
  assert.equal(flute.length, 29);
  assert.ok(Math.abs(flute.find((n) => n.beat === 8).sec - 4.8) < 1e-9);
  assert.ok(Math.abs(flute.find((n) => n.beat === 9).sec - (4.8 + 60 / 90)) < 1e-6);
  assert.equal(flute[0].ch, 5);

  const r = importMidi(bytes, { fileName: 'sunny.kar' });
  assert.equal(r.source.kind, 'kar');
  assert.equal(r.song.title, 'Sunny Café Song');
  assert.equal(r.choices.find((c) => c.chosen).id, 't4c6', 'the tune is the flute on channel 6, not the piano, bass or drums');
  assert.ok(!r.choices.some((c) => c.id.endsWith('c10')), 'drums are never a choice');
  assert.equal(
    r.song.melody,
    'C5 C5 G5 G5 | A5 A5 G5/2 //\nF5 F5 E5 E5 | D5 D5 C5/2 //\nG5 G5 F5 F5 | E5 E5 D5/2 //\nG5 G5 F5 F5 | E5 E5 D5 C5'
  );
  assert.equal(
    r.song.lyrics,
    'Sun- ny days at ca- fé glow,\nBir- dies sing ü- ber- all snow.\nHap- py moon a- bove the sea,\nSmi- ling down on you and me. ~'
  );
  assert.equal(r.song.bpm, 90, 'the tempo that covers most of the song');
  assert.ok(r.warnings.some((w) => /tempo changes/.test(w)), r.warnings.join(' | '));
  assert.ok(!r.warnings.some((w) => /guessed|close second/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);
  // The held "me." shows once and is sung over two notes.
  const data = songData(r.song);
  const last = data.mel.notes.slice(-2);
  assert.deepEqual([last[0].text, last[1].hold, last[1].si === last[0].si], ['me.', true, true]);
});

test('MIDI: SMPTE timing, format 2, sysex, unknown chunks and damaged files', () => {
  // SMPTE: 25 frames a second, 40 ticks a frame = 1000 ticks a second.
  const smpte = smf(0, ((256 - 25) << 8) | 40, [trackBytes([[0, tempoEv(120)], [0, [0xf0, 3, 0x7e, 0x7f, 0xf7]], [1000, [0x90, 60, 80]], [1500, [0x80, 60, 0]], [1500, [0xf7, 1, 0xf8]], [2000, [0x90, 62, 80]], [2500, [0x80, 62, 0]]])]);
  const s = parseMidi(smpte);
  assert.deepEqual(s.division, { type: 'smpte', fps: 25, tpf: 40 });
  assert.deepEqual(
    s.tracks[0].notes.map((n) => [n.sec, n.beat, n.endBeat, n.m]),
    [[1, 2, 3, 60], [2, 4, 5, 62]]
  );

  // Format 2: every track keeps its own clock.
  const f2 = smf(2, 100, [trackBytes([[0, tempoEv(60)], [100, [0x90, 60, 80]], [200, [0x80, 60, 0]]]), trackBytes([[0, tempoEv(120)], [100, [0x90, 64, 80]], [200, [0x80, 64, 0]]])]);
  const two = parseMidi(f2);
  assert.equal(two.format, 2);
  assert.equal(two.tracks[0].notes[0].sec, 1);
  assert.equal(two.tracks[1].notes[0].sec, 0.5);

  // Unknown chunk between tracks, running status straight after a meta event (not allowed
  // by the standard, but common), no end-of-track marker, notes that never end.
  const body = [...vlq(0), 0x90, 60, 80, ...vlq(96), ...meta(0x01, ascii('hi')), ...vlq(0), 60, 0, ...vlq(0), 64, 80, ...vlq(96), 67, 80];
  const odd = new Uint8Array([...chunk('MThd', [0, 1, 0, 2, 0, 96]), ...chunk('XFIH', [1, 2, 3]), ...chunk('MTrk', trackBytes([[0, tempoEv(120)]])), ...chunk('MTrk', body)]);
  const o = parseMidi(odd);
  assert.deepEqual(
    o.tracks[1].notes.map((n) => [n.m, n.tick, n.endTick]),
    [[60, 0, 96], [64, 96, 192], [67, 192, 192]]
  );
  assert.ok(o.warnings.some((w) => /never ended/.test(w)));

  // Cut short in the middle of a track: read what is there.
  const whole = smf(0, 96, [trackBytes(tune(TW1, { ppq: 96 }).ev)]);
  const cut = parseMidi(whole.slice(0, whole.length - 20));
  assert.ok(cut.tracks[0].notes.length >= 5);
  assert.ok(cut.warnings.some((w) => /cut short/.test(w)));

  // A RIFF "RMID" wrapper around the same file.
  const le32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const riff = new Uint8Array([...ascii('RIFF'), ...le32(whole.length + 12), ...ascii('RMID'), ...ascii('data'), ...le32(whole.length), ...whole]);
  assert.equal(parseMidi(riff).tracks[0].notes.length, 7);

  assert.throws(() => parseMidi(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), /not a MIDI file/);
  assert.throws(() => importMidi(new Uint8Array(ascii('MThd'))), ImportError);
});

test('MIDI: a tune with no words is sung on "la"; the tune is guessed from the band', () => {
  const ppq = 240;
  const mel = tune(ODE, { ch: 3, ppq });
  const pad = [];
  for (let bar = 0; bar < 4; bar++) for (const m of [36, 43, 48, 52]) pad.push([bar * 4 * ppq, [0x91, m, 40]], [(bar * 4 + 4) * ppq, [0x81, m, 0]]);
  const bytes = smf(1, ppq, [trackBytes([[0, tempoEv(108)]]), trackBytes(pad), trackBytes(mel.ev)]);
  const r = importMidi(bytes, { fileName: 'Ode_to_Joy.mid' });
  assert.equal(r.song.title, 'Ode to Joy');
  assert.equal(r.song.lyrics, null);
  assert.ok(r.warnings.some((w) => /No words/.test(w)));
  assert.ok(r.warnings.some((w) => /guessed: track 3/.test(w)), r.warnings.join(' | '));
  assert.equal(notesOnly(r.song.melody).join(' '), 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4/1.5 D4/0.5 D4/2');
  assertPlayable(r.song);
  const data = songData(r.song);
  assert.ok(data.mel.notes.every((n) => n.text === 'la'));
});

test('MIDI: words that stop early, triplets, lyrics a little early, and an intro', () => {
  const ppq = 480;
  // An intro bar, then Twinkle with words for the first two lines only.
  const intro = [[C4, 0.5], [E4, 0.5], [G4, 0.5], [C5, 0.5], [G4, 2]];
  const mel = tune([...intro, ...TW1, ...TW2, ...TW3, ...TW4], { ppq });
  const words = ['Twin-', 'kle ', 'oh ', 'twin-', 'kle ', 'lit-', 'tle ', 'light, ', 'sing-', 'ing ', 'soft ', 'and ', 'shi-', 'ny bright.'];
  // Every syllable 30 ticks early, as some karaoke files do.
  const lyr = words.map((w, i) => [Math.round(mel.starts[i + 5] * ppq) - 30, lyricEv(utf8(w))]);
  const r = importMidi(smf(0, ppq, [trackBytes([...mel.ev, ...lyr])]));
  assert.ok(r.warnings.some((w) => /^Left out 5 notes before the words start/.test(w)), r.warnings.join(' | '));
  assert.ok(r.warnings.some((w) => /^Ran out of lyric syllables at bar 6; the 15 notes after that were left out/.test(w)), r.warnings.join(' | '));
  assert.equal(notesOnly(r.song.melody).length, 14);
  assert.equal(parseLyrics(r.song.lyrics).join(' '), 'Twin- kle oh twin- kle lit- tle light, sing- ing soft and shi- ny‿bright.');
  assertPlayable(r.song);

  // Swung triplets with a little human timing, then straight eighths.
  const t3 = [];
  const tick = (b, jitter) => Math.round(b * ppq) + jitter;
  const trip = [[0, 0], [1 / 3, 6], [2 / 3, -5], [1, 3], [1 + 1 / 3, -4], [1 + 2 / 3, 5]];
  const scale = [C4, D4, E4, F4, G4, A4, B4, C5, D5, C5];
  trip.forEach(([b, j], i) => t3.push([tick(b, j), [0x90, scale[i], 80]], [tick(b + 0.3, j), [0x90, scale[i], 0]]));
  [2, 2.5, 3, 3.5].forEach((b, i) => t3.push([tick(b, 2), [0x90, scale[6 + i], 80]], [tick(b + 0.45, 2), [0x90, scale[6 + i], 0]]));
  const r3 = importMidi(smf(0, ppq, [trackBytes(t3)]));
  assert.equal(r3.song.melody, 'C4/0.3333 D4/0.3334 E4/0.3333 F4/0.3333 G4/0.3334 A4/0.3333 B4/0.5 C5/0.5 D5/0.5 C5/0.5');
  assert.equal(parseMelody(r3.song.melody).totalBeats, 4);

  // Dotted rhythms played a little loosely: starts snap to sixteenths, ends to eighths.
  const dotted = [];
  [[0, 0.75, C4, 9], [0.75, 0.25, D4, -12], [1, 1, E4, 4], [2, 0.5, F4, -7], [2.5, 0.5, G4, 15], [3, 1, A4, 0]].forEach(([b, d, m, j]) =>
    dotted.push([tick(b, j), [0x90, m, 80]], [tick(b + d * 0.8, j), [0x90, m, 0]])
  );
  const rd = importMidi(smf(0, ppq, [trackBytes(dotted)]));
  assert.equal(rd.song.melody, 'C4/0.75 D4/0.25 E4 F4/0.5 G4/0.5 A4');
});

test('MIDI: chord names in a Marker track become chords', () => {
  const ppq = 480;
  const mel = tune([...TW1, ...TW2], { ppq });
  const words = ['Up ', 'we ', 'go ', 'to ', 'the ', 'big ', 'tree, ', 'down ', 'we ', 'come ', 'to ', 'you ', 'and ', 'me.'];
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * ppq), lyricEv(utf8(w))]);
  const marks = [[0, 'C'], [4, 'F'], [6, 'C'], [8, 'G7'], [10, 'C'], [12, 'G7'], [14, 'C']].map(([b, c]) => [b * ppq, meta(0x06, ascii(c))]);
  const r = importMidi(smf(0, ppq, [trackBytes([...mel.ev, ...lyr, ...marks])]));
  assert.equal(r.song.chords, 'C/4 | F/2 C/2 | G7/2 C/2 | G7/2 C/2');
  assertPlayable(r.song);
  const [step] = buildSong(r.song, RANGE, { mode: 'along' });
  assert.ok(step.audio.some((a) => a.kind === 'piano'));
});

test('karaoke syllables and chord names', () => {
  const ev = (texts) => texts.map((text, i) => ({ beat: i, text }));
  const join = (syls) => syls.map((s) => s.text + (s.joinNext ? '-' : '')).join(' ');
  // Words with no spaces at all: a trailing hyphen joins, anything else ends a word.
  assert.equal(join(karaokeSyllables(ev(['Twin-', 'kle', 'twin-', 'kle', 'star']))), 'Twin- kle twin- kle star');
  // A whole line in one event: split into words (and hyphenated syllables) that follow on.
  const lines = karaokeSyllables(ev(['Hel-lo there my friend', 'See you soon']));
  assert.deepEqual(
    lines.map((s) => [s.text, s.follow, s.joinNext]),
    [['Hel', false, 'join'], ['lo', true, null], ['there', true, null], ['my', true, null], ['friend', true, null], ['See', false, null], ['you', true, null], ['soon', true, null]]
  );
  // A lone "-" event, control characters and paragraph markers.
  const odd = karaokeSyllables(ev(['\\Ma', '-', 'ry\u0007', ' had', '\r', 'a', ' lamb']));
  assert.deepEqual(
    odd.map((s) => [s.text, s.joinNext, s.line, s.para]),
    [['Ma', 'join', true, true], ['ry', null, false, false], ['had', null, false, false], ['a', null, true, false], ['lamb', null, false, false]]
  );
  assert.deepEqual(parseChordSymbol('F#m7'), { root: 6, quality: 'm7', none: false });
  assert.deepEqual(parseChordSymbol('Bbmaj7'), { root: 10, quality: 'maj7', none: false });
  assert.deepEqual(parseChordSymbol('Dsus4'), { root: 2, quality: '', none: false });
  assert.deepEqual(parseChordSymbol('C/E'), { root: 0, quality: '', none: false });
  assert.deepEqual(parseChordSymbol('Bdim'), { root: 11, quality: 'm', none: false });
  assert.equal(parseChordSymbol('N.C.').none, true);
  assert.equal(parseChordSymbol('Ah'), null);
  assert.equal(parseChordSymbol('Doe'), null);
});

// ---------- MIDI: melismas, fills, played note lengths, pickups ----------

// Syllable events on the starts of the listed notes (index -> text).
const wordsAt = (starts, words, ppq = PPQ) => Object.entries(words).map(([i, w]) => [Math.round(starts[i] * ppq), lyricEv(utf8(w))]);

test('MIDI: long melismas are held, and a fill after a rest is left out', () => {
  // Ode to Joy in eighths, sung on one syllable: 8 notes after a word's last syllable, and
  // 16 notes in the middle of a hyphenated word ("Glo- … ri- a"). No extender exists in MIDI.
  const run8 = [E4, E4, F4, G4, G4, F4, E4, D4].map((m) => [m, 0.5]);
  const run16 = [...run8, ...[C4, C4, D4, E4, E4, D4, D4, C4].map((m) => [m, 0.5])];
  const mel = tune([[C4, 1], [C4, 1], [G4, 1], [G4, 1], ...run8, [A4, 1], [A4, 1], [G4, 2], [F4, 1], ...run16, [E4, 1], [D4, 1], [C4, 2]]);
  const lyr = wordsAt(mel.starts, { 0: 'Sing ', 1: 'a ', 2: 'lit-', 3: 'tle ', 12: 'song ', 13: 'for ', 14: 'me,\r', 15: 'Glo-', 32: 'ri-', 33: 'a ', 34: 'now.' });
  const r = importMidi(smf(0, PPQ, [trackBytes([...mel.ev, ...lyr])]));
  const hold = (n) => Array(n).fill('~').join(' ');
  assert.equal(parseLyrics(r.song.lyrics).join(' '), `Sing a lit- tle ${hold(8)} song for me, Glo- ${hold(16)} ri- a now.`);
  assert.ok(!r.warnings.some((w) => /Left out|Ran out/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);

  // A lead instrument plays a lick in the rest after a line: that's not the singer.
  const line1 = tune([...TW1.slice(0, 6), [G4, 1], ['r', 1], ...TW2]);
  const lick = tune([[C5, 0.25], [D5, 0.25], [C5, 0.25]], { at: 7.25 });
  const words = wordsAt(line1.starts, Object.fromEntries('Up we go to the big tree, down we come to you and me.'.split(' ').map((w, i) => [i, w + ' '])));
  const f = importMidi(smf(0, PPQ, [trackBytes([...line1.ev, ...lick.ev, ...words])]));
  assert.equal(parseLyrics(f.song.lyrics).join(' '), 'Up we go to the big tree, down we come to you and me.');
  assert.equal(notesOnly(f.song.melody).join(' '), 'C4 C4 G4 G4 A4 A4 G4 r/1 F4 F4 E4 E4 D4 D4 C4/2');
  assert.ok(f.warnings.some((w) => /^Left out 3 notes with no words/.test(w)), f.warnings.join(' | '));
});

test('MIDI: notes held for 80% of their length keep their written length', () => {
  // Dotted, long and tied-over notes, and one real rest, all played at 80%.
  const items = [[E4, 1.5], [D4, 0.5], [C4, 2], [D4, 1], [E4, 1], [F4, 1], ['r', 1], [G4, 5], [F4, 1], [E4, 1], [D4, 1], [C4, 4]];
  const r = importMidi(smf(0, PPQ, [trackBytes(tune(items, { legato: 0.8 }).ev)]));
  assert.equal(notesOnly(r.song.melody).join(' '), 'E4/1.5 D4/0.5 C4/2 D4 E4 F4 r/1 G4/5 F4 E4 D4 C4/4');

  // A karaoke line marker keeps a five-bar line whole, even with a comma and a rest in it.
  const long = [[C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 1.5], ['r', 0.5], ...TW2, [E4, 1], [D4, 1], [C4, 2]];
  const mel = tune([...long, ...TW3, ...TW4]);
  const text = 'Hap-py lit-tle bells ring out, all a-long the snow-y road and back home, Ring-ing on and on for you, and for me, sing-ing all the way.';
  const syl = text.split(' ').flatMap((w) => w.split(/(?<=-)/));
  assert.equal(syl.length, 32);
  const mark = { 0: '\\', 17: '/', 24: '/' };
  const lyr = syl.map((s, i) => [Math.round(mel.starts[i] * PPQ), textEv(ascii((mark[i] || '') + s + (s.endsWith('-') ? '' : ' ')))]);
  const k = importMidi(smf(0, PPQ, [trackBytes([...mel.ev, ...lyr])]), { fileName: 'bells.kar' });
  assert.deepEqual(k.song.lyrics.split('\n'), ['Hap- py lit- tle bells ring out, all a- long the snow- y road and back home,', 'Ring- ing on and on for you,', 'and for me, sing- ing all the way.']);
});

test('MIDI: a pickup written as a 1/4 bar is a short first bar, not a change of time', () => {
  const mel = tune([[G4, 1], ...TW1, ...TW2]);
  const words = 'Now the sun is up so high, shin-ing on the gar-den wall.'.split(' ').flatMap((w) => w.split(/(?<=-)/));
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * PPQ), lyricEv(utf8(w.endsWith('-') ? w : w + ' '))]);
  const r = importMidi(smf(0, PPQ, [trackBytes([[0, timeSigEv(1, 4)], [PPQ, timeSigEv(4, 4)], ...mel.ev, ...lyr])]));
  assert.ok(!r.warnings.some((w) => /time signature/.test(w)), r.warnings.join(' | '));
  assert.equal(r.song.meter, 4);
  assert.ok(r.song.melody.startsWith('G4 | C4 C4 G4 G4 | A4 A4 G4/2'), r.song.melody);
  assert.ok(parseMelody(r.song.melody).phrases[0][1] >= 8, 'the first line runs on past the pickup');
});

test('MIDI: a whole line in one karaoke event, however long, keeps its words', () => {
  const mel = tune([...TW1, ...TW2, ...TW3, ...TW4]);
  const lines = [
    '\\Wonderful glittering starlight twinkling everywhere tonight brightly',
    '/Over the rooftops and chimneys the candles are glowing',
    '\\Sleepy little children are dreaming of summer',
    '/Under their blankets the kittens are purring softly',
  ];
  assert.ok(lines[0].length > 64);
  const firsts = [0, 7, 14, 21];
  const lyr = lines.map((l, i) => [Math.round(mel.starts[firsts[i]] * PPQ), textEv(ascii(l))]);
  const r = importMidi(smf(0, PPQ, [trackBytes([...mel.ev, ...lyr])]), { fileName: 'stars.kar' });
  assert.equal(parseLyrics(r.song.lyrics).slice(0, 7).join(' '), 'Wonderful glittering starlight twinkling everywhere tonight brightly');
  assert.ok(r.warnings.some((w) => /a whole line at a time/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);
});

test('MIDI: a harmony line in the tune\'s track is flagged for the grown-up', () => {
  // Twinkle with a descant a third above, on the same channel, in its second half. Nothing in
  // the file says which line is the tune, so the top note is kept and the grown-up is told.
  const mel = tune([...TW1, ...TW2, ...TW3, ...TW4]);
  const descant = tune([...TW3, ...TW4].map(([m, d]) => [m + 4, d]), { at: 16 });
  const words = 'Sing a song of stars to-night, shin-ing on the hill so bright, hear the night birds call to you, all the dark-ness through.'.split(' ').flatMap((w) => w.split(/(?<=-)/));
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * PPQ), lyricEv(utf8(w.endsWith('-') ? w : w + ' '))]);
  const r = importMidi(smf(0, PPQ, [trackBytes([...mel.ev, ...descant.ev, ...lyr])]));
  assert.ok(r.warnings.some((w) => /^From bar 5, the tune’s track often plays two notes at once/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);
});

test('MIDI: long breaks shrink to one bar, and the chords stay with the tune', () => {
  const mel = tune([...TW1, ['r', 24], ...TW2]);
  const words = 'Up we go to the big tree, down we come to you and me.'.split(' ');
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * PPQ), lyricEv(utf8(w + ' '))]);
  const marks = [[0, 'C'], [32, 'G']].map(([b, c]) => [b * PPQ, meta(0x06, ascii(c))]);
  const r = importMidi(smf(0, PPQ, [trackBytes([...mel.ev, ...lyr, ...marks])]));
  assert.ok(r.warnings.includes('A long break with no singing was shortened to one bar.'), r.warnings.join(' | '));
  assert.equal(parseMelody(r.song.melody).totalBeats, 20);
  assert.equal(r.song.chords, 'C/4 | C/4 | C/4 | G/4 | G/4');
});

// ---------- MIDI files made to be awkward ----------

test('MIDI: a RIFF length with the top bit set, and note-ons stacked on one key', () => {
  // The first chunk claims 0xFFFFFFF8 bytes: reading it as a negative number used to loop forever.
  const inner = smf(0, 96, [trackBytes(tune(TW1, { ppq: 96 }).ev)]);
  const le32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const riff = (len) => new Uint8Array([...ascii('RIFF'), ...le32(inner.length + 24), ...ascii('RMID'), ...ascii('LIST'), ...le32(len), ...ascii('INFO'), ...ascii('data'), ...le32(inner.length), ...inner]);
  assert.throws(() => parseMidi(riff(0xfffffff8)), /no MIDI data/);
  assert.equal(parseMidi(riff(4)).tracks[0].notes.length, 7, 'a LIST chunk before the data is skipped');

  // Three note-ons on one key, then three note-offs: each off ends the oldest note.
  const body = [0, 0x90, 60, 90, 10, 60, 91, 10, 60, 92, 10, 60, 0, 10, 60, 0, 10, 60, 0, 0, 0xff, 0x2f, 0];
  const t = parseMidi(smf(0, 96, [body])).tracks[0];
  assert.deepEqual(
    t.notes.map((n) => [n.tick, n.endTick, n.vel]),
    [[0, 30, 90], [10, 40, 91], [20, 50, 92]]
  );
  // Tens of thousands of them stay quick (each note-off used to shift the whole queue).
  const n = 60000;
  const stacked = [0, 0x90];
  for (let i = 0; i < n; i++) stacked.push(60, 90, 0);
  for (let i = 0; i < n; i++) stacked.push(60, 0, 0);
  stacked.pop();
  stacked.push(0xff, 0x2f, 0);
  const t0 = performance.now();
  assert.equal(parseMidi(smf(0, 96, [stacked])).tracks[0].notes.length, n);
  assert.ok(performance.now() - t0 < 1000, 'stacked note-ons are matched in constant time');
});

test('MIDI: notes, text and tempo floods are capped while the file is read', async () => {
  const { MIDI_LIMITS } = await import('../js/midi.js');
  const saved = { ...MIDI_LIMITS };
  try {
    Object.assign(MIDI_LIMITS, { notes: 10, texts: 5, metas: 3 });
    const mel = tune([...TW1, ...TW2]);
    const lyr = 'Up we go to the big tree'.split(' ').map((w, i) => [Math.round(mel.starts[i] * PPQ), lyricEv(utf8(w + ' '))]);
    const tempos = [100, 101, 102, 103, 104].map((b, i) => [i * PPQ, tempoEv(b)]);
    const midi = parseMidi(smf(0, PPQ, [trackBytes([...tempos, ...mel.ev, ...lyr])]));
    assert.equal(midi.tracks[0].notes.length, 10);
    assert.equal(midi.tracks[0].texts.length, 5);
    assert.equal(midi.tempos.length, 3);
    for (const what of ['notes; only the first 10', 'text events; only the first 5', 'tempo changes; only the first 3']) {
      assert.ok(midi.warnings.some((w) => w.includes(what)), what);
    }
  } finally {
    Object.assign(MIDI_LIMITS, saved);
  }

  // Syllables are capped too, and so are the tracks and channels weighed as the tune.
  assert.equal(karaokeSyllables([{ beat: 0, text: 'one two three four five' }, { beat: 1, text: 'six seven' }], 3).length, 3);
  const tracks = [];
  for (let i = 0; i < 70; i++) tracks.push(trackBytes(tune([[C4 + (i % 12), 1]], { ch: i % 9 }).ev));
  const many = importMidi(smf(1, PPQ, tracks));
  assert.ok(many.choices.length <= 64, `${many.choices.length} choices`);
  // A file whose notes are all cut to nothing has no notes, not "only drums".
  assert.throws(() => importMidi(smf(0, 96, [[0, 0x90, 60, 90, 0, 60, 0, 0, 0xff, 0x2f, 0]])), /has no notes/);
});

// ---------- XML ----------

test('XML reader: entities, CDATA, comments, namespaces, and no DTD processing', () => {
  const doc = parseXML(`<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!-- a ] bracket and a > inside a comment -->
]>
<mx:root xmlns:mx="urn:x" a='1 &amp; 2' b="x>y" c="&#x41;&#66;&#0;">
  <!-- comment -->
  <t>&lt;tag&gt; &amp; &quot;q&quot; &apos;a&apos; &#233;&#x1F600; &lol2; &nope</t>
  <t><![CDATA[<raw> & stuff]]></t>
  <empty/>
  <stray></wrong></stray>
</mx:root>`);
  const root = doc.children[0];
  assert.equal(root.name, 'root');
  assert.deepEqual(root.attrs, { 'xmlns:mx': 'urn:x', a: '1 & 2', b: 'x>y', c: 'AB\ufffd' });
  const [t1, t2] = root.children.filter((c) => c.name === 't');
  assert.equal(t1.text, '<tag> & "q" \'a\' é😀 &lol2; &nope');
  assert.equal(t2.text, '<raw> & stuff');
  assert.equal(root.children.length, 4);
  assert.equal(decodeEntities('&amp;lt;'), '&lt;', 'decoded once only');
  assert.throws(() => parseXML('<a><!-- never closed'), /unfinished comment/);
  // Bytes: a Latin-1 declaration, UTF-16 with a byte-order mark, and bad UTF-8.
  assert.equal(decodeXmlBytes(new Uint8Array([...ascii('<?xml version="1.0" encoding="ISO-8859-1"?><a>caf'), 0xe9, ...ascii('</a>')])).endsWith('café</a>'), true);
  const u16 = [0xff, 0xfe, ...[...'<a>ü</a>'].flatMap((c) => [c.charCodeAt(0), 0])];
  assert.equal(decodeXmlBytes(new Uint8Array(u16)), '<a>ü</a>');
  assert.equal(decodeXmlBytes(new Uint8Array([...ascii('<a>'), 0x93, 0x96, ...ascii('</a>')])), '<a>“–</a>');
  assert.equal(decodeCp1252(new Uint8Array([0x80, 0x92, 0xe9, 0x81])), '€’é\u0081');
});

// ---------- MusicXML ----------

// New Britain (1829, the "Amazing Grace" tune) in 3/4 with a pickup, a melisma, a tie,
// chord symbols and two verses of made-up words.
function xnote({ p, dur, type, lyrics = [], tie, chord = false, voice = 1, rest = false, grace = false }) {
  const [, step, acc, oct] = rest ? [] : /^([A-G])([#b]?)(\d)$/.exec(p);
  const alter = acc === '#' ? 1 : acc === 'b' ? -1 : 0;
  const pitch = rest ? '<rest/>' : `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch>`;
  const ties = tie ? tie.map((t) => `<tie type="${t}"/>`).join('') : '';
  const tied = tie ? `<notations>${tie.map((t) => `<tied type="${t}"/>`).join('')}</notations>` : '';
  const lyr = lyrics
    .map((l, i) => (l ? `<lyric number="${i + 1}"><syllabic>${l.s || 'single'}</syllabic><text>${l.t}</text>${l.ext ? '<extend/>' : ''}</lyric>` : ''))
    .join('');
  return `<note>${grace ? '<grace/>' : ''}${chord ? '<chord/>' : ''}${pitch}${grace ? '' : `<duration>${dur}</duration>`}${ties}<voice>${voice}</voice><type>${type}</type>${tied}${lyr}</note>`;
}
const L = (t, s = 'single', ext = false) => ({ t, s, ext });
const harmony = (step, kind = 'major', alter = 0) => `<harmony><root><root-step>${step}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ''}</root><kind>${kind}</kind></harmony>`;

function newBritainMeasures() {
  const q = (p, l1, l2, extra = {}) => xnote({ p, dur: 2, type: 'quarter', lyrics: [l1, l2], ...extra });
  const h = (p, l1, l2, extra = {}) => xnote({ p, dur: 4, type: 'half', lyrics: [l1, l2], ...extra });
  const e = (p, l1, l2) => xnote({ p, dur: 1, type: 'eighth', lyrics: [l1, l2] });
  return [
    { attrs: 'number="0" implicit="yes"', body: `<attributes><divisions>2</divisions><key><fifths>1</fifths><mode>major</mode></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>80</per-minute></metronome></direction-type><sound tempo="80"/></direction>${q('D4', L('The'), L('The'))}` },
    { attrs: 'number="1"', body: `${harmony('G')}${h('G4', L('morn', 'begin'), L('eve', 'begin'))}${e('B4', L('ing', 'end', true), L('ning', 'end', true))}${e('G4')}` },
    { attrs: 'number="2"', body: `${h('B4', L('light'), L('stars'))}${q('A4', L('so'), L('come'))}` },
    { attrs: 'number="3"', body: `${harmony('C')}${h('G4', L('warm'), L('out'))}${q('E4', L('and'), L('to'))}` },
    { attrs: 'number="4"', body: `${harmony('G')}${h('D4', L('bright,'), L('play,'))}${q('D4', L('wakes'), L('and'))}` },
    { attrs: 'number="5"', body: `${h('G4', L('up'), L('wave'))}${e('B4', L('the', 'single', true), L('a', 'single', true))}${e('G4')}` },
    { attrs: 'number="6"', body: `${harmony('D', 'dominant')}${h('B4', L('sleep', 'begin'), L('sil', 'begin'))}${q('A4', L('y', 'end'), L('ver', 'end'))}` },
    { attrs: 'number="7"', body: `${harmony('G')}${xnote({ p: 'D5', dur: 6, type: 'half', lyrics: [L('town.'), L('hand.')], tie: ['start'] })}` },
    { attrs: 'number="8"', body: `${xnote({ p: 'D5', dur: 4, type: 'half', tie: ['stop'] })}${xnote({ rest: true, dur: 2, type: 'quarter' })}<barline location="right"><bar-style>light-heavy</bar-style></barline>` },
  ];
}
const PART_LIST = (parts) => `<part-list>${parts.map(([id, name]) => `<score-part id="${id}"><part-name>${name}</part-name></score-part>`).join('')}</part-list>`;
function partwise(title, parts) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0"><work><work-title>${title}</work-title></work>${PART_LIST(parts.map((p) => [p.id, p.name]))}
${parts.map((p) => `<part id="${p.id}">${p.measures.map((m) => `<measure ${m.attrs}>${m.body}</measure>`).join('\n')}</part>`).join('\n')}
</score-partwise>`;
}
function timewise(title, parts) {
  const n = parts[0].measures.length;
  const ms = [];
  for (let i = 0; i < n; i++) ms.push(`<measure ${parts[0].measures[i].attrs}>${parts.map((p) => `<part id="${p.id}">${p.measures[i].body}</part>`).join('')}</measure>`);
  return `<?xml version="1.0"?><score-timewise version="4.0"><movement-title>${title}</movement-title>${PART_LIST(parts.map((p) => [p.id, p.name]))}${ms.join('\n')}</score-timewise>`;
}
const NB_XML = partwise('Morning Light', [{ id: 'P1', name: 'Voice', measures: newBritainMeasures() }]);

const NB_MELODY_VERSE = [
  'D4 | G4/2 B4/0.5 G4/0.5 | B4/2 A4 | G4/2 E4 | D4/2',
  'D4 | G4/2 B4/0.5 G4/0.5 | B4/2 A4 | D5/5',
];
const NB_MELODY = [NB_MELODY_VERSE[0], NB_MELODY_VERSE[1] + ' r/1', NB_MELODY_VERSE[0], NB_MELODY_VERSE[1]].join(' //\n');
const NB_LYRICS = 'The morn- ing ~ light so warm and bright,\nwakes up the ~ sleep- y town.\nThe eve- ning ~ stars come out to play,\nand wave a ~ sil- ver hand.';
const NB_CHORDS = '-/1 | G/3 | G/3 | C/3 | G/3 | G/3 | D7/3 | G/3 | G/3 | G/1 | G/3 | G/3 | C/3 | G/3 | G/3 | D7/3 | G/3 | G/2';

test('MusicXML: pickup, melisma, tie, chord symbols and two verses', () => {
  const score = readMusicXML(NB_XML);
  assert.equal(score.title, 'Morning Light');
  assert.equal(score.parts.length, 1);
  assert.equal(score.parts[0].measures[0].len, 1, 'the pickup bar is one beat');
  assert.equal(score.parts[0].measures[8].len, 3);

  const r = importMusicXML(NB_XML, { fileName: 'morning.musicxml' });
  assert.equal(r.song.title, 'Morning Light');
  assert.equal(r.song.key, 'G');
  assert.equal(r.song.bpm, 80);
  assert.equal(r.song.meter, 3);
  assert.equal(r.song.pulse, undefined);
  assert.equal(r.song.melody, NB_MELODY);
  assert.equal(r.song.lyrics, NB_LYRICS);
  assert.equal(r.song.chords, NB_CHORDS);
  assert.ok(r.warnings.some((w) => /once for each verse/.test(w)), r.warnings.join(' | '));
  assert.equal(r.source.kind, 'musicxml');
  assert.equal(r.stats.lines, 4);
  assertPlayable(r.song);
  // The tie made one five-beat note, the melisma holds "ing", and the chords play.
  const data = songData(r.song);
  assert.equal(data.mel.notes.filter((n) => n.beats === 5).length, 2);
  assert.equal(data.mel.notes[3].hold, true);
  assert.equal(data.mel.notes[2].text, 'ing');
  assert.ok(data.chords.some((c) => c.quality === '7'));

  // The same score written timewise gives the same song.
  const tw = importMusicXML(timewise('Morning Light', [{ id: 'P1', name: 'Voice', measures: newBritainMeasures() }]));
  assert.equal(tw.song.melody, r.song.melody);
  assert.equal(tw.song.lyrics, r.song.lyrics);
  assert.equal(tw.song.id, r.song.id);
});

test('MusicXML: repeats with endings, verses per pass, a transposing part, voices and a grace note', () => {
  // Ode to Joy for B-flat clarinet (written a step higher), with a piano part first.
  const n = (p, l1, l2, extra = {}) => xnote({ p, dur: 1, type: 'quarter', lyrics: [l1, l2], ...extra });
  const wq = (p, l1, l2) => xnote({ p, dur: 2, type: 'half', lyrics: [l1, l2] });
  const voice2 = `<backup><duration>4</duration></backup>${xnote({ p: 'D4', dur: 4, type: 'whole', voice: 2 })}`;
  const clar = [
    {
      attrs: 'number="1"',
      body: `<attributes><divisions>1</divisions><key><fifths>2</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes><barline location="left"><repeat direction="forward"/></barline>${n('F#4', L('Bright'), L('Soft'))}${xnote({ p: 'D4', dur: 1, type: 'quarter', chord: true })}${n('F#4', L('lit', 'begin'), L('the'))}${n('G4', L('tle', 'end'), L('eve', 'begin'))}${n('A4', L('bells'), L('ning', 'end'))}${voice2}`,
    },
    {
      attrs: 'number="2"',
      body: `${xnote({ p: 'B4', type: 'eighth', grace: true })}${n('A4', L('ring'), L('light'))}${n('G4', L('a', 'begin'), L('is'))}${n('F#4', L('cross', 'end'), L('fall', 'begin'))}${n('E4', L('the'), L('ing', 'end'))}${voice2}`,
    },
    {
      attrs: 'number="3"',
      body: `<barline location="left"><ending number="1" type="start"/></barline>${n('D4', L('val', 'begin'))}${n('D4', L('ley', 'end'))}${n('E4', L('green'))}${n('F#4', L('and'))}<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>`,
    },
    {
      attrs: 'number="4"',
      body: `<barline location="left"><ending number="2" type="start"/></barline>${n('F#4', null, L('home'))}${n('E4', null, L('we'))}${wq('E4', null, L('go.'))}<barline location="right"><bar-style>light-heavy</bar-style><ending number="2" type="discontinue"/></barline>`,
    },
  ];
  const chord = (steps) => steps.map((p, i) => xnote({ p, dur: 4, type: 'whole', chord: i > 0 })).join('');
  // The piano part carries the tempo mark and the chord symbols.
  const piano = [
    { attrs: 'number="1"', body: `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><direction><direction-type><words>Brightly</words></direction-type><sound tempo="120"/></direction>${harmony('C')}${chord(['C3', 'E3', 'G3'])}` },
    { attrs: 'number="2"', body: `${harmony('G')}${chord(['G2', 'B2', 'D3'])}` },
    { attrs: 'number="3"', body: `${harmony('A', 'minor')}${chord(['C3', 'E3', 'G3'])}` },
    { attrs: 'number="4"', body: `${harmony('G', 'dominant')}${chord(['G2', 'B2', 'D3'])}` },
  ];
  const xml = partwise('Bells', [
    { id: 'P1', name: 'Piano', measures: piano },
    { id: 'P2', name: 'Clarinet in B♭', measures: clar },
  ]);
  const score = readMusicXML(xml);
  const line = musicxmlMelody(score);
  assert.equal(line.info.part, 1);
  assert.equal(line.info.voice, '1');
  assert.equal(line.measures.length, 6, 'played: 1 2 3 1 2 4');

  const r = importMusicXML(xml);
  assert.equal(r.song.key, 'C', 'D major for B♭ clarinet sounds in C');
  assert.equal(r.song.bpm, 120, 'the tempo mark on the piano part');
  assert.equal(r.song.chords, 'C/4 | G/4 | Am/4 | C/4 | G/4 | G7/4');
  assert.equal(notesOnly(r.song.melody).join(' '), 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 E4 F4 G4 G4 F4 E4 D4 E4 D4 D4/2');
  assert.equal(parseLyrics(r.song.lyrics).join(' '), 'Bright lit- tle bells ring a- cross the val- ley green and Soft the eve- ning light is fall- ing home we go.');
  assert.ok(r.warnings.some((w) => /Clarinet in B♭/.test(w)), r.warnings.join(' | '));
  assert.ok(r.choices.length >= 3, 'piano, clarinet voice 1 and voice 2');
  assertPlayable(r.song);
  // The second pass starts a new line.
  const mel = parseMelody(r.song.melody);
  assert.ok(mel.phrases.some(([s]) => s === 12));

  // Choosing voice 2 instead: no words, sung on "la".
  const v2 = importMusicXML(xml, { melody: r.choices.find((c) => /voice 2/.test(c.label)).id });
  assert.equal(v2.song.lyrics, null);
  assert.equal(notesOnly(v2.song.melody)[0], 'C4/4');
});

// A zip file the way MusicXML apps write .mxl, built by hand.
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const le16 = (n) => [n & 255, (n >> 8) & 255];
  const le32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const f of files) {
    const name = utf8(f.name);
    const data = new Uint8Array(f.data);
    const body = f.deflate ? new Uint8Array(deflateRawSync(data)) : data;
    const crc = f.badCrc ? 1234 : zlibCrc32(data);
    const head = [...le16(20), ...le16(0x800), ...le16(f.deflate ? 8 : 0), ...le16(0), ...le16(0), ...le32(crc), ...le32(body.length), ...le32(data.length), ...le16(name.length)];
    local.push(0x50, 0x4b, 3, 4, ...head, ...le16(0), ...name, ...body);
    central.push(0x50, 0x4b, 1, 2, ...le16(20), ...head, ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...name);
    offset = local.length;
  }
  const end = [0x50, 0x4b, 5, 6, ...le16(0), ...le16(0), ...le16(files.length), ...le16(files.length), ...le32(central.length), ...le32(offset), ...le16(0)];
  return new Uint8Array([...local, ...central, ...end]);
}

test('MusicXML: compressed .mxl through META-INF/container.xml', async () => {
  const container = '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="score/morning.xml" media-type="application/vnd.recordare.musicxml+xml"/><rootfile full-path="morning.pdf" media-type="application/pdf"/></rootfiles></container>';
  const decoy = '<?xml version="1.0"?><score-partwise><part-list/></score-partwise>';
  const mxl = zip([
    { name: 'mimetype', data: ascii('application/vnd.recordare.musicxml') },
    { name: 'decoy.xml', data: utf8(decoy), deflate: true },
    { name: 'META-INF/container.xml', data: utf8(container) },
    { name: 'score/morning.xml', data: utf8(NB_XML), deflate: true },
  ]);
  const r = await importSongFile(mxl, 'Morning Light.mxl');
  assert.equal(r.source.kind, 'mxl');
  assert.equal(r.song.melody, NB_MELODY);
  assert.equal(r.song.lyrics, NB_LYRICS);
  assert.equal(r.song.id, importMusicXML(NB_XML).song.id);
  assert.equal(crc32(utf8('hello')), zlibCrc32(Buffer.from('hello')));

  const broken = zip([{ name: 'score.xml', data: utf8(NB_XML), deflate: true, badCrc: true }]);
  await assert.rejects(importSongFile(broken, 'broken.mxl'), (e) => e instanceof ImportError && /damaged/.test(e.message));
  await assert.rejects(importSongFile(new Uint8Array(ascii('just some text')), 'notes.txt'), (e) => e instanceof ImportError && /can read/.test(e.message));
  // Plain .musicxml bytes go through the same door.
  const plain = await importSongFile(enc.encode(NB_XML), 'morning.musicxml');
  assert.equal(plain.song.id, r.song.id);
});

// ---------- MusicXML: melismas, jumps, verses and pickups ----------

// Small scores in 4/4 with 2 divisions a beat. n('q', 'C4', 'one', 'two'): a quarter note C4
// with "one" on lyric line 1 and "two" on line 2 (null: no syllable on that line).
const LEN = { e: [1, 'eighth'], q: [2, 'quarter'], h: [4, 'half'], w: [8, 'whole'] };
const n = (len, p, ...lyrics) => xnote({ p, dur: LEN[len][0], type: LEN[len][1], lyrics: lyrics.map((t) => (typeof t === 'string' ? L(t) : t)) });
const rest = (len) => xnote({ rest: true, dur: LEN[len][0], type: LEN[len][1] });
const bar = (num, body) => ({ attrs: `number="${num}"`, body: (num === 1 ? '<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' : '') + body });
const voiceScore = (measures, name = 'Voice') => partwise('Test', [{ id: 'P1', name, measures }]);
const sung = (r) => parseLyrics(r.song.lyrics).join(' ');
const lineStarts = (r) => {
  const lyr = parseLyrics(r.song.lyrics);
  return parseMelody(r.song.melody).phrases.map(([s]) => lyr[s]);
};
const sound = (attrs, words = '') => `<direction>${words ? `<direction-type><words>${words}</words></direction-type>` : ''}<sound ${attrs}/></direction>`;
const words = (w) => `<direction><direction-type><words>${w}</words></direction-type></direction>`;
const FWD = '<barline location="left"><repeat direction="forward"/></barline>';
const BACK = '<barline location="right"><repeat direction="backward"/></barline>';
const ending = (num, type, side = 'left', more = '') => `<barline location="${side}"><ending number="${num}" type="${type}"/>${more}</barline>`;

test('MusicXML: a long melisma with no extender line is sung; a cue cut off by rests is not', () => {
  // Ode to Joy in eighths on "-py", as engravers leave the extender off. Bar 5 is an
  // instrumental cue in the voice part, after a bar's rest.
  const run = ['G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4'].map((p) => n('e', p)).join('');
  const xml = voiceScore([
    bar(1, n('q', 'E4', 'Sing') + n('q', 'E4', 'a') + n('q', 'F4', L('hap', 'begin')) + n('q', 'G4', L('py', 'end'))),
    bar(2, run),
    bar(3, n('q', 'E4', 'all') + n('q', 'D4', 'day') + n('h', 'D4', 'long.')),
    bar(4, rest('w')),
    bar(5, n('q', 'C4') + n('q', 'D4') + rest('h')),
    bar(6, n('q', 'E4', 'Sing') + n('q', 'E4', 'it') + n('h', 'F4', 'now.')),
  ]);
  const r = importMusicXML(xml);
  assert.equal(sung(r), 'Sing a hap- py ~ ~ ~ ~ ~ ~ ~ ~ all day long. Sing it now.');
  assert.ok(r.warnings.some((w) => /^Left out 2 notes with no words .*from bar 5/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);
});

test('MusicXML: D.S. al Coda and D.C. al Fine are followed, and the jump sings the next verse', () => {
  // Twinkle: an intro bar, segno, To Coda after bar 3, D.S. al Coda at the end of bar 5.
  const xml = voiceScore([
    bar(1, rest('w')),
    bar(2, sound('segno="s1"') + n('q', 'C4', 'Stars', 'Moon') + n('q', 'C4', 'up', 'up') + n('q', 'G4', 'so', 'so') + n('q', 'G4', 'high', 'bright')),
    bar(3, n('q', 'A4', 'shine', 'glow') + n('q', 'A4', 'on', 'on') + n('h', 'G4', 'me,', 'me,') + sound('tocoda="c1"', 'To Coda')),
    bar(4, n('q', 'F4', 'all') + n('q', 'F4', 'the') + n('q', 'E4', 'night') + n('q', 'E4', 'long')),
    bar(5, n('q', 'D4', 'you') + n('q', 'D4', 'and') + n('h', 'C4', 'me.') + sound('dalsegno="s1"', 'D.S. al Coda')),
    bar(6, sound('coda="c1"') + n('q', 'G4', 'then') + n('q', 'G4', 'we') + n('q', 'F4', 'go') + n('q', 'F4', 'home')),
    bar(7, n('q', 'E4', 'to') + n('q', 'E4', 'the') + n('h', 'C4', 'end.')),
  ]);
  const r = importMusicXML(xml);
  assert.equal(sung(r), 'Stars up so high shine on me, all the night long you and me. Moon up so bright glow on me, then we go home to the end.');
  assert.ok(lineStarts(r).includes('Moon'), 'the D.S. starts a new line');
  assert.ok(!r.warnings.some((w) => /Sung through|not followed/.test(w)), r.warnings.join(' | '));
  assertPlayable(r.song);

  // The same jumps written only as words, with no <sound>: D.C. al Fine.
  const dc = voiceScore([
    bar(1, n('q', 'C4', 'Row', 'Sail') + n('q', 'C4', 'the', 'the') + n('q', 'G4', 'boat', 'ship') + n('q', 'G4', 'home', 'home')),
    bar(2, n('q', 'A4', 'row', 'sail') + n('q', 'A4', 'it', 'it') + n('h', 'G4', 'slow,', 'slow,') + words('Fine')),
    bar(3, n('q', 'F4', 'down') + n('q', 'F4', 'the') + n('q', 'E4', L('riv', 'begin')) + n('q', 'E4', L('er', 'end'))),
    bar(4, n('q', 'D4', 'we') + n('q', 'D4', 'both') + n('h', 'C4', 'go,') + words('D.C. al Fine')),
  ]);
  assert.equal(sung(importMusicXML(dc)), 'Row the boat home row it slow, down the riv- er we both go, Sail the ship home sail it slow,');
});

test('MusicXML: pickups take the right verse at a repeat and into a chorus written once', () => {
  // Three verses in a repeat (Twinkle). Each verse ends with the pickup into the chorus, whose
  // words are written once, on line 1. The 1st ending ends the chorus and holds the pickup into
  // the next verse on lines 2 and 3; the 2nd ending ends the song.
  const xml = voiceScore([
    bar(1, FWD + n('q', 'C4', 'Here', 'There', 'Now') + n('q', 'C4', 'we', 'they', 'you') + n('q', 'G4', 'go', 'go', 'go') + n('q', 'G4', 'now', 'too', 'home')),
    bar(2, n('q', 'A4', 'on', 'on', 'by') + n('q', 'A4', 'the', 'the', 'the') + n('q', 'G4', 'road,', 'way,', 'sea,') + n('q', 'G4', 'Oh')),
    bar(3, n('q', 'F4', 'sing') + n('q', 'F4', 'it') + n('q', 'E4', 'loud') + n('q', 'E4', 'and')),
    bar(4, ending('1, 2', 'start') + n('q', 'D4', 'sing') + n('q', 'D4', 'it') + n('q', 'C4', 'clear.') + n('q', 'C4', null, 'And', 'So') + ending('1, 2', 'stop', 'right', '<repeat direction="backward"/>')),
    bar(5, ending('3', 'start') + n('q', 'D4', 'sing') + n('q', 'D4', 'it') + n('h', 'C4', 'out!') + ending('3', 'discontinue', 'right')),
  ]);
  const r = importMusicXML(xml);
  assert.equal(
    sung(r),
    'Here we go now on the road, Oh sing it loud and sing it clear. And There they go too on the way, Oh sing it loud and sing it clear. So Now you go home by the sea, Oh sing it loud and sing it out!'
  );
  assert.ok(lineStarts(r).includes('And') && lineStarts(r).includes('So'), 'a verse starts at its pickup');
  assertPlayable(r.song);
});

test('MusicXML: verses stacked before a repeated chorus are each sung, with the chorus twice', () => {
  const xml = voiceScore([
    bar(1, n('q', 'E4', 'Rain', 'Snow', 'Sun') + n('q', 'E4', 'is', 'is', 'is') + n('q', 'F4', 'on', 'on', 'on') + n('q', 'G4', 'the', 'the', 'the')),
    bar(2, n('q', 'G4', 'roof', 'road', 'lake') + n('q', 'F4', 'and', 'and', 'and') + n('q', 'E4', 'the', 'the', 'the') + n('q', 'D4', 'hill,', 'mill,', 'sea,')),
    bar(3, FWD + n('q', 'C4', 'sing') + n('q', 'C4', 'a') + n('q', 'D4', 'song') + n('q', 'E4', 'for')),
    bar(4, n('q', 'E4', 'you') + n('q', 'D4', 'and') + n('h', 'D4', 'me.') + BACK),
  ]);
  const r = importMusicXML(xml);
  const chorus = 'sing a song for you and me. sing a song for you and me.';
  assert.equal(sung(r), `Rain is on the roof and the hill, ${chorus} Snow is on the road and the mill, ${chorus} Sun is on the lake and the sea, ${chorus}`);
  assert.ok(r.warnings.includes('Sung through 3 times, once for each verse.'), r.warnings.join(' | '));
});

test('MusicXML: a verse\'s extra syllable written in a second voice', () => {
  // Verse 2 needs two notes where verse 1 holds one: the half note is split in voice 2,
  // which carries only line 2.
  const split = `<backup><duration>4</duration></backup>${xnote({ p: 'G4', dur: 2, type: 'quarter', voice: 2, lyrics: [null, L('the')] })}${xnote({ p: 'G4', dur: 2, type: 'quarter', voice: 2, lyrics: [null, L('trees,')] })}`;
  const xml = voiceScore([
    bar(1, n('q', 'C4', 'Bells', 'Birds') + n('q', 'C4', 'are', 'are') + n('q', 'G4', L('ring', 'begin'), L('sing', 'begin')) + n('q', 'G4', L('ing', 'end'), L('ing', 'end'))),
    bar(2, n('q', 'A4', 'all', 'up') + n('q', 'A4', 'through', 'in') + n('h', 'G4', 'town,') + split),
    bar(3, n('q', 'F4', 'far', 'hear') + n('q', 'F4', 'and', 'them') + n('q', 'E4', 'near', 'sing') + n('q', 'E4', 'now.', 'now.')),
  ]);
  const r = importMusicXML(xml);
  assert.equal(sung(r), 'Bells are ring- ing all through town, far and near now. Birds are sing- ing up in the trees, hear them sing now.');
  assert.equal(r.choices.find((c) => c.chosen).id, 'p1v1');
  assertPlayable(r.song);
});

test('MusicXML: the tune is the soprano even when the alto has one more word', () => {
  const sop = [bar(1, n('q', 'G4', 'Shine') + n('q', 'G4', 'on') + n('q', 'A4', 'us') + n('q', 'A4', 'all')), bar(2, n('q', 'G4', 'bright') + n('q', 'F4', 'star') + n('h', 'E4', 'light.'))];
  const alto = [bar(1, n('q', 'E4', 'Shine') + n('q', 'E4', 'on') + n('q', 'F4', 'us') + n('q', 'F4', 'all')), bar(2, n('q', 'E4', 'bright') + n('q', 'D4', 'star') + n('q', 'C4', 'light.') + n('q', 'C4', 'yeah!'))];
  const r = importMusicXML(partwise('Echo', [{ id: 'P1', name: 'Soprano', measures: sop }, { id: 'P2', name: 'Alto', measures: alto }]));
  assert.equal(r.choices.find((c) => c.chosen).label, 'Soprano');
  assert.ok(r.warnings.includes('The tune is from Soprano.'), r.warnings.join(' | '));
  assert.equal(notesOnly(r.song.melody).join(' '), 'G4 G4 A4 A4 G4 F4 E4/2');

  // Two parts with the same words and no telling names: the higher line.
  const low = sop.map((m) => ({ ...m, body: m.body.replace(/<octave>4<\/octave>/g, '<octave>3</octave>') }));
  const two = importMusicXML(partwise('Duet', [{ id: 'P1', name: 'Singer 1', measures: low }, { id: 'P2', name: 'Singer 2', measures: sop }]));
  assert.equal(two.choices.find((c) => c.chosen).label, 'Singer 2');
});

test('MusicXML: verse numbers, styled syllables, elisions and a syllable on a grace note', () => {
  const ly = (num, syllabic, ...texts) => `<lyric number="${num}"><syllabic>${syllabic}</syllabic>${texts.join('')}</lyric>`;
  const t = (s) => `<text>${s}</text>`;
  const pitch = (p) => `<pitch><step>${p[0]}</step><octave>${p[1]}</octave></pitch>`;
  const note = (p, lyrics) => `<note>${pitch(p)}<duration>2</duration><voice>1</voice><type>quarter</type>${lyrics}</note>`;
  const grace = `<note><grace slash="yes"/>${pitch('B3')}<voice>1</voice><type>eighth</type>${ly(1, 'single', t('Oh,'))}${ly(2, 'single', t('Hey,'))}</note>`;
  const xml = voiceScore([
    bar(
      1,
      note('C4', ly(1, 'single', t('1. Sing')) + ly(2, 'single', t('2. Ring'))) +
        note('D4', ly(1, 'begin', t('Ma'), '<text font-style="italic">r</text>') + ly(2, 'begin', t('ding'))) +
        note('E4', ly(1, 'end', t('y')) + ly(2, 'end', t('dong'))) +
        note('F4', ly(1, 'single', t('to'), '<elision> </elision>', t('a')) + ly(2, 'single', t('for')))
    ),
    bar(2, grace + note('C4', '') + note('D4', ly(1, 'single', t('my')) + ly(2, 'single', t('my'))) + n('h', 'E4', 'dear.', 'friend.')),
  ]);
  const r = importMusicXML(xml);
  assert.equal(sung(r), 'Sing Mar- y to‿a Oh, my dear. Ring ding- dong for Hey, my friend.');
  assertPlayable(r.song);
});

test('MusicXML: a plain .zip from a Mac, and an .mxl that unzips too big', async () => {
  // macOS "Compress" adds a resource-fork copy, which can come first.
  const mac = zip([
    { name: '__MACOSX/._Morning Light.musicxml', data: [0, 5, 22, 7, 0, 2, 0, 0, 77, 97, 99] },
    { name: 'Morning Light.musicxml', data: utf8(NB_XML), deflate: true },
  ]);
  assert.equal((await importSongFile(mac, 'Morning Light.zip')).song.melody, NB_MELODY);

  // A few kilobytes that unzip to more than a plain score may be.
  const big = new Uint8Array(IMPORT_LIMITS.xmlBytes + 1).fill(0x20);
  big.set(utf8(NB_XML));
  const bomb = zip([{ name: 'score.musicxml', data: big, deflate: true }]);
  assert.ok(bomb.length < 100 * 1024);
  await assert.rejects(importSongFile(bomb, 'big.mxl'), (e) => e instanceof ImportError && /too big/.test(e.message));
});

test('MusicXML: huge or hostile scores are cut down, and file text is cleaned for display', () => {
  // A long measure repeated 16 times stops at the note limit, with one warning.
  const many = Array.from({ length: 1000 }, (_, i) => xnote({ p: ['C4', 'D4', 'E4', 'F4'][i % 4], dur: 1, type: 'eighth' })).join('');
  const rep = importMusicXML(voiceScore([bar(1, many + '<barline location="right"><repeat direction="backward" times="16"/></barline>')]));
  assert.equal(rep.warnings.filter((w) => /only its first 12000 notes/.test(w)).length, 1, rep.warnings.join(' | '));

  // Control characters and bidi overrides in part names and bar numbers never reach the screen.
  const sop = [1, 2, 3].map((k) => ({ attrs: `number="‮${k}<b>"`, body: (k === 1 ? '<attributes><divisions>2</divisions></attributes>' : '') + n('q', 'C4', 'la') + n('q', 'D4', 'la') + n('h', 'E4', 'la') }));
  const evil = importMusicXML(partwise('X', [{ id: 'P1', name: 'Lead‮evil\u0007', measures: sop }, { id: 'P2', name: 'B', measures: sop }]));
  const shown = [...evil.choices.map((c) => c.label), ...evil.warnings, ...evil.sections.flatMap((s) => [s.firstBar, s.lastBar])];
  assert.ok(shown.every((x) => !UNSAFE_CHARS.test(x)), JSON.stringify(shown));
  assert.equal(evil.choices[0].label, 'Leadevil');
  assert.equal(evil.sections[0].firstBar, '1<b>');

  // At most 64 choices, 100 parts and 16 verses.
  const voices = Array.from({ length: 70 }, (_, i) => `${i ? '<backup><duration>2</duration></backup>' : ''}${xnote({ p: 'C4', dur: 2, type: 'quarter', voice: i + 1 })}`).join('');
  assert.equal(importMusicXML(voiceScore([bar(1, voices)])).choices.length, 64);
  const parts = Array.from({ length: 101 }, (_, i) => ({ id: `P${i + 1}`, name: `Part ${i + 1}`, measures: [bar(1, n('w', 'C4', 'la'))] }));
  assert.ok(importMusicXML(partwise('Crowd', parts)).warnings.includes('This score has 101 parts; only the first 100 were read.'));
  const verses = Array.from({ length: 40 }, (_, i) => L(`v${i}`));
  const v = importMusicXML(voiceScore([bar(1, xnote({ p: 'C4', dur: 2, type: 'quarter', lyrics: verses }) + n('q', 'D4', 'a') + n('q', 'E4', 'b') + n('q', 'F4', 'c'))]));
  assert.ok(v.warnings.includes('Only the first 16 verses were used.'), v.warnings.join(' | '));
});

// ---------- Long songs: sections ----------

test('long songs offer sections of lines, and a section is a song of its own', () => {
  const ppq = 480;
  const lines = 20;
  const items = [];
  const words = [];
  for (let k = 1; k <= lines; k++) {
    items.push(...(k % 2 ? TW1 : TW2));
    words.push('Sing ', 'a ', 'long ', 'line ', 'num-', 'ber ', `${k}${k % 4 === 0 ? '\n' : '\r'}`);
  }
  const mel = tune(items, { ppq });
  const lyr = words.map((w, i) => [Math.round(mel.starts[i] * ppq), lyricEv(utf8(w))]);
  const marks = [];
  for (let k = 0; k < lines; k++) marks.push([k * 8 * ppq, meta(0x06, ascii(k % 2 ? 'F' : 'C'))], [(k * 8 + 6) * ppq, meta(0x06, ascii(k % 2 ? 'C' : 'G'))]);
  const r = importMidi(smf(0, ppq, [trackBytes([[0, tempoEv(120)], ...mel.ev, ...lyr, ...marks])]), { fileName: 'long song.mid' });
  assert.equal(r.stats.lines, 20);
  assert.equal(r.stats.notes, 140);
  assert.equal(r.long, true);
  assert.equal(r.fits, true);
  assert.deepEqual(
    r.sections.map((s) => [s.from, s.to, s.firstBar, s.lastBar]),
    [[0, 3, '1', '8'], [4, 7, '9', '16'], [8, 11, '17', '24'], [12, 15, '25', '32'], [16, 19, '33', '40']]
  );
  assert.equal(r.sections[1].label, 'Lines 5–8');
  assert.equal(r.sections[1].words, 'Sing a long line number 5');
  assert.equal(r.sections[1].seconds, 16);
  assertPlayable(r.song);

  const part = sliceSong(r.song, 4, 7, { title: 'Long song, part 2' });
  assert.notEqual(part.id, r.song.id);
  assert.equal(part.title, 'Long song, part 2');
  assert.equal(parseMelody(part.melody).notes.length, 28);
  assert.equal(parseMelody(part.melody).phrases.length, 4);
  assert.ok(part.lyrics.startsWith('Sing a long line num- ber 5\n'));
  assert.ok(part.chords.startsWith('C/4 | C/2 G/2 | F/4 | F/2 C/2'), part.chords);
  assert.equal(parseMelody(part.melody).totalBeats, 32);
  assertPlayable(part);
  assert.throws(() => sliceSong(r.song, 3, 20), RangeError);

  // A built-in song can be cut too.
  const twinkle = SONGS.find((s) => s.id === 'twinkle');
  const mid = sliceSong(twinkle, 1, 1);
  assert.equal(mid.melody, 'G4 G4 F4 F4 | E4 E4 D4/2 | G4 G4 F4 F4 | E4 E4 D4/2');
  assert.equal(mid.chords, 'C/2 F/2 | C/2 G/2 | C/2 F/2 | C/2 G/2');
  assert.equal(songSections(twinkle).sections.length, 1);
});

// ---------- .nbn family song files ----------

test('.nbn files: round trip, and strict checks on files that arrive from elsewhere', async () => {
  const r = importMusicXML(NB_XML, { fileName: 'Morning Light.musicxml', now: new Date('2026-09-30T08:15:00Z') });
  const text = writeFamilySongFile(r.song, r.source);
  const doc = JSON.parse(text);
  assert.equal(doc.format, 'note-by-note-song');
  assert.equal(doc.version, 1);
  assert.deepEqual(doc.source, { kind: 'musicxml', fileName: 'Morning Light.musicxml', importedAt: '2026-09-30T08:15:00.000Z' });
  assert.equal(familySongFileName(r.song), 'Morning Light.nbn');
  assert.equal(familySongFileName({ title: '../../etc/pass:wd*?' }), 'etc pass wd.nbn');

  const back = readFamilySongFile(text);
  assert.ok(back.ok, back.error);
  assert.deepEqual(back.song, r.song);
  assert.deepEqual(back.source, doc.source);
  const viaImport = await importSongFile(enc.encode(text), 'Morning Light.nbn');
  assert.deepEqual(viaImport.song, r.song);
  assertPlayable(back.song);

  // Unknown fields are dropped, the id is recomputed and the credit is always the family line.
  const tampered = JSON.parse(text);
  tampered.song.id = 'mary';
  tampered.song.credit = 'Published by somebody';
  tampered.song.extra = '<script>';
  tampered.song.__proto__ = { polluted: true };
  tampered.extra = 1;
  const t2 = readFamilySongFile(JSON.stringify(tampered));
  assert.ok(t2.ok, t2.error);
  assert.equal(t2.song.id, r.song.id);
  assert.equal(t2.song.credit, FAMILY_CREDIT);
  assert.equal('extra' in t2.song, false);
  assert.equal({}.polluted, undefined);

  const bad = (mutate) => {
    const d = JSON.parse(text);
    mutate(d);
    return readFamilySongFile(JSON.stringify(d));
  };
  const rejects = [
    ['wrong format', (d) => (d.format = 'something-else'), /not a Note by Note song file/],
    ['newer version', (d) => (d.version = 2), /newer version/],
    ['bell character in the title', (d) => (d.song.title = 'Hi\u0007'), /title/],
    ['newline in the title', (d) => (d.song.title = 'Two\nlines'), /title/],
    ['bidi override in the words', (d) => (d.song.lyrics = d.song.lyrics.replace('morn-', '\u202emorn-')), /words/],
    ['markup in the melody', (d) => (d.song.melody = '<b>C4</b>'), /melody/],
    ['a bad melody token', (d) => (d.song.melody = d.song.melody.replace('D5/5', 'D5/5/5')), /melody/],
    ['a note far out of range', (d) => (d.song.melody = d.song.melody.replace('D4', 'G9')), /out of range/],
    ['a zero-length note', (d) => (d.song.melody = d.song.melody.replace('D5/5', 'D5/0')), /bad length/],
    ['words that do not match the notes', (d) => (d.song.lyrics += ' extra'), /don.t match/],
    ['a chord the app can not play', (d) => (d.song.chords = 'Cdim/4'), /chords/],
    ['a tempo of a million', (d) => (d.song.bpm = 1e6), /tempo/],
    ['a key that is not a key', (d) => (d.song.key = 'H'), /key/],
    ['a number for a title', (d) => (d.song.title = 42), /title/],
    ['a folder in the file name', (d) => (d.source.fileName = '../x.mid'), /file information/],
    ['a strange source kind', (d) => (d.source.kind = 'mp3'), /file information/],
    ['too many notes', (d) => ((d.song.melody = Array(1600).fill('C4/0.5').join(' ')), (d.song.lyrics = null)), /too long/],
  ];
  for (const [what, mutate, msg] of rejects) {
    const res = bad(mutate);
    assert.equal(res.ok, false, what);
    assert.match(res.error, msg, what);
  }
  assert.equal(readFamilySongFile('{"format":').ok, false);
  assert.equal(readFamilySongFile('[]').ok, false);
  assert.equal(readFamilySongFile(new Uint8Array([0x7b, 0xff, 0x7d])).ok, false, 'not UTF-8');
  assert.match(readFamilySongFile('x'.repeat(300 * 1024)).error, /too big/);
  await assert.rejects(importSongFile(enc.encode(JSON.stringify({ format: 'note-by-note-song', version: 1, song: {} })), 'x.nbn'), ImportError);

  // A song without words or chords saves and loads too.
  const plain = { id: '', title: 'Hum along', credit: FAMILY_CREDIT, key: 'F', bpm: 90, meter: 3, melody: 'F4 A4 C5 | F5/3', lyrics: null, chords: null };
  plain.id = songId(plain);
  const p2 = readFamilySongFile(writeFamilySongFile(plain));
  assert.ok(p2.ok, p2.error);
  assert.deepEqual(p2.song, plain);
  assert.equal(p2.source, null);
});

test('.nbn files: a melody ending in a line break, and long names with emoji', async () => {
  // A trailing "//" used to make an empty last line that crashed the player.
  const song = { id: '', title: 'Ends with a break', credit: FAMILY_CREDIT, key: 'C', bpm: 100, meter: 4, melody: 'C4 D4 E4 F4 // G4 A4 B4 C5 // r/2', lyrics: 'a b c d e f g h', chords: null };
  song.id = songId(song);
  const back = readFamilySongFile(writeFamilySongFile(song));
  assert.ok(back.ok, back.error);
  assert.equal(parseMelody(back.song.melody).phrases.length, 2);
  assertPlayable(back.song);
  assert.equal(songSections(back.song).stats.lines, 2);
  assert.equal(songGlyph(back.song).pts.length, 4);
  const viaImport = await importSongFile(enc.encode(writeFamilySongFile(song)), 'break.nbn');
  assert.equal(viaImport.stats.lines, 2);

  // Names cut to length never end in half an emoji, so the importer's own output saves.
  const name = 'a'.repeat(159) + '😀😀.mid';
  assert.ok(!UNSAFE_CHARS.test(cleanFileName(name)));
  const r = importMidi(smf(0, PPQ, [trackBytes(tune(TW1).ev)]), { fileName: name });
  assert.equal(r.source.fileName, 'a'.repeat(159));
  assert.ok(writeFamilySongFile(r.song, r.source));
  const file = familySongFileName({ title: 'a' + '😀'.repeat(40) });
  assert.ok(!UNSAFE_CHARS.test(file), file);
  assert.equal(cutText('ab😀', 3), 'ab');
  // A very long syllable is cut for the song too, whole emoji only.
  const longWord = importMusicXML(voiceScore([bar(1, n('q', 'C4', 'a' + '😀'.repeat(30)) + n('q', 'D4', 'b') + n('q', 'E4', 'c') + n('q', 'F4', 'd'))]));
  assert.ok(longWord.fits, longWord.warnings.join(' | '));
});

// ---------- songs.js with family songs ----------

test('songs.js: no chords, no words, and a harmonizer hook', () => {
  const song = { id: 'fam-0000000test', title: 'Test', credit: FAMILY_CREDIT, key: 'C', bpm: 100, meter: 4, melody: 'C4 E4 G4 C5 // G4 E4 C4/2', lyrics: null, chords: null };
  const data = songData(song);
  assert.deepEqual(data.chords, []);
  assert.deepEqual(
    data.mel.notes.map((n) => n.text),
    ['la', 'la', 'la', 'la', 'la', 'la', 'la']
  );
  const [step] = buildSong(song, RANGE, { mode: 'along' });
  assert.equal(step.audio.filter((a) => a.kind === 'piano').length, 0);
  assert.equal(step.events.length, 7);

  let called = 0;
  setHarmonizer((mel, s) => {
    called++;
    assert.equal(s.id, song.id);
    return `C/4 | C/2 G/2`;
  });
  try {
    const [step2] = buildSong(song, RANGE, { mode: 'along' });
    assert.equal(called, 1);
    assert.ok(step2.audio.some((a) => a.kind === 'piano'));
    // Songs with their own chords never ask the harmonizer.
    buildSong(SONGS[0], RANGE, { mode: 'along' });
    assert.equal(called, 1);
  } finally {
    setHarmonizer(null);
  }
  assert.deepEqual(songData(song).chords, []);
});
