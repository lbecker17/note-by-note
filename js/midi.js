// Standard MIDI File reader, for karaoke (.kar) and MIDI-with-lyrics files a grown-up
// has bought. Reads formats 0, 1 and 2, PPQ and SMPTE timing, running status, and skips
// sysex, unknown chunks and anything it doesn't need. Every note and text event comes
// back with its absolute tick, its time in seconds and its position in quarter notes.
// No DOM, so it runs in Node for the tests.
//
// parseMidi(bytes) -> {
//   format, division: { type: 'ppq', ppq } | { type: 'smpte', fps, tpf },
//   tracks: [{ index, name, instrument, notes, texts, programs, endTick }],
//     notes: [{ tick, endTick, beat, endBeat, sec, endSec, ch, m, vel }]   (ch is 0-15; 9 is drums)
//     texts: [{ tick, beat, sec, kind, metaType, text, ch }]   kind: text, lyric, marker, cue, name, ...
//     programs: [{ tick, beat, ch, program }]
//   tempos: [{ tick, beat, sec, us, bpm, track }], timeSigs: [{ tick, beat, sec, num, den, track }],
//   keySigs: [{ tick, beat, sec, sf, mi, track }],
//   endTick, endBeat, durationSec, encoding: 'ascii' | 'utf-8' | 'windows-1252', warnings
// }
// In format 2 every track keeps its own clock, so tempo and time-signature events only
// time their own track (each carries `track`).

import { decodeUtf8, decodeCp1252, isAscii, stripUtf8Bom, toBytes } from './text.js';

// notes, texts and metas (each of tempo, time and key signatures) are kept up to these
// counts, far more than any song has; past them the rest is skipped with a warning, so a
// hostile file can't fill the phone's memory with millions of tiny events.
export const MIDI_LIMITS = { bytes: 8 * 1024 * 1024, events: 2_000_000, tracks: 512, notes: 100_000, texts: 20_000, metas: 10_000 };

const TEXT_KINDS = { 1: 'text', 2: 'copyright', 3: 'name', 4: 'instrument', 5: 'lyric', 6: 'marker', 7: 'cue', 8: 'program', 9: 'device' };

export class MidiError extends Error {}

const tag = (b, p) => (p + 4 <= b.length ? String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]) : '');
const u16 = (b, p) => (b[p] << 8) | b[p + 1];
const u32 = (b, p) => ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];

export function looksLikeMidi(data) {
  const b = toBytes(data);
  return tag(b, 0) === 'MThd' || (tag(b, 0) === 'RIFF' && tag(b, 8) === 'RMID');
}

const le32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;

// Find the SMF inside a RIFF "RMID" wrapper.
function unwrapRiff(b) {
  let p = 12;
  while (p + 8 <= b.length) {
    const id = tag(b, p);
    const len = le32(b, p + 4);
    if (id === 'data') return b.subarray(p + 8, Math.min(b.length, p + 8 + len));
    p += 8 + len + (len & 1); // always moves on: len is never negative
  }
  throw new MidiError('This RIFF file has no MIDI data inside.');
}

