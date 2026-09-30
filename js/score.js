// Scoring: how much of each note you sang in tune, plus coaching numbers.

import { letterName, prefersFlats } from './music.js';

export const STRICTNESS = {
  relaxed: { good: 50, near: 100, label: 'Relaxed', blurb: 'In tune within 50 cents' },
  standard: { good: 30, near: 60, label: 'Standard', blurb: 'In tune within 30 cents' },
  strict: { good: 15, near: 35, label: 'Strict', blurb: 'In tune within 15 cents' },
};

export function targetAt(ev, time) {
  if (ev.m2 == null) return ev.m;
  const u = Math.min(1, Math.max(0, (time - ev.t) / ev.d));
  return ev.m + (ev.m2 - ev.m) * u;
}

// Distance to the target in semitones. Singing the right note in another octave
// counts (octave says which way); any other miss is measured as sung.
export function foldDiff(m, target) {
  const diff = m - target;
  const k = Math.round(diff / 12);
  const d = diff - 12 * k;
  if (k !== 0 && Math.abs(d) <= 2) return { d, octave: k };
  return { d: diff, octave: 0 };
}

export function creditFor(cents, tol, wide = 1) {
  const a = Math.abs(cents);
  if (a <= tol.good * wide) return 1;
  if (a <= tol.near * wide) return 0.5;
  return 0;
}

export function graceFor(ev) {
  return Math.min(0.2, ev.d * 0.3);
}

// frames: [{t, m}] sorted by time
export function scoreStep(step, frames, tol) {
  const notes = [];
  let fi = 0;
  for (const ev of step.events) {
    if (ev.role !== 'sing') continue;
    const wide = ev.m2 != null ? 2 : 1;
    const a = ev.t + graceFor(ev);
    const z = ev.t + ev.d;
    while (fi < frames.length && frames[fi].t < ev.t - 0.5) fi++;
    let n = 0, cr = 0, voiced = 0, sumAbs = 0, sumSigned = 0, octaveOff = 0, onset = null;
    let run = 0, longest = 0, lastT = null;
    const devs = [];
    for (let i = fi; i < frames.length; i++) {
      const f = frames[i];
      if (f.t >= z) break;
      if (f.t < ev.t) continue;
      if (f.m != null && onset == null) {
        const x = foldDiff(f.m, targetAt(ev, f.t));
        if (Math.abs(x.d * 100) <= tol.near * wide) onset = f.t - ev.t;
      }
      if (f.t < a) continue;
      n++;
      if (f.m == null) {
        run = 0;
        lastT = null;
        continue;
      }
      voiced++;
      const x = foldDiff(f.m, targetAt(ev, f.t));
      const c = x.d * 100;
      if (x.octave !== 0) octaveOff++;
      const k = creditFor(c, tol, wide);
      cr += k;
      sumAbs += Math.abs(c);
      sumSigned += c;
      devs.push(c);
      if (Math.abs(c) <= tol.near * wide) {
        if (lastT != null) run += f.t - lastT;
        lastT = f.t;
        longest = Math.max(longest, run);
      } else {
        run = 0;
        lastT = null;
      }
    }
    let steadiness = null;
    if (ev.hold && devs.length > 10) {
      const settled = devs.slice(Math.floor(devs.length * 0.1));
      const sorted = settled.slice().sort((p, q) => p - q);
      const med = sorted[Math.floor(sorted.length / 2)];
      steadiness = settled.filter((c) => Math.abs(c - med) <= 25).length / settled.length;
    }
    notes.push({
      ev,
      score: n ? cr / n : 0,
      n,
      voiced,
      avgAbs: voiced ? sumAbs / voiced : null,
      avgSigned: voiced ? sumSigned / voiced : null,
      octaveOff,
      onset,
      steadiness,
      longest: ev.hold ? longest + (voiced ? 1 / 60 : 0) : null,
    });
  }
  return notes;
}

export function summarize(steps) {
  // steps: [{ step, notes }]
  const all = steps.flatMap((s) => s.notes.map((n) => ({ ...n, step: s.step })));
  let wsum = 0, dsum = 0, voiced = 0, frames = 0, signed = 0, absSum = 0, octaveOff = 0;
  const onsets = [];
  const holds = [];
  for (const n of all) {
    wsum += n.score * n.ev.d;
    dsum += n.ev.d;
    voiced += n.voiced;
    frames += n.n;
    octaveOff += n.octaveOff;
    if (n.voiced) {
      signed += n.avgSigned * n.voiced;
      absSum += n.avgAbs * n.voiced;
    }
    if (n.ev.d >= 0.45 && n.onset != null && n.ev.m2 == null) onsets.push(n.onset);
    if (n.steadiness != null) holds.push(n);
  }
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return {
    score: dsum ? wsum / dsum : 0,
    landed: all.filter((n) => n.score >= 0.5).length,
    total: all.length,
    coverage: frames ? voiced / frames : 0,
    tendency: voiced ? signed / voiced : 0,
    avgAbs: voiced ? absSum / voiced : null,
    octaveShare: voiced ? octaveOff / voiced : 0,
    onset: avg(onsets),
    steadiness: avg(holds.map((h) => h.steadiness)),
    longest: holds.length ? Math.max(...holds.map((h) => h.longest)) : null,
    all,
  };
}

