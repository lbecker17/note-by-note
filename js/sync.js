// The family account's merge rules, kept free of the browser so they can be tested on their own.
// A singer's state lives in two places: this device's working copy (js/store.js) and the family's
// profile_state row. When both changed, they are merged rather than one overwriting the other:
//   progress: best = max, runs = max, last (and when) from the newer side
//   days:     union, the newest 120
//   warm, songPass: the newer day
//   range, settings: from the side changed more recently (stamps.range, stamps.settings);
//             but each song's chosen speed (settings.speeds) is kept from both sides
//   nudge:    the newer day for each kind
// "Reset progress" stamps stamps.reset; a side that hasn't seen that reset only keeps what it
// sang after it, so a reset on one device isn't undone by another.
// Everything read from the server goes through clean() first: other family devices are trusted,
// but data may be damaged, so wrong types are dropped rather than trusted.

export const PROFILE_KEYS = ['range', 'rangeAt', 'rangePrev', 'rangeFrom', 'settings', 'progress', 'days', 'warm', 'songPass', 'nudge', 'stamps'];
export const DAYS_KEPT = 120;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_FROM = ['test', 'child', 'high', 'low'];
const NAMES = ['letters', 'solfa'];
const STRICT = ['relaxed', 'standard', 'strict'];
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const num = (v, lo = -Infinity, hi = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isDay = (v) => typeof v === 'string' && DAY.test(v);
const stamp = (v) => (num(v, 0) ? v : 0);

function cleanRange(r) {
  if (!isObj(r) || !Number.isInteger(r.low) || !Number.isInteger(r.high)) return null;
  if (r.low < 12 || r.high > 120 || r.low >= r.high) return null;
  return { low: r.low, high: r.high };
}

const SPEED_KEYS = ['slow', 'steady', 'normal'];
export const SPEEDS_KEPT = 300;

// speeds: the speed last chosen for each song, { songId: 'slow' | 'steady' | 'normal' }.
function cleanSpeeds(v) {
  const out = {};
  if (!isObj(v)) return out;
  const ok = Object.entries(v).filter(([k, x]) => k.length > 0 && k.length <= 100 && SPEED_KEYS.includes(x));
  for (const [k, x] of ok.slice(-SPEEDS_KEPT)) out[k] = x;
  return out;
}

function cleanSettings(s) {
  const out = { headphones: false, names: 'letters', strict: 'standard', warmupLock: true, speeds: {} };
  if (!isObj(s)) return out;
  out.speeds = cleanSpeeds(s.speeds);
  if (typeof s.headphones === 'boolean') out.headphones = s.headphones;
  if (NAMES.includes(s.names)) out.names = s.names;
  if (STRICT.includes(s.strict)) out.strict = s.strict;
  if (typeof s.warmupLock === 'boolean') out.warmupLock = s.warmupLock;
  return out;
}

function cleanEntry(p) {
  if (!isObj(p) || !num(p.best, 0, 1)) return null;
  const out = { best: p.best, runs: Number.isInteger(p.runs) && p.runs >= 0 ? p.runs : 0 };
  if (num(p.last, 0, 1)) out.last = p.last;
  if (isDay(p.at)) out.at = p.at;
  if (num(p.t, 0)) out.t = p.t;
  return out;
}

// Any value -> a singer's state with every field present and the right type.
export function clean(d) {
  const src = isObj(d) ? d : {};
  const progress = {};
  if (isObj(src.progress)) {
    for (const [k, v] of Object.entries(src.progress)) {
      if (k.length > 100) continue;
      const e = cleanEntry(v);
      if (e) progress[k] = e;
    }
  }
  const days = Array.isArray(src.days) ? [...new Set(src.days.filter(isDay))].sort().slice(-DAYS_KEPT) : [];
  const warm = isObj(src.warm) && isDay(src.warm.day) ? { ...pick(src.warm, ['day', 'at', 'heard', 'ctl']) } : null;
  const songPass = isObj(src.songPass) && isDay(src.songPass.day) ? { day: src.songPass.day } : null;
  const nudge = {};
  if (isObj(src.nudge)) for (const [k, v] of Object.entries(src.nudge)) if (k.length <= 20 && isDay(v)) nudge[k] = v;
  const st = isObj(src.stamps) ? src.stamps : {};
  return {
    range: cleanRange(src.range),
    rangeAt: isDay(src.rangeAt) ? src.rangeAt : null,
    rangePrev: cleanRange(src.rangePrev),
    rangeFrom: RANGE_FROM.includes(src.rangeFrom) ? src.rangeFrom : null,
    settings: cleanSettings(src.settings),
    progress,
    days,
    warm,
    songPass,
    nudge,
    stamps: { range: stamp(st.range), settings: stamp(st.settings), reset: stamp(st.reset) },
  };
}

function pick(o, keys) {
  const out = {};
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
  }
  return out;
}