export function parseMidi(data) {
  let b = toBytes(data);
  const warnings = [];
  const warn = (w) => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  if (b.length > MIDI_LIMITS.bytes) throw new MidiError('This MIDI file is too big.');
  if (tag(b, 0) === 'RIFF' && tag(b, 8) === 'RMID') b = unwrapRiff(b);
  // Some files carry a short header (e.g. MacBinary) before MThd.
  let start = 0;
  if (tag(b, 0) !== 'MThd') {
    start = -1;
    for (let i = 1; i < Math.min(b.length - 4, 1024); i++) {
      if (tag(b, i) === 'MThd') {
        start = i;
        break;
      }
    }
    if (start < 0) throw new MidiError('This is not a MIDI file.');
    warn('Skipped some bytes before the MIDI header.');
  }
  const hlen = u32(b, start + 4);
  if (start + 8 + 6 > b.length || hlen < 6) throw new MidiError('This MIDI file is damaged (short header).');
  let format = u16(b, start + 8);
  const ntrks = u16(b, start + 10);
  const div = u16(b, start + 12);
  let division;
  if (div & 0x8000) {
    const fpsCode = 256 - (div >> 8);
    const fps = fpsCode === 29 ? 30000 / 1001 : fpsCode;
    if (![24, 25, 29, 30].includes(fpsCode)) warn(`Unusual SMPTE frame rate ${fpsCode}.`);
    division = { type: 'smpte', fps, tpf: div & 0xff || 1 };
  } else {
    let ppq = div;
    if (!ppq) {
      warn('The file gives 0 ticks per beat; assuming 96.');
      ppq = 96;
    }
    division = { type: 'ppq', ppq };
  }
  if (format > 2) {
    warn(`Unknown MIDI format ${format}; reading it like format 1.`);
    format = 1;
  }

  // Chunks: read every MTrk, skip anything else.
  const chunks = [];
  let p = start + 8 + hlen;
  while (p + 8 <= b.length && chunks.length < MIDI_LIMITS.tracks) {
    const id = tag(b, p);
    const len = u32(b, p + 4);
    let end = p + 8 + len;
    if (end > b.length) {
      warn('The file is cut short; reading what is there.');
      end = b.length;
    }
    if (id === 'MTrk') chunks.push([p + 8, end]);
    else if (!/^[\x20-\x7e]{4}$/.test(id)) {
      warn('The file has junk between its tracks.');
      break;
    }
    p = end;
  }
  if (!chunks.length) throw new MidiError('This MIDI file has no tracks.');
  if (chunks.length < ntrks) warn(`The header says ${ntrks} tracks but the file has ${chunks.length}.`);

  const counter = { events: 0, notes: 0, texts: 0, tempos: 0, timeSigs: 0, keySigs: 0 };
  const raw = chunks.map(([s, e], i) => readTrack(b, s, e, i, warn, counter));

  // Text: one decision for the whole file, so a karaoke file reads consistently.
  // If every non-ASCII string is valid UTF-8 it's UTF-8, otherwise Windows-1252.
  let encoding = 'ascii';
  for (const t of raw) {
    for (const x of t.texts) {
      if (isAscii(x.bytes)) continue;
      if (decodeUtf8(stripUtf8Bom(x.bytes)) == null) {
        encoding = 'windows-1252';
        break;
      }
      encoding = 'utf-8';
    }
    if (encoding === 'windows-1252') break;
  }
  const decode = (bytes) => (encoding === 'windows-1252' ? decodeCp1252(bytes) : encoding === 'utf-8' ? decodeUtf8(stripUtf8Bom(bytes)) : decodeCp1252(bytes));

  // Clocks: formats 0 and 1 share one tempo map (taken from every track, since files
  // don't always keep it in track 0); in format 2 each track has its own.
  const sortByTick = (list) => list.sort((x, y) => x.tick - y.tick || x.track - y.track);
  const allTempos = sortByTick(raw.flatMap((t) => t.tempos));
  const shared = format === 2 ? null : makeClock(division, allTempos);
  const clocks = new Map();
  const clockOf = (i) => {
    if (shared) return shared;
    if (!clocks.has(i)) clocks.set(i, makeClock(division, raw[i].tempos));
    return clocks.get(i);
  };

  const tracks = raw.map((t, i) => {
    const clk = clockOf(i);
    const at = (tick) => ({ tick, beat: clk.beat(tick), sec: clk.sec(tick) });
    const notes = t.notes.map((n) => ({
      tick: n.tick,
      endTick: n.endTick,
      beat: clk.beat(n.tick),
      endBeat: clk.beat(n.endTick),
      sec: clk.sec(n.tick),
      endSec: clk.sec(n.endTick),
      ch: n.ch,
      m: n.m,
      vel: n.vel,
    }));
    const texts = t.texts.map((x) => ({ ...at(x.tick), kind: TEXT_KINDS[x.type] || 'text', metaType: x.type, text: decode(x.bytes), ch: x.ch }));
    const name = texts.find((x) => x.metaType === 3);
    const inst = texts.find((x) => x.metaType === 4);
    return {
      index: i,
      name: name ? name.text : '',
      instrument: inst ? inst.text : '',
      notes,
      texts,
      programs: t.programs.map((x) => ({ tick: x.tick, beat: clk.beat(x.tick), ch: x.ch, program: x.program })),
      endTick: t.endTick,
    };
  });

  const stamp = (list) => sortByTick(list).map((e) => ({ ...e, beat: clockOf(e.track).beat(e.tick), sec: clockOf(e.track).sec(e.tick) }));
  const tempos = stamp(allTempos.map((e) => ({ ...e }))).map((e) => ({ ...e, bpm: 60e6 / e.us }));
  const timeSigs = stamp(raw.flatMap((t) => t.timeSigs));
  const keySigs = stamp(raw.flatMap((t) => t.keySigs));
  const endTick = Math.max(0, ...raw.map((t) => t.endTick));
  const ends = tracks.map((t, i) => ({ beat: clockOf(i).beat(t.endTick), sec: clockOf(i).sec(t.endTick) }));
  return {
    format,
    division,
    tracks,
    tempos,
    timeSigs,
    keySigs,
    endTick,
    endBeat: Math.max(0, ...ends.map((e) => e.beat)),
    durationSec: Math.max(0, ...ends.map((e) => e.sec)),
    encoding,
    warnings,
  };
}

