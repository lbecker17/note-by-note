// The note-finder and "play my tune as a song" engine for Free sing.
//   findNotes: pitch line -> notes        findKey: notes -> key
//   quantize: notes -> beats              harmonize: beats -> about one chord a bar
//   arrange: -> timed events for audio.js describe: kind facts for a feedback card
// Everything here is pure and deterministic: plain data in, plain data out,
// no DOM, no Web Audio and no randomness, so it runs the same in Node tests.

import { pc } from './music.js';

// Tempos the child picks from, rather than us guessing one from free-time singing.
export const TEMPOS = { slow: 72, medium: 96, fast: 120 };

// ---------- Finding notes ----------

const NOTE_OPTS = {
  gap: 0.055, // voiced frames further apart than this are separate notes (about 60 ms of silence)
  minNote: 0.08, // anything shorter is a blip
  penalty: 0.045, // price of a new segment, in semitones² × seconds: more than vibrato ever saves
  mergeTol: 0.5, // neighbouring pieces closer than half a semitone are one note
  glideMin: 2, // a slide has to cover two semitones to be a glide rather than a wobble
  scoopMax: 0.35, // a shorter slide into or out of a note is part of that note
};
const MAX_SEG = 1.2; // seconds; longer steady stretches are cut and joined again afterwards

// frames: [{ t, m, rms? }] in time order, m a MIDI float or null.
// Returns { notes: [{ t0, t1, m, p, conf }], sungSeconds, glideShare, tuning }.
// m is the measured centre of each note. p is the note it was aiming for: the whole take
// is first moved by `tuning` (semitones, the duration-weighted circular mean of how far
// every note sat from the nearest semitone), so a child who sings everything a little
// sharp still gets the notes they meant.
export function findNotes(frames, opts = {}) {
  const o = { ...NOTE_OPTS, ...opts };
  if (!Array.isArray(frames) || !frames.length) return { notes: [], sungSeconds: 0, glideShare: 0, tuning: 0 };
  const dt = framePeriod(frames);
  const { runs, sung } = voicedRuns(frames, o.gap, dt);
  let glide = 0;
  let found = [];
  for (const run of runs) {
    if (run.jumpy) clean(run, dt);
    if (!run.x.length) continue;
    const segs = segmentRun(run, o.penalty, dt);
    const res = runNotes(run, segs, o);
    glide += res.glide;
    found = found.concat(res.notes);
  }

  // Global tuning: where the notes sit between semitones, averaged round the circle.
  let c = 0;
  let s = 0;
  let wsum = 0;
  for (const n of found) {
    const w = Math.min(n.t1 - n.t0, 2);
    const a = 2 * Math.PI * (n.m - Math.round(n.m));
    c += w * Math.cos(a);
    s += w * Math.sin(a);
    wsum += w;
  }
  // When the notes scatter all round the circle there is no tuning to speak of.
  const tuning = wsum > 0 && Math.hypot(c, s) / wsum > 0.25 ? Math.atan2(s, c) / (2 * Math.PI) : 0;

  const notes = [];
  for (const n of found) {
    const p = Math.round(n.m - tuning);
    const prev = notes[notes.length - 1];
    // Two touching pieces that land on the same note are one note, unless a dip split them.
    if (prev && prev.p === p && !n.split && n.t0 - prev.t1 < 1e-6) {
      const wa = prev.t1 - prev.t0;
      const wb = n.t1 - n.t0;
      prev.m = (prev.m * wa + n.m * wb) / (wa + wb);
      prev.conf = Math.max(prev.conf, n.conf);
      prev.t1 = n.t1;
      continue;
    }
    notes.push({ t0: n.t0, t1: n.t1, m: n.m, p, conf: n.conf });
  }
  for (const n of notes) {
    // A note far from any semitone (after tuning) is a less certain guess.
    const off = Math.abs(n.m - tuning - n.p);
    n.conf = round(n.conf * (1 - 0.6 * off), 2);
    n.m = round(n.m, 3);
    n.t0 = round(n.t0, 4);
    n.t1 = round(n.t1, 4);
  }
  return {
    notes,
    sungSeconds: round(sung, 3),
    glideShare: sung > 0 ? round(Math.min(1, glide / sung), 3) : 0,
    tuning: round(tuning, 3),
  };
}

// Rounded for tidy output (and never -0, which strict comparisons treat as different).
function round(v, places) {
  const k = 10 ** places;
  return Math.round(v * k) / k + 0;
}

// The usual time between frames, from a spread-out sample: plenty for a median, and quick.
function framePeriod(frames) {
  const step = Math.max(1, Math.floor(frames.length / 2000));
  const d = [];
  for (let i = step; i < frames.length; i += step) {
    const a = frames[i - 1] && frames[i - 1].t;
    const b = frames[i] && frames[i].t;
    if (b > a) d.push(b - a);
  }
  if (!d.length) return 1 / 60;
  const s = Float64Array.from(d).sort();
  return Math.min(0.05, Math.max(0.002, s[s.length >> 1]));
}

// Stretches of voiced frames. Short dropouts are bridged; a longer silence starts a new run.
// Everything per frame is worked out in this one pass, into shared arrays that each run
// views a slice of, which keeps a long take quick: the time each frame stands for (w; a
// bridged hole doesn't count as singing), running sums for smoothing (PW, PX), and whether
// the run has any big jump in it (only those can hold an octave slip).
function voicedRuns(frames, gap, dt) {
  const N = frames.length;
  const T = new Float64Array(N);
  const X = new Float64Array(N);
  const R = new Float64Array(N);
  const Wt = new Float64Array(N);
  const PW = new Float64Array(N + 1);
  const PX = new Float64Array(N + 1);
  const runs = [];
  let n = 0;
  let start = 0;
  let last = -Infinity;
  let sung = 0;
  let jumpy = false;
  const weight = (w) => {
    Wt[n - 1] = w;
    PW[n] = PW[n - 1] + w;
    PX[n] = PX[n - 1] + w * X[n - 1];
    sung += w;
  };
  const close = () => {
    if (n > start) {
      weight(dt);
      const v = (A, extra = 0) => A.subarray(start, n + extra);
      runs.push({ t: v(T), x: v(X), r: v(R), w: v(Wt), PW: v(PW, 1), PX: v(PX, 1), jumpy });
    }
    start = n;
    jumpy = false;
  };
  for (let i = 0; i < N; i++) {
    const f = frames[i];
    if (!f || !(f.t > last)) continue; // broken or out-of-order frame
    last = f.t;
    const m = f.m;
    if (typeof m !== 'number' || !(m > 12 && m < 120)) continue;
    if (n > start) {
      const d = f.t - T[n - 1];
      if (d > gap) close();
      else {
        weight(Math.min(d, 2 * dt));
        if (Math.abs(m - X[n - 1]) >= 4.5) jumpy = true;
      }
    }
    T[n] = f.t;
    X[n] = m;
    R[n] = typeof f.rms === 'number' && f.rms >= 0 ? f.rms : NaN;
    n++;
  }
  close();
  return { runs, sung };
}

