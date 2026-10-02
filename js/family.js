// The family account: one family, signed in once per device by a grown-up (email and password),
// with a profile for each child and the family songs shared by every family device.
//   - The app's own store (js/store.js) stays the working copy for the singer on this device.
//     Other singers' copies are cached here (localStorage) so switching works offline.
//   - A singer's state syncs with their profile_state row: pulled on start, resume, coming back
//     online and on picking the singer; pushed a few seconds after a change. When both sides
//     changed they are merged (js/sync.js), and a write only lands if the row hasn't changed
//     since it was read (updated_at), otherwise it is read and merged again.
//   - Family songs stay in IndexedDB (js/library.js) as the offline copy. Adds, renames and
//     deletes made here wait in a small queue until they reach family_songs; then the family's
//     list is pulled and this device's copy brought into line. Rows are checked with
//     validateSong before use.
// Nothing here throws at the app for being offline: it says so through status ('offline').

import { createCloud } from './cloud.js';
import { store } from './store.js';
import { library, cleanSource } from './library.js';
import { mergeState, sameState, clean, planSongs, summary as summarize } from './sync.js';
import { validateSong, isFamilySongId } from './nbn.js';
import { UNSAFE_CHARS_G } from './text.js';

const ACCOUNT_KEY = 'note-by-note:family';
const LOCAL_KEY = 'note-by-note:local'; // the signed-out singer's data, kept aside while signed in
const cacheKey = (id) => 'note-by-note:profile:' + id;
const PUSH_DELAY = 2500;
const RESUME_GAP = 20000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^[0-9a-f]+$/;
export const NAME_MAX = 40;

export const cloud = createCloud();

const rd = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch (e) {
    return null;
  }
};
const wr = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    /* storage full or blocked: this session only */
  }
};

const FRESH = () => ({ v: 1, familyId: null, profileId: null, profiles: [], seen: {}, dirty: {}, songOps: {} });
function readAcct() {
  const a = rd(ACCOUNT_KEY);
  if (!a || typeof a !== 'object') return FRESH();
  const f = FRESH();
  return {
    ...f,
    familyId: typeof a.familyId === 'string' ? a.familyId : null,
    profileId: typeof a.profileId === 'string' ? a.profileId : null,
    profiles: Array.isArray(a.profiles) ? a.profiles.map(cleanProfile).filter(Boolean) : [],
    seen: a.seen && typeof a.seen === 'object' ? a.seen : {},
    dirty: a.dirty && typeof a.dirty === 'object' ? a.dirty : {},
    songOps: a.songOps && typeof a.songOps === 'object' ? a.songOps : {},
  };
}
let acct = readAcct();
const saveAcct = () => wr(ACCOUNT_KEY, acct);

// A singer's name as it may be shown: no control or direction characters, 1 to 40 characters.
export function cleanName(s) {
  const t = String(s == null ? '' : s)
    .replace(UNSAFE_CHARS_G, '')
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(t).slice(0, NAME_MAX).join('').trim();
}

function parseCode(v) {
  let c = v;
  if (typeof v === 'string') {
    try {
      c = JSON.parse(v);
    } catch (e) {
      return null;
    }
  }
  if (!c || typeof c !== 'object' || typeof c.salt !== 'string' || typeof c.hash !== 'string' || !HEX.test(c.salt) || !HEX.test(c.hash) || c.hash.length !== 64 || c.salt.length > 64) return null;
  return { v: 1, salt: c.salt, hash: c.hash };
}

// A profiles row (or a cached profile) -> { id, name, avatar, code, sort }, or null.
export function cleanProfile(p) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !UUID.test(p.id)) return null;
  const name = cleanName(p.name);
  if (!name) return null;
  return {
    id: p.id,
    name,
    avatar: typeof p.avatar === 'string' && p.avatar.length <= 40 ? p.avatar : '',
    code: parseCode(p.code !== undefined ? p.code : p.pin_hash),
    sort: Number.isFinite(p.sort) ? p.sort : 0,
  };
}

