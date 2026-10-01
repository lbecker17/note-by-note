// Progress and settings, kept on this device only.

const KEY = 'note-by-note:v1';

const DEFAULTS = () => ({
  range: null,
  rangeAt: null, // 'YYYY-MM-DD' when the range was last saved
  rangePrev: null, // the range before that, {low, high}
  rangeFrom: null, // 'test' | 'child' | 'high' | 'low'
  // warmupLock: songs open only after today's warm-up (the grown-ups' switch in Settings).
  settings: { headphones: false, names: 'letters', strict: 'standard', warmupLock: true },
  progress: {},
  days: [],
  warm: null, // { day: 'YYYY-MM-DD', at: ms, heard: 0.86, ctl: 'bounce' }: the last warm-up that counted
  nudge: {}, // { range: 'YYYY-MM-DD' } when the range re-test nudge was last put off
  pin: null, // the grown-up PIN as { v, salt, hash } (js/pin.js), never the digits
  pinLock: null, // wrong PINs: { fails, until, lockouts }, so a reload doesn't end a lockout
  persistAsked: false, // navigator.storage.persist() asked once, after the first family song
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const d = JSON.parse(raw);
    const base = DEFAULTS();
    const data = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
    // Saves from before rangeAt existed start the re-test clock today, so there's no nag on first launch.
    if (data.range && !data.rangeAt) data.rangeAt = today();
    return data;
  } catch (e) {
    return DEFAULTS();
  }
}

export const store = {
  data: load(),
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* storage unavailable: the app still works for this session */
    }
  },
  setSetting(k, v) {
    this.data.settings[k] = v;
    this.save();
  },
  // from: 'test' for the range test, or the preset's key ('child', 'high', 'low').
  setRange(range, from = 'test') {
    this.data.rangePrev = this.data.range;
    this.data.range = range;
    this.data.rangeAt = today();
    this.data.rangeFrom = from;
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
    const { range, rangeAt, rangePrev, rangeFrom, settings, nudge, warm, songPass, pin, pinLock, persistAsked } = this.data;
    this.data = { ...DEFAULTS(), range, rangeAt, rangePrev, rangeFrom, settings, nudge, warm, songPass, pin, pinLock, persistAsked };
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