// One MTrk chunk: notes paired on/off, the meta events we use, program changes.
function readTrack(b, p, end, index, warn, counter) {
  const notes = [];
  const texts = [];
  const tempos = [];
  const timeSigs = [];
  const keySigs = [];
  const programs = [];
  const open = new Map(); // (ch << 7 | note) -> { ons: [{ tick, vel }], next }: oldest unmatched at ons[next]
  let tick = 0;
  let status = 0;
  let chPrefix = null;
  let ended = false;

  const varlen = () => {
    let v = 0;
    for (let k = 0; k < 4; k++) {
      if (p >= end) return -1;
      const x = b[p++];
      v = v * 128 + (x & 0x7f);
      if (!(x & 0x80)) return v;
    }
    return -2;
  };

  // A note-off ends the oldest note still sounding on that key (in constant time, however
  // many note-ons a file stacks up).
  const noteOff = (ch, m) => {
    const q = open.get((ch << 7) | m);
    if (!q || q.next >= q.ons.length) return;
    const on = q.ons[q.next++];
    if (q.next === q.ons.length) q.ons.length = q.next = 0;
    notes.push({ tick: on.tick, endTick: tick, ch, m, vel: on.vel });
  };
  // Keep an event only while the file is under its cap for that kind.
  const room = (kind, limit, what) => {
    if (counter[kind] >= limit) {
      warn(`This file has a huge number of ${what}; only the first ${limit} were read.`);
      return false;
    }
    counter[kind]++;
    return true;
  };

  while (p < end) {
    if (++counter.events > MIDI_LIMITS.events) throw new MidiError('This MIDI file has too many events.');
    const delta = varlen();
    if (delta < 0) {
      if (delta === -2) warn(`Track ${index + 1} is damaged; reading what came before.`);
      break;
    }
    tick += delta;
    if (p >= end) break;
    let s = b[p];
    if (s & 0x80) p++;
    else if (status) s = status; // running status
    else {
      warn(`Track ${index + 1} has a data byte with no status; skipped.`);
      p++;
      continue;
    }

    if (s < 0xf0) {
      status = s;
      const hi = s & 0xf0;
      const ch = s & 0x0f;
      const need = hi === 0xc0 || hi === 0xd0 ? 1 : 2;
      if (p + need > end) break;
      if (b[p] & 0x80 || (need === 2 && b[p + 1] & 0x80)) {
        warn(`Track ${index + 1} has a broken message; skipped it.`);
        status = 0;
        continue;
      }
      const d1 = b[p];
      const d2 = need === 2 ? b[p + 1] : 0;
      p += need;
      if (hi === 0x90 && d2 > 0) {
        if (!room('notes', MIDI_LIMITS.notes, 'notes')) continue;
        const key = (ch << 7) | d1;
        if (!open.has(key)) open.set(key, { ons: [], next: 0 });
        open.get(key).ons.push({ tick, vel: d2 });
      } else if (hi === 0x80 || hi === 0x90) noteOff(ch, d1);
      else if (hi === 0xc0) programs.push({ tick, ch, program: d1 });
      continue;
    }

    if (s === 0xff) {
      if (p >= end) break;
      const type = b[p++];
      const len = varlen();
      if (len < 0) break;
      const dataEnd = Math.min(end, p + len);
      const d = b.subarray(p, dataEnd);
      p = dataEnd;
      if (type === 0x2f) {
        ended = true;
        break;
      }
      if (type >= 1 && type <= 9) {
        if (room('texts', MIDI_LIMITS.texts, 'text events')) texts.push({ tick, type, bytes: d, ch: chPrefix });
      } else if (type === 0x20 && d.length >= 1) chPrefix = d[0] & 0x0f;
      else if (type === 0x51 && d.length >= 3) {
        const us = (d[0] << 16) | (d[1] << 8) | d[2];
        if (us > 0 && room('tempos', MIDI_LIMITS.metas, 'tempo changes')) tempos.push({ tick, us, track: index });
      } else if (type === 0x58 && d.length >= 2) {
        const den = 2 ** d[1];
        if (d[0] > 0 && den <= 64 && room('timeSigs', MIDI_LIMITS.metas, 'time signatures')) timeSigs.push({ tick, num: d[0], den, track: index });
      } else if (type === 0x59 && d.length >= 2) {
        const sf = d[0] > 127 ? d[0] - 256 : d[0];
        if (sf >= -7 && sf <= 7 && room('keySigs', MIDI_LIMITS.metas, 'key signatures')) keySigs.push({ tick, sf, mi: d[1] ? 1 : 0, track: index });
      }
      // Running status carries on after meta events in lenient readers; keep it.
      continue;
    }

    if (s === 0xf0 || s === 0xf7) {
      const len = varlen();
      if (len < 0) break;
      p = Math.min(end, p + len);
      continue;
    }

    // System common / real-time bytes don't belong in a file; step over their data.
    p += s === 0xf2 ? 2 : s === 0xf1 || s === 0xf3 ? 1 : 0;
  }

  let hanging = 0;
  for (const [key, q] of open) {
    for (const on of q.ons.slice(q.next)) {
      notes.push({ tick: on.tick, endTick: Math.max(tick, on.tick), ch: key >> 7, m: key & 0x7f, vel: on.vel });
      hanging++;
    }
  }
  if (hanging) warn(`${hanging} note${hanging === 1 ? '' : 's'} never ended; they stop at the end of the track.`);
  if (!ended) warn(`Track ${index + 1} has no end marker.`);
  notes.sort((x, y) => x.tick - y.tick || y.m - x.m);
  return { notes, texts, tempos, timeSigs, keySigs, programs, endTick: tick };
}

