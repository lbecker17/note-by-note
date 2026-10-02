// Progress and settings: the working copy for the singer using this device. Signed out, it is
// all there is. With a family account (js/family.js) it is one singer's copy, synced with the
// family's profile_state row; the keys in PROFILE_KEYS travel with the singer, and the grown-up
// PIN and its lockout stay with the device.

import { PROFILE_KEYS, SPEEDS_KEPT, clean } from './sync.js';

const KEY = 'note-by-note:v1';
// When the range and settings last changed, and the last "Reset progress", in ms. The family
// sync uses them to tell which side is newer (js/sync.js).
const NO_STAMPS = () => ({ range: 0, settings: 0, reset: 0 });

const DEFAULTS = () => ({
  range: null,
  rangeAt: null, // 'YYYY-MM-DD' when the range was last saved
  rangePrev: null, // the range before that, {low, high}
  rangeFrom: null, // 'test' | 'child' | 'high' | 'low'
  // warmupLock: songs open only after today's warm-up (the grown-ups' switch in Settings).
  // speeds: the speed each song was last sung at ({ songId: 'slow' | 'steady' | 'normal' }).
  // tune: songs without headphones, how loud the tune plays while the child sings ('off' | 'soft' | 'clear').
  settings: { headphones: false, names: 'letters', strict: 'standard', warmupLock: true, speeds: {}, tune: 'soft' },
  progress: {},
  days: [],
  warm: null, // { day: 'YYYY-MM-DD', at: ms, heard: 0.86, ctl: 'bounce' }: the last warm-up that counted
  nudge: {}, // { range: 'YYYY-MM-DD' } when the range re-test nudge was last put off
  pin: null, // the grown-up PIN as { v, salt, hash } (js/pin.js), never the digits
  pinLock: null, // wrong PINs: { fails, until, lockouts }, so a reload doesn't end a lockout
  persistAsked: false, // navigator.storage.persist() asked once, after the first family song
  stamps: NO_STAMPS(),
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const d = JSON.parse(raw);
    const base = DEFAULTS();
    const data = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, stamps: { ...NO_STAMPS(), ...(d.stamps || {}) } };
    // Saves from before rangeAt existed start the re-test clock today, so there's no nag on first launch.
    if (data.range && !data.rangeAt) data.rangeAt = today();
    return data;
  } catch (e) {
    return DEFAULTS();
  }
}

export const store = {
  data: load(),
  // Called after every save (js/family.js uses it to sync the singer's changes).
  onSave: null,
  save(notify = true) {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* storage unavailable: the app still works for this session */
    }
    if (notify && this.onSave) this.onSave();
  },
  // The singer's own part of the data (what syncs), as a copy.
  profileData() {
    const out = {};
    for (const k of PROFILE_KEYS) out[k] = this.data[k] === undefined ? null : JSON.parse(JSON.stringify(this.data[k]));
    return out;
  },
  // Make another singer's data (or a fresh start, with null) the working copy. The device's own
  // keys (PIN, lockout, persistAsked) stay. Saved without telling onSave: nothing new to sync.
  useProfile(d) {
    const c = clean(d || {});
    const base = DEFAULTS();
    for (const k of PROFILE_KEYS) this.data[k] = c[k] == null ? base[k] : c[k];
    if (!d) this.data.songPass = null;
    this.save(false);
  },
  // The speed chosen for a song. Most recent last, so the oldest go first when there are many.
  setSpeed(songId, v) {
    const speeds = { ...(this.data.settings.speeds || {}) };
    delete speeds[songId];
    speeds[songId] = v;
    const keys = Object.keys(speeds);
    for (const k of keys.slice(0, Math.max(0, keys.length - SPEEDS_KEPT))) delete speeds[k];
    this.setSetting('speeds', speeds);
  },
  setSetting(k, v) {
    this.data.settings[k] = v;
    this.data.stamps = { ...NO_STAMPS(), ...this.data.stamps, settings: Date.now() };
    this.save();
  },
  // from: 'test' for the range test, or the preset's key ('child', 'high', 'low').
  setRange(range, from = 'test') {
    this.data.rangePrev = this.data.range;
    this.data.range = range;
    this.data.rangeAt = today();
    this.data.rangeFrom = from;
    this.data.stamps = { ...NO_STAMPS(), ...this.data.stamps, range: Date.now() };
    this.save();
  },
  // A warm-up the app heard: it opens songs until local midnight.
  setWarm(w) {
    this.data.warm = w;
    this.save();
  },
  // A grown-up opened songs for today without a warm-up (PIN). Like a warm-up it lasts until local
  // midnight, but it isn't a practice day and the warm-up still shows as not done.
  setSongPass() {
    this.data.songPass = { day: today() };
    this.save();
  },
  putOffNudge(kind) {
    this.data.nudge = { ...this.data.nudge, [kind]: today() };
    this.save();
  },
  record(id, score) {
    const p = this.data.progress[id] || { best: 0, runs: 0 };
    p.best = Math.max(p.best, score);
    p.last = score;
    p.runs += 1;
    p.at = today();
    p.t = Date.now();
    this.data.progress[id] = p;
    const t = today();
    if (!this.data.days.includes(t)) this.data.days.push(t);
    this.data.days = this.data.days.slice(-120);
    this.save();
  },
  setPin(pin) {
    this.data.pin = pin;
    this.save();
  },
  // Clears scores and practice days. Resetting scores shouldn't lock songs again, so today's warm-up
  // stays, and neither the PIN nor the family songs (which live in IndexedDB) are touched.
  reset() {
    const { range, rangeAt, rangePrev, rangeFrom, settings, nudge, warm, songPass, pin, pinLock, persistAsked, stamps } = this.data;
    this.data = { ...DEFAULTS(), range, rangeAt, rangePrev, rangeFrom, settings, nudge, warm, songPass, pin, pinLock, persistAsked, stamps: { ...NO_STAMPS(), ...stamps, reset: Date.now() } };
    this.save();
  },
};

export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// True once a warm-up has counted today. It resets at local midnight with no timer:
// everything that shows or enforces the lock asks again when it renders or opens.
export function songPassToday() {
  return !!(store.data.songPass && store.data.songPass.day === today());
}

export function warmedToday() {
  return !!(store.data.warm && store.data.warm.day === today());
}

// Monday-first week with practised flags.
export function week(days) {
  const set = new Set(days);
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label: 'MTWTFSS'[i], done: set.has(today(d)), isToday: i === dow, future: i > dow };
  });
}