function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- Status and hooks ----------
// status: 'idle' | 'syncing' | 'saved' | 'offline' | 'later' (the server had a problem) | 'signin'
let status = 'idle';
export const hooks = {
  status: () => {}, // the quiet line changed
  state: () => {}, // the current singer's data changed from elsewhere
  songs: () => {}, // the family songs on this device changed
  profiles: () => {}, // the singers list changed
  gone: () => {}, // the current singer was deleted on another device
};
const setStatus = (s) => {
  if (s === status) return;
  status = s;
  hooks.status(s);
};
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const failStatus = (e) => (e && e.code === 'auth' ? 'signin' : e && e.code === 'offline' ? 'offline' : 'later');

// ---------- The account ----------

export const family = {
  get status() {
    return status;
  },
  signedIn: () => cloud.signedIn() && !!acct.familyId,
  needsSignIn: () => cloud.signedIn() && cloud.expired(),
  email: () => cloud.email(),
  profiles: () => acct.profiles.slice(),
  profile: (id = acct.profileId) => acct.profiles.find((p) => p.id === id) || null,
  profileId: () => acct.profileId,
  pending: () => Object.values(acct.dirty).some(Boolean) || Object.keys(acct.songOps).length > 0,
  localData: () => rd(LOCAL_KEY),

  // create: true makes a new family account (email + password); otherwise signs in to one.
  // Then the family exists (ensure_family) and its singers are listed. Signing in again to the
  // same family keeps everything this device had.
  async signIn(email, password, create = false) {
    if (create) await cloud.signUp(email, password);
    else await cloud.signIn(email, password);
    const fid = await cloud.rpc('ensure_family', { family_name: 'Our family' });
    if (typeof fid !== 'string' || !fid) throw new Error('no family');
    if (acct.familyId !== fid) {
      if (rd(LOCAL_KEY) == null) wr(LOCAL_KEY, store.profileData());
      acct = { ...FRESH(), familyId: fid };
      store.data.owner = null;
      store.save(false);
      saveAcct();
    }
    await refreshProfiles();
    setStatus('saved');
    return acct.profiles.slice();
  },

  // New singer. data: their starting state (this device's, when it becomes the first singer).
  async addProfile({ name, avatar = '', code = null, data = null }) {
    const id = uuid();
    const sort = acct.profiles.reduce((m, p) => Math.max(m, p.sort), -1) + 1;
    const rows = await cloud.insert('profiles', [{ id, family_id: acct.familyId, name: cleanName(name), avatar, pin_hash: code ? JSON.stringify(code) : null, sort }]);
    const p = cleanProfile((rows && rows[0]) || { id, name, avatar, pin_hash: code ? JSON.stringify(code) : null, sort });
    acct.profiles = [...acct.profiles.filter((x) => x.id !== id), p];
    if (data) {
      const d = clean(data);
      const t = Date.now();
      if (d.range && !d.stamps.range) d.stamps.range = t;
      if (!d.stamps.settings) d.stamps.settings = t;
      const st = await cloud.insert('profile_state', [{ profile_id: id, family_id: acct.familyId, data: d, updated_at: new Date().toISOString() }], { upsert: 'merge', onConflict: 'profile_id' });
      acct.seen[id] = st && st[0] ? st[0].updated_at : null;
      wr(cacheKey(id), d);
    }
    saveAcct();
    hooks.profiles();
    return p;
  },

  // The signed-out data has become a singer: it no longer needs keeping aside.
  dropLocal: () => wr(LOCAL_KEY, null),

  async updateProfile(id, { name, avatar, code }) {
    const patch = {};
    if (name !== undefined) patch.name = cleanName(name);
    if (avatar !== undefined) patch.avatar = avatar;
    if (code !== undefined) patch.pin_hash = code ? JSON.stringify(code) : null;
    patch.updated_at = new Date().toISOString();
    const rows = await cloud.update('profiles', { id: 'eq.' + id }, patch);
    const p = cleanProfile(rows && rows[0]);
    if (p) acct.profiles = acct.profiles.map((x) => (x.id === id ? p : x));
    saveAcct();
    hooks.profiles();
    return p;
  },

  async deleteProfile(id) {
    await cloud.remove('profile_state', { profile_id: 'eq.' + id });
    await cloud.remove('profiles', { id: 'eq.' + id });
    forget(id);
    hooks.profiles();
  },

  // Make id the singer on this device. Their cached copy shows straight away; the family's copy
  // follows when it arrives.
  select(id) {
    if (!family.profile(id)) return Promise.resolve();
    if (acct.profileId !== id || store.data.owner !== id) {
      if (acct.profileId && store.data.owner === acct.profileId) wr(cacheKey(acct.profileId), store.profileData());
      acct.profileId = id;
      saveAcct();
      store.useProfile(rd(cacheKey(id)));
      store.data.owner = id;
      store.save(false);
    }
    return syncProfile(id).catch(() => {});
  },

  // Called after every save of the working copy.
  changed() {
    if (!family.signedIn() || !acct.profileId || store.data.owner !== acct.profileId) return;
    changes++;
    if (!acct.dirty[acct.profileId]) {
      acct.dirty[acct.profileId] = true;
      saveAcct();
    }
    clearTimeout(pushTimer);
    const id = acct.profileId;
    pushTimer = setTimeout(() => {
      if (!online()) return setStatus('offline');
      syncProfile(id).then(
        () => setStatus('saved'),
        (e) => setStatus(failStatus(e))
      );
    }, PUSH_DELAY);
  },

  songPut(id) {
    if (!family.signedIn()) return;
    acct.songOps[id] = 'put';
    saveAcct();
    soon();
  },
  songDelete(id) {
    if (!family.signedIn()) return;
    acct.songOps[id] = 'delete';
    saveAcct();
    soon();
  },
  // This device's own family songs, sent up when it joins the family (songs already there stay).
  async uploadSongs(records) {
    for (const r of records) acct.songOps[r.id] = acct.songOps[r.id] || 'put';
    saveAcct();
    await syncSongs();
  },

  sync: (opts) => syncAll(opts),

  // A short progress line per singer: { id: { week, lessons, last } }. The family's copy when
  // online, else what this device has.
  async summaries(lessonIds) {
    const out = {};
    const local = (id) => (id === acct.profileId && store.data.owner === id ? store.profileData() : rd(cacheKey(id)));
    let rows = [];
    try {
      if (online()) rows = (await cloud.select('profile_state', { select: 'profile_id,data' })) || [];
    } catch (e) {
      rows = [];
    }
    for (const p of acct.profiles) {
      const row = rows.find((r) => r && r.profile_id === p.id);
      const mine = local(p.id);
      const d = row && mine ? mergeState(mine, row.data) : (row && row.data) || mine || {};
      out[p.id] = summarize(d, lessonIds);
    }
    return out;
  },

  // Sign this device out: it forgets the singers and family songs (they stay in the family
  // account), and goes back to the singer it had before signing in, if any.
  async signOut() {
    clearTimeout(pushTimer);
    for (const p of acct.profiles) wr(cacheKey(p.id), null);
    for (const k of Object.keys(acct.seen)) wr(cacheKey(k), null);
    try {
      await library.clear();
    } catch (e) {
      /* nothing saved here */
    }
    const local = rd(LOCAL_KEY);
    store.useProfile(local);
    store.data.owner = null;
    store.save(false);
    wr(LOCAL_KEY, null);
    acct = FRESH();
    wr(ACCOUNT_KEY, null);
    await cloud.signOut();
    setStatus('idle');
  },

  // Browser wiring: sync on start, when the app comes back, and when the network does.
  start() {
    store.onSave = () => family.changed();
    // A working copy that belongs to someone else (the app closed half way through a switch).
    if (family.signedIn() && acct.profileId && store.data.owner && store.data.owner !== acct.profileId) {
      wr(cacheKey(store.data.owner), store.profileData());
      store.useProfile(rd(cacheKey(acct.profileId)));
      store.data.owner = acct.profileId;
      store.save(false);
    }
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => syncAll());
    window.addEventListener('offline', () => family.signedIn() && setStatus('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Leaving the app: send what's waiting now rather than in a few seconds.
        if (family.signedIn() && acct.profileId && acct.dirty[acct.profileId] && online()) {
          clearTimeout(pushTimer);
          syncProfile(acct.profileId).catch(() => {});
        }
      } else if (Date.now() - lastSync > RESUME_GAP) syncAll();
    });
    if (family.signedIn()) {
      if (cloud.expired()) setStatus('signin');
      else syncAll();
    }
  },
};

