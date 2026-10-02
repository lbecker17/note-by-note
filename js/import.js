// Family songs from files. Turns a karaoke MIDI (.kar, or .mid with lyrics) or MusicXML
// (.musicxml, .xml, .mxl) file that a grown-up bought into a Note by Note song, in exactly
// the format of js/songs.js. The song is kept on this phone, or sent to another of the
// family's phones as a private .nbn file (js/nbn.js). Nothing here uploads anything, and
// the words are only ever the ones in the file: none are invented or fetched.
//
// importSongFile(bytes, fileName, opts) -> Promise<{
//   song,      { id: 'fam-…', title, credit, key, bpm, meter, [pulse], melody, lyrics, chords }
//              (lyrics: null when the file has no words, chords: null when it has no chord symbols)
//   sections,  [{ from, to, label, firstBar, lastBar, notes, seconds, words }]: line ranges
//              (0-based, inclusive). One section when the song is short enough to learn whole.
//   long,      true when the whole song is more than a child can comfortably learn at once
//   fits,      false when the whole song is too long to save: pick a section with sliceSong()
//   warnings,  plain sentences for the grown-up ("No words were found…", "Ran out of lyric…")
//   choices,   where else the tune could come from: [{ id, label, notes, chosen }].
//              Pass { melody: id } in opts to import again from another track or part.
//   source,    { kind, fileName, importedAt } for the .nbn file
//   stats,     { notes, lines, seconds, low, high }
// }>
// importMidi(bytes, opts) and importMusicXML(textOrBytes, opts) do the same synchronously.
// opts: { fileName, title, melody, now }.

import { parseMidi, looksLikeMidi, MidiError } from './midi.js';
import { readMusicXML, musicxmlMelody, readMxl, MusicXmlError } from './musicxml.js';
import { looksLikeZip, ZipError } from './unzip.js';
import { decodeXmlBytes, XmlError } from './xml.js';
import { toBytes, cleanText, cutText, UNSAFE_CHARS_G } from './text.js';
import { songId, validateSong, readFamilySongFile, makeSource, FAMILY_CREDIT, SONG_LIMITS } from './nbn.js';
import { parseMelody, parseLyrics, paraStarts } from './music.js';

export class ImportError extends Error {}

// More than this is a lot to learn in one go: offer sections.
export const COMFORT = { lines: 12, notes: 160, seconds: 150 };
const SECTION_LINES = 8;
const MAX_READ_NOTES = 12000; // far more than any song; a file with more is cut short
const MAX_SYLLABLES = 6000; // the same for words
const MAX_CANDIDATES = 64; // tracks and channels considered for the tune (a band has far fewer)
// xmlBytes caps a score both as a file and unzipped from an .mxl, so a small .mxl can't
// unpack into more than a plain file could be. Sheet music for one song is far smaller.
export const IMPORT_LIMITS = { midiBytes: 4 * 1024 * 1024, xmlBytes: 16 * 1024 * 1024, mxlBytes: 8 * 1024 * 1024 };

const EPS = 1e-6;
const mod12 = (x) => ((x % 12) + 12) % 12;
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set([1, 3, 5, 8, 10]); // same as music.js: D♭, E♭, F, A♭, B♭
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const NOT_A_SONG = 'This isn’t a song file Note by Note can read. Try a karaoke MIDI file (.kar or .mid) or MusicXML sheet music (.musicxml or .mxl).';

function asImportError(e) {
  if (e instanceof ImportError) return e;
  const known = e instanceof MidiError || e instanceof XmlError || e instanceof ZipError || e instanceof MusicXmlError;
  const err = new ImportError(known ? e.message : 'Something in this file could not be read.');
  err.cause = e;
  return err;
}

function sniff(b) {
  if (looksLikeMidi(b)) return 'midi';
  if (looksLikeZip(b)) return 'zip';
  if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff) || (b[0] === 0x3c && b[1] === 0) || (b[0] === 0 && b[1] === 0x3c)) return 'xml';
  let i = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0;
  while (i < b.length && i < 4096 && (b[i] === 0x20 || b[i] === 0x09 || b[i] === 0x0a || b[i] === 0x0d)) i++;
  if (b[i] === 0x7b) return 'json';
  if (b[i] === 0x3c) return 'xml';
  return null;
}

export async function importSongFile(data, fileName = '', opts = {}) {
  const b = toBytes(data);
  const o = { ...opts, fileName };
  let kind = sniff(b);
  if (!kind && /\.(mid|midi|kar|rmi)$/i.test(fileName)) kind = 'midi';
  try {
    if (kind === 'midi') return importMidi(b, o);
    if (kind === 'zip') {
      if (b.length > IMPORT_LIMITS.mxlBytes) throw new ImportError('This file is too big.');
      return importMusicXML(await readMxl(b, IMPORT_LIMITS.xmlBytes), { ...o, kind: 'mxl' });
    }
    if (kind === 'json') {
      const r = readFamilySongFile(b);
      if (!r.ok) throw new ImportError(r.error);
      return resultFor(r.song, { source: r.source, warnings: [], choices: [] });
    }
    if (kind === 'xml') return importMusicXML(b, o);
  } catch (e) {
    throw asImportError(e);
  }
  throw new ImportError(NOT_A_SONG);
}

export function importMidi(data, opts = {}) {
  try {
    const b = toBytes(data);
    if (b.length > IMPORT_LIMITS.midiBytes) throw new ImportError('This MIDI file is too big.');
    const line = midiLine(parseMidi(b), opts);
    return finish(line, line.kar ? 'kar' : 'midi', opts);
  } catch (e) {
    throw asImportError(e);
  }
}

export function importMusicXML(data, opts = {}) {
  try {
    let text = data;
    if (typeof data !== 'string') {
      const b = toBytes(data);
      if (b.length > IMPORT_LIMITS.xmlBytes) throw new ImportError('This file is too big.');
      text = decodeXmlBytes(b);
    }
    const line = musicxmlMelody(readMusicXML(text), opts);
    line.defaultTempo = 100;
    return finish(line, opts.kind || 'musicxml', opts);
  } catch (e) {
    throw asImportError(e);
  }
}

// ---------- MIDI: which words, which notes ----------

const META_TEXT = /(copyright|©|\(c\)|https?:|www\.|\.com\b|sequenced|generated|karaoke|midi file|all rights)/i;

// The lyric events: Lyric metas, or Text metas in a karaoke file's words track.
function pickLyrics(midi, fileName) {
  let kar = /\.kar$/i.test(fileName);
  let title = '';
  const firstNote = Math.min(Infinity, ...midi.tracks.map((t) => (t.notes.length ? t.notes[0].beat : Infinity)));
  const groups = [];
  for (const t of midi.tracks) {
    const lyr = [];
    const txt = [];
    for (const x of t.texts) {
      if (x.metaType !== 1 && x.metaType !== 5) continue;
      if (x.text.startsWith('@')) {
        kar = true;
        if (x.text.startsWith('@T') && !title) title = x.text.slice(2);
        continue;
      }
      // Some karaoke files put a whole line of words in one event. Longer text, or a notice
      // ("Sequenced by…", a web address) at the start or in a long event, isn't words.
      const long = x.text.length > 64;
      if (x.text.length > 200 || ((long || x.beat <= firstNote + EPS) && META_TEXT.test(x.text))) continue;
      (x.metaType === 5 ? lyr : txt).push(x);
    }
    if (lyr.length) groups.push({ track: t.index, type: 5, events: lyr });
    if (txt.length) groups.push({ track: t.index, type: 1, events: txt });
  }
  let best = null;
  for (const g of groups) {
    if (g.events.length < 4) continue;
    // A track of chord names ("C", "G7") isn't words.
    const chordy = g.events.filter((x) => parseChordSymbol(x.text)).length;
    if (chordy >= 0.8 * g.events.length) continue;
    g.score = g.events.length * (g.type === 5 ? 1 : kar ? 1.3 : 0.8);
    if (!best || g.score > best.score) best = g;
  }
  return best ? { ...best, kar, title } : { kar, title, events: [], track: -1, type: 0 };
}