// The same per-frame weights and running sums for a run whose frames have changed.
function weigh(run, dt) {
  const { t, x } = run;
  const n = t.length;
  run.w = new Float64Array(n);
  run.PW = new Float64Array(n + 1);
  run.PX = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    run.w[i] = i + 1 < n ? Math.min(t[i + 1] - t[i], 2 * dt) : dt;
    run.PW[i + 1] = run.PW[i] + run.w[i];
    run.PX[i + 1] = run.PX[i] + run.w[i] * x[i];
  }
}

// Fold short octave jumps back onto the line and drop wild frames. A running median over
// about a quarter of a second is the reference: it keeps real leaps (a median keeps edges)
// but ignores a jump that lasts less than half its window.
// Only runs with a jump of 4.5 semitones or more come here: slips and wild frames always
// start with one. (That also keeps a steep scoop at the start of a run from looking like a slip.)
function clean(run, dt) {
  const { t, x, r } = run;
  const med = runningMedian(x, Math.max(2, Math.round(0.12 / dt)));
  const keep = [];
  let moved = false;
  for (let i = 0; i < x.length; i++) {
    let v = x[i];
    const d = v - med[i];
    if (Math.abs(d) > 9) {
      const k = Math.round(d / 12);
      if (k && Math.abs(d - 12 * k) < 2.5) v -= 12 * k;
    }
    if (Math.abs(v - med[i]) > 5) continue;
    if (v !== x[i]) moved = true;
    x[i] = v;
    keep.push(i);
  }
  if (keep.length < x.length) {
    run.t = Float64Array.from(keep, (i) => t[i]);
    run.x = Float64Array.from(keep, (i) => x[i]);
    run.r = Float64Array.from(keep, (i) => r[i]);
  }
  if (moved || keep.length < x.length) weigh(run, dt);
}

function runningMedian(x, h) {
  const n = x.length;
  const out = new Float64Array(n);
  const win = [];
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - h);
    const b = Math.min(n - 1, i + h);
    while (hi < b) win.splice(lowerBound(win, x[++hi]), 0, x[hi]);
    while (lo < a) win.splice(lowerBound(win, x[lo++]), 1);
    const k = win.length;
    out[i] = k % 2 ? win[(k - 1) >> 1] : (win[k / 2 - 1] + win[k / 2]) / 2;
  }
  return out;
}

function lowerBound(a, v) {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Best piecewise-constant fit to the pitch line: least squares plus a fixed price per piece,
// solved exactly by dynamic programming. A step between notes saves far more than the price;
// vibrato swings around its centre and never pays for a cut. Glides come out as staircases,
// which runNotes recognises. Above about 90 frames a second, neighbouring frames are averaged
// in blocks first: the cuts only need to be roughly right (boundaries are refined at full
// rate later) and the work falls with the square of the block size.
function segmentRun(run, lambda, dt) {
  const { t, x, w } = run;
  const N = x.length;
  const f = Math.max(1, Math.floor(1 / (dt * 60) + 0.25));
  const n = Math.ceil(N / f);
  const base = x[0]; // measured from the first frame, so the sums stay small and exact
  const start = new Int32Array(n + 1);
  const bt = new Float64Array(n);
  const W = new Float64Array(n + 1);
  const S = new Float64Array(n + 1);
  const Q = new Float64Array(n + 1);
  for (let b = 0; b < n; b++) {
    const a = b * f;
    const z = Math.min(N, a + f);
    let sw = 0;
    let sx = 0;
    let sq = 0;
    for (let i = a; i < z; i++) {
      const v = x[i] - base;
      sw += w[i];
      sx += w[i] * v;
      sq += w[i] * v * v;
    }
    start[b] = a;
    bt[b] = t[a];
    W[b + 1] = W[b] + sw;
    S[b + 1] = S[b] + sx;
    Q[b + 1] = Q[b] + sq;
  }
  start[n] = N;
  const F = new Float64Array(n + 1);
  const from = new Int32Array(n + 1);
  let lo = 0;
  for (let j = 1; j <= n; j++) {
    while (bt[j - 1] - bt[lo] > MAX_SEG) lo++;
    const Wj = W[j];
    const Sj = S[j];
    const Qj = Q[j];
    // Walk back from j. F never falls as i grows and a piece's error only grows as it
    // reaches further back, so once even the cheapest possible start can't win, stop.
    const floor = F[lo];
    let best = Infinity;
    let arg = j - 1;
    for (let i = j - 1; i >= lo; i--) {
      const s = Sj - S[i];
      const err = Qj - Q[i] - (s * s) / (Wj - W[i]);
      const cost = F[i] + err;
      if (cost < best) {
        best = cost;
        arg = i;
      } else if (floor + err >= best) break;
    }
    F[j] = best + lambda;
    from[j] = arg;
  }
  const cuts = [];
  for (let j = n; j > 0; j = from[j]) cuts.push(start[j]);
  cuts.push(0);
  cuts.reverse();
  const segs = [];
  for (let k = 0; k + 1 < cuts.length; k++) segs.push(segStats(run, cuts[k], cuts[k + 1]));
  return segs;
}

// Mean level, and the straight-line slope through the piece (semitones per second).
function segStats(run, a, b) {
  const { t, x, w } = run;
  let sw = 0;
  let st = 0;
  let sx = 0;
  let stt = 0;
  let stx = 0;
  let lo = Infinity;
  const t0 = t[a];
  for (let i = a; i < b; i++) {
    const u = t[i] - t0;
    sw += w[i];
    st += w[i] * u;
    sx += w[i] * x[i];
    stt += w[i] * u * u;
    stx += w[i] * u * x[i];
    if (x[i] < lo) lo = x[i];
  }
  const mu = sx / sw;
  const den = sw * stt - st * st;
  const beta = den > 1e-12 ? (sw * stx - st * sx) / den : 0;
  const t1 = t[b - 1] + w[b - 1];
  const dur = t1 - t0;
  const rise = beta * dur;
  return { a, b, t0, t1, dur, mu, lo, beta, rise, sloped: Math.abs(rise) >= 0.6 && Math.abs(beta) >= 1.5, glide: false };
}

// Consecutive pieces of one glide: same direction, about the same speed, and each starts
// where the last one ended. Two short notes with vibrato can both lean the same way, but
// they don't join up; a fast scoop followed by a note that drifts a little isn't one glide.
function joins(a, b) {
  if (!b.sloped || Math.sign(a.beta) !== Math.sign(b.beta) || Math.sign(b.mu - a.mu) !== Math.sign(a.beta)) return false;
  const fast = Math.max(Math.abs(a.beta), Math.abs(b.beta));
  const slow = Math.min(Math.abs(a.beta), Math.abs(b.beta));
  if (fast > 3 * slow) return false;
  const jump = b.mu - b.rise / 2 - (a.mu + a.rise / 2);
  return Math.abs(jump) <= 0.25 + 0.15 * Math.abs(b.mu - a.mu);
}

// Notes (and glide time) for one voiced run, from its segments.
function runNotes(run, segs, o) {
  const K = segs.length;

  // 1. Glides: chains of sloped pieces that join up and cover a real distance.
  for (let k = 0; k < K; ) {
    if (!segs[k].sloped) {
      k++;
      continue;
    }
    let e = k;
    while (e + 1 < K && joins(segs[e], segs[e + 1])) e++;
    const f = segs[k];
    const l = segs[e];
    const change = Math.abs(l.mu + l.rise / 2 - (f.mu - f.rise / 2));
    const dur = l.t1 - f.t0;
    if (change >= o.glideMin && dur >= 0.15) for (let i = k; i <= e; i++) segs[i].glide = true;
    k = e + 1;
  }
  // The turn at the top (or bottom) of a siren, a glitch inside a glide, or a moment before
  // or after a glide all belong to the glide. A steady bit between two glides that go the
  // same way is a note reached by a big scoop, so it stays.
  for (let p = 0; p < K; ) {
    if (segs[p].glide) {
      p++;
      continue;
    }
    let q = p;
    while (q + 1 < K && !segs[q + 1].glide) q++;
    const before = p > 0;
    const after = q + 1 < K;
    const dur = segs[q].t1 - segs[p].t0;
    const turn = before && after && Math.sign(segs[p - 1].beta) !== Math.sign(segs[q + 1].beta);
    if ((turn && dur <= 0.4) || (before && after && dur < 0.12) || (((before && q === K - 1) || (after && p === 0)) && dur < 0.15)) {
      for (let i = p; i <= q; i++) segs[i].glide = true;
    }
    p = q + 1;
  }

  // 2. Islands between glides become notes; glides decide whether they belong to a note.
  const core = new Uint8Array(run.x.length);
  const items = [];
  for (let p = 0; p < K; ) {
    let q = p;
    while (q + 1 < K && segs[q + 1].glide === segs[p].glide) q++;
    if (segs[p].glide) {
      const f = segs[p];
      const l = segs[q];
      items.push({ glide: true, a: f.a, b: l.b, dur: l.t1 - f.t0, from: f.mu - f.rise / 2, to: l.mu + l.rise / 2 });
    } else {
      const isl = islandNotes(run, segs.slice(p, q + 1), o, core);
      items.push({ glide: false, notes: isl.notes, junk: isl.junk });
    }
    p = q + 1;
  }
  let glide = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.glide) {
      glide += it.junk;
      continue;
    }
    const P = i > 0 && items[i - 1].notes.length ? items[i - 1].notes[items[i - 1].notes.length - 1] : null;
    const N = i + 1 < items.length && items[i + 1].notes.length ? items[i + 1].notes[0] : null;
    if (it.dur <= o.scoopMax) {
      const into = N && N.a === it.b && Math.abs(it.to - N.mu) <= 1;
      const out = P && P.b === it.a && Math.abs(it.from - P.mu) <= 1;
      if (into && out) {
        // A slow slide from one note to the next: change notes halfway.
        const k = crossing(run, it.a, it.b, (P.mu + N.mu) / 2, N.mu > P.mu);
        P.b = k;
        N.a = k;
        continue;
      }
      if (into) {
        N.a = it.a; // a scoop up (or down) into the note, which starts it afresh
        N.split = true;
        continue;
      }
      if (out) {
        P.b = it.b; // a fall at the end of the note
        continue;
      }
    }
    // A real glide. The segments next to it may have taken its first or last few frames;
    // hand back whatever has already left the note (by more than its own wobble).
    let a = it.a;
    let b = it.b;
    if (P && P.b === it.a) {
      const near = closeTo(run, P);
      const stop = Math.max(P.a + 1, lowerBound(run.t, run.t[P.b - 1] - 0.2));
      while (P.b - 1 > stop && Math.abs(run.x[P.b - 1] - P.mu) > near) P.b--;
      a = P.b;
    }
    if (N && N.a === it.b) {
      const near = closeTo(run, N);
      const stop = Math.min(N.b - 1, lowerBound(run.t, run.t[N.a] + 0.2));
      while (N.a < stop && Math.abs(run.x[N.a] - N.mu) > near) N.a++;
      b = N.a;
    }
    glide += (b < run.x.length ? run.t[b] : run.t[b - 1] + run.w[b - 1]) - run.t[a];
  }

  // 3. Split repeated notes at clear dips, then measure each note.
  const notes = [];
  for (const it of items) {
    if (it.glide) continue;
    for (const nt of it.notes) {
      for (const part of splitDips(run, nt, o, core)) {
        const n = measure(run, part, core);
        if (n && n.t1 - n.t0 >= o.minNote) notes.push(n);
      }
    }
  }
  return { notes, glide };
}

