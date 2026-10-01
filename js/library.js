// Family songs: the songs a grown-up imported from files they bought (js/import.js), kept in
// IndexedDB on this phone only. Nothing here sends anything anywhere, and the bought file
// itself is never stored: a record holds only the melody and words in the app's own song
// format, where the song came from, and when it was added:
//   { id: 'fam-…', song: { …js/songs.js format… }, source: { kind, fileName, importedAt } | null,
//     via: 'kar' | 'midi' | 'musicxml' | 'mxl' | 'nbn', addedAt: ISO date }
// Records are checked again when they are read (validateSong), so a damaged one is skipped
// rather than trusted. The record's id stays the same when a song is renamed, so its best
// scores (saved under 'song:' + id) stay with it.

import { validateSong, isFamilySongId } from './nbn.js';

const DB_NAME = 'note-by-note-family';
const DB_VERSION = 1;
const STORE = 'songs';

export class LibraryError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'unavailable' | 'full' | 'failed'
  }
}

const UNAVAILABLE = 'This browser won’t let me save songs here. Private Browsing turns saving off: open Note by Note from the Home Screen, or in a normal Safari tab.';
const FULL = 'This phone is out of space for songs. Delete a song, or free up some space, then try again.';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('no indexedDB');
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(new LibraryError(UNAVAILABLE, 'unavailable'));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgrading the database: let go so it can.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(new LibraryError(UNAVAILABLE, 'unavailable'));
    req.onblocked = () => reject(new LibraryError(UNAVAILABLE, 'unavailable'));
  });
  // A failed open can be tried again later (e.g. after leaving Private Browsing).
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        let tx;
        try {
          tx = db.transaction(STORE, mode);
        } catch (e) {
          dbPromise = null;
          reject(new LibraryError(UNAVAILABLE, 'unavailable'));
          return;
        }
        let out;
        const req = fn(tx.objectStore(STORE));
        if (req) req.onsuccess = () => (out = req.result);
        tx.oncomplete = () => resolve(out);
        const fail = () => {
          const e = tx.error || (req && req.error);
          reject(e && e.name === 'QuotaExceededError' ? new LibraryError(FULL, 'full') : new LibraryError('I couldn’t save that. Try again.', 'failed'));
        };
        tx.onerror = fail;
        tx.onabort = fail;
      })
  );
}

// A record as stored -> a clean record, or null when it doesn't hold a valid song.
function clean(rec) {
  if (!rec || typeof rec !== 'object' || !isFamilySongId(rec.id)) return null;
  const v = validateSong(rec.song);
  if (!v.ok) return null;
  const song = { ...v.song, id: rec.id };
  const src = rec.source && typeof rec.source === 'object' ? rec.source : null;
  return {
    id: rec.id,
    song,
    source: src ? { kind: typeof src.kind === 'string' ? src.kind : undefined, fileName: typeof src.fileName === 'string' ? src.fileName : undefined, importedAt: typeof src.importedAt === 'string' ? src.importedAt : undefined } : null,
    via: typeof rec.via === 'string' ? rec.via : null,
    addedAt: typeof rec.addedAt === 'string' ? rec.addedAt : null,
  };
}

export const library = {
  // Every family song, oldest first.
  async list() {
    const all = (await run('readonly', (s) => s.getAll())) || [];
    return all
      .map(clean)
      .filter(Boolean)
      .sort((a, b) => String(a.addedAt).localeCompare(String(b.addedAt)) || a.id.localeCompare(b.id));
  },
  async get(id) {
    return clean(await run('readonly', (s) => s.get(id)));
  },
  async put(rec) {
    const c = clean(rec);
    if (!c) throw new LibraryError('This song can’t be saved.', 'failed');
    await run('readwrite', (s) => s.put(c));
    return c;
  },
  async remove(id) {
    await run('readwrite', (s) => s.delete(id));
  },
  async clear() {
    await run('readwrite', (s) => s.clear());
  },
  // True when the database opens (false in a browser that blocks it, e.g. some private modes).
  async available() {
    try {
      await open();
      return true;
    } catch (e) {
      return false;
    }
  },
};

// Ask the browser to keep the songs even when space runs low (once, after the first save).
export async function askToPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) {
    /* not supported */
  }
  return false;
}