// "sun-shine" -> ["sun-", "shine"]: split after a hyphen with a letter on each side.
// Written as a loop because Safari before 16.4 can't parse regex lookbehind.
function splitHyphens(w) {
  const out = [];
  let start = 0;
  for (let i = 1; i < w.length - 1; i++) {
    if (w[i] === '-' && !/[-\s]/.test(w[i - 1]) && !/[-\s]/.test(w[i + 1])) {
      out.push(w.slice(start, i + 1));
      start = i + 1;
    }
  }
  out.push(w.slice(start));
  return out;
}

const cleanSyl = (t) => t.replace(UNSAFE_CHARS_G, '').trim().replace(/\s+/g, '‿');

// Karaoke text events -> syllables { beat, text, joinNext, line, para, follow }.
// "\" starts a paragraph and "/" a line (Soft Karaoke .kar); CR starts a line and LF a
// paragraph (MIDI lyric events). A leading or trailing space marks a word boundary, a
// trailing "-" joins the next syllable. Files that put a whole line in one event are split
// into words that follow on from the event's first note. At most `max` syllables.
export function karaokeSyllables(events, max = MAX_SYLLABLES) {
  const raw = events.map((e) => e.text.replace(/\u0000/g, ''));
  const spaced = raw.filter((t) => /^[ \t]|[ \t]$/.test(t.replace(/^[\\/\r\n]+|[\r\n]+$/g, ''))).length;
  const lineMode = raw.filter((t) => /\S\s+\S/.test(t.trim())).length >= Math.max(2, raw.length * 0.5);
  const hyphenMode = !lineMode && spaced < raw.length * 0.05;
  const out = [];
  let pendLine = false;
  let pendPara = false;
  let pendWord = true;
  for (let k = 0; k < events.length && out.length < max; k++) {
    const e = events[k];
    let t = raw[k];
    let line = pendLine;
    let para = pendPara;
    for (;;) {
      const c = t[0];
      if (c === '\\' || c === '\n') para = true;
      else if (c !== '/' && c !== '\r') break;
      line = true;
      t = t.slice(t.startsWith('\r\n') ? 2 : 1);
    }
    let nextLine = false;
    let nextPara = false;
    const tail = /[\r\n]+$/.exec(t);
    if (tail) {
      nextLine = true;
      nextPara = /^\n$|\n\s*\n|\r\r|\r\n\r\n/.test(tail[0]);
      t = t.slice(0, tail.index);
    }
    t = t.replace(/[\r\n]+/g, ' ');
    const lead = /^\s/.test(t);
    const trail = /\s$/.test(t);
    t = t.trim();
    const prev = out[out.length - 1];
    if (t === '-' && prev) {
      prev.hy = true;
      t = '';
    }
    if (!cleanSyl(t)) {
      pendLine = line || nextLine;
      pendPara = para || nextPara;
      pendWord = pendWord || lead || trail || line;
      continue;
    }
    const words = lineMode ? t.split(/\s+/).flatMap((w) => splitHyphens(w)) : [t];
    words.slice(0, max - out.length).forEach((w, i) => {
      let hy = false;
      if (w.length > 1 && w.endsWith('-')) {
        w = w.slice(0, -1);
        hy = true;
      }
      const before = out[out.length - 1];
      let wordStart;
      if (!before || (i === 0 && line)) wordStart = true;
      else if (before.hy) wordStart = false;
      else if (hyphenMode || lineMode) wordStart = true;
      else wordStart = i > 0 || pendWord || lead;
      const text = cleanSyl(w);
      if (!text) return;
      out.push({ beat: e.beat, text, wordStart, line: i === 0 && line, para: i === 0 && para, hy, follow: i > 0 });
    });
    pendLine = nextLine;
    pendPara = nextPara;
    pendWord = trail;
  }
  for (let k = 0; k < out.length; k++) {
    const nx = out[k + 1];
    out[k].joinNext = nx && !nx.wordStart ? 'join' : null;
  }
  return out.map(({ beat, text, joinNext, line, para, follow }) => ({ beat, text, joinNext, line, para, follow }));
}

