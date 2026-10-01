// Private family song files (".nbn"). A grown-up can send a family song from one of the
// family's phones to another (AirDrop, Messages, a shared iCloud folder) and open it there.
// The file is small JSON:
//   { format: 'note-by-note-song', version: 1, song: {...}, source: { kind, fileName, importedAt } }
// Files arrive from outside the app, so reading one is strict: types, sizes, lengths, the
// characters allowed in the melody and chords, the note count and the file size are all
// checked, and control characters (and bidi overrides) are refused anywhere. The UI must
// still escape every string it shows. Unknown fields are dropped, the id is recomputed
// from the content, and the credit is always the family-song line.

import { parseMelody, parseLyrics, parseChords, parsePitch } from './music.js';
import { UNSAFE_CHARS, UNSAFE_CHARS_G, decodeUtf8, stripUtf8Bom, toBytes } from './text.js';

export const NBN_FORMAT = 'note-by-note-song';
export const NBN_VERSION = 1;
export const NBN_EXT = '.nbn';
export const FAMILY_CREDIT = 'Family song · only on this phone';
export const SOURCE_KINDS = ['midi', 'kar', 'musicxml', 'mxl'];

export const SONG_LIMITS = {
  fileBytes: 256 * 1024,
  title: 80,
  notes: 1500,
  melodyChars: 48000,
  lyricsChars: 48000,
  chordsChars: 24000,
  token: 48,
  totalBeats: 20000,
  bpm: [20, 400],
  meter: [1, 24],
  pitch: [12, 120],
  fileName: 160,
};

