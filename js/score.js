// Scoring: how much of each note you sang in tune, plus coaching numbers.

import { letterName, prefersFlats } from './music.js';

// good and near are in cents (100 cents is one half step). blurb is the children's wording;
// the cents themselves are only shown to grown-ups (Settings, the copied report).
export const STRICTNESS = {
  relaxed: { good: 50, near: 100, label: 'Relaxed', blurb: 'Close to the note counts as in tune.' },
  standard: { good: 30, near: 60, label: 'Standard', blurb: 'Quite close to the note counts as in tune.' },
  strict: { good: 15, near: 35, label: 'Strict', blurb: 'Only right on the note counts as in tune.' },
};

// The words children see for being off the note, in the tune pill, the results and the tips:
// "a little low / high" up to a half step away, "too low / high" beyond it. Cents never reach them.
const TOO_FAR = 100;

export function offWords(cents) {
  const dir = cents < 0 ? 'low' : 'high';
  return Math.abs(cents) > TOO_FAR ? `too ${dir}` : `a little ${dir}`;
}

export function targetAt(ev, time) {
  if (ev.m2 == null) return ev.m;
  const u = Math.min(1, Math.max(0, (time - ev.t) / ev.d));
  return ev.m + (ev.m2 - ev.m) * u;
}

// The key (tonic) a note belongs to. Exercises that climb through keys tag each note;
// everything else is in the step's one key.
export function keyOf(ev, step) {
  return ev && ev.tonic != null ? ev.tonic : step.tonic;
}

