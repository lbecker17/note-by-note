// The Timing check (Settings, For grown-ups): how late this device's sound reaches the singer.
// The app plays LEAD_IN clicks to get the beat going, then COUNT clicks to tap or sing along to.
// Each answer is matched to its nearest click; the device's lag is the median of how late the
// answers were. Tapping measures the speaker plus the screen's touch delay; singing measures the
// speaker plus the mic, which is what scoring depends on. Either is close enough: the scorer also
// lines up a steady lag of up to a quarter of a second on its own (alignStep in score.js).

export const TIMING = { leadIn: 2, count: 8, gap: 0.7, early: 0.2, late: 0.45, need: 5, spread: 0.06 };

// Context times of the clicks, from `start`: { all, counted } (counted: the last COUNT).
export function clickTimes(start, o = TIMING) {
  const all = [];
  for (let i = 0; i < o.leadIn + o.count; i++) all.push(start + i * o.gap);
  return { all, counted: all.slice(o.leadIn) };
}

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};

// clicks: the counted click times; answers: times of taps or sung onsets (same clock).
// Returns { lag, used, spread, ok, why }: why is 'few' (too few answers near the clicks) or
// 'uneven' (answers too scattered to trust) when ok is false.
export function lagFrom(clicks, answers, o = TIMING) {
  const offs = [];
  for (const c of clicks) {
    let best = null;
    for (const a of answers) {
      const d = a - c;
      if (d < -o.early || d > o.late) continue;
      if (best == null || Math.abs(d) < Math.abs(best)) best = d;
    }
    if (best != null) offs.push(best);
  }
  if (offs.length < o.need) return { lag: null, used: offs.length, spread: null, ok: false, why: 'few' };
  const lag = median(offs);
  const spread = median(offs.map((d) => Math.abs(d - lag)));
  if (spread > o.spread) return { lag: null, used: offs.length, spread, ok: false, why: 'uneven' };
  return { lag: Math.max(0, lag), used: offs.length, spread, ok: true, why: null };
}

// Sung onsets from mic readings [{ t, m }] (sorted): a voiced reading after at least `quiet`
// seconds without one.
export function onsets(readings, quiet = 0.12) {
  const out = [];
  let lastVoiced = -Infinity;
  for (const r of readings) {
    if (r.m == null) continue;
    if (r.t - lastVoiced >= quiet) out.push(r.t);
    lastVoiced = r.t;
  }
  return out;
}