let changes = 0;
let pushTimer = 0;
let songTimer = 0;
let lastSync = 0;
let allBusy = null;
const busy = {};

function forget(id) {
  acct.profiles = acct.profiles.filter((p) => p.id !== id);
  delete acct.seen[id];
  delete acct.dirty[id];
  wr(cacheKey(id), null);
  if (acct.profileId === id) {
    acct.profileId = null;
    store.data.owner = null;
    store.save(false);
  }
  saveAcct();
}

function soon() {
  clearTimeout(songTimer);
  songTimer = setTimeout(() => {
    if (!online()) return setStatus('offline');
    setStatus('syncing');
    syncSongs().then(
      () => setStatus(family.pending() ? status : 'saved'),
      (e) => setStatus(failStatus(e))
    );
  }, 300);
}

async function refreshProfiles() {
  const rows = await cloud.select('profiles', { select: 'id,name,avatar,pin_hash,sort,created_at,updated_at', order: 'sort.asc,created_at.asc' });
  const list = (Array.isArray(rows) ? rows : []).map(cleanProfile).filter(Boolean);
  const before = JSON.stringify(acct.profiles);
  acct.profiles = list;
  const goneId = acct.profileId && !list.find((p) => p.id === acct.profileId) ? acct.profileId : null;
  for (const id of Object.keys(acct.seen)) if (!list.find((p) => p.id === id)) forget(id);
  saveAcct();
  if (goneId) hooks.gone();
  else if (JSON.stringify(list) !== before) hooks.profiles();
}