const MELODY_CHARS = /^[A-Gr#b0-9.\/|\s-]*$/;
const MELODY_TOKEN = /^(?:\||\/\/|(?:r|[A-G][#b]?-?\d)(?:\/(?:\d{1,4}(?:\.\d{1,6})?|\.\d{1,6}))?)$/;
const CHORD_CHARS = /^[A-Gmaj#b0-9.\/|r\s-]*$/;
const CHORD_TOKEN = /^(?:\||(?:-|r|[A-G][#b]?(?:m|7|m7|maj7)?)(?:\/(?:\d{1,4}(?:\.\d{1,6})?|\.\d{1,6}))?)$/;
const KEY = /^[A-G][#b]?$/;
const ID = /^fam-[0-9a-z]{11}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

// 53-bit string hash (cyrb53), for ids that stay the same when the same song is imported twice.
function hash53(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function songId(song) {
  const key = JSON.stringify([song.title, song.key, song.bpm, song.meter, song.pulse || null, song.melody, song.lyrics || null, song.chords || null]);
  return 'fam-' + hash53(key).toString(36).padStart(11, '0');
}

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const fail = (error) => ({ ok: false, error });
const tokens = (s) => s.trim().split(/\s+/).filter(Boolean);

// Check a song object and return a clean copy: { ok: true, song } or { ok: false, error }.
export function validateSong(input) {
  if (!isObj(input)) return fail('The song is missing.');
  const L = SONG_LIMITS;
  const { title, key, bpm, meter, pulse, melody, lyrics, chords } = input;

  if (typeof title !== 'string') return fail('The song has no title.');
  const t = title.trim();
  if (!t || t.length > L.title) return fail(`The title must be 1 to ${L.title} characters.`);
  if (UNSAFE_CHARS.test(t) || /[\t\n\r]/.test(t)) return fail('The title has characters that are not allowed.');

  if (typeof key !== 'string' || !KEY.test(key)) return fail('The key is not valid.');
  if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < L.bpm[0] || bpm > L.bpm[1]) return fail('The tempo is not valid.');
  if (typeof meter !== 'number' || !Number.isFinite(meter) || meter < L.meter[0] || meter > L.meter[1] || !Number.isInteger(meter * 4)) return fail('The time signature is not valid.');
  if (pulse != null && (!Number.isInteger(pulse) || pulse < 1 || pulse > 12 || pulse > meter)) return fail('The beat grouping is not valid.');

  if (typeof melody !== 'string' || !melody.trim()) return fail('The song has no melody.');
  if (melody.length > L.melodyChars) return fail('The melody is too long.');
  if (!MELODY_CHARS.test(melody)) return fail('The melody has characters that are not allowed.');
  for (const tok of tokens(melody)) {
    if (!MELODY_TOKEN.test(tok)) return fail('The melody is not written correctly.');
    if (tok === '|' || tok === '//') continue;
    const [p, d] = tok.split('/');
    if (d != null && !(Number(d) > 0 && Number(d) <= 64)) return fail('A note in the melody has a bad length.');
    if (p !== 'r') {
      const m = parsePitch(p);
      if (m < L.pitch[0] || m > L.pitch[1]) return fail('A note in the melody is out of range.');
    }
  }
  let mel;
  try {
    mel = parseMelody(melody);
  } catch (e) {
    return fail('The melody is not written correctly.');
  }
  if (!mel.notes.length) return fail('The melody has no notes.');
  if (mel.notes.length > L.notes) return fail(`The song is too long to save (${mel.notes.length} notes, at most ${L.notes}). Choose a part of it.`);
  if (!(mel.totalBeats <= L.totalBeats)) return fail('The song is too long to save.');

  let lyr = null;
  if (lyrics != null && !(typeof lyrics === 'string' && !lyrics.trim())) {
    if (typeof lyrics !== 'string') return fail('The words are not valid.');
    if (lyrics.length > L.lyricsChars) return fail('The words are too long.');
    if (UNSAFE_CHARS.test(lyrics)) return fail('The words have characters that are not allowed.');
    lyr = parseLyrics(lyrics);
    if (lyr.length !== mel.notes.length) return fail(`The words don't match the tune (${lyr.length} syllables for ${mel.notes.length} notes).`);
    if (lyr.some((w) => w.length > L.token)) return fail('A word is too long.');
  }

  if (chords != null) {
    if (typeof chords !== 'string') return fail('The chords are not valid.');
    if (chords.length > L.chordsChars) return fail('The chords are too long.');
    if (!CHORD_CHARS.test(chords)) return fail('The chords have characters that are not allowed.');
    for (const tok of tokens(chords)) {
      if (!CHORD_TOKEN.test(tok)) return fail('The chords are not written correctly.');
      const d = tok === '|' ? null : tok.split('/')[1];
      if (d != null && !(Number(d) > 0 && Number(d) <= 64)) return fail('A chord has a bad length.');
    }
    try {
      parseChords(chords);
    } catch (e) {
      return fail('The chords are not written correctly.');
    }
  }

  const song = {
    id: '',
    title: t,
    credit: FAMILY_CREDIT,
    key,
    bpm,
    meter,
    ...(pulse != null ? { pulse } : {}),
    melody,
    lyrics: lyr ? lyrics : null,
    chords: chords != null && chords.trim() ? chords : null,
  };
  song.id = songId(song);
  return { ok: true, song };
}

function validateSource(src) {
  if (src == null) return { ok: true, source: null };
  if (!isObj(src)) return fail('The file information is not valid.');
  const out = {};
  if (src.kind != null) {
    if (!SOURCE_KINDS.includes(src.kind)) return fail('The file information is not valid.');
    out.kind = src.kind;
  }
  if (src.fileName != null) {
    if (typeof src.fileName !== 'string' || src.fileName.length > SONG_LIMITS.fileName || UNSAFE_CHARS.test(src.fileName) || /[\t\n\r\/\\]/.test(src.fileName)) {
      return fail('The file information is not valid.');
    }
    out.fileName = src.fileName;
  }
  if (src.importedAt != null) {
    if (typeof src.importedAt !== 'string' || !ISO.test(src.importedAt) || Number.isNaN(Date.parse(src.importedAt))) return fail('The file information is not valid.');
    out.importedAt = src.importedAt;
  }
  return { ok: true, source: out };
}

// Just the file's own name: no folders, nothing unsafe.
export function cleanFileName(name) {
  const base = String(name || '').split(/[\\/]/).pop();
  return base.replace(UNSAFE_CHARS_G, '').replace(/[\t\n\r]/g, ' ').trim().slice(0, SONG_LIMITS.fileName);
}

export function makeSource(kind, fileName, now = new Date()) {
  return { kind, fileName: cleanFileName(fileName), importedAt: now.toISOString() };
}

// Song -> the text of a .nbn file.
export function writeFamilySongFile(song, source = null) {
  const v = validateSong(song);
  if (!v.ok) throw new Error(v.error);
  const s = validateSource(source);
  if (!s.ok) throw new Error(s.error);
  const doc = { format: NBN_FORMAT, version: NBN_VERSION, song: v.song };
  if (s.source) doc.source = s.source;
  const text = JSON.stringify(doc, null, 1);
  if (new TextEncoder().encode(text).length > SONG_LIMITS.fileBytes) throw new Error('This song is too long to save as a file.');
  return text;
}

// The text or bytes of a .nbn file -> { ok: true, song, source } or { ok: false, error }.
export function readFamilySongFile(data) {
  let text;
  if (typeof data === 'string') {
    if (data.length > SONG_LIMITS.fileBytes) return fail('This file is too big to be a song file.');
    text = data.charCodeAt(0) === 0xfeff ? data.slice(1) : data;
  } else {
    const b = toBytes(data);
    if (b.length > SONG_LIMITS.fileBytes) return fail('This file is too big to be a song file.');
    text = decodeUtf8(stripUtf8Bom(b));
    if (text == null) return fail('This is not a Note by Note song file.');
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return fail('This is not a Note by Note song file.');
  }
  if (!isObj(doc) || doc.format !== NBN_FORMAT) return fail('This is not a Note by Note song file.');
  if (!Number.isInteger(doc.version) || doc.version < 1) return fail('This song file is damaged.');
  if (doc.version > NBN_VERSION) return fail('This song file was made by a newer version of Note by Note. Update the app on this phone, then try again.');
  const v = validateSong(doc.song);
  if (!v.ok) return v;
  const s = validateSource(doc.source);
  if (!s.ok) return s;
  return { ok: true, song: v.song, source: s.source };
}

// A file name for sending a song: its title, without characters file systems dislike.
export function familySongFileName(song) {
  const base = String((song && song.title) || '')
    .replace(UNSAFE_CHARS_G, '')
    .replace(/[\\/:*?"<>|\t\n\r]+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60)
    .trim();
  return (base || 'Family song') + NBN_EXT;
}

export const isFamilySongId = (id) => typeof id === 'string' && ID.test(id);