export function verdict(score) {
  if (score >= 0.85) return 'Spot on';
  if (score >= 0.65) return 'Nicely done';
  if (score >= 0.4) return 'Getting there';
  return 'Keep practising';
}

export function tip(sum) {
  if (sum.total === 0) return '';
  if (sum.coverage < 0.45) return 'The mic lost you on a lot of notes. Sing a little louder, or hold the phone closer.';
  if (sum.octaveShare > 0.5) return 'You sang most notes an octave away from the guide. That still counts. Redo the range test if the notes felt uncomfortable.';
  if (sum.tendency < -20) return `On average you sat about ${Math.round(-sum.tendency)} cents flat. Think of each note as slightly higher, and keep the air moving to the end of the note.`;
  if (sum.tendency > 20) return `On average you sat about ${Math.round(sum.tendency)} cents sharp. Relax your jaw and let each note settle instead of pushing.`;
  if (sum.onset != null && sum.onset > 0.35) return 'You found the notes, but late. Breathe in during the tick so you’re ready to start on time.';
  if (sum.steadiness != null && sum.steadiness < 0.7) return 'Your long notes wobbled. Breathe low into your belly and let the air out slowly and evenly.';
  if (sum.score >= 0.85) return 'That was accurate. Switch to Strict in settings for a tougher check.';
  if (sum.score >= 0.6) return 'Good work. Run it again and aim to land each note sooner.';
  return 'Listen closely to each note, then hum it quietly before you sing it out.';
}

function cents(c) {
  const r = Math.round(c);
  return r > 0 ? `+${r}` : `${r}`;
}

// Plain-text summary to paste into Claude for coaching.
export function reportText({ title, sum, range, voice, strictKey, date }) {
  const tol = STRICTNESS[strictKey];
  const lines = [];
  lines.push('Note by Note practice results');
  lines.push(`Lesson: ${title}`);
  lines.push(`Date: ${date}`);
  if (range) lines.push(`My comfortable range: ${letterName(range.low)} to ${letterName(range.high)} (${voice})`);
  lines.push(`Strictness: ${tol.label} (${tol.blurb.toLowerCase()})`);
  lines.push(`Score: ${Math.round(sum.score * 100)}% · ${sum.landed} of ${sum.total} notes landed`);
  if (sum.avgAbs != null) lines.push(`Average distance from the note: ${Math.round(sum.avgAbs)} cents · overall lean: ${Math.abs(Math.round(sum.tendency))} cents ${sum.tendency < 0 ? 'flat' : 'sharp'}`);
  lines.push(`The mic heard me for ${Math.round(sum.coverage * 100)}% of the singing time`);
  if (sum.onset != null) lines.push(`Average time to reach each note: ${(sum.onset * 1000).toFixed(0)} ms`);
  if (sum.steadiness != null) lines.push(`Long notes: ${Math.round(sum.steadiness * 100)}% steady, longest in-tune hold ${sum.longest.toFixed(1)} s`);
  lines.push('');
  lines.push('Note by note (target: average offset in cents, share in tune):');
  let current = null;
  let row = [];
  const flush = () => {
    if (row.length) lines.push(`${current}: ${row.join(', ')}`);
    row = [];
  };
  for (const n of sum.all) {
    const part = n.step.title;
    if (part !== current) {
      flush();
      current = part;
    }
    const flats = prefersFlats(n.step.tonic, !!n.step.minor);
    const name = n.ev.m2 != null ? `slide ${letterName(n.ev.m, { flats })}→${letterName(n.ev.m2, { flats })}` : letterName(n.ev.m, { flats });
    const word = n.ev.text ? ` “${n.ev.text}”` : '';
    row.push(n.voiced ? `${name}${word} ${cents(n.avgSigned)} (${Math.round(n.score * 100)}%)` : `${name}${word} not heard`);
  }
  flush();
  lines.push('');
  lines.push('Based on this, what are the one or two most useful things for me to practise next?');
  return lines.join('\n');
}