// How far from its centre a note's own frames stray: a little for a steady voice, more with vibrato.
function closeTo(run, nt) {
  const s = Float64Array.from(run.x.slice(nt.a, nt.b)).sort();
  return Math.min(0.35, Math.max(0.12, 2.1 * (quantile(s, 0.75, true) - quantile(s, 0.25, true))));
}

// First frame in [a, b) at or past `level` in the direction of travel.
function crossing(run, a, b, level, up) {
  for (let k = a; k < b; k++) if (up ? run.x[k] >= level : run.x[k] <= level) return k;
  return (a + b) >> 1;
}

// Notes inside one stretch with no glide in it.
function islandNotes(run, list, o, core) {
  const { x } = run;
  const A = list[0].a;
  const B = list[list.length - 1].b;
  const dur = list[list.length - 1].t1 - list[0].t0;
  // Cores are the steady pieces. Short or sloping bits between them are scoops and steps. A
  // short note with vibrato can lean (it holds part of a cycle), but not by a semitone or more.
  list.forEach((s, i) => {
    s.i = i;
    s.core = s.dur >= 0.3 || (s.dur >= 0.15 && Math.abs(s.rise) < 1.2) || (s.dur >= 0.06 && !s.sloped);
  });
  const cores = list.filter((s) => s.core);
  // A short, unsteady piece between two notes is part of the change from one to the other:
  // the bottom of a dip, a scoop, or a slide through the notes in between. A steady little
  // note (a lower neighbour, say do-ti-do, or a quick passing note) stays. Between two of the
  // same note, a dip below means two repeated notes.
  const spread = (c, trim) => {
    const cut = Math.floor((c.b - c.a) * trim);
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = c.a + cut; k < c.b - cut; k++) {
      lo = Math.min(lo, x[k]);
      hi = Math.max(hi, x[k]);
    }
    return hi - lo;
  };
  for (let i = 1; i + 1 < cores.length; i++) {
    const c = cores[i];
    const l = cores[i - 1];
    const r = cores[i + 1];
    if (c.dur >= 0.15 || Math.abs(c.mu - l.mu) < o.mergeTol || Math.abs(c.mu - r.mu) < o.mergeTol) continue;
    const under = Math.min(l.mu, r.mu) - c.mu >= 0.5;
    const over = c.mu - Math.max(l.mu, r.mu) >= 0.5;
    // A quick note in a run borrows a little of the step on each side, so a note between
    // two others is judged on its middle, and as a slide only if it carries much of the step.
    const change =
      under || over
        ? c.sloped || c.dur < 0.1 || spread(c, 0) >= 0.6
        : spread(c, 0.2) >= 0.5 || (c.sloped && Math.abs(c.rise) >= 0.5 * Math.abs(r.mu - l.mu));
    if (change) {
      c.core = false;
      c.dip = under && Math.abs(l.mu - r.mu) < o.mergeTol;
    }
  }
  // Likewise a short piece at either end that leads into (or out of) a longer note at another
  // level is that note's scoop (or fall): when it wobbles, or when it is very short and below.
  for (const [c, n] of [[cores[0], cores[1]], [cores[cores.length - 1], cores[cores.length - 2]]]) {
    if (!n || !c.core || c.dur >= 0.15 || n.dur < c.dur || Math.abs(c.mu - n.mu) < o.mergeTol || Math.abs(c.mu - n.mu) > 3) continue;
    if (c.sloped || spread(c, 0) >= 0.6 || (c.dur < 0.12 && n.mu - c.mu <= 2.5)) c.core = false;
  }

  if (!list.some((s) => s.core)) {
    // Nothing steady: a short plain note (staccato) is still a note, anything else is a wobble.
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = A; k < B; k++) {
      lo = Math.min(lo, x[k]);
      hi = Math.max(hi, x[k]);
    }
    if (dur >= o.minNote && hi - lo <= 1.5) {
      for (let k = A; k < B; k++) core[k] = 1;
      return { notes: [{ a: A, b: B, mu: (lo + hi) / 2, split: false }], junk: 0 };
    }
    return { notes: [], junk: hi - lo >= o.glideMin ? dur : 0 };
  }

  const groups = [];
  let prev = null;
  for (const s of list) {
    if (!s.core) continue;
    for (let k = s.a; k < s.b; k++) core[k] = 1;
    const g = groups[groups.length - 1];
    const dip = prev && dipBetween(run, list, prev, s);
    if (g && !dip && Math.abs(s.mu - prev.mu) < o.mergeTol && Math.abs(s.mu - g.mu) < 1) {
      g.last = s;
      g.w += s.dur;
      g.mu += ((s.mu - g.mu) * s.dur) / g.w;
    } else {
      groups.push({ first: s, last: s, mu: s.mu, w: s.dur, dip: !!dip });
    }
    prev = s;
  }

  const notes = groups.map((g) => ({ a: g.first.a, b: g.last.b, mu: g.mu, split: g.dip }));
  notes[0].a = A;
  notes[notes.length - 1].b = B;
  for (let i = 1; i < notes.length; i++) {
    const g = groups[i - 1];
    const h = groups[i];
    const a = g.last.b;
    const b = h.first.a;
    let k = b;
    if (h.dip && b > a) {
      // Change notes at the bottom of the dip; for a scoop into the second note that is its start.
      k = a;
      for (let j = a; j < b; j++) if (x[j] < x[k]) k = j;
    } else {
      k = stepAt(run, g.last, h.first);
    }
    // Frames that changed hands are part of the change, not steady singing for either note.
    for (let j = Math.min(k, a); j < Math.max(k, b); j++) core[j] = 0;
    notes[i - 1].b = k;
    notes[i].a = k;
  }
  return { notes, junk: 0 };
}

