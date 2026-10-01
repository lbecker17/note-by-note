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
        g.font = `${strong ? 700 : 600} 11px ${font}`;
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
        let ink = ev.role === 'listen' ? C['lane-label'] : C.fg;
        if (ev.hits && ev.hits.length) {
          const la = ev.t + 6 / this.pps, lb = ev.t + 22 / this.pps;
          if (ev.hits.some((h) => h.k === 1 && h.a <= lb && h.b >= la)) ink = C['on-' + fam];
        }
        g.save();
        g.beginPath();
        g.rect(x0 + 5, top, x1 - x0 - 8, barH);
        g.clip();
        g.fillStyle = ink;
        g.font = `700 ${Math.round(Math.min(13, barH * 0.56))}px ${font}`;
        g.textAlign = 'left';
        g.fillText(text, x0 + 7, yy + 0.5);
        g.restore();
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

    if (live && live.m != null && !live.hide) {
      const dm = live.dm != null ? live.dm : live.m;
      const px = this.playX, py = this.y(clampM(dm));
      const color = live.k === 1 ? C[live.fam] : live.k === 0.5 ? C.near : live.k === 0 ? C.off : C.trace;
      g.fillStyle = color;
      g.beginPath();
      g.arc(px, py, 7.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = C['lane-bg'];
      g.lineWidth = 2.5;
      g.stroke();
      g.fillStyle = C.muted;
      g.font = `700 11px ${font}`;
      g.textAlign = 'left';
      if (live.octave) g.fillText(live.octave < 0 ? '8vb' : '8va', px + 12, py - 12);
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
