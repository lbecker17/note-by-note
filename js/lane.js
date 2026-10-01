// The pitch lane: target notes scroll right to left past a fixed line,
// and your voice draws a line across them. Notes light up in their colour as you hit them.

import { family, label, pc, prefersFlats, MAJOR } from './music.js';
import { targetAt, keyOf, keyAt } from './score.js';

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const TOKENS = [
  'lane-bg', 'lane-row', 'lane-row-strong', 'lane-label', 'bar-idle', 'bar-ghost', 'trace', 'playhead',
  'fg', 'muted', 'near', 'off', 'do', 're', 'mi', 'fa', 'sol', 'la', 'ti',
  'on-do', 'on-re', 'on-mi', 'on-fa', 'on-sol', 'on-la', 'on-ti', 'font-body',
];

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const col = {};
  for (const k of TOKENS) col[k] = cs.getPropertyValue('--' + k).trim() || '#888';
  return col;
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// First index with frames[i].t >= t
function lowerBound(frames, t) {
  let a = 0, b = frames.length;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (frames[mid].t < t) a = mid + 1;
    else b = mid;
  }
  return a;
}

export class Lane {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.pps = 105; // pixels per second
    this.model = { events: [], free: true };
    this.view = { lo: 53, hi: 67 };
    this.center = 60;
    this.col = readTokens();
    this.resize();
  }

  readColors() {
    this.col = readTokens();
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.w = Math.max(40, r.width);
    this.h = Math.max(40, r.height);
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
  }

  // model: { events, tonic, minor, names, free, center, marks }
  // Events may carry their own tonic when an exercise changes key part way through.
  setModel(model) {
    this.model = model;
    if (model.free) {
      this.center = model.center != null ? model.center : 60;
      this.view = { lo: this.center - 7, hi: this.center + 7 };
      return;
    }
    let lo = Infinity, hi = -Infinity;
    for (const e of model.events) {
      lo = Math.min(lo, e.m, e.m2 != null ? e.m2 : e.m);
      hi = Math.max(hi, e.m, e.m2 != null ? e.m2 : e.m);
    }
    if (!isFinite(lo)) {
      lo = 57;
      hi = 69;
    }
    const minSpan = 10;
    if (hi - lo < minSpan) {
      const pad = (minSpan - (hi - lo)) / 2;
      lo -= pad;
      hi += pad;
    }
    this.view = { lo: lo - 1.4, hi: hi + 1.4 };
  }

  get gutter() {
    return 40;
  }
  get playX() {
    return this.gutter + (this.w - this.gutter) * 0.3;
  }
  y(m) {
    const { lo, hi } = this.view;
    const top = 12, bot = this.h - 12;
    return bot - ((m - lo) / (hi - lo)) * (bot - top);
  }
  x(time, now) {
    return this.playX + (time - now) * this.pps;
  }
  rowH() {
    return (this.h - 24) / (this.view.hi - this.view.lo);
  }
  noteLabel(m, tonic) {
    const M = this.model;
    const T = M.free ? null : tonic;
    return label(m, {
      tonic: T,
      flats: T != null && prefersFlats(T, !!M.minor),
      names: M.free ? 'letters' : M.names,
      octave: !(M.names === 'solfa' && !M.free),
    });
  }

  // now: timeline seconds; frames: [{t, m, dm, hide, k, fam, octave}]; live: latest frame or null
  draw(now, frames, live) {
    const g = this.g, C = this.col, W = this.w, H = this.h, M = this.model;
    const font = C['font-body'] || 'system-ui, sans-serif';
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = C['lane-bg'];
    g.fillRect(0, 0, W, H);

    if (M.free && live && live.m != null) {
      this.center += (live.m - this.center) * 0.06;
      this.view = { lo: this.center - 7, hi: this.center + 7 };
    }

    // Rows and note names, in the key of the note at (or coming up to) the line
    const rh = this.rowH();
    const tonic = M.free ? null : keyAt(M, now);
    const scale = M.minor ? MINOR : MAJOR;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let m = Math.ceil(this.view.lo); m <= Math.floor(this.view.hi); m++) {
      const deg = tonic != null ? pc(m - tonic) : pc(m);
      const inScale = tonic != null ? scale.includes(deg) : MAJOR.includes(deg);
      const strong = deg === 0;
      if (!inScale && rh < 14) continue;
      const yy = Math.round(this.y(m)) + 0.5;
      g.strokeStyle = strong ? C['lane-row-strong'] : C['lane-row'];
      g.lineWidth = strong ? 1.5 : 1;
      g.beginPath();
      g.moveTo(this.gutter, yy);
      g.lineTo(W, yy);
      g.stroke();
      if (inScale && rh >= 8) {
        g.fillStyle = C['lane-label'];
        g.font = `${strong ? 800 : 700} 12px ${font}`;
        g.fillText(this.noteLabel(m, tonic), this.gutter - 8, yy);
      }
    }

    g.save();
    g.beginPath();
    g.rect(this.gutter, 0, W - this.gutter, H);
    g.clip();

    // Marks (used by the range test)
    for (const mk of M.marks || []) {
      const yy = Math.round(this.y(mk.m)) + 0.5;
      g.strokeStyle = C[mk.color] || C.fg;
      g.lineWidth = 2;
      g.setLineDash([6, 5]);
      g.beginPath();
      g.moveTo(this.gutter, yy);
      g.lineTo(W, yy);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = C[mk.color] || C.fg;
      g.font = `700 12px ${font}`;
      g.textAlign = 'right';
      g.fillText(mk.label, W - 10, yy - 11);
    }

    // Target notes
    const t0 = now - (this.playX - this.gutter) / this.pps - 0.2;
    const t1 = now + (W - this.playX) / this.pps + 0.2;
    const barH = Math.max(8, Math.min(rh * 0.76, 28));
    const labels = []; // drawn after your line, so it never runs through them
    for (const ev of M.events || []) {
      if (ev.t + ev.d < t0 || ev.t > t1) continue;
      const key = M.free ? null : keyOf(ev, M);
      const fam = family(ev.m, key != null ? key : 0);
      if (ev.m2 != null) {
        this.drawGlide(ev, now, C[fam], barH);
        continue;
      }
      const x0 = this.x(ev.t, now) + 1;
      const x1 = this.x(ev.t + ev.d, now) - 1.5;
      const yy = this.y(ev.m);
      const top = yy - barH / 2;
      const r = Math.min(barH / 2, 9);
      const active = now >= ev.t && now < ev.t + ev.d;
      if (ev.role === 'listen') {
        g.setLineDash([4, 4]);
        g.strokeStyle = C['bar-ghost'];
        g.lineWidth = 1.5;
        roundRect(g, x0, top, x1 - x0, barH, r);
        g.stroke();
        g.setLineDash([]);
      } else {
        g.fillStyle = C['bar-idle'];
        roundRect(g, x0, top, x1 - x0, barH, r);
        g.fill();
        if (ev.hits && ev.hits.length) {
          g.save();
          roundRect(g, x0, top, x1 - x0, barH, r);
          g.clip();
          g.fillStyle = C[fam];
          for (const h of ev.hits) {
            g.globalAlpha = h.k === 1 ? 1 : 0.4;
            const a = this.x(h.a, now), b = this.x(h.b, now);
            g.fillRect(a, top, Math.max(1.5, b - a + 1), barH);
          }
          g.restore();
          g.globalAlpha = 1;
        }
        if (active) {
          g.strokeStyle = C.fg;
          g.lineWidth = 2;
          roundRect(g, x0, top, x1 - x0, barH, r);
          g.stroke();
        }
      }
      // Label on the bar: the syllable for songs, the note name for exercises.
      const text = ev.text != null ? (ev.melisma ? '' : ev.text) : this.noteLabel(ev.m, key);
      if (text && barH >= 13 && x1 - x0 >= 18) {
        const listen = ev.role === 'listen';
        let lit = false;
        if (ev.hits && ev.hits.length) {
          const la = ev.t + 6 / this.pps, lb = ev.t + 22 / this.pps;
          lit = ev.hits.some((h) => h.k === 1 && h.a <= lb && h.b >= la);
        }
        labels.push({ text, x0, x1, top, yy, listen, lit, fam });
      }
    }

    // The "now" line
    g.strokeStyle = C.playhead;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(this.playX, 6);
    g.lineTo(this.playX, H - 6);
    g.stroke();

    // Your voice
    const vlo = this.view.lo + 0.25, vhi = this.view.hi - 0.25;
    const clampM = (m) => Math.max(vlo, Math.min(vhi, m));
    if (frames && frames.length) {
      const tStart = now - (this.playX - this.gutter) / this.pps;
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = C.trace;
      g.beginPath();
      let prev = null;
      for (let i = lowerBound(frames, tStart); i < frames.length; i++) {
        const f = frames[i];
        if (f.m == null || f.hide) {
          prev = null;
          continue;
        }
        const dm = f.dm != null ? f.dm : f.m;
        const px = this.x(f.t, now), py = this.y(clampM(dm));
        if (prev && f.t - prev.t < 0.1) g.lineTo(px, py);
        else g.moveTo(px, py);
        prev = f;
      }
      g.stroke();
    }

    // Bar labels, over your line. Each has a halo in the colour behind it, so the line can't run
    // through a note name. While a bar is under the "now" line, its label waits just right of the
    // dot rather than sitting under it; near the bar's end it goes back to the bar's start, or
    // hides if that would still be under the dot.
    const zoneL = this.playX - 14, zoneR = this.playX + 14;
    const size = Math.round(Math.min(13, barH * 0.56));
    g.font = `800 ${size}px ${font}`;
    g.textAlign = 'left';
    g.lineJoin = 'round';
    g.lineWidth = 4;
    for (const lb of labels) {
      const tw = g.measureText(lb.text).width;
      let lx = lb.x0 + 7;
      let lit = lb.lit;
      if (lb.x0 <= zoneR && lb.x1 >= zoneL) {
        if (zoneR + tw <= lb.x1 - 3) {
          lx = Math.max(lx, zoneR);
          lit = false; // right of the line hasn't been sung yet
        } else if (lx + tw > zoneL) continue;
      }
      const ink = lb.listen ? C['lane-label'] : lit ? C['on-' + lb.fam] : C.fg;
      const halo = lb.listen ? C['lane-bg'] : lit ? C[lb.fam] : C['bar-idle'];
      g.save();
      g.beginPath();
      g.rect(lb.x0 + 5, lb.top + 1.5, lb.x1 - lb.x0 - 8, barH - 3); // inside the current bar's outline
      g.clip();
      g.strokeStyle = halo;
      g.strokeText(lb.text, lx, lb.yy + 0.5);
      g.fillStyle = ink;
      g.fillText(lb.text, lx, lb.yy + 0.5);
      g.restore();
    }

    if (live && live.m != null && !live.hide) {
      const dm = live.dm != null ? live.dm : live.m;
      const px = this.playX, py = this.y(clampM(dm));
      const color = live.k === 1 ? C[live.fam] : live.k === 0.5 ? C.near : live.k === 0 ? C.off : C.trace;
      // A soft halo when you're in tune: a wordless "yes".
      if (live.k === 1) {
        g.globalAlpha = 0.25;
        g.fillStyle = color;
        g.beginPath();
        g.arc(px, py, 13, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      g.fillStyle = color;
      g.beginPath();
      g.arc(px, py, 7.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = C['lane-bg'];
      g.lineWidth = 2.5;
      g.stroke();
      // The right note in another octave counts. The dot sits on the bar; a small note says why.
      // It sits clear of the bar's own label, with a halo so bars behind it don't muddle it.
      if (live.octave) {
        const say = live.octave < 0 ? 'same note, lower' : 'same note, higher';
        const sy = py < 30 ? py + 20 : py - 18;
        g.font = `700 12px ${font}`;
        g.textAlign = 'left';
        g.lineWidth = 4;
        g.strokeStyle = C['lane-bg'];
        g.strokeText(say, px + 13, sy);
        g.fillStyle = C.muted;
        g.fillText(say, px + 13, sy);
      }
      if (dm > vhi || dm < vlo) {
        const up = dm > vhi;
        g.fillStyle = C.fg;
        g.beginPath();
        const ay = up ? 6 : H - 6;
        g.moveTo(px, ay);
        g.lineTo(px - 6, ay + (up ? 9 : -9));
        g.lineTo(px + 6, ay + (up ? 9 : -9));
        g.closePath();
        g.fill();
      }
    }
    g.restore();
  }

  drawGlide(ev, now, color, barH) {
    const g = this.g, C = this.col;
    const pts = (a, b) => {
      const out = [];
      const n = Math.max(2, Math.ceil(((b - a) / ev.d) * 28));
      for (let i = 0; i <= n; i++) {
        const tt = a + ((b - a) * i) / n;
        out.push([this.x(tt, now), this.y(targetAt(ev, tt))]);
      }
      return out;
    };
    const stroke = (p) => {
      g.beginPath();
      p.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (ev.role === 'listen') {
      g.setLineDash([4, 5]);
      g.strokeStyle = C['bar-ghost'];
      g.lineWidth = 2;
      stroke(pts(ev.t, ev.t + ev.d));
      g.setLineDash([]);
      return;
    }
    g.strokeStyle = C['bar-idle'];
    g.lineWidth = barH * 0.8;
    stroke(pts(ev.t, ev.t + ev.d));
    if (ev.hits) {
      g.strokeStyle = color;
      for (const h of ev.hits) {
        g.globalAlpha = h.k === 1 ? 1 : 0.4;
        stroke(pts(Math.max(ev.t, h.a), Math.min(ev.t + ev.d, h.b + 1 / 60)));
      }
      g.globalAlpha = 1;
    }
  }
}

// A compact picture of a whole run for the results sheet.
export function drawOverview(canvas, results) {
  const C = readTokens();
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = Math.max(40, r.width), H = Math.max(40, r.height);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = C['lane-bg'];
  g.fillRect(0, 0, W, H);
  const total = results.reduce((s, x) => s + x.step.end, 0) || 1;
  let lo = Infinity, hi = -Infinity;
  for (const res of results)
    for (const e of res.step.events)
      if (e.role === 'sing') {
        lo = Math.min(lo, e.m, e.m2 != null ? e.m2 : e.m);
        hi = Math.max(hi, e.m, e.m2 != null ? e.m2 : e.m);
      }
  if (!isFinite(lo)) return;
  if (hi - lo < 8) {
    const p = (8 - (hi - lo)) / 2;
    lo -= p;
    hi += p;
  }
  lo -= 1.2;
  hi += 1.2;
  const pad = 8;
  const X = (t) => pad + (t / total) * (W - pad * 2);
  const Y = (m) => H - 6 - ((m - lo) / (hi - lo)) * (H - 12);
  const bh = Math.max(3, Math.min(9, ((H - 12) / (hi - lo)) * 0.7));
  let off = 0;
  results.forEach((res, i) => {
    const st = res.step;
    if (i > 0) {
      g.strokeStyle = C['lane-row-strong'];
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(X(off) + 0.5, 4);
      g.lineTo(X(off) + 0.5, H - 4);
      g.stroke();
    }
    for (const ev of st.events) {
      if (ev.role !== 'sing') continue;
      const fam = family(ev.m, keyOf(ev, st));
      if (ev.m2 != null) {
        g.strokeStyle = C['bar-idle'];
        g.lineWidth = bh;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(X(off + ev.t), Y(ev.m));
        g.lineTo(X(off + ev.t + ev.d), Y(ev.m2));
        g.stroke();
        continue;
      }
      const x0 = X(off + ev.t), x1 = X(off + ev.t + ev.d) - 0.5;
      g.fillStyle = C['bar-idle'];
      roundRect(g, x0, Y(ev.m) - bh / 2, Math.max(1, x1 - x0), bh, bh / 2);
      g.fill();
      if (ev.hits) {
        g.fillStyle = C[fam];
        for (const h of ev.hits) {
          g.globalAlpha = h.k === 1 ? 1 : 0.4;
          const a = X(off + h.a), b = X(off + h.b);
          g.fillRect(a, Y(ev.m) - bh / 2, Math.max(0.8, b - a), bh);
        }
        g.globalAlpha = 1;
      }
    }
    g.strokeStyle = C.trace;
    g.globalAlpha = 0.7;
    g.lineWidth = 1.25;
    g.lineJoin = 'round';
    g.beginPath();
    let prev = null;
    for (const f of res.frames) {
      if (f.t < 0 || f.t > st.end || f.m == null || f.hide) {
        prev = null;
        continue;
      }
      const dm = f.dm != null ? f.dm : f.m;
      if (dm < lo || dm > hi) {
        prev = null;
        continue;
      }
      const px = X(off + f.t), py = Y(dm);
      if (prev && f.t - prev.t < 0.12) g.lineTo(px, py);
      else g.moveTo(px, py);
      prev = f;
    }
    g.stroke();
    g.globalAlpha = 1;
    off += st.end;
  });
}

// "See my song": a Free sing take as rounded note blocks on a pitch grid (time across, pitch
// up), with the take's pitch line faint behind them, so slides show too. With a sure key each
// block takes its scale-degree colour and the name Settings asks for; otherwise every block is
// one warm neutral, named by letter. lit is the block playing now (-1 for none). A long take
// scrolls sideways: each second gets about SONG_PPS pixels. Returns each block's [x0, x1]
// in CSS pixels, so the page can keep the lit one in view.
const SONG_PPS = 36;
const SONG_MAX_W = 6000;
export function drawSong(canvas, { notes, frames = [], key = null, names = 'letters', lit = -1, width }) {
  const C = readTokens();
  const plain = getComputedStyle(document.documentElement).getPropertyValue('--line-strong').trim() || C['bar-ghost'];
  const font = C['font-body'] || 'system-ui, sans-serif';
  const voiced = frames.filter((f) => f.m != null);
  let t0 = Infinity, t1 = -Infinity;
  for (const n of notes) {
    t0 = Math.min(t0, n.t0);
    t1 = Math.max(t1, n.t1);
  }
  if (voiced.length) {
    t0 = Math.min(t0, voiced[0].t);
    t1 = Math.max(t1, voiced[voiced.length - 1].t);
  }
  if (!isFinite(t0)) {
    t0 = 0;
    t1 = 1;
  }
  t0 = Math.max(0, t0 - 0.25);
  t1 += 0.25;
  // Pitch: the notes' span, or the middle of the line when there are no notes (one wild
  // reading shouldn't squash the picture).
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) {
    lo = Math.min(lo, n.p);
    hi = Math.max(hi, n.p);
  }
  if (!isFinite(lo)) {
    const ms = voiced.map((f) => f.m).sort((a, b) => a - b);
    lo = ms.length ? ms[Math.floor(ms.length * 0.05)] : 57;
    hi = ms.length ? ms[Math.floor(ms.length * 0.95)] : 64;
  }
  if (hi - lo < 7) {
    const pad = (7 - (hi - lo)) / 2;
    lo -= pad;
    hi += pad;
  }
  lo -= 1;
  hi += 1;

  const W0 = Math.max(40, width || canvas.parentElement.clientWidth);
  // Fit the screen when that is nearly roomy enough, rather than scroll for the last few pixels.
  const W = W0 / (t1 - t0) >= SONG_PPS * 0.75 ? W0 : Math.min(SONG_MAX_W, (t1 - t0) * SONG_PPS);
  canvas.style.width = `${Math.round(W)}px`;
  const H = Math.max(60, canvas.getBoundingClientRect().height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = C['lane-bg'];
  g.fillRect(0, 0, W, H);
  const padX = 8, top = 10, bot = H - 10;
  const X = (t) => padX + ((t - t0) / (t1 - t0)) * (W - padX * 2);
  const Y = (m) => bot - ((m - lo) / (hi - lo)) * (bot - top);
  const rh = (bot - top) / (hi - lo);

  // Rows: the key's scale notes (home a little stronger), or the white keys when the key isn't sure.
  const sure = !!(key && key.enough);
  const tonic = sure ? pc(key.tonic) : 0;
  const scale = sure && key.mode === 'minor' ? MINOR : MAJOR;
  for (let m = Math.ceil(lo); m <= Math.floor(hi); m++) {
    const deg = pc(m - tonic);
    if (!scale.includes(deg)) continue;
    const strong = sure && deg === 0;
    const yy = Math.round(Y(m)) + 0.5;
    g.strokeStyle = strong ? C['lane-row-strong'] : C['lane-row'];
    g.lineWidth = strong ? 1.5 : 1;
    g.beginPath();
    g.moveTo(0, yy);
    g.lineTo(W, yy);
    g.stroke();
  }

  // The pitch line, faint
  g.strokeStyle = C.trace;
  g.globalAlpha = 0.3;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  let prev = null;
  for (const f of voiced) {
    const px = X(f.t), py = Y(Math.max(lo + 0.2, Math.min(hi - 0.2, f.m)));
    if (prev && f.t - prev.t < 0.1) g.lineTo(px, py);
    else g.moveTo(px, py);
    prev = f;
  }
  g.stroke();
  g.globalAlpha = 1;

  // The blocks, each named when its name fits inside it
  // Taller than a row, so a name fits (neighbours a semitone apart never sound at the same
  // time), but no taller than the tune's usual note is wide, so short notes stay round.
  const widths = notes.map((n) => X(n.t1) - X(n.t0) - 2.5).sort((a, b) => a - b);
  const usual = widths.length ? widths[widths.length >> 1] : Infinity;
  const bh = Math.max(14, Math.min(28, rh * 1.45, usual + 2));
  const flats = sure && prefersFlats(tonic, key.mode === 'minor');
  g.font = `800 12px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const xs = [];
  notes.forEach((n, i) => {
    const x0 = X(n.t0) + 1;
    const w = Math.max(6, X(n.t1) - 1.5 - x0);
    const yy = Y(n.p);
    const fam = sure ? family(n.p, tonic) : null;
    roundRect(g, x0, yy - bh / 2, w, bh, Math.min(bh / 2, 8));
    g.fillStyle = fam ? C[fam] : plain;
    g.fill();
    if (i === lit) {
      roundRect(g, x0 - 2.5, yy - bh / 2 - 2.5, w + 5, bh + 5, Math.min(bh / 2 + 2.5, 10));
      g.strokeStyle = C.fg;
      g.lineWidth = 2.5;
      g.stroke();
    }
    const text = label(n.p, { tonic: sure ? tonic : null, flats, names: sure ? names : 'letters', octave: false });
    if (g.measureText(text).width + 6 <= w) {
      g.fillStyle = fam ? C['on-' + fam] : C.fg;
      g.fillText(text, x0 + w / 2, yy + 0.5);
    }
    xs.push([x0, x0 + w]);
  });
  return xs;
}