// Chord names: "C", "Am", "F#m7", "Bbmaj7", "G7", "Dsus4", "C/E", "N.C.". Returns
// { root, quality, none } with the quality simplified to what the app plays.
export function parseChordSymbol(raw) {
  const s = String(raw).trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  if (/^(N\.?\s?C\.?|NC)$/i.test(s)) return { root: 0, quality: '', none: true };
  const m = /^([A-G])([#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(s);
  if (!m) return null;
  const q = m[3];
  if (!/^(?:maj|ma|M|Δ|min|mi|m|-|dim|°|o|ø|aug|\+|sus|add|alt|omit|no|[0-9]|[#b]|\(|\)|,)*$/.test(q)) return null;
  const root = mod12(STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
  let quality = '';
  if (/^(maj|ma|M|Δ)/.test(q)) quality = /7|9|11|13|Δ/.test(q) ? 'maj7' : '';
  else if (/^(ø|m7b5|min7b5|-7b5)/.test(q)) quality = 'm7';
  else if (/^(dim|°|o)/.test(q)) quality = 'm';
  else if (/^(min|mi|m|-)/.test(q)) quality = /^(min|mi|m|-)(7|9|11|13)/.test(q) ? 'm7' : 'm';
  else if (/^(7|9|11|13)/.test(q)) quality = '7';
  else if (/^(aug|\+|sus\d?)7/.test(q)) quality = '7';
  return { root, quality, none: false };
}

function pickChordText(midi, lyr) {
  const groups = new Map();
  for (const t of midi.tracks) {
    for (const x of t.texts) {
      if (x.metaType !== 1 && x.metaType !== 6 && x.metaType !== 7) continue;
      if (t.index === lyr.track && x.metaType === lyr.type) continue;
      if (x.text.startsWith('@')) continue;
      const k = `${t.index}:${x.metaType}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(x);
    }
  }
  let best = null;
  for (const g of groups.values()) {
    const ok = g.map((x) => ({ x, c: parseChordSymbol(x.text) })).filter((p) => p.c);
    if (ok.length >= 2 && ok.length >= 0.9 * g.length && (!best || ok.length > best.length)) best = ok;
  }
  return best ? best.map(({ x, c }) => ({ q: x.beat, root: c.root, quality: c.quality, none: c.none })) : null;
}

function nearest(sorted, x) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  let d = Infinity;
  if (lo < sorted.length) d = sorted[lo] - x;
  if (lo > 0 && x - sorted[lo - 1] < Math.abs(d)) d = sorted[lo - 1] - x;
  return d;
}
const lowerBound = (arr, x, key) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid][key] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const VOCAL_NAME = /(vocal|voice|vox|melod|lead|sing|lyric|soprano|canto|voz|stimme|chant|gesang)/i;
const ACCOMP_NAME = /(drum|perc|bass|chord|pad|string|accomp|backing|rhythm|arp|harmony|guitar|piano)/i;
const TOL = 0.2; // quarter notes between a syllable and its note

// How likely each track/channel is to be the sung tune. With words, mostly how well its
// note starts line up with the syllables (both ways, so a busy accompaniment that hits every
// syllable still loses); then its name, playing one note at a time, and a singable range.
function scoreCandidates(cands, syls) {
  const anchored = syls.filter((s) => !s.follow).map((s) => s.beat);
  const useLyrics = anchored.length >= 4;
  const lo = anchored[0];
  const hi = anchored[anchored.length - 1];
  for (const c of cands) {
    const notes = c.notes;
    const onsets = notes.map((n) => n.beat);
    let poly = 0;
    let maxEnd = -Infinity;
    for (const n of notes) {
      if (n.beat < maxEnd - 0.05) poly++;
      maxEnd = Math.max(maxEnd, n.endBeat);
    }
    c.mono = 1 - poly / notes.length;
    const ps = notes.map((n) => n.m).sort((a, b) => a - b);
    const at = (f) => ps[Math.min(ps.length - 1, Math.floor(ps.length * f))];
    c.median = at(0.5);
    const inRange = c.median >= 52 && c.median <= 84 ? 1 : Math.max(0, 1 - (c.median < 52 ? 52 - c.median : c.median - 84) / 12);
    const span = at(0.95) - at(0.05);
    c.range = inRange * (span <= 24 ? 1 : Math.max(0, 1 - (span - 24) / 12));
    const name = `${c.track.name} ${c.track.instrument}`;
    c.hint = (VOCAL_NAME.test(name) ? 1 : 0) - (ACCOMP_NAME.test(name) ? 0.5 : 0);
    const prog = (c.track.programs.find((p) => p.ch === c.ch) || {}).program;
    if (prog >= 52 && prog <= 54) c.hint += 0.5; // choir, voice, synth voice
    if (prog >= 32 && prog <= 39) c.hint -= 0.5; // basses
    c.shift = 0;
    c.lyr = 0;
    if (!useLyrics) continue;
    // Some files place every syllable a little early or late: line them up first.
    const offs = [];
    for (const b of anchored) {
      const d = nearest(onsets, b);
      if (Math.abs(d) <= 0.5) offs.push(d);
    }
    offs.sort((a, b) => a - b);
    const med = offs.length ? offs[offs.length >> 1] : 0;
    c.shift = Math.abs(med) >= 0.03 ? med : 0;
    let hits = 0;
    for (const b of anchored) if (Math.abs(nearest(onsets, b + c.shift)) <= TOL) hits++;
    const shifted = anchored.map((b) => b + c.shift);
    let inSpan = 0;
    let matched = 0;
    for (const n of notes) {
      if (n.beat < lo + c.shift - 0.5 || n.beat > hi + c.shift + 1) continue;
      inSpan++;
      if (Math.abs(nearest(shifted, n.beat)) <= TOL) matched++;
    }
    const recall = hits / anchored.length;
    const precision = inSpan ? matched / inSpan : 0;
    c.lyr = recall * (0.3 + 0.7 * precision);
    c.score = 6 * c.lyr + 1.5 * c.mono + 0.5 * c.range + c.hint;
  }
  if (!useLyrics) {
    const meds = cands.map((c) => c.median);
    const top = Math.max(...meds);
    const bottom = Math.min(...meds);
    const start = Math.min(...cands.map((c) => c.notes[0].beat));
    const end = Math.max(...cands.map((c) => c.notes[c.notes.length - 1].endBeat));
    for (const c of cands) {
      const high = (c.median - bottom) / (top - bottom || 1);
      const cover = (c.notes[c.notes.length - 1].endBeat - c.notes[0].beat) / (end - start || 1);
      c.score = 2 * c.mono + c.range + 1.5 * c.hint + 0.7 * cover + 0.5 * high + 0.3 * Math.min(1, c.notes.length / 100);
    }
  }
  return useLyrics;
}

// One note at a time: chords keep their top note, an inner note under a held one is
// dropped, and otherwise a note ends where the next begins.
function monophonic(notes) {
  const sorted = [...notes].sort((a, b) => a.beat - b.beat || b.m - a.m);
  const out = [];
  for (const n of sorted) {
    const x = { q: n.beat, e: n.endBeat, m: n.m };
    const last = out[out.length - 1];
    if (last) {
      if (x.q - last.q < 0.04) continue;
      if (last.e > x.q + 0.01) {
        const overlap = Math.min(last.e, x.e) - x.q;
        if (x.m < last.m && overlap > 0.5 * (x.e - x.q)) continue;
        last.e = x.q;
      }
    }
    out.push(x);
  }
  return out;
}

// Where a track plays two or more different notes at once (chords, or a harmony line).
function chordOnsets(notes) {
  const sorted = [...notes].sort((a, b) => a.beat - b.beat);
  const out = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].beat - sorted[i].beat < 0.04) j++;
    if (sorted.slice(i, j).some((n) => n.m !== sorted[i].m)) out.push(sorted[i].beat);
    i = j;
  }
  return out;
}

function mergeSyl(into, s) {
  into.text = into.text + (into.joinNext ? '' : '‿') + s.text;
  into.joinNext = s.joinNext;
}

// Give each syllable a note: the nearest free note start within TOL, else a free note it
// falls inside, else the note before (two words on one note). Returns how many had no note.
function alignSyllables(notes, syls, shift) {
  let last = -1;
  let unmatched = 0;
  const anchors = syls.map((s) => (s.follow ? null : s.beat + shift));
  syls.forEach((s, k) => {
    const syl = { text: s.text, joinNext: s.joinNext };
    if (s.follow) {
      let nextAnchor = Infinity;
      for (let j = k + 1; j < syls.length; j++) {
        if (anchors[j] != null) {
          nextAnchor = anchors[j];
          break;
        }
      }
      const i = last + 1;
      if (i < notes.length && notes[i].q < nextAnchor - TOL) {
        notes[i].syl = syl;
        last = i;
      } else if (last >= 0) mergeSyl(notes[last].syl, syl);
      else unmatched++;
      return;
    }
    const b = anchors[k];
    let best = -1;
    let bestD = Infinity;
    for (let i = Math.max(last + 1, lowerBound(notes, b - TOL, 'q')); i < notes.length && notes[i].q <= b + TOL; i++) {
      const d = Math.abs(notes[i].q - b);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    }
    if (best < 0) {
      const i = lowerBound(notes, b + EPS, 'q') - 1;
      if (i > last && i >= 0 && notes[i].e > b) best = i;
      else if (i === last && i >= 0 && notes[i].e > b) {
        mergeSyl(notes[i].syl, syl);
        return;
      } else {
        // Placed early in a rest: the next note, if it is nearer this syllable than the next one.
        const j = Math.max(last + 1, i + 1);
        let nextAnchor = Infinity;
        for (let k2 = k + 1; k2 < syls.length; k2++) {
          if (anchors[k2] != null) {
            nextAnchor = anchors[k2];
            break;
          }
        }
        if (j < notes.length && notes[j].q - b <= 0.5 && notes[j].q - b < nextAnchor - notes[j].q) best = j;
      }
    }
    if (best < 0) {
      unmatched++;
      return;
    }
    notes[best].syl = syl;
    notes[best].line = s.line;
    notes[best].para = s.para;
    last = best;
  });
  return unmatched;
}

// Snap a played performance to a written rhythm: note starts to sixteenths, but a start
// within a little of an eighth goes to the eighth (human timing), and eighth-note triplets
// only in beats where they clearly fit better. Players let go of every note early, by about
// the same share of its length all through a file (sequenced karaoke files often hold notes
// for 80-90% of their value). So a note runs on to the next one unless it is held for clearly
// less than that usual share of the time between them, or stops more than a sixteenth short;
// only then is there a rest, and the note's written length is its held length scaled back up.
function quantize(notes) {
  if (!notes.length) return [];
  const near = (x, g) => Math.abs(x / g - Math.round(x / g)) * g;
  const base = 0.25;
  const byBeat = new Map();
  for (const n of notes) {
    const b = Math.floor(n.q + 0.02);
    if (!byBeat.has(b)) byBeat.set(b, []);
    byBeat.get(b).push(n.q - b);
  }
  const triplet = new Set();
  for (const [b, fracs] of byBeat) {
    const off = fracs.filter((f) => f > 0.04 && f < 0.96);
    if (!off.length) continue;
    const errB = off.reduce((s, f) => s + near(f, base), 0);
    const errT = off.reduce((s, f) => s + near(f, 1 / 3), 0);
    const third = off.some((f) => near(f, 1 / 3) < 0.05 && near(f, 0.25) > 0.04);
    if (third && errT < errB * 0.5) triplet.add(b);
  }
  const gridAt = (x) => (triplet.has(Math.floor(x + 0.02)) ? 1 / 3 : base);
  const snap = (x) => {
    const b = Math.floor(x + 0.02);
    const f = x - b;
    if (triplet.has(b)) return b + Math.round(f * 3) / 3;
    const e8 = Math.round(f * 2) / 2;
    return b + (Math.abs(f - e8) <= 0.09 ? e8 : Math.round(f * 4) / 4);
  };
  const snapEnd = (x) => {
    const b = Math.floor(x + 0.02);
    return b + (triplet.has(b) ? Math.round((x - b) * 3) / 3 : Math.round((x - b) * 2) / 2);
  };
  // The usual share of the time to the next note that a note is held for.
  const shares = [];
  for (let i = 0; i + 1 < notes.length; i++) {
    const ioi = notes[i + 1].q - notes[i].q;
    if (ioi > 0.1 && ioi <= 4) shares.push(Math.min(1, (notes[i].e - notes[i].q) / ioi));
  }
  shares.sort((a, b) => a - b);
  const hold = Math.max(0.5, shares.length ? shares[shares.length >> 1] : 1);

  const out = [];
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const q = snap(n.q);
    const prev = out[out.length - 1];
    if (prev && q <= prev.q + EPS) {
      // Two notes landed on one spot: keep the first, and its words.
      if (n.syl) {
        if (prev.syl) mergeSyl(prev.syl, n.syl);
        else Object.assign(prev, { syl: n.syl, line: n.line, para: n.para });
      }
      continue;
    }
    const next = notes[i + 1];
    const held = n.e - n.q;
    const tight = !!next && next.q - n.e <= 0.25 + EPS; // let go less than a sixteenth early
    const legato = tight || (!!next && held >= (hold - 0.15) * (next.q - n.q));
    out.push({ ...n, q, e: snapEnd(n.q + held / hold), legato, tight });
  }
  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    const next = out[i + 1];
    if (next && (n.legato || n.e > next.q)) n.e = next.q;
    else if (n.e < n.q + gridAt(n.q) - EPS) n.e = next ? Math.min(next.q, n.q + gridAt(n.q)) : n.q + gridAt(n.q);
  }
  return out.map(({ e, legato, ...n }) => ({ ...n, d: e - n.q }));
}

function buildMeasures(timeSigs, endQ) {
  const sigs = [];
  for (const t of [...timeSigs].sort((a, b) => a.beat - b.beat)) {
    const last = sigs[sigs.length - 1];
    if (last && t.beat - last.q < EPS) Object.assign(last, { num: t.num, den: t.den });
    else sigs.push({ q: t.beat, num: t.num, den: t.den });
  }
  if (!sigs.length || sigs[0].q > EPS) sigs.unshift({ q: 0, num: 4, den: 4 });
  // Notation programs often write a pickup as a bar of its own in a short time signature
  // (1/4, then 4/4). That's a short first bar in the next signature, not a change of time.
  if (sigs.length > 1) {
    const len0 = (sigs[0].num * 4) / sigs[0].den;
    const next = sigs[1];
    if (Math.abs(next.q - len0) < EPS && len0 < (next.num * 4) / next.den - EPS) Object.assign(sigs[0], { num: next.num, den: next.den });
  }
  const out = [];
  let q = 0;
  let si = 0;
  while (q < endQ + EPS && out.length < 20000) {
    while (si + 1 < sigs.length && sigs[si + 1].q <= q + EPS) si++;
    const cur = sigs[si];
    let len = (cur.num * 4) / cur.den;
    if (si + 1 < sigs.length && sigs[si + 1].q < q + len - EPS) len = sigs[si + 1].q - q;
    out.push({ q, len, num: cur.num, den: cur.den, label: String(out.length + 1) });
    q += len;
  }
  return out;
}

const GENERIC_NAME = /^(untitled|track\s*\d*|tempo( track)?|sequence\s*\d*|midi|conductor|system|control|new song)$/i;

function midiLine(midi, opts) {
  const warnings = midi.warnings.filter((w) => !/no end marker/.test(w));
  const lyr = pickLyrics(midi, opts.fileName || '');
  const syls = karaokeSyllables(lyr.events);
  if (syls.length >= MAX_SYLLABLES) warnings.push(`This file has a huge number of words; only the first ${MAX_SYLLABLES} syllables were read.`);
  if (syls.filter((x) => x.follow).length > syls.length / 4) {
    warnings.push('The words in this file come a whole line at a time, so a long word sits on one note and the words may not line up with the tune. Check them before you save.');
  }

  const byId = new Map();
  for (const t of midi.tracks) {
    for (const n of t.notes) {
      if (n.ch === 9 || n.endBeat - n.beat < 0.01) continue;
      const id = `t${t.index + 1}c${n.ch + 1}`;
      if (!byId.has(id)) byId.set(id, { id, track: t, ch: n.ch, notes: [] });
      byId.get(id).notes.push(n);
    }
  }
  const cands = [...byId.values()];
  if (!cands.length) throw new ImportError(midi.tracks.some((t) => t.notes.some((n) => n.ch === 9)) ? 'This file only has drums, no tune.' : 'This file has no notes.');
  if (cands.length > MAX_CANDIDATES) {
    // Only a file made to be awkward has this many: keep the busiest.
    cands.sort((a, b) => b.notes.length - a.notes.length);
    cands.length = MAX_CANDIDATES;
  }
  const useLyrics = scoreCandidates(cands, syls);
  cands.sort((a, b) => b.score - a.score);
  const channelsIn = (t) => new Set(cands.filter((c) => c.track === t).map((c) => c.ch)).size;
  const label = (c) => {
    const nm = cleanText(c.track.name || c.track.instrument || '', 40);
    return `track ${c.track.index + 1}${nm ? ` “${nm}”` : ''}${channelsIn(c.track) > 1 ? `, channel ${c.ch + 1}` : ''}`;
  };
  let chosen = cands[0];
  const picked = opts.melody && cands.find((c) => c.id === opts.melody);
  if (picked) chosen = picked;
  else if (cands.length > 1) {
    if (!useLyrics) warnings.push(`There are no words to follow, so the tune was guessed: ${label(chosen)}.`);
    else if (chosen.lyr < 0.5) warnings.push(`The words don’t line up well with any part, so the tune was guessed: ${label(chosen)}.`);
    else if (cands[1].score > chosen.score * 0.9) warnings.push(`The tune is from ${label(chosen)}; ${label(cands[1])} was a close second.`);
  }
  const choices = cands.map((c) => ({ id: c.id, label: label(c).replace(/^t/, 'T'), notes: c.notes.length, chosen: c === chosen }));

  const ti = chosen.track.index;
  const own = (list) => (midi.format === 2 ? list.filter((e) => e.track === ti) : list);
  let notes = monophonic(chosen.notes);
  if (syls.length) {
    const missed = alignSyllables(notes, syls, chosen.shift);
    if (missed) warnings.push(`${missed} syllable${missed === 1 ? '' : 's'} had no note to go with and ${missed === 1 ? 'was' : 'were'} left out.`);
  }
  notes = quantize(notes);
  const end = notes.length ? notes[notes.length - 1].q + notes[notes.length - 1].d : 0;
  const measures = buildMeasures(own(midi.timeSigs), end);
  // A chord's top note is taken as the tune. When the tune's track often plays two notes at
  // once, say so: a harmony line above the tune can't be told from one below it.
  const both = chordOnsets(chosen.notes);
  if (both.length >= 8 && both.length >= 0.1 * notes.length) {
    warnings.push(`From bar ${barAt(measures, both[0]).label}, the tune’s track often plays two notes at once; the top one was taken as the tune. Check it before you save.`);
  }
  const tempos = own(midi.tempos).map((t) => ({ q: t.beat, bpm: t.bpm }));
  const ks = own(midi.keySigs);

  let title = cleanText(lyr.title, 80);
  if (!title) {
    const t0 = midi.tracks[0];
    const nm = cleanText((t0 && t0.name) || '', 80);
    if (nm && !GENERIC_NAME.test(nm) && (midi.format === 0 || !t0.notes.length)) title = nm;
  }
  return {
    title,
    notes,
    measures,
    chords: pickChordText(midi, lyr),
    tempos,
    defaultTempo: 120,
    keys: ks.map((k) => ({ q: k.beat, pc: mod12(7 * k.sf), minor: !!k.mi })),
    keyFromFile: ks.some((k) => k.sf !== 0 || k.mi),
    warnings,
    choices,
    kar: lyr.kar,
  };
}

// ---------- From a line of notes to the song format ----------

// The measure a position falls in, and a bar's written length there (a pickup bar is short,
// but lines and melismas are measured in whole bars).
const fullBar = (m) => (m.num * 4) / m.den;
function barAt(measures, q) {
  let lo = 0;
  let hi = measures.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measures[mid].q <= q + EPS) lo = mid;
    else hi = mid - 1;
  }
  return measures[lo];
}

// With words, the song runs from the first syllable to the last. In between, a run of notes
// with no syllable is either a held syllable ("~", a melisma) or left out:
// - In sheet music (vocal) the line is the singer's own part, so its notes are all sung unless
//   a bar or more of rest cuts them off from the words (an instrumental cue in the voice part).
// - In a MIDI file the tune's instrument often plays an intro, a solo or fills between lines
//   too. A run is held when the word goes on after it, or else for as long as it carries
//   straight on from the syllable with no rest (up to two bars). The rest is left out.
// After the last syllable, only a melisma straight on from it and within the next bar is kept.
function keepSung(notes, measures, warnings, vocal) {
  const first = notes.findIndex((n) => n.syl);
  const out = [];
  const droppedMid = [];
  const droppedEnd = [];
  const end = (x) => x.q + x.d;
  const gap = (a, b) => b.q - end(a);
  let lastSyl = null;
  let i = first;
  while (i < notes.length) {
    const n = notes[i];
    if (n.syl) {
      out.push({ ...n, hold: false });
      lastSyl = n.syl;
      i++;
      continue;
    }
    let j = i;
    while (j < notes.length && !notes[j].syl) j++;
    const run = notes.slice(i, j);
    const atEnd = j >= notes.length;
    const anchor = out[out.length - 1];
    const bar = fullBar(barAt(measures, anchor.q));
    // The notes that carry straight on from the syllable. A played note that stops a little
    // short (tight: false, see quantize) is followed by a fill, not a melisma.
    let legato = gap(anchor, run[0]) < EPS && anchor.tight !== false ? 1 : 0;
    while (legato && legato < run.length && gap(run[legato - 1], run[legato]) < EPS) legato++;
    // The longest rest from the syllable, through the run, to the next syllable.
    const around = atEnd ? [anchor, ...run] : [anchor, ...run, notes[j]];
    let longest = 0;
    for (let k = 1; k < around.length; k++) longest = Math.max(longest, gap(around[k - 1], around[k]));
    const span = (k) => end(run[k - 1]) - run[0].q; // the first k notes of the run
    let keep = 0;
    if (atEnd) keep = legato === run.length && end(run[run.length - 1]) <= end(anchor) + bar + EPS ? run.length : 0;
    else if (vocal) keep = longest < bar - EPS ? run.length : 0;
    else if (lastSyl.joinNext && longest < 1 - EPS && span(run.length) <= 4 * bar + EPS) keep = run.length;
    else {
      keep = legato;
      while (keep && span(keep) > 2 * bar + EPS) keep--;
    }
    for (let k = 0; k < keep; k++) out.push({ ...run[k], syl: null, hold: true });
    (atEnd ? droppedEnd : droppedMid).push(...run.slice(keep));
    i = j;
  }
  if (first >= 2) warnings.push(`Left out ${first} notes before the words start.`);
  if (droppedMid.length) warnings.push(`Left out ${droppedMid.length} notes with no words (instrumental parts?), from bar ${barAt(measures, droppedMid[0].q).label}.`);
  if (droppedEnd.length) warnings.push(`Ran out of lyric syllables at bar ${barAt(measures, droppedEnd[0].q).label}; the ${droppedEnd.length} note${droppedEnd.length === 1 ? '' : 's'} after that ${droppedEnd.length === 1 ? 'was' : 'were'} left out.`);
  return out;
}

// Long stretches with no singing (three or more empty bars) shrink to one empty bar.
function squeezeGaps(notes, measures, chords, tempos, keys, warnings) {
  const cuts = [];
  let mi = 0;
  for (let i = 0; i + 1 < notes.length; i++) {
    const from = notes[i].q + notes[i].d;
    const to = notes[i + 1].q;
    if (to - from < 3) continue;
    // The empty bars are measures[mi..k-1]: the notes and the measures are both in order.
    while (mi < measures.length && measures[mi].q < from - EPS) mi++;
    let k = mi;
    while (k < measures.length && measures[k].q + measures[k].len <= to + EPS) k++;
    if (k - mi >= 3) cuts.push({ from: measures[mi + 1].q, to: measures[k - 1].q + measures[k - 1].len });
  }
  if (!cuts.length) return { notes, measures, chords, tempos, keys };
  const before = [0]; // beats cut before each cut
  for (const c of cuts) before.push(before[before.length - 1] + c.to - c.from);
  // The first cut that doesn't end at or before q.
  const cutAt = (q) => {
    let lo = 0;
    let hi = cuts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (q >= cuts[mid].to - EPS) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const map = (q) => {
    const k = cutAt(q);
    return (k < cuts.length && q > cuts[k].from ? cuts[k].from : q) - before[k];
  };
  const inCut = (q) => {
    const k = cutAt(q);
    return k < cuts.length && q >= cuts[k].from - EPS;
  };
  warnings.push(cuts.length === 1 ? 'A long break with no singing was shortened to one bar.' : `${cuts.length} long breaks with no singing were shortened to one bar each.`);
  return {
    notes: notes.map((n) => ({ ...n, q: map(n.q) })),
    measures: measures.filter((m) => !inCut(m.q)).map((m) => ({ ...m, q: map(m.q) })),
    chords: chords && chords.map((c) => ({ ...c, q: map(c.q) })),
    tempos: tempos.map((t) => ({ ...t, q: map(t.q) })),
    keys: keys.map((k) => ({ ...k, q: map(k.q) })),
  };
}

function dominantTime(measures, q0, qEnd) {
  const w = new Map();
  for (const m of measures) {
    const a = Math.max(m.q, q0);
    const b = Math.min(m.q + m.len, qEnd);
    if (b <= a + EPS) continue;
    const k = `${m.num}/${m.den}`;
    w.set(k, (w.get(k) || 0) + (b - a));
  }
  let best = null;
  for (const [k, v] of w) if (!best || v > best[1] + EPS) best = [k, v];
  const [num, den] = (best ? best[0] : '4/4').split('/').map(Number);
  return { num, den, changes: w.size > 1 };
}

function dominantTempo(tempos, q0, qEnd) {
  const ts = [...tempos].filter((t) => t.bpm > 0 && Number.isFinite(t.bpm)).sort((a, b) => a.q - b.q);
  if (!ts.length) return null;
  const w = new Map();
  ts.forEach((t, i) => {
    const a = Math.max(i === 0 ? -Infinity : t.q, q0);
    const b = Math.min(i + 1 < ts.length ? ts[i + 1].q : Infinity, qEnd);
    if (b <= a + EPS) return;
    const k = Math.round(t.bpm * 10) / 10;
    w.set(k, (w.get(k) || 0) + (b - a));
  });
  let best = null;
  for (const [k, v] of w) if (!best || v > best[1] + EPS) best = [k, v];
  if (!best) return { bpm: ts[0].bpm, changes: false };
  const changes = [...w.keys()].some((k) => Math.abs(k - best[0]) > best[0] * 0.04);
  return { bpm: best[0], changes };
}

// Krumhansl-Schmuckler key finding, duration weighted. Minor keys give their relative major,
// because the app names notes from a major tonic.
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
export function estimateKey(notes) {
  const h = new Array(12).fill(0);
  for (const n of notes) h[mod12(n.m)] += n.d || 1;
  const corr = (prof, t) => {
    const xs = h.map((_, i) => h[mod12(i + t)]);
    const mx = xs.reduce((a, b) => a + b, 0) / 12;
    const my = prof.reduce((a, b) => a + b, 0) / 12;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < 12; i++) {
      sxy += (xs[i] - mx) * (prof[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (prof[i] - my) ** 2;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  };
  let best = { pc: 0, r: -Infinity, minor: false };
  for (let t = 0; t < 12; t++) {
    const rM = corr(KS_MAJOR, t);
    if (rM > best.r + 1e-9) best = { pc: t, r: rM, minor: false };
    const rm = corr(KS_MINOR, t);
    if (rm > best.r + 1e-9) best = { pc: mod12(t + 3), r: rm, minor: true };
  }
  return best.pc;
}

// Where lines start. Each place between two notes gets a score (a rest, a comma or full
// stop, a breath mark, a long note, a karaoke line marker...), never inside a word or before
// a held syllable; then lines are chosen to be about 2 to 4 bars long.
function splitLines(notes, measures) {
  const n = notes.length;
  if (n <= 1) return [0];
  // Karaoke line markers, or sections in sheet music (after a repeat or a jump).
  const karaoke = notes.filter((x, i) => i > 0 && x.line).length >= 2;
  const marked = karaoke || notes.filter((x, i) => i > 0 && x.para).length >= 2;
  const lyricTexts = notes.filter((x) => x.syl).map((x) => x.syl.text).join(' ');
  const mixedCase = /[a-z]/.test(lyricTexts) && /[A-Z]/.test(lyricTexts);
  const score = new Float64Array(n);
  let lastSyl = notes[0].syl ? notes[0] : null;
  for (let i = 1; i < n; i++) {
    const a = notes[i - 1];
    const b = notes[i];
    if (a.syl) lastSyl = a;
    if (b.hold) {
      score[i] = -Infinity;
      continue;
    }
    let s = 0;
    const gap = b.q - (a.q + a.d);
    s += gap >= 2 - EPS ? 5 : gap >= 1 - EPS ? 4 : gap >= 0.5 - EPS ? 2.5 : gap > EPS ? 1.5 : 0;
    if (lastSyl) {
      const t = lastSyl.syl.text;
      if (/[.!?]["'’”»)\]]*$/.test(t)) s += 3;
      else if (/[,;:]["'’”»)\]]*$/.test(t)) s += 2;
      if (lastSyl.syl.joinNext) s -= 30;
    }
    if (a.breath || a.fermata) s += 3;
    if (a.d >= 2 - EPS) s += 1.5;
    else if (a.d >= 1.5 - EPS) s += 1;
    if (b.para || b.sect) s += 4;
    if (b.sys) s += 1;
    if (mixedCase && b.syl && /^[A-Z]/.test(b.syl.text)) s += 1;
    // Marked lines are the file's own; a karaoke line is split only when it's very long.
    if (marked) s += b.line || b.para ? 20 : karaoke ? -16 : -2;
    score[i] = s;
  }
  const cost = (i, j) => {
    const span = notes[j - 1].q + notes[j - 1].d - notes[i].q;
    const bars = span / fullBar(barAt(measures, notes[i].q));
    const count = j - i;
    let c = 2; // every line costs a little, so a break has to earn its place
    if (bars < 1.5) c += (1.5 - bars) * 4;
    if (bars > 4.25) c += (bars - 4.25) * 6;
    if (count < 3) c += (3 - count) * 2;
    if (count > 20) c += (count - 20) * 0.6;
    return c;
  };
  const WINDOW = 200;
  const best = new Float64Array(n + 1).fill(Infinity);
  const from = new Int32Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    if (j < n && score[j] === -Infinity) continue;
    for (let i = Math.max(0, j - WINDOW); i < j; i++) {
      if (best[i] === Infinity) continue;
      const v = best[i] + cost(i, j) - (i > 0 ? score[i] : 0);
      if (v < best[j]) {
        best[j] = v;
        from[j] = i;
      }
    }
  }
  const starts = [];
  for (let j = n; j > 0; j = from[j]) {
    if (from[j] < 0) break;
    starts.push(from[j]);
  }
  starts.reverse();
  return starts.length && starts[0] === 0 ? starts : [0];
}

const round4 = (x) => Math.round(x * 10000) / 10000;
const fmt = (x) => String(round4(x));
const noteName = (m, flats) => (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(m)] + (Math.floor(m / 12) - 1);

// Tokens laid out in beats, with bar lines, line breaks and rests (or "-" no-chord spans)
// filling the gaps. items: [{ a, b, sym, split }], split: cut the token at each bar line
// (chords). bars: beat positions. A one-beat note is written without "/1", like songs.js.
function layout(items, bars, lineStarts, kind) {
  const gapSym = kind === 'melody' ? 'r' : '-';
  const out = [];
  let bi = 0;
  let end = 0;
  const skipTo = (x) => {
    while (bi < bars.length && bars[bi] < x - EPS) bi++;
  };
  const here = (x) => bi < bars.length && Math.abs(bars[bi] - x) < EPS;
  const piece = (sym, a, b) => {
    const d = fmt(b - a);
    out.push(kind === 'melody' && sym !== 'r' && d === '1' ? sym : `${sym}/${d}`);
  };
  items.forEach((it, k) => {
    if (it.a > end + EPS) {
      skipTo(end);
      let x = end;
      if (here(x) && out.length) {
        out.push('|');
        bi++;
      }
      while (bi < bars.length && bars[bi] < it.a - EPS) {
        piece(gapSym, x, bars[bi]);
        out.push('|');
        x = bars[bi];
        bi++;
      }
      piece(gapSym, x, it.a);
    } else skipTo(it.a);
    if (k > 0 && lineStarts.has(k)) {
      out.push('//\n');
      if (here(it.a)) bi++;
    } else if (here(it.a) && out.length) {
      out.push('|');
      bi++;
    }
    let x = it.a;
    if (it.split) {
      // chords: one token per bar
      while (bi < bars.length && bars[bi] < it.b - EPS) {
        piece(it.sym, x, bars[bi]);
        out.push('|');
        x = bars[bi];
        bi++;
      }
    }
    piece(it.sym, x, it.b);
    end = it.b;
  });
  return out.join(' ').replace(/ \/\/\n /g, ' //\n');
}

function emitLyrics(notes, starts) {
  const lines = [];
  starts.forEach((s, li) => {
    const e = li + 1 < starts.length ? starts[li + 1] : notes.length;
    const toks = [];
    // A blank line before a new verse or section (a karaoke "\" paragraph), so the song
    // player can tell where one ends (js/songs.js learnChunks).
    if (li > 0 && (notes[s].para || notes[s].sect)) lines.push('');
    for (let i = s; i < e; i++) {
      const n = notes[i];
      if (n.hold || !n.syl) {
        toks.push('~');
        continue;
      }
      let t = n.syl.text.replace(UNSAFE_CHARS_G, '').replace(/\s+/g, '‿');
      t = cutText(t, SONG_LIMITS.token - 2);
      if (t === '~') t = '∼';
      // A literal hyphen or equals sign at the end would read as a join marker.
      t = t.replace(/-$/, '‐').replace(/=$/, '＝');
      toks.push(t + (n.syl.joinNext === 'join' ? '-' : n.syl.joinNext === 'hyphen' ? '=' : ''));
    }
    lines.push(toks.join(' '));
  });
  return lines.join('\n');
}

function chordName(c, flats) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(c.root)] + c.quality;
}

function finish(line, kind, opts) {
  const warnings = [...line.warnings];
  let notes = line.notes.filter((n) => n.m != null && n.d > 1e-4).map((n) => ({ ...n }));
  notes.sort((a, b) => a.q - b.q);
  const mono = [];
  for (const n of notes) {
    const last = mono[mono.length - 1];
    if (last && n.q < last.q + EPS) continue;
    if (last && last.q + last.d > n.q) last.d = n.q - last.q;
    mono.push(n);
  }
  notes = mono;
  if (!notes.length) throw new ImportError('No tune was found in this file.');
  if (notes.length > MAX_READ_NOTES) {
    notes.length = MAX_READ_NOTES;
    warnings.push(`This file is very long; only its first ${MAX_READ_NOTES} notes were read.`);
  }
  let measures = line.measures.length ? line.measures : [{ q: 0, len: 4, num: 4, den: 4, label: '1' }];

  const withSyl = notes.filter((n) => n.syl).length;
  const hasLyrics = withSyl >= 4 && withSyl >= 0.02 * notes.length;
  if (!hasLyrics) {
    notes.forEach((n) => (n.syl = null));
    warnings.push(withSyl ? 'Only a few notes have words, so the song is sung on “la”.' : 'No words were found in this file, so the song is sung on “la”.');
  } else notes = keepSung(notes, measures, warnings, !!line.vocal);

  let { chords, tempos, keys } = line;
  ({ notes, measures, chords, tempos, keys } = squeezeGaps(notes, measures, chords, tempos || [], keys || [], warnings));
  const q0 = notes[0].q;
  const lastNote = notes[notes.length - 1];
  const qEnd = lastNote.q + lastNote.d;

  const ts = dominantTime(measures, q0, qEnd);
  const unit = ts.den >= 8 ? 0.5 : 1; // x/8 songs count in eighths, like "Row, Row, Row Your Boat"
  const meter = Math.max(1, Math.min(24, Math.round(((ts.num * 4) / ts.den / unit) * 4) / 4));
  const pulse = ts.den === 8 && ts.num % 3 === 0 && ts.num > 3 ? 3 : null;
  if (ts.changes) warnings.push(`The time signature changes; the count-in uses ${ts.num}/${ts.den}.`);

  const tempo = dominantTempo(tempos, q0, qEnd) || { bpm: line.defaultTempo || 100, changes: false };
  const bpm = Math.max(20, Math.min(400, Math.round(tempo.bpm / unit)));
  if (tempo.changes) warnings.push(`The tempo changes in this file; the song is sung at ${bpm} beats a minute throughout.`);

  let keyPc;
  if (line.keyFromFile && keys.length) {
    const atStart = keys.filter((k) => k.q <= q0 + EPS);
    keyPc = (atStart.length ? atStart[atStart.length - 1] : keys[0]).pc;
    const change = keys.find((k) => k.q > q0 + EPS && k.q < qEnd - EPS && k.pc !== keyPc);
    if (change) warnings.push(`The key changes at bar ${barAt(measures, change.q).label}; note names follow the first key.`);
  } else keyPc = estimateKey(notes);
  const flats = FLAT_KEYS.has(keyPc);

  const starts = splitLines(notes, measures);
  const startSet = new Set(starts);
  const beat = (q) => round4((q - q0) / unit);
  const bars = measures.map((m) => beat(m.q)).filter((b) => b > EPS);
  const melody = layout(
    notes.map((n) => ({ a: beat(n.q), b: beat(n.q + n.d), sym: noteName(n.m, flats) })),
    bars,
    startSet,
    'melody'
  );
  const lyrics = hasLyrics ? emitLyrics(notes, starts) : null;

  let chordStr = null;
  if (chords && chords.length) {
    const cs = [...chords].sort((a, b) => a.q - b.q);
    const spans = [];
    let k = cs.length - 1;
    while (k >= 0 && cs[k].q > q0 + EPS) k--;
    if (k < 0) {
      spans.push({ q: q0, sym: '-' });
      k = 0;
    }
    for (; k < cs.length; k++) {
      const q = Math.max(cs[k].q, q0);
      if (q >= qEnd - EPS) break;
      const sym = cs[k].none ? '-' : chordName(cs[k], flats);
      if (spans.length && Math.abs(spans[spans.length - 1].q - q) < EPS) spans[spans.length - 1].sym = sym;
      else spans.push({ q, sym });
    }
    if (spans.some((s) => s.sym !== '-')) {
      const items = spans.map((s, i) => ({ a: beat(s.q), b: beat(i + 1 < spans.length ? spans[i + 1].q : qEnd), sym: s.sym, split: true }));
      chordStr = layout(items, bars, new Set(), 'chords');
    }
  }

  const title = cleanText(opts.title || line.title || titleFromFileName(opts.fileName) || '', SONG_LIMITS.title) || 'Family song';
  const song = { id: '', title, credit: FAMILY_CREDIT, key: KEY_NAMES[keyPc], bpm, meter, ...(pulse ? { pulse } : {}), melody, lyrics, chords: chordStr };
  song.id = songId(song);

  const paras = new Set();
  const barLabels = starts.map((s, li) => {
    const e = (li + 1 < starts.length ? starts[li + 1] : notes.length) - 1;
    if (li > 0 && (notes[s].para || notes[s].sect)) paras.add(li);
    return [notes[s].bar || barAt(measures, notes[s].q).label, notes[e].bar || barAt(measures, notes[e].q).label];
  });
  return resultFor(song, { paras, bars: barLabels, warnings, choices: line.choices || [], source: makeSource(kind, opts.fileName, opts.now) });
}

function titleFromFileName(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/\.[A-Za-z0-9]{1,8}$/, '');
  return base.replace(/[_]+/g, ' ');
}

function resultFor(song, { paras, bars, warnings, choices, source }) {
  const v = validateSong(song);
  if (!v.ok) warnings.push(v.error);
  const { sections, stats, long } = songSections(song, { paras, bars });
  return { song, sections, long, fits: v.ok, warnings, choices, source, stats };
}

// The words of some lyric tokens, as a child would read them.
function wordsOf(tokens, max = 6) {
  let s = '';
  for (const t of tokens) {
    if (t === '~') continue;
    if (t.endsWith('=')) s += t.slice(0, -1) + '-';
    else if (t.endsWith('-')) s += t.slice(0, -1);
    else s += t + ' ';
  }
  const words = s.replace(/‿/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, max).join(' ') + (words.length > max ? '…' : '');
}

// Line ranges a grown-up can choose from when a song is long. paras: line indexes that
// start a verse or section in the file; bars: [first, last] bar label of each line.
export function songSections(song, { paras = null, bars = null } = {}) {
  const mel = parseMelody(song.melody);
  if (!paras) paras = paraStarts(song.lyrics, mel.phrases);
  const lyr = song.lyrics ? parseLyrics(song.lyrics) : null;
  const spb = 60 / song.bpm;
  const lines = mel.phrases.map(([s, e]) => {
    const last = mel.notes[e - 1];
    return { s, e, beat: mel.notes[s].beat, end: last.beat + last.beats, words: lyr ? wordsOf(lyr.slice(s, e)) : '' };
  });
  let low = Infinity;
  let high = -Infinity;
  for (const n of mel.notes) {
    low = Math.min(low, n.m);
    high = Math.max(high, n.m);
  }
  const seconds = mel.totalBeats * spb;
  const stats = { notes: mel.notes.length, lines: lines.length, seconds: Math.round(seconds), low, high };
  const long = lines.length > COMFORT.lines || mel.notes.length > COMFORT.notes || seconds > COMFORT.seconds;
  let groups = [[0, lines.length - 1]];
  if (long) {
    const gs = [];
    let start = 0;
    for (let i = 1; i < lines.length; i++) {
      if (paras.has(i)) {
        gs.push([start, i - 1]);
        start = i;
      }
    }
    gs.push([start, lines.length - 1]);
    const merged = [];
    for (const g of gs) {
      const prev = merged[merged.length - 1];
      if (prev && (g[1] - g[0] < 2 || prev[1] - prev[0] < 2) && g[1] - prev[0] < SECTION_LINES) prev[1] = g[1];
      else merged.push([...g]);
    }
    groups = merged.flatMap(([a, b]) => {
      const count = b - a + 1;
      const parts = Math.ceil(count / SECTION_LINES);
      const size = Math.ceil(count / parts);
      const out = [];
      for (let x = a; x <= b; x += size) out.push([x, Math.min(b, x + size - 1)]);
      return out;
    });
  }
  const sections = groups.map(([a, b]) => ({
    from: a,
    to: b,
    label: a === b ? `Line ${a + 1}` : `Lines ${a + 1}–${b + 1}`,
    firstBar: bars && bars[a] ? bars[a][0] : null,
    lastBar: bars && bars[b] ? bars[b][1] : null,
    notes: lines[b].e - lines[a].s,
    seconds: Math.round((lines[b].end - lines[a].beat) * spb),
    words: lines[a].words,
  }));
  return { sections, stats, long };
}

// Lines from..to (0-based, inclusive) of a song, as a song of their own: melody, words and
// chords cut to those lines and starting at beat 0. The id is new; the title is kept unless
// opts.title is given.
export function sliceSong(song, from, to, opts = {}) {
  const mel = parseMelody(song.melody);
  if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from && to < mel.phrases.length)) {
    throw new RangeError(`Lines ${from}..${to} are not in this song.`);
  }
  const s = mel.phrases[from][0];
  const e = mel.phrases[to][1];
  const start = mel.notes[s].beat;
  const last = mel.notes[e - 1];
  const end = last.beat + last.beats;

  // Walk the melody text again, keeping bar lines, line breaks and rests inside the cut.
  const out = [];
  let b = 0;
  let idx = 0;
  for (const tok of song.melody.trim().split(/\s+/)) {
    if (tok === '|') {
      if (idx > s && idx < e && out.length && out[out.length - 1] !== '|') out.push('|');
      continue;
    }
    if (tok === '//') {
      if (idx > s && idx < e) out.push('//\n');
      continue;
    }
    const [p, d] = tok.split('/');
    const beats = d ? Number(d) : 1;
    if (p === 'r') {
      if (idx > s && idx < e && b >= start - EPS && b + beats <= end + EPS) out.push(tok);
    } else {
      if (idx >= s && idx < e) out.push(tok);
      idx++;
    }
    b += beats;
  }
  while (out.length && (out[out.length - 1] === '|' || out[out.length - 1] === '//\n')) out.pop();
  const melody = out.join(' ').replace(/ \/\/\n /g, ' //\n');

  let lyrics = null;
  if (song.lyrics) {
    const toks = parseLyrics(song.lyrics);
    const paras = paraStarts(song.lyrics, mel.phrases);
    lyrics = mel.phrases
      .slice(from, to + 1)
      .map(([a, z], k) => (k > 0 && paras.has(from + k) ? '\n' : '') + toks.slice(a, z).join(' '))
      .join('\n');
  }

  let chords = null;
  if (song.chords) {
    const spans = [];
    const cbars = [];
    let x = 0;
    for (const tok of song.chords.trim().split(/\s+/)) {
      if (tok === '|') {
        cbars.push(x);
        continue;
      }
      const [sym, d] = tok.split('/');
      const beats = d ? Number(d) : 1;
      spans.push({ a: x, b: x + beats, sym: sym === 'r' ? '-' : sym });
      x += beats;
    }
    const items = [];
    for (const sp of spans) {
      const a = Math.max(sp.a, start);
      const z = Math.min(sp.b, end);
      if (z <= a + EPS) continue;
      const prev = items[items.length - 1];
      const it = { a: round4(a - start), b: round4(z - start), sym: sp.sym, split: true };
      if (prev && prev.sym === it.sym && Math.abs(prev.b - it.a) < EPS) prev.b = it.b;
      else items.push(it);
    }
    const bars = cbars.filter((p) => p > start + EPS && p < end - EPS).map((p) => round4(p - start));
    if (items.some((it) => it.sym !== '-')) chords = layout(items, bars, new Set(), 'chords');
  }

  const piece = { id: '', title: opts.title || song.title, credit: song.credit, key: song.key, bpm: song.bpm, meter: song.meter, ...(song.pulse ? { pulse: song.pulse } : {}), melody, lyrics, chords };
  piece.id = songId(piece);
  return piece;
}

// ---------- Choosing what to keep ----------
export const PIECE_LINES = 16; // a part offered on its own: up to this many lines

// The parts a grown-up can choose from a long song: each section, two sections in a row
// (often a verse and its chorus) and, when it fits, the whole song.
export function pieceOptions(result) {
  const { sections, fits, long } = result;
  const lines = result.stats.lines;
  if (fits && !long) return [{ from: 0, to: lines - 1, whole: true }];
  const out = [];
  if (fits) out.push({ from: 0, to: lines - 1, whole: true });
  sections.forEach((s, i) => {
    out.push({ from: s.from, to: s.to, sec: s });
    const nx = sections[i + 1];
    if (nx && nx.to - s.from + 1 <= PIECE_LINES) out.push({ from: s.from, to: nx.to, sec: s, end: nx, pair: true });
  });
  return out;
}

// The whole song whenever it fits (a long one is still learnt a part at a time in Line by line).
// Only a song too long to keep whole starts on a part: its first verse and chorus when there are
// sections to pair, or its first part.
export function defaultPiece(opts) {
  if (opts.length === 1 || opts[0].whole) return 0;
  const pair = opts.findIndex((p) => p.pair && p.from === 0);
  if (pair >= 0) return pair;
  const first = opts.findIndex((p) => !p.whole);
  return first >= 0 ? first : 0;
}