// Pull, merge and (when this device has something new) push one singer's state.
async function syncProfile(id) {
  if (!family.signedIn()) return;
  if (busy[id]) {
    busy[id].again = true;
    return busy[id].p;
  }
  const job = { again: false, p: null };
  busy[id] = job;
  job.p = (async () => {
    try {
      do {
        job.again = false;
        await syncOnce(id);
      } while (job.again);
    } finally {
      delete busy[id];
    }
  })();
  return job.p;
}

async function syncOnce(id) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = changes;
    const rows = await cloud.select('profile_state', { select: 'data,updated_at', profile_id: 'eq.' + id });
    const remote = Array.isArray(rows) && rows[0] ? rows[0] : null;
    const isCur = () => id === acct.profileId && store.data.owner === id;
    const local = isCur() ? store.profileData() : rd(cacheKey(id));
    const fresh = !acct.seen[id] && !acct.dirty[id];
    let merged;
    if (!remote) merged = clean(local || {});
    else if (!local || fresh) merged = clean(remote.data);
    else merged = mergeState(local, remote.data);
    let savedAt = remote ? remote.updated_at : null;
    if (!remote) {
      if (!local) return; // nothing anywhere yet
      try {
        const out = await cloud.insert('profile_state', [{ profile_id: id, family_id: acct.familyId, data: merged, updated_at: new Date().toISOString() }]);
        savedAt = out && out[0] ? out[0].updated_at : null;
      } catch (e) {
        if (e.status === 409) continue; // another device got there first: read theirs
        throw e;
      }
    } else if (!sameState(merged, remote.data)) {
      const out = await cloud.update('profile_state', { profile_id: 'eq.' + id, updated_at: 'eq.' + remote.updated_at }, { data: merged, updated_at: new Date().toISOString() });
      if (!Array.isArray(out) || !out.length) continue; // changed meanwhile: read and merge again
      savedAt = out[0].updated_at;
    }
    acct.seen[id] = savedAt;
    if (isCur()) {
      const now = store.profileData();
      const next = changes === start ? merged : mergeState(now, merged);
      if (!sameState(now, next)) {
        store.useProfile(next);
        store.data.owner = id;
        store.save(false);
        hooks.state();
      }
      if (changes === start) acct.dirty[id] = false;
      else family.changed();
    } else {
      wr(cacheKey(id), merged);
      acct.dirty[id] = false;
    }
    saveAcct();
    return;
  }
  throw Object.assign(new Error('busy'), { code: 'later' });
}