// The key at a moment in a step: the note under the playhead, or the next one coming.
export function keyAt(step, time) {
  const evs = step.events || [];
  for (const ev of evs) if (ev.t + ev.d > time) return keyOf(ev, step);
  return keyOf(evs[evs.length - 1], step);
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

// frames: [{t, m}] sorted by time. A frame marked skip (the app's own sound, see fromSpeaker)
// is not a miss: the note is scored on the frames left. But a note that is mostly the speaker
// (fewer than SKIP_MIN of its pitched frames left, or fewer than 3) wasn't heard. In a heard note the
// skipped frames count as heard (they are most likely the child right on the note, or the tune
// between their syllables); otherwise as silence, so a run of only the speaker isn't heard.
// shift: seconds to move the whole run of frames earlier before scoring (see bestShift).
export const SKIP_MIN = 0.2;

export function scoreStep(step, frames, tol, shift = 0) {
  const notes = [];
  let fi = 0;
  for (const ev of step.events) {
    if (ev.role !== 'sing') continue;
    const wide = ev.m2 != null ? 2 : 1;
    const a = ev.t + graceFor(ev);
    const z = ev.t + ev.d;
    while (fi < frames.length && frames[fi].t - shift < ev.t - 0.5) fi++;
    let n = 0, cr = 0, voiced = 0, sumAbs = 0, sumSigned = 0, octaveOff = 0, onset = null, skipped = 0;
    let run = 0, longest = 0, lastT = null;
    const devs = [];
    for (let i = fi; i < frames.length; i++) {
      const f = frames[i];
      const ft = f.t - shift;
      if (ft >= z) break;
      if (ft < ev.t) continue;
      if (f.skip) {
        if (ft >= a) skipped++;
        continue;
      }
      if (f.m != null && onset == null) {
        const x = foldDiff(f.m, targetAt(ev, ft));
        if (Math.abs(x.d * 100) <= tol.near * wide) onset = ft - ev.t;
      }
      if (ft < a) continue;
      n++;
      if (f.m == null) {
        run = 0;
        lastT = null;
        continue;
      }
      voiced++;
      const x = foldDiff(f.m, targetAt(ev, ft));
      const c = x.d * 100;
      if (x.octave !== 0) octaveOff++;
      const k = creditFor(c, tol, wide);
      cr += k;
      sumAbs += Math.abs(c);
      sumSigned += c;
      devs.push(c);
      if (Math.abs(c) <= tol.near * wide) {
        if (lastT != null) run += ft - lastT;
        lastT = ft;
        longest = Math.max(longest, run);
      } else {
        run = 0;
        lastT = null;
      }
    }
    if (skipped) {
      if (voiced < Math.max(3, SKIP_MIN * (voiced + skipped))) {
        // Mostly the speaker: not heard.
        notes.push({ ev, score: 0, n: n + skipped, voiced: 0, avgAbs: null, avgSigned: null, octaveOff: 0, onset: null, steadiness: null, longest: ev.hold ? 0 : null });
        continue;
      }
      const sc = cr / n;
      n += skipped;
      voiced += skipped;
      cr = sc * n;
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

// ---------- A steady lag ----------
// However well the app guesses this device's delays, a singer can still sit a little behind (or
// ahead of) the music the whole way through: a Bluetooth speaker, a slow mic, or just how they
// follow. That isn't a pitch mistake, so before scoring, the whole step's singing may move by up
// to ALIGN_MAX to where it fits the notes best. It moves as one: single notes are never nudged.
// A move must earn at least ALIGN_GAIN of the step's notes' worth (by length) to beat staying
// put, and the smallest of equally good moves wins, so a run that already fits stays where it is.
export const ALIGN_MAX = 0.25;
export const ALIGN_STEP = 0.01;
export const ALIGN_GAIN = 0.01;

const worth = (notes) => notes.reduce((s, n) => s + n.score * n.ev.d, 0);

// Returns { shift, notes } (seconds, positive when the singing was late).
export function alignStep(step, frames, tol) {
  const base = scoreStep(step, frames, tol, 0);
  const total = base.reduce((s, n) => s + n.ev.d, 0);
  if (!total || !frames.some((f) => f.m != null)) return { shift: 0, notes: base };
  let best = { shift: 0, notes: base, w: worth(base) };
  const need = best.w + ALIGN_GAIN * total;
  const steps = Math.round(ALIGN_MAX / ALIGN_STEP);
  for (let k = 1; k <= steps; k++) {
    for (const sh of [k * ALIGN_STEP, -k * ALIGN_STEP]) {
      const notes = scoreStep(step, frames, tol, sh);
      const w = worth(notes);
      if (w >= need && w > best.w + 1e-9) best = { shift: sh, notes, w };
    }
  }
  return { shift: best.shift, notes: best.notes };
}

// ---------- The app's own sound ----------
// Without headphones the tune (and the soft piano) comes out of the speaker while the child
// sings, and the mic hears it. A speaker plays a note machine-exact: its readings sit within a
// cent or so of the note, where a child's voice wobbles. So a reading within SPEAKER_CENTS of a
// note the app is playing at that moment (in any octave) is the speaker, and is left out: not
// heard, and not a miss. A child singing that exact note loses only those few frames.
export const SPEAKER_CENTS = 3;

// ref: the app's own output read the same way at that moment (AudioEngine.readRef). A reading
// that matches it is the speaker too, even when chords under the tune move it off the note. Chords
// on their own read unsteadily (often as a low note they share, measured 0 to 20 cents apart from
// one read to the next), so a reading that is a miss anyway (miss: true, more than a semitone
// from the note to sing, or no note to sing) may sit up to REF_FAR_CENTS from the output's.
// Leaving such a reading out never gives credit; it only stops the piano counting as the child.
export const REF_FAR_CENTS = 30;
// ref: one reading or a list of them (the output around that moment).
export function sameAsRef(m, ref, miss = false) {
  if (m == null || ref == null) return false;
  const tol = miss ? REF_FAR_CENTS : SPEAKER_CENTS;
  for (const x of Array.isArray(ref) ? ref : [ref]) {
    const diff = m - x;
    if (Math.abs(diff - 12 * Math.round(diff / 12)) * 100 <= tol) return true;
  }
  return false;
}

// m: the reading (MIDI); t: when it was sung; playing: [{ a, z, s, d, m, m2 }] on the same
// clock: a..z when that note can reach the mic, s and d its own start and length (for slides).
export function fromSpeaker(m, t, playing) {
  if (m == null) return false;
  for (const p of playing) {
    if (t < p.a || t > p.z) continue;
    const target = p.m2 != null && p.d > 0 ? p.m + (p.m2 - p.m) * Math.min(1, Math.max(0, (t - p.s) / p.d)) : p.m;
    const diff = m - target;
    const off = Math.abs(diff - 12 * Math.round(diff / 12)) * 100;
    if (off <= SPEAKER_CENTS) return true;
  }
  return false;
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

// Share of the singing time (0 to 1) when the mic heard a voice, from a summarize() result.
// A run heard for less than HEARD_MIN of it doesn't count toward progress or practice days:
// most likely nobody sang, or the mic couldn't pick them up.
export const HEARD_MIN = 0.2;

export function heardShare(sum) {
  return sum && sum.total ? sum.coverage : 0;
}

export function wasHeard(sum) {
  return heardShare(sum) >= HEARD_MIN;
}

// ---------- Did the daily warm-up count? ----------
// It checks that the singer took part, not whether they were in tune:
//   1. every sung step: at least half its notes and slides had a voiced frame near them,
//   2. the voice was heard for at least HEARD_MIN of the sung time (the same rule as practice days), and
//   3. the pitch went up and down with the exercise (followed(), below).
// Steps with nothing to sing (the move cards) are never checked.
export const STEP_HEARD_MIN = 0.5;

function noteHeard(ev, frames) {
  const a = ev.t - 0.1, z = ev.t + ev.d + 0.15;
  return frames.some((f) => f.m != null && f.t >= a && f.t <= z);
}

// Being heard isn't enough: a fridge hum or a tone from a speaker is "heard" too. So the voice
// must move with the exercise. Each sung step is compared on its own, so a singer an octave
// away, or a whole step sung low, still counts. Across the steps:
//   span:  the middle 80% of the sung pitch covers at least FOLLOW_SPAN semitones;
//   r:     sung pitch and target pitch rise and fall together: their correlation in each step,
//          averaged over the steps, is at least FOLLOW_R;
//   exact: on long level notes the median miss is at least MACHINE_CENTS. A voice always
//          wobbles; the app's own guide note played into the mic sits on the target.
// The thresholds are loose on purpose. In simulated warm-ups (four control days, four ranges),
// a 4-year-old who sings a third of each interval, misses by a semitone and drifts flat still
// scored span 2.4+ and r 0.39+. A steady hum and a sung drone scored span under 1, and the guide
// note played back sat within 0.2 cents of the target, where synthetic voices sat 4+ cents off.
export const FOLLOW_SPAN = 1.2;
export const FOLLOW_R = 0.2;
export const MACHINE_CENTS = 1.5;

function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// sung: [{ step, frames }] for the steps with notes to sing.
export function followed(sung) {
  const dev = [];
  const rs = [];
  const held = []; // misses on long level notes, in cents
  for (const { step, frames } of sung) {
    const pairs = []; // [target, sung] for each heard frame in a sung note
    let fi = 0;
    for (const ev of step.events) {
      if (ev.role !== 'sing') continue;
      while (fi < frames.length && frames[fi].t < ev.t) fi++;
      for (let i = fi; i < frames.length && frames[i].t < ev.t + ev.d; i++) {
        const f = frames[i];
        if (f.m == null) continue;
        const x = targetAt(ev, f.t);
        pairs.push([x, f.m]);
        if (ev.d >= 0.8 && ev.m2 == null) held.push(Math.abs(foldDiff(f.m, x).d) * 100);
      }
    }
    if (pairs.length < 10) continue;
    const ay = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
    for (const [, y] of pairs) dev.push(y - ay);
    // Octave slips (9 or more semitones off the step's line) don't count against the singer.
    const off = median(pairs.map(([x, y]) => y - x));
    const kept = pairs.filter(([x, y]) => Math.abs(y - x - off) < 9);
    const mx = kept.reduce((s, p) => s + p[0], 0) / kept.length;
    const my = kept.reduce((s, p) => s + p[1], 0) / kept.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of kept) {
      sxx += (x - mx) ** 2;
      syy += (y - my) ** 2;
      sxy += (x - mx) * (y - my);
    }
    // Weighted by how far the step's target moves: a slide or a scale says more than two holds.
    if (sxx > 0) rs.push({ r: syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0, w: sxx / kept.length });
  }
  dev.sort((p, q) => p - q);
  const at = (q) => dev[Math.round(q * (dev.length - 1))];
  const span = dev.length ? at(0.9) - at(0.1) : 0;
  const w = rs.reduce((s, k) => s + k.w, 0);
  const r = w > 0 ? rs.reduce((s, k) => s + k.r * k.w, 0) / w : 0;
  const exact = held.length ? median(held) : null;
  return { span, r, exact, ok: span >= FOLLOW_SPAN && r >= FOLLOW_R && !(exact != null && exact < MACHINE_CENTS) };
}

// results: [{ step, notes, frames }] from the player.
// heard: rules 1 and 2; follow: rule 3; ok: all three.
export function warmupCheck(results) {
  const sung = results.filter((r) => r.step.kind !== 'move' && r.step.events.some((e) => e.role === 'sing'));
  const perStep = sung.map((r) => {
    const evs = r.step.events.filter((e) => e.role === 'sing');
    const heard = evs.filter((e) => noteHeard(e, r.frames)).length;
    return { title: r.step.title, heard, total: evs.length, share: heard / evs.length };
  });
  const sum = summarize(sung);
  const missed = perStep.filter((p) => p.share < STEP_HEARD_MIN).map((p) => p.title);
  const heard = sung.length > 0 && missed.length === 0 && wasHeard(sum);
  const follow = followed(sung);
  return { ok: heard && follow.ok, heard, follow, coverage: heardShare(sum), perStep, missed };
}

// ---------- Was that the speaker? ----------
// With Headphones on, the guide melody plays while the child sings. If no headphones are worn it
// comes out of the speaker, the mic hears it and it would be scored as singing. A voice always
// wobbles; the guide note sits on the target (the warm-up's MACHINE_CENTS test). So on long level
// notes, if the median miss of the sung frames is under MACHINE_CENTS, the run was the speaker.
// Synthetic voices with a few cents of jitter and a gentle vibrato sit 4 or more cents off;
// the guide played back sits within a fraction of a cent.
export const BLEED_MIN_FRAMES = 15;

// results: [{ step, frames }]. Returns { bleed, exact, frames }.
export function speakerBleed(results) {
  const held = [];
  for (const { step, frames } of results) {
    let fi = 0;
    for (const ev of step.events) {
      if (ev.role !== 'sing') continue;
      while (fi < frames.length && frames[fi].t < ev.t) fi++;
      if (ev.d < 0.8 || ev.m2 != null) continue;
      const a = ev.t + graceFor(ev);
      for (let i = fi; i < frames.length && frames[i].t < ev.t + ev.d; i++) {
        const f = frames[i];
        if (f.m == null || f.t < a) continue;
        held.push(Math.abs(foldDiff(f.m, ev.m).d) * 100);
      }
    }
  }
  if (held.length < BLEED_MIN_FRAMES) return { bleed: false, exact: null, frames: held.length };
  const exact = median(held);
  return { bleed: exact < MACHINE_CENTS, exact, frames: held.length };
}

export function verdict(score) {
  if (score >= 0.85) return 'Spot on';
  if (score >= 0.65) return 'Nicely done';
  if (score >= 0.4) return 'Getting there';
  return 'Keep practising';
}

// How far (in cents) the run's average must lean before the tip calls it low or high.
const LEAN_MIN = 20;

export function tip(sum) {
  if (sum.total === 0) return '';
  if (sum.coverage < 0.45) return 'The mic lost you on a lot of notes. Sing a little louder, or hold the phone closer.';
  if (sum.octaveShare > 0.5) return 'You sang the same notes as the guide, but most of them higher or lower. That still counts. Redo the range test if the notes felt uncomfortable.';
  if (sum.tendency < -LEAN_MIN) return `You often sang ${offWords(sum.tendency)}. Think of each note as slightly higher, and keep the air moving to the end of the note.`;
  if (sum.tendency > LEAN_MIN) return `You often sang ${offWords(sum.tendency)}. Relax your jaw and let each note settle instead of pushing.`;
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

// Plain-text summary to paste into Claude for coaching. rangeFrom says where the range came
// from ('test', or a typical range: 'child', 'high', 'low'). family: a family song (imported
// from a bought file): its words are left out and each part is marked "(family song)"; the
// caller marks the title.
const RANGE_SOURCE = {
  test: 'from the range test',
  child: 'a typical child range, not tested',
  high: 'a typical higher-voice range, not tested',
  low: 'a typical lower-voice range, not tested',
};

// speed: for songs, how fast it was sung (text), else null.
export function reportText({ title, sum, range, rangeFrom, strictKey, date, family = false, speed = null }) {
  const tol = STRICTNESS[strictKey];
  const lines = [];
  lines.push('Note by Note practice results');
  lines.push(`Lesson: ${title}`);
  lines.push(`Date: ${date}`);
  if (range) {
    const src = RANGE_SOURCE[rangeFrom];
    lines.push(`My comfortable range: ${letterName(range.low)} to ${letterName(range.high)}${src ? ` (${src})` : ''}`);
  }
  lines.push(`Strictness: ${tol.label} (in tune within ${tol.good} cents)`);
  if (speed) lines.push(`Speed: ${speed}`);
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
    const part = family ? `${n.step.title} (family song)` : n.step.title;
    if (part !== current) {
      flush();
      current = part;
    }
    const flats = prefersFlats(keyOf(n.ev, n.step), !!n.step.minor);
    const name = n.ev.m2 != null ? `slide ${letterName(n.ev.m, { flats })}→${letterName(n.ev.m2, { flats })}` : letterName(n.ev.m, { flats });
    const word = n.ev.text && !family ? ` “${n.ev.text}”` : '';
    row.push(n.voiced ? `${name}${word} ${cents(n.avgSigned)} (${Math.round(n.score * 100)}%)` : `${name}${word} not heard`);
  }
  flush();
  lines.push('');
  lines.push('Based on this, what are the one or two most useful things for me to practise next?');
  return lines.join('\n');
}
