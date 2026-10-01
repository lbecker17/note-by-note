// Turning bytes from song files into text. Files from music shops and old karaoke
// software are UTF-8 or Windows-1252 (a superset of Latin-1), so try UTF-8 strictly
// and fall back to Windows-1252, byte for byte. No DOM, so it runs in Node too.

// Windows-1252 0x80-0x9F. The five unassigned bytes map to the C1 control of the same value.
const CP1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8d, 0x017d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x9d, 0x017e, 0x0178,
];

export function decodeCp1252(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 4096) {
    const end = Math.min(bytes.length, i + 4096);
    const codes = new Array(end - i);
    for (let j = i; j < end; j++) {
      const b = bytes[j];
      codes[j - i] = b >= 0x80 && b < 0xa0 ? CP1252_HIGH[b - 0x80] : b;
    }
    s += String.fromCharCode(...codes);
  }
  return s;
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const looseUtf8 = new TextDecoder('utf-8', { ignoreBOM: true });

export function isAscii(bytes) {
  for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0x7f) return false;
  return true;
}

// Strict UTF-8, or null if the bytes aren't valid UTF-8.
export function decodeUtf8(bytes) {
  try {
    return strictUtf8.decode(bytes);
  } catch (e) {
    return null;
  }
}

export function decodeUtf8Loose(bytes) {
  return looseUtf8.decode(bytes);
}

// One string: UTF-8 if it is valid UTF-8, otherwise Windows-1252.
export function utf8OrCp1252(bytes) {
  const s = decodeUtf8(stripUtf8Bom(bytes));
  return s != null ? s : decodeCp1252(bytes);
}

export function stripUtf8Bom(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
}

export function decodeUtf16(bytes, littleEndian) {
  let s = '';
  const n = bytes.length >> 1;
  for (let i = 0; i < n; i += 4096) {
    const end = Math.min(n, i + 4096);
    const codes = new Array(end - i);
    for (let j = i; j < end; j++) {
      const a = bytes[2 * j];
      const b = bytes[2 * j + 1];
      codes[j - i] = littleEndian ? a | (b << 8) : (a << 8) | b;
    }
    s += String.fromCharCode(...codes);
  }
  return s;
}

export function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new TypeError('Expected bytes');
}

// C0 controls (other than the whitespace the caller allows), DEL, C1 controls, the
// Unicode bidi overrides and isolates, line/paragraph separators and lone surrogates.
// Text from files someone sent can't use these to hide or reorder what the app shows.
// The u flag makes a surrogate pair one character, so the surrogate range below only
// matches lone halves. (No lookbehind: Safari before 16.4 can't parse it, and one
// unparseable pattern stops the whole app loading.)
export const UNSAFE_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff\ufff9-\ufffb\ud800-\udfff]/u;
export const UNSAFE_CHARS_G = new RegExp(UNSAFE_CHARS.source, 'gu');

// The first `max` code units of a string, without cutting a character in half (emoji and
// other astral characters take two code units).
export function cutText(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, /[\ud800-\udbff]/.test(s[max - 1]) ? max - 1 : max);
}

// Display text from a file: unsafe characters removed, whitespace runs folded to one space.
export function cleanText(s, max = 200) {
  const t = String(s).replace(UNSAFE_CHARS_G, '').replace(/[\s\u00a0]+/g, ' ').trim();
  return cutText(t, max).trim();
}