// Ticks -> seconds and quarter notes. PPQ: quarters are ticks / ppq and seconds follow
// the tempo map. SMPTE: seconds are fixed by the frame rate and quarters follow the tempo.
function makeClock(division, tempoEvents) {
  const DEFAULT_US = 500000;
  const find = (segs, key, v) => {
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid][key] <= v) lo = mid;
      else hi = mid - 1;
    }
    return segs[lo];
  };
  if (division.type === 'ppq') {
    const ppq = division.ppq;
    const segs = [{ tick: 0, sec: 0, us: DEFAULT_US }];
    for (const t of tempoEvents) {
      const last = segs[segs.length - 1];
      if (t.tick <= last.tick) last.us = t.us;
      else segs.push({ tick: t.tick, sec: last.sec + ((t.tick - last.tick) * last.us) / 1e6 / ppq, us: t.us });
    }
    return {
      beat: (tick) => tick / ppq,
      sec: (tick) => {
        const s = find(segs, 'tick', tick);
        return s.sec + ((tick - s.tick) * s.us) / 1e6 / ppq;
      },
    };
  }
  const tps = division.fps * division.tpf;
  const segs = [{ sec: 0, beat: 0, us: DEFAULT_US }];
  for (const t of tempoEvents) {
    const s = t.tick / tps;
    const last = segs[segs.length - 1];
    if (s <= last.sec) last.us = t.us;
    else segs.push({ sec: s, beat: last.beat + ((s - last.sec) * 1e6) / last.us, us: t.us });
  }
  return {
    sec: (tick) => tick / tps,
    beat: (tick) => {
      const s = tick / tps;
      const g = find(segs, 'sec', s);
      return g.beat + ((s - g.sec) * 1e6) / g.us;
    },
  };
}