// Where one note hands over to the next. The line is first smoothed over up to a fifth of a
// second, which irons out vibrato but still crosses halfway exactly where a step happens.
// After a steady note, the change starts where the line leaves it, and a scoop (a dip past
// the old note before rising to the new one) belongs to the new note.
function stepAt(run, l, r) {
  const { t, x } = run;
  const up = r.mu > l.mu;
  const level = (l.mu + r.mu) / 2;
  const half = Math.min(0.1, 0.4 * Math.min(l.dur, r.dur));
  const lo = l.a + ((l.b - l.a) >> 1);
  const hi = r.a + ((r.b - r.a) >> 1);
  const cut = r.a > l.b ? (l.b + r.a) >> 1 : r.a;
  let c = -1;
  let prev = smooth(run, lo, half) - level;
  for (let k = lo + 1; k <= hi; k++) {
    const v = smooth(run, k, half) - level;
    if ((up ? prev < 0 && v >= 0 : prev > 0 && v <= 0) && (c < 0 || Math.abs(k - cut) < Math.abs(c - cut))) c = k;
    prev = v;
  }
  if (c < 0) c = cut;
  const s = Float64Array.from(x.slice(l.a, l.b)).sort();
  const sw = 0.71 * (quantile(s, 0.75, true) - quantile(s, 0.25, true));
  // The old note's level is its median: the piece may also hold the start of the next scoop.
  const base = quantile(s, 0.5, true);
  const edge = base + 0.2 * (r.mu - base);
  let k = c;
  while (k > lo && (up ? x[k - 1] > edge : x[k - 1] < edge)) k--;
  let e = k;
  for (let j = k - 1; j >= lo && t[k] - t[j] <= 0.12; j--) if (up ? x[j] < x[e] : x[j] > x[e]) e = j;
  // Past the old note by more than its own wobble (vibrato included): a scoop.
  const past = Math.max(0.2, 3 * sw);
  if (up ? x[e] < base - past : x[e] > base + past) return e;
  // With vibrato, the frame-by-frame line can't say where the change began; the smoothed one can.
  return sw >= 0.25 ? c : k;
}

// Weighted mean of the line within `half` seconds of frame k.
function smooth(run, k, half) {
  const { t, PW, PX } = run;
  const i = lowerBound(t, t[k] - half);
  const j = lowerBound(t, t[k] + half + 1e-9);
  return (PX[j] - PX[i]) / (PW[j] - PW[i]);
}

// Something between two pieces at the same level that drops well below both.
function dipBetween(run, list, l, r) {
  for (let k = l.i + 1; k < r.i; k++) if (list[k].dip) return true;
  if (r.a <= l.b || r.t0 - l.t1 > 0.25) return false;
  let lo = Infinity;
  for (let k = l.b; k < r.a; k++) lo = Math.min(lo, run.x[k]);
  return Math.min(l.mu, r.mu) - lo >= 0.8;
}

// Split a note where the pitch (or, when we have it, the level) dips clearly and comes
// back to the same note: that is two repeated notes sung without a break.
function splitDips(run, nt, o, core) {
  const dip = findDip(run, nt.a, nt.b, o);
  if (!dip) return [nt];
  // Frames in the dip don't count towards either note's pitch.
  for (let j = dip.i; j <= dip.j; j++) core[j] = 0;
  const k = dip.k;
  const before = splitDips(run, { a: nt.a, b: k, mu: nt.mu, split: nt.split }, o, core);
  return before.concat(splitDips(run, { a: k, b: nt.b, mu: nt.mu, split: true }, o, core));
}