// A family_songs row -> a library record, or null when it isn't a song this app can use.
export function recordOf(row) {
  if (!row || typeof row !== 'object' || !isFamilySongId(row.id)) return null;
  const v = validateSong(row.song);
  if (!v.ok) return null;
  return {
    id: row.id,
    song: { ...v.song, id: row.id },
    source: cleanSource(row.source),
    via: null,
    addedAt: typeof row.added_at === 'string' ? row.added_at : null,
  };
}

async function syncSongs() {
  if (!family.signedIn()) return;
  // No song storage in this browser window (Private Browsing): nothing to keep in step.
  if (!(await library.available())) return;
  const fid = acct.familyId;
  for (const [id, op] of Object.entries(acct.songOps)) {
    if (op === 'delete') {
      await cloud.remove('family_songs', { family_id: 'eq.' + fid, id: 'eq.' + id });
    } else {
      const rec = await library.get(id);
      if (rec) {
        const now = new Date().toISOString();
        const song = { ...rec.song };
        // A rename or a song brought in again changes the row; a new song is added (one already in
        // the family stays as it is).
        const out = await cloud.update('family_songs', { family_id: 'eq.' + fid, id: 'eq.' + id }, { title: song.title, song, source: rec.source || null, updated_at: now });
        if (!Array.isArray(out) || !out.length) {
          await cloud.insert('family_songs', [{ family_id: fid, id, title: song.title, song, source: rec.source || null, added_by: cloud.userId(), added_at: rec.addedAt || now, updated_at: now }], { upsert: 'ignore', onConflict: 'family_id,id' });
        }
      }
    }
    delete acct.songOps[id];
    saveAcct();
  }
  const rows = await cloud.select('family_songs', { select: 'id,title,song,source,added_at,updated_at', order: 'added_at.asc' });
  const remote = (Array.isArray(rows) ? rows : []).map(recordOf).filter(Boolean);
  const local = await library.list();
  const plan = planSongs(local, remote, acct.songOps);
  for (const r of plan.put) await library.put(r);
  for (const id of plan.remove) await library.remove(id);
  if (plan.put.length || plan.remove.length) hooks.songs();
}

async function syncAll() {
  if (!family.signedIn()) return;
  if (cloud.expired()) return setStatus('signin');
  if (!online()) return setStatus('offline');
  if (allBusy) return allBusy;
  lastSync = Date.now();
  setStatus('syncing');
  allBusy = (async () => {
    try {
      await refreshProfiles();
      if (acct.profileId && store.data.owner === acct.profileId) await syncProfile(acct.profileId);
      for (const [id, d] of Object.entries(acct.dirty)) if (d && id !== acct.profileId) await syncProfile(id);
      await syncSongs();
      setStatus('saved');
    } catch (e) {
      setStatus(failStatus(e));
    } finally {
      allBusy = null;
    }
  })();
  return allBusy;
}
