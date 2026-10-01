// A minimal ZIP reader for compressed MusicXML (.mxl). Reads the central directory and
// "stored" or "deflated" entries only (no ZIP64, no encryption). Deflate uses the
// platform's DecompressionStream('deflate-raw') (Safari 16.4+, Node 18+). Every entry is
// capped while it decompresses and checked against its CRC, so a "zip bomb" or a
// damaged file stops with a clear error instead of filling the phone's memory.

import { decodeUtf8Loose, decodeCp1252, toBytes } from './text.js';

export const ZIP_LIMITS = { inputBytes: 16 * 1024 * 1024, entries: 4000, entryBytes: 48 * 1024 * 1024 };

export class ZipError extends Error {}

const le16 = (b, p) => b[p] | (b[p + 1] << 8);
const le32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;

export function looksLikeZip(data) {
  const b = toBytes(data);
  return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6);
}

let CRC_TABLE = null;
export function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// The entries listed in the central directory.
export function listZip(data) {
  const b = toBytes(data);
  if (b.length > ZIP_LIMITS.inputBytes) throw new ZipError('This file is too big.');
  let eocd = -1;
  for (let p = b.length - 22; p >= Math.max(0, b.length - 22 - 65535); p--) {
    if (b[p] === 0x50 && b[p + 1] === 0x4b && b[p + 2] === 5 && b[p + 3] === 6) {
      eocd = p;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('This zip file is damaged (no directory).');
  const count = le16(b, eocd + 10);
  const cdOffset = le32(b, eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new ZipError('Very large (ZIP64) files are not supported.');
  if (count > ZIP_LIMITS.entries) throw new ZipError('This zip file has too many files inside.');
  const out = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > b.length || le32(b, p) !== 0x02014b50) throw new ZipError('This zip file is damaged (bad directory).');
    const flags = le16(b, p + 8);
    const nameLen = le16(b, p + 28);
    const extraLen = le16(b, p + 30);
    const commentLen = le16(b, p + 32);
    if (p + 46 + nameLen > b.length) throw new ZipError('This zip file is damaged (bad directory).');
    const nameBytes = b.subarray(p + 46, p + 46 + nameLen);
    out.push({
      name: flags & 0x800 ? decodeUtf8Loose(nameBytes) : decodeCp1252(nameBytes),
      flags,
      method: le16(b, p + 10),
      crc: le32(b, p + 16),
      csize: le32(b, p + 20),
      usize: le32(b, p + 24),
      offset: le32(b, p + 42),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflateRaw(bytes, maxOut) {
  if (typeof DecompressionStream !== 'function') throw new ZipError('This browser cannot open compressed files (.mxl). Try an uncompressed .musicxml file.');
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  const reader = ds.readable.getReader();
  const parts = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxOut) {
        reader.cancel().catch(() => {});
        throw new ZipError('A file inside the zip is too big.');
      }
      parts.push(value);
    }
  } catch (e) {
    if (e instanceof ZipError) throw e;
    throw new ZipError('A file inside the zip is damaged.');
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const part of parts) {
    out.set(part, o);
    o += part.length;
  }
  return out;
}

// One entry's bytes.
export async function readZipEntry(data, entry, maxBytes = ZIP_LIMITS.entryBytes) {
  const b = toBytes(data);
  if (entry.flags & 1) throw new ZipError('This zip file is password-protected.');
  if (entry.usize > maxBytes) throw new ZipError('A file inside the zip is too big.');
  const p = entry.offset;
  if (p + 30 > b.length || le32(b, p) !== 0x04034b50) throw new ZipError('This zip file is damaged (bad entry).');
  const start = p + 30 + le16(b, p + 26) + le16(b, p + 28);
  const end = start + entry.csize;
  if (end > b.length) throw new ZipError('This zip file is cut short.');
  const raw = b.subarray(start, end);
  let out;
  if (entry.method === 0) out = raw.slice();
  else if (entry.method === 8) out = await inflateRaw(raw, maxBytes);
  else throw new ZipError('This zip file uses a compression method that is not supported.');
  if (out.length !== entry.usize || crc32(out) !== entry.crc) throw new ZipError('A file inside the zip is damaged (checksum).');
  return out;
}