function findDip(run, a, b, o) {
  const { t, x, r } = run;
  if (b - a < 6 || t[b - 1] - t[a] < 2 * o.minNote + 0.05) return null;
  const sorted = Float64Array.from(x.slice(a, b)).sort();
  const level = quantile(sorted, 0.5, true);
  let haveRms = true;
  for (let k = a; k < b && haveRms; k++) if (!(r[k] >= 0)) haveRms = false;
  const loud = haveRms ? Float64Array.from(r.slice(a, b)).sort() : null;
  const rmsLevel = haveRms ? quantile(loud, 0.5, true) : 0;
  // A level that keeps dropping out is too erratic to say where a note starts.
  if (haveRms && lowerBound(loud, 0.35 * rmsLevel) > 0.1 * loud.length) haveRms = false;
  // Nothing low enough or quiet enough to be a dip: done. So many low frames that there is
  // no level for a dip to fall from: done too.
  const low = lowerBound(sorted, level - 0.7 + 1e-9);
  if ((low === 0 || low > 0.4 * sorted.length) && !(haveRms && loud[0] < 0.35 * rmsLevel)) return null;
  // The note's vibrato depth, leaving out the dips we are looking for. A line that wanders
  // by more than a semitone has no level for a dip to fall from.
  const kept = sorted.filter((v) => v > level - 0.7);
  const noteSwing = kept.length > 3 ? 0.71 * (quantile(kept, 0.75, true) - quantile(kept, 0.25, true)) : 0;
  if (noteSwing > 1) return null;
  let best = null;
  for (let k = a; k < b; k++) {
    if (t[k] - t[a] < o.minNote || t[b - 1] - t[k] < o.minNote) continue;
    const pitchy = x[k] <= level - 0.7;
    const quiet = haveRms && r[k] < 0.35 * rmsLevel;
    if (!pitchy && !quiet) continue;
    const v = pitchy ? x : r;
    // The lowest point within 25 ms either side
    let ok = true;
    for (let j = k - 1; j >= a && t[k] - t[j] <= 0.025 && ok; j--) if (v[j] < v[k]) ok = false;
    for (let j = k + 1; j < b && t[j] - t[k] <= 0.025 && ok; j++) if (v[j] <= v[k]) ok = false;
    if (!ok) continue;
    const L = context(run, a, b, t[k] - 0.25, t[k] - 0.05);
    const R = context(run, a, b, t[k] + 0.05, t[k] + 0.25);
    if (!L || !R || Math.abs(L.mid - R.mid) > o.mergeTol) continue;
    let depth = 0;
    let span = null;
    if (pitchy) {
      const d = Math.min(L.mid, R.mid) - x[k];
      // Deeper than any vibrato swing on either side, and wider than a one-frame glitch.
      if (d >= Math.max(0.7, Math.max(L.swing, R.swing, noteSwing) + 0.3)) {
        span = below(run, x, a, b, k, Math.min(L.mid, R.mid) - d / 2);
        if (span) depth = d;
      }
    }
    if (!depth && quiet && L.rms > 0 && R.rms > 0 && r[k] < 0.35 * Math.min(L.rms, R.rms)) {
      span = below(run, r, a, b, k, 0.5 * Math.min(L.rms, R.rms));
      if (span) depth = 1;
    }
    if (depth && (!best || depth > best.depth)) best = { k, i: span.i, j: span.j, depth };
  }
  return best;
}

// The stretch around frame k where v stays under `limit`, if it is more than one frame
// (one frame is a glitch) and no longer than a quarter of a second.
function below(run, v, a, b, k, limit) {
  let i = k;
  let j = k;
  while (i > a && v[i - 1] < limit) i--;
  while (j + 1 < b && v[j + 1] < limit) j++;
  const d = run.t[j] - run.t[i] + run.w[j];
  return j > i && d <= 0.25 ? { i, j } : null;
}

// Pitch (and level) of the frames between two times, inside [a, b).
function context(run, a, b, from, to) {
  const { t, x, r } = run;
  // At least 0.12 s on each side, or a slice of vibrato could pass for a level.
  if (t[a] > to - 0.12 || t[b - 1] < from + 0.12) return null;
  const xs = [];
  const rs = [];
  for (let k = Math.max(a, lowerBound(t, from)); k < b && t[k] <= to; k++) {
    xs.push(x[k]);
    if (r[k] >= 0) rs.push(r[k]);
  }
  if (xs.length < 3) return null;
  const s = Float64Array.from(xs).sort();
  const swing = (quantile(s, 0.9, true) - quantile(s, 0.1, true)) / 2;
  return { mid: centre(s, swing), swing, rms: rs.length ? quantile(rs, 0.5) : 0 };
}

// Centre of sorted pitches: the median for a steady note, moving to the middle of the range
// as vibrato grows, because a slice of a vibrato cycle pulls the median (and the mean) its way.
function centre(s, swing) {
  const mix = Math.min(1, Math.max(0, (swing - 0.15) / 0.15));
  const med = quantile(s, 0.5, true);
  return med + mix * ((quantile(s, 0.05, true) + quantile(s, 0.95, true)) / 2 - med);
}

function quantile(arr, q, sorted = false) {
  const s = sorted ? arr : Float64Array.from(arr).sort();
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return s[i];
}

// Pitch centre and confidence for frames [a, b), from its steady frames with the first and
// last tenth left out, so scoops and falls barely move it.
function measure(run, { a, b, split }, core) {
  const { t, x, w } = run;
  if (b <= a) return null;
  let n = 0;
  for (let k = a; k < b; k++) n += core[k];
  let from = a;
  let to = b;
  let use = core;
  if (n < 3) {
    // No steady frames left (a short or wobbly note): use its middle three fifths.
    from = a + Math.floor((b - a) * 0.2);
    to = Math.max(from + 1, b - Math.floor((b - a) * 0.2));
    use = null;
    n = to - from;
  }
  const cut = Math.floor(n * 0.1);
  const vals = new Float64Array(n - 2 * cut);
  let seen = 0;
  let k2 = 0;
  for (let k = from; k < to; k++) {
    if (use && !use[k]) continue;
    if (seen >= cut && seen < n - cut) vals[k2++] = x[k];
    seen++;
  }
  let mean = 0;
  for (let i = 0; i < vals.length; i++) mean += vals[i];
  mean /= vals.length;
  let v = 0;
  for (let i = 0; i < vals.length; i++) v += (vals[i] - mean) * (vals[i] - mean);
  const sd = Math.sqrt(v / vals.length);
  // Wider than any vibrato: this was never one note (noise, or a slide that got through).
  if (sd > 1.2) return null;
  const s = vals.sort();
  const trim = Math.floor(s.length * 0.15);
  let sum = 0;
  for (let i = trim; i < s.length - trim; i++) sum += s[i];
  // A steady note: trimmed mean. With vibrato, the middle of its range is far better: part
  // of a cycle left over at either end barely moves it (the mean can be off by 13 cents).
  const trimmed = s.length > 2 * trim ? sum / (s.length - 2 * trim) : mean;
  const range = (quantile(s, 0.05, true) + quantile(s, 0.95, true)) / 2;
  const mix = Math.min(1, Math.max(0, (0.71 * (quantile(s, 0.75, true) - quantile(s, 0.25, true)) - 0.15) / 0.15));
  const m = trimmed + mix * (range - trimmed);
  const t0 = t[a];
  const t1 = t[b - 1] + w[b - 1];
  const dur = t1 - t0;
  // Longer and steadier notes are surer. Vibrato (sd about 0.4) only costs a little.
  const long = Math.min(1, Math.max(0, (dur - 0.05) / 0.25));
  const steady = Math.min(1, Math.max(0, 1.25 - sd));
  return { t0, t1, m, conf: Math.sqrt(long) * (0.4 + 0.6 * steady), split };
}

// ---------- Key ----------