const dayOf = (ms) => {
  const d = new Date(ms);
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// When an entry was last sung: its time, else the end of its day.
const when = (e) => (e.t ? e.t : e.at ? Date.parse(e.at + 'T23:59:59') || 0 : 0);

// A side that hasn't seen the latest reset keeps only what came after it.
function afterReset(s, resetAt) {
  if (s.stamps.reset >= resetAt || !resetAt) return s;
  const resetDay = dayOf(resetAt);
  const progress = {};
  for (const [k, e] of Object.entries(s.progress)) if (e.t && e.t > resetAt) progress[k] = e;
  return { ...s, progress, days: s.days.filter((d) => d > resetDay) };
}

function newerDay(x, y) {
  if (!x) return y;
  if (!y) return x;
  if (x.day !== y.day) return x.day > y.day ? x : y;
  return (Number(y.at) || 0) > (Number(x.at) || 0) ? y : x;
}

// Each song's speed: both sides' choices, the side whose settings changed last winning a clash.
function mergeSpeeds(older, newer) {
  const out = { ...older.settings.speeds };
  for (const [k, v] of Object.entries(newer.settings.speeds)) {
    delete out[k];
    out[k] = v;
  }
  return cleanSpeeds(out);
}

// a: this device's copy, b: the family's. Ties go to a. Both are cleaned first.
export function mergeState(aIn, bIn) {
  const a0 = clean(aIn);
  const b0 = clean(bIn);
  const resetAt = Math.max(a0.stamps.reset, b0.stamps.reset);
  const a = afterReset(a0, resetAt);
  const b = afterReset(b0, resetAt);

  const progress = {};
  for (const k of new Set([...Object.keys(a.progress), ...Object.keys(b.progress)])) {
    const x = a.progress[k];
    const y = b.progress[k];
    if (!x || !y) {
      progress[k] = { ...(x || y) };
      continue;
    }
    const newer = when(y) > when(x) ? y : x;
    const e = { best: Math.max(x.best, y.best), runs: Math.max(x.runs, y.runs) };
    if (newer.last != null) e.last = newer.last;
    if (newer.at) e.at = newer.at;
    if (newer.t) e.t = newer.t;
    progress[k] = e;
  }

  const days = [...new Set([...a.days, ...b.days])].sort().slice(-DAYS_KEPT);
  const rangeSide = a.stamps.range > b.stamps.range || (a.stamps.range === b.stamps.range && (a.range || !b.range)) ? a : b;
  const settingsSide = b.stamps.settings > a.stamps.settings ? b : a;
  const nudge = { ...a.nudge };
  for (const [k, v] of Object.entries(b.nudge)) if (!nudge[k] || v > nudge[k]) nudge[k] = v;

  return {
    range: rangeSide.range,
    rangeAt: rangeSide.rangeAt,
    rangePrev: rangeSide.rangePrev,
    rangeFrom: rangeSide.rangeFrom,
    settings: { ...settingsSide.settings, speeds: mergeSpeeds(settingsSide === a ? b : a, settingsSide) },
    progress,
    days,
    warm: newerDay(a.warm, b.warm),
    songPass: newerDay(a.songPass, b.songPass),
    nudge,
    stamps: {
      range: Math.max(a.stamps.range, b.stamps.range),
      settings: Math.max(a.stamps.settings, b.stamps.settings),
      reset: resetAt,
    },
  };
}

// JSON with sorted keys, so two states can be compared whatever order their keys are in.
export function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (isObj(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

export const sameState = (a, b) => canon(clean(a)) === canon(clean(b));

// A short progress summary for the grown-ups' Family list.
// lessonIds: the app's lesson ids (scores for songs don't count as lessons).
export function summary(d, lessonIds, now = new Date()) {
  const s = clean(d);
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  const from = dayOf(monday.getTime());
  const to = dayOf(now.getTime());
  const week = s.days.filter((x) => x >= from && x <= to).length;
  const lessons = lessonIds.filter((id) => s.progress[id] && s.progress[id].best > 0).length;
  const last = s.days.length ? s.days[s.days.length - 1] : null;
  return { week, lessons, last };
}

// Family songs: what to do with this device's cache once the family's list has arrived.
// local: records in IndexedDB ({ id, song, … }); remote: rows already checked (validRow);
// pending: { id: 'put' | 'delete' } changes made here that haven't reached the family yet.
// -> { put: [records to save here], remove: [ids to delete here] }
export function planSongs(local, remote, pending = {}) {
  const here = new Map(local.map((r) => [r.id, r]));
  const there = new Map(remote.map((r) => [r.id, r]));
  const put = [];
  const remove = [];
  for (const [id, r] of there) {
    if (pending[id]) continue; // this device's change goes up first
    const mine = here.get(id);
    if (!mine || mine.song.title !== r.song.title || canon(mine.song) !== canon(r.song)) put.push(r);
  }
  for (const id of here.keys()) if (!there.has(id) && pending[id] !== 'put') remove.push(id);
  return { put, remove };
}
