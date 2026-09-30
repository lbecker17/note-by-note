// Progress and settings, kept on this device only.

const KEY = 'note-by-note:v1';

const DEFAULTS = () => ({
  range: null,
  settings: { headphones: false, names: 'letters', strict: 'standard' },
  progress: {},
  days: [],
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const d = JSON.parse(raw);
    const base = DEFAULTS();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
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
  setRange(range) {
    this.data.range = range;
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
  reset() {
    const range = this.data.range;
    const settings = this.data.settings;
    this.data = { ...DEFAULTS(), range, settings };
    this.save();
  },
};

export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function streak(days) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
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