// Krumhansl–Kessler probe-tone profiles, and Aarden–Essen profiles taken from folk-song
// melodies. The second set suits a sung tune; averaging the two is steadier than either.
const KK = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
};
const AE = {
  major: [17.7661, 0.145624, 14.9265, 0.160186, 19.8049, 11.3587, 0.291248, 22.062, 0.145624, 8.15494, 0.232998, 4.95122],
  minor: [18.2648, 0.737619, 14.0499, 16.8599, 0.702494, 14.4362, 0.702494, 18.6161, 4.56621, 1.93186, 7.37619, 1.75623],
};

function noteP(n) {
  if (!n) return null;
  if (Number.isFinite(n.p)) return Math.round(n.p);
  if (Number.isFinite(n.m)) return Math.round(n.m);
  return null;
}

// Seconds for found notes, beats for quantized ones: either works as a weight.
function noteLen(n) {
  if (Number.isFinite(n.t0) && Number.isFinite(n.t1)) return n.t1 - n.t0;
  if (Number.isFinite(n.beats)) return n.beats;
  return 0;
}

function corr(h, prof, tonic) {
  let mh = 0;
  let mp = 0;
  for (let i = 0; i < 12; i++) {
    mh += h[i];
    mp += prof[i];
  }
  mh /= 12;
  mp /= 12;
  let num = 0;
  let dh = 0;
  let dp = 0;
  for (let i = 0; i < 12; i++) {
    const a = h[(i + tonic) % 12] - mh;
    const b = prof[i] - mp;
    num += a * b;
    dh += a * a;
    dp += b * b;
  }
  return dh > 0 && dp > 0 ? num / Math.sqrt(dh * dp) : 0;
}

// Duration-weighted Krumhansl–Schmuckler, plus nudges that matter for short tunes: songs
// nearly always end on the home note and usually start on a note of the home chord. Without
// them a short major tune is often read as its relative minor (same notes, other home).
// Returns the best guess even when it isn't sure; `enough` says whether to tell anyone.
export function findKey(notes) {
  const h = new Array(12).fill(0);
  const list = [];
  for (const n of notes || []) {
    const p = noteP(n);
    const d = noteLen(n);
    if (p == null || !(d > 0)) continue;
    const conf = Number.isFinite(n.conf) ? n.conf : 1;
    list.push({ p, conf });
    // Cap very long notes so one held note doesn't decide the key on its own.
    h[pc(p)] += Math.min(d, 2) * (0.5 + 0.5 * conf);
  }
  if (!list.length) return { tonic: 0, mode: 'major', confidence: 0, enough: false };
  const clear = list.filter((n) => n.conf >= 0.45);
  const ends = clear.length ? clear : list;
  const first = pc(ends[0].p);
  const last = pc(ends[ends.length - 1].p);

  const keys = [];
  for (const mode of ['major', 'minor']) {
    const third = mode === 'major' ? 4 : 3;
    for (let tonic = 0; tonic < 12; tonic++) {
      const r = (corr(h, KK[mode], tonic) + corr(h, AE[mode], tonic)) / 2;
      const triad = [tonic, (tonic + third) % 12, (tonic + 7) % 12];
      let bonus = 0;
      if (last === tonic) bonus += 0.2;
      else if (triad.includes(last)) bonus += 0.05;
      if (first === tonic) bonus += 0.05;
      else if (triad.includes(first)) bonus += 0.02;
      keys.push({ tonic, mode, r, score: r + bonus });
    }
  }
  // Ties (rare) go to major, then the lower tonic, so the answer never depends on sort order.
  keys.sort((a, b) => b.score - a.score || (a.mode === b.mode ? 0 : a.mode === 'major' ? -1 : 1) || a.tonic - b.tonic);
  const best = keys[0];
  const margin = best.score - keys[1].score;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  // The nudge for ending on the home note is 0.2, so a key has to win by more than most of
  // that nudge before we say it out loud.
  const confidence = clamp(Math.min(1, clear.length / 10) * (0.4 * clamp((best.r - 0.3) / 0.5) + 0.6 * clamp(margin / 0.3)));
  const enough = clear.length >= 8 && margin >= 0.15 && best.r >= 0.5;
  return { tonic: best.tonic, mode: best.mode, confidence: round(confidence, 2), enough };
}

// ---------- Rhythm ----------

// Snap notes to an eighth-note grid at the tempo the child picked. The grid's phase is the
// one that best fits the note starts; the first note lands on beat 0 and offset is the time
// of beat 0, so beat b sits at offset + b × 60 / bpm seconds. Notes keep their order, never
// overlap and are at least an eighth long; silences of an eighth or more stay as rests.
export function quantize(notes, { bpm = TEMPOS.medium, beatsPerBar = 4 } = {}) {
  bpm = Number.isFinite(bpm) && bpm > 0 ? bpm : TEMPOS.medium;
  beatsPerBar = Number.isInteger(beatsPerBar) && beatsPerBar > 0 ? beatsPerBar : 4;
  const list = (notes || [])
    .filter((n) => n && Number.isFinite(n.t0) && n.t1 > n.t0 && noteP(n) != null)
    .slice()
    .sort((a, b) => a.t0 - b.t0);
  if (!list.length) return { bpm, beatsPerBar, offset: 0, notes: [] };
  const g = 30 / bpm; // one eighth note in seconds

  let phase = 0;
  let bestCost = Infinity;
  const STEPS = 48;
  for (let k = 0; k < STEPS; k++) {
    const ph = (k / STEPS) * g;
    let cost = 0;
    for (const n of list) {
      let f = ((n.t0 - ph) / g) % 1;
      if (f < 0) f += 1;
      const d = Math.min(f, 1 - f);
      // Starts of longer, surer notes are the better guide to where the beat is.
      cost += Math.sqrt(Math.min(1, n.t1 - n.t0)) * (Number.isFinite(n.conf) ? 0.5 + n.conf : 1) * d * d;
    }
    if (cost < bestCost - 1e-12) {
      bestCost = cost;
      phase = ph;
    }
  }
  const offset = phase + g * Math.round((list[0].t0 - phase) / g);

  const out = [];
  let lastStart = -Infinity;
  list.forEach((n, i) => {
    const exact = (n.t0 - offset) / g;
    let s = Math.round(exact);
    // When the next note wants the same grid point and this one was nearly halfway between
    // two, take the earlier one: a dotted rhythm becomes two eighths, not a late squash.
    const next = list[i + 1];
    if (next && Math.round((next.t0 - offset) / g) <= s && s - 1 > lastStart && exact - (s - 1) <= 0.75) s -= 1;
    if (s <= lastStart) {
      s = lastStart + 1;
      if (s - exact > 1) return; // a burst of quick notes: this one gives way to the one before
    }
    let e = Math.round((n.t1 - offset) / g);
    if (e <= s) e = s + 1;
    const prev = out[out.length - 1];
    if (prev && prev.e > s) prev.e = s;
    out.push({ s, e, p: noteP(n) });
    lastStart = s;
  });
  return {
    bpm,
    beatsPerBar,
    offset: round(offset, 4),
    notes: out.map((n) => ({ beat: n.s / 2 + 0, beats: (n.e - n.s) / 2, p: n.p })),
  };
}

// ---------- Chords ----------

const CHORDS = {
  major: [
    { numeral: 'I', step: 0, quality: '' },
    { numeral: 'IV', step: 5, quality: '' },
    { numeral: 'V', step: 7, quality: '' },
    { numeral: 'vi', step: 9, quality: 'm' },
  ],
  // Minor keys borrow a major V, as most minor tunes do.
  minor: [
    { numeral: 'i', step: 0, quality: 'm' },
    { numeral: 'iv', step: 5, quality: 'm' },
    { numeral: 'V', step: 7, quality: '' },
    { numeral: 'VI', step: 8, quality: '' },
  ],
};
const PREFER = [0, 2, 1, 3]; // when two chords still tie: I, then V, IV, vi

function triad(root, quality) {
  return [root % 12, (root + (quality === 'm' ? 3 : 4)) % 12, (root + 7) % 12];
}

function strength(pos, bpb) {
  if (pos === 0) return 1;
  if (bpb % 2 === 0 && pos === bpb / 2) return 0.75;
  return Number.isInteger(pos) ? 0.55 : 0.35;
}

// How well a chord fits the melody between two beats. Chord tones score, a note a semitone
// above (or below) a chord tone clashes, other notes are passing notes and cost a little.
// Long notes and notes on strong beats count most. Chord tones score nearly the same so the
// small preference for I, then V and IV, decides between chords that share the note, which
// gives the familiar nursery harmony: do mi sol on I, re ti on V, fa la on IV.
const FAVOUR = [0.06, 0.02, 0.02, -0.06]; // I IV V vi
function fitSpan(notes, start, from, to, tones, bpb) {
  let s = 0;
  let wsum = 0;
  for (let k = start; k < notes.length; k++) {
    const n = notes[k];
    if (n.beat >= to) break;
    const a = Math.max(n.beat, from);
    const b = Math.min(n.beat + n.beats, to);
    if (b <= a) continue;
    const onset = n.beat >= from && n.beat < to;
    const w = (b - a) * (onset ? 0.5 + 0.5 * strength(n.beat % bpb, bpb) : 0.5);
    const q = pc(n.p);
    const i = tones.indexOf(q);
    const f = i >= 0 ? [1, 0.95, 0.97][i] : tones.includes((q + 11) % 12) ? -0.7 : tones.includes((q + 1) % 12) ? -0.5 : -0.2;
    s += w * f;
    wsum += w;
  }
  return { s, w: wsum };
}

// One chord per bar from I IV V vi (i iv V VI in minor), two when the halves of a bar
// clearly want different chords. Starts on I when it fits, ends on I, and likes V just
// before that last I. Returns [{ bar, beat, beats, root, quality, numeral }].
export function harmonize(q, key) {
  const notes = ((q && q.notes) || [])
    .filter((n) => n && Number.isFinite(n.beat) && n.beats > 0 && noteP(n) != null)
    .sort((a, b) => a.beat - b.beat);
  if (!notes.length) return [];
  const bpb = q.beatsPerBar > 0 ? q.beatsPerBar : 4;
  key = key && Number.isFinite(key.tonic) ? key : findKey(notes);
  const set = CHORDS[key.mode === 'minor' ? 'minor' : 'major'];
  const tones = set.map((c) => triad(key.tonic + c.step, c.quality));
  let end = 0;
  for (const n of notes) end = Math.max(end, n.beat + n.beats);
  const bars = Math.max(1, Math.ceil(end / bpb - 1e-9));
  const half = Math.ceil(bpb / 2);

  // Notes are in order and don't overlap, so each span only needs the notes from the one
  // sounding at its start.
  const score = (from, to) => {
    let lo = 0;
    let hi = notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (notes[mid].beat + notes[mid].beats <= from) lo = mid + 1;
      else hi = mid;
    }
    return tones.map((tn, i) => {
      const f = fitSpan(notes, lo, from, to, tn, bpb);
      return { s: f.s + FAVOUR[i] * f.w, w: f.w };
    });
  };
  const pick = (sc, prevIdx) => {
    let best = PREFER[0];
    let bestS = -Infinity;
    for (const i of PREFER) {
      // A little loyalty to the chord already playing, so the harmony doesn't flicker.
      const s = sc[i].s + (i === prevIdx ? 0.05 * sc[i].w : 0);
      if (s > bestS + 1e-9) {
        bestS = s;
        best = i;
      }
    }
    return best;
  };

  const spans = [];
  let prevIdx = 0;
  for (let bar = 0; bar < bars; bar++) {
    const from = bar * bpb;
    const whole = score(from, from + bpb);
    const w = whole[0].w;
    if (w === 0) {
      spans.push({ bar, beat: from, beats: bpb, idx: prevIdx, sc: whole });
      continue;
    }
    const one = pick(whole, prevIdx);
    if (bpb >= 3) {
      const A = score(from, from + half);
      const B = score(from + half, from + bpb);
      if (A[0].w > 0 && B[0].w > 0) {
        const x = pick(A, prevIdx);
        const y = pick(B, x);
        if (x !== y && A[x].s + B[y].s - whole[one].s >= 0.3 * w) {
          spans.push({ bar, beat: from, beats: half, idx: x, sc: A });
          spans.push({ bar, beat: from + half, beats: bpb - half, idx: y, sc: B });
          prevIdx = y;
          continue;
        }
      }
    }
    spans.push({ bar, beat: from, beats: bpb, idx: one, sc: whole });
    prevIdx = one;
  }

  const bestOf = (sc) => Math.max(...sc.map((v) => v.s));
  // Start at home when home fits.
  const s0 = spans[0];
  if (s0.sc[0].s >= bestOf(s0.sc) - 0.25 * s0.sc[0].w) s0.idx = 0;
  // End at home. If the last bar's first half clearly wants another chord, give it that
  // chord and finish on I in the second half.
  const lastBar = bars - 1;
  while (spans.length > 1 && spans[spans.length - 1].bar === lastBar && spans[spans.length - 2].bar === lastBar) spans.pop();
  const last = spans[spans.length - 1];
  last.beat = lastBar * bpb;
  last.beats = bpb;
  last.idx = 0;
  if (bpb >= 3 && spans.length > 1) {
    const A = score(last.beat, last.beat + half);
    const B = score(last.beat + half, last.beat + bpb);
    if (A[0].w > 0 && B[0].w > 0 && bestOf(A) - A[0].s >= 0.3 * A[0].w) {
      last.beats = half;
      last.sc = A;
      last.idx = pick(A, -1);
      spans.push({ bar: lastBar, beat: last.beat + half, beats: bpb - half, idx: 0, sc: B });
    }
  }
  // V just before the final I, when V fits about as well as anything (but a two-bar tune
  // still starts at home).
  const pen = spans[spans.length - 2];
  if (pen && !(pen === s0 && s0.idx === 0) && (pen.sc[2].w === 0 || pen.sc[2].s >= bestOf(pen.sc) - 0.2 * pen.sc[2].w)) pen.idx = 2;

  return spans.map((s) => ({
    bar: s.bar,
    beat: s.beat,
    beats: s.beats,
    root: (key.tonic + set[s.idx].step) % 12,
    quality: set[s.idx].quality,
    numeral: set[s.idx].numeral,
  }));
}

// ---------- Arrangement ----------

// Close triad around middle C, moving as little as possible from the last chord:
// phone speakers play this register well and it stays out of the way of a child's voice.
function voiceChord(root, quality, prev) {
  const tones = triad(root, quality);
  let best = null;
  let bestCost = Infinity;
  for (let low = 55; low <= 64; low++) {
    if (!tones.includes(low % 12)) continue;
    const v = [low];
    for (let m = low + 1; v.length < 3; m++) if (tones.includes(m % 12)) v.push(m);
    if (v[2] > 72) continue;
    const centre = Math.abs((v[0] + v[2]) / 2 - 62);
    const cost = prev ? v.reduce((s, m, i) => s + Math.abs(m - prev[i]), 0) + 0.3 * centre : centre;
    if (cost < bestCost) {
      bestCost = cost;
      best = v;
    }
  }
  return best;
}

// The root between E2 and D#3: low enough to sound like a bass, high enough that a phone
// speaker can still hint at it through its harmonics.
function bassNote(root) {
  const m = 36 + (((root % 12) + 12) % 12);
  return m < 40 ? m + 12 : m;
}

// Timed events for audio.js: the tune (piano), chords, bass and, for 'pop', a drum kit.
// 'gentle' has no drums and softer, held chords. countIn adds one bar of clicks first.
// events: [{ kind, t, d, m?, ms?, vel, accent? }], t and d in seconds from 0, vel 0..1.
export function arrange(q, chords, key, { style = 'pop', countIn = false } = {}) {
  const bpm = q && q.bpm > 0 ? q.bpm : TEMPOS.medium;
  const bpb = q && q.beatsPerBar > 0 ? q.beatsPerBar : 4;
  const spb = 60 / bpm;
  const lead = countIn ? bpb * spb : 0;
  const at = (beat) => lead + beat * spb;
  const gentle = style === 'gentle';
  const events = [];

  if (countIn) for (let i = 0; i < bpb; i++) events.push({ kind: 'click', t: i * spb, d: 0.05, vel: i ? 0.7 : 1, accent: i === 0 });

  const notes = (q && q.notes) || [];
  let end = 0;
  for (const n of notes) {
    events.push({ kind: 'melody', t: at(n.beat), d: n.beats * spb, m: noteP(n), vel: 0.9 });
    end = Math.max(end, n.beat + n.beats);
  }
  if (!chords || !chords.length) chords = notes.length ? harmonize(q, key) : [];
  for (const c of chords) end = Math.max(end, c.beat + c.beats);
  const total = Math.ceil(end / bpb - 1e-9) * bpb;

  let prev = null;
  chords.forEach((c, i) => {
    const ms = voiceChord(c.root, c.quality, prev);
    prev = ms;
    const bass = bassNote(c.root);
    const final = i === chords.length - 1;
    if (gentle || final) {
      // Held chords fade on a piano, so long ones are struck again halfway.
      const ring = final ? 2 * spb : 0;
      const parts = !final && c.beats >= 4 ? 2 : 1;
      for (let k = 0; k < parts; k++) {
        const b = c.beat + (k * c.beats) / parts;
        events.push({ kind: 'chord', t: at(b), d: (c.beats / parts) * spb + ring, ms, vel: gentle ? 0.45 : 0.55 });
      }
      events.push({ kind: 'bass', t: at(c.beat), d: c.beats * spb + ring, m: bass, vel: 0.6 });
      return;
    }
    // Pop: the chord on every beat, the bass on each half bar.
    for (let b = 0; b < c.beats; b++) events.push({ kind: 'chord', t: at(c.beat + b), d: 0.9 * spb, ms, vel: b === 0 ? 0.55 : 0.42 });
    const step = bpb % 2 === 0 ? bpb / 2 : bpb;
    for (let b = 0; b < c.beats; b += step) {
      events.push({ kind: 'bass', t: at(c.beat + b), d: Math.min(step, c.beats - b) * spb * 0.95, m: bass, vel: 0.7 });
    }
  });

  if (!gentle && total > 0) {
    const lastBar = total - bpb;
    for (let bar = 0; bar < total; bar += bpb) {
      if (bar === lastBar && bar > 0) {
        events.push({ kind: 'kick', t: at(bar), d: 0.3, vel: 0.85 }); // the last bar just lands
        continue;
      }
      for (let b = 0; b < bpb; b++) {
        const kick = b === 0 || (bpb % 2 === 0 && b === bpb / 2);
        if (kick) events.push({ kind: 'kick', t: at(bar + b), d: 0.3, vel: b === 0 ? 0.85 : 0.7 });
        else events.push({ kind: 'snare', t: at(bar + b), d: 0.2, vel: bpb === 3 ? 0.4 : 0.6 });
        events.push({ kind: 'hat', t: at(bar + b), d: 0.05, vel: 0.35 });
        events.push({ kind: 'hat', t: at(bar + b + 0.5), d: 0.05, vel: 0.22 });
      }
    }
  }

  events.sort((a, b) => a.t - b.t);
  let duration = lead + total * spb;
  for (const e of events) duration = Math.max(duration, e.t + e.d);
  return { bpm, duration: round(duration, 3), events };
}

// ---------- Feedback ----------

// Kind, plain facts about a take for a feedback card: nothing here is a grade.
export function describe(notes, key) {
  const list = (notes || []).filter((n) => noteP(n) != null);
  if (!list.length) return { seconds: 0, notes: 0, distinct: 0, low: null, high: null, span: 0, endsHome: false, shape: 'flat' };
  const ps = list.map(noteP);
  const low = Math.min(...ps);
  const high = Math.max(...ps);
  const first = list[0];
  const lastN = list[list.length - 1];
  const seconds = Number.isFinite(first.t0) && Number.isFinite(lastN.t1) ? lastN.t1 - first.t0 : 0;
  const endPc = pc(ps[ps.length - 1]);
  const endsHome = endPc === pc(ps[0]) || !!(key && key.enough && endPc === key.tonic);
  return {
    seconds: round(Math.max(0, seconds), 1),
    notes: list.length,
    distinct: new Set(ps).size,
    low,
    high,
    span: high - low,
    endsHome,
    shape: shapeOf(ps, high - low),
  };
}

// The big moves of the tune, ignoring wiggles smaller than about a third of its span.
function shapeOf(ps, span) {
  const h = Math.max(2, 0.35 * span);
  const moves = [];
  let lo = ps[0];
  let hi = ps[0];
  for (const p of ps) {
    const dir = moves[moves.length - 1] || 0;
    if (dir >= 0) hi = Math.max(hi, p);
    if (dir <= 0) lo = Math.min(lo, p);
    if (dir <= 0 && p - lo >= h) {
      moves.push(1);
      hi = p;
    } else if (dir >= 0 && hi - p >= h) {
      moves.push(-1);
      lo = p;
    }
  }
  if (!moves.length) return 'flat';
  if (moves.length === 1) return moves[0] > 0 ? 'up' : 'down';
  if (moves.length === 2) return moves[0] > 0 ? 'up-down' : 'down-up';
  return 'wave';
}
