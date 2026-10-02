// MusicXML reader, for sheet music a grown-up has bought (.musicxml, .xml or zipped .mxl).
//
// readMusicXML(text) reads a partwise or timewise score into plain measures and notes
// (positions in quarter notes, sounding pitches as MIDI numbers, transposing instruments
// already moved to concert pitch via <transpose>).
//
// musicxmlMelody(score) picks the singing line and lays it out in time:
// - the part, staff and voice with the most lyrics (near-ties go to a Voice or Soprano part
//   over an Alto, Tenor or backing part, then to the higher line). A voice is one staff's: a
//   piano's left hand is never mixed into a tune in its right hand, even when a file numbers
//   both voice 1, and a file with no <voice> numbers takes each <backup> as a new voice;
// - chords in that voice keep their top note; grace and cue notes (<cue/>, small "cue" size
//   notes, and invisible ones) are skipped (a syllable on a grace note moves to the next
//   note); ties join;
// - repeats and first/second endings are played out, and each pass sings the next verse
//   (pass 1 sings lyric number 1, pass 2 lyric number 2...). D.C., D.S., To Coda and Fine are
//   followed, and the pass after a D.C. or D.S. sings the next verse too. Verses stacked under
//   bars that are played only once (a score with no repeats, or verses before a repeated
//   chorus) are sung through once per verse. A bar with no words for the current verse (often
//   a chorus written once) sings the first verse's words, and so does a pickup into such a
//   bar; a pickup at the end of a repeat sings the next verse's words.
// - <harmony> chord symbols are kept as chords.
// The result is the same "line" shape js/import.js makes from MIDI files.

import { parseXML, kids, kid, txt, num, decodeXmlBytes } from './xml.js';
import { listZip, readZipEntry } from './unzip.js';
import { cleanText } from './text.js';

export class MusicXmlError extends Error {}

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const UNIT_Q = { maxima: 32, long: 16, breve: 8, whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625 };
const MAX_EXPANDED_MEASURES = 3000;
const MAX_VERSES = 16;
const MAX_NOTES = 12000; // far more than any song: a score with more is cut short
const MAX_PARTS = 100;
const MAX_CHOICES = 64;

// Harmony kinds -> the chord qualities the app plays ('', 'm', '7', 'm7', 'maj7').
const KIND = {
  major: '', augmented: '', 'suspended-second': '', 'suspended-fourth': '', power: '', 'major-sixth': '', pedal: '',
  Neapolitan: '', Italian: '7', French: '7', German: '7', Tristan: '7', other: '',
  minor: 'm', diminished: 'm', 'minor-sixth': 'm', 'major-minor': 'm', 'diminished-seventh': 'm',
  dominant: '7', 'dominant-seventh': '7', 'dominant-ninth': '7', 'dominant-11th': '7', 'dominant-13th': '7', 'augmented-seventh': '7',
  'major-seventh': 'maj7', 'major-ninth': 'maj7', 'major-11th': 'maj7', 'major-13th': 'maj7', 'augmented-ninth': '7',
  'minor-seventh': 'm7', 'minor-ninth': 'm7', 'minor-11th': 'm7', 'minor-13th': 'm7', 'half-diminished': 'm7',
};

const r6 = (x) => Math.round(x * 1e6) / 1e6;
const mod12 = (x) => ((x % 12) + 12) % 12;

function creditTitle(root) {
  for (const c of kids(root, 'credit')) {
    if (kids(c, 'credit-type').some((t) => t.text.trim() === 'title')) {
      const w = kid(c, 'credit-words');
      if (w && w.text.trim()) return w.text.trim();
    }
  }
  return '';
}

export function readMusicXML(text) {
  const doc = parseXML(text);
  const root = doc.children.find((e) => e.name === 'score-partwise' || e.name === 'score-timewise');
  if (!root) throw new MusicXmlError('This file is not MusicXML sheet music.');
  const warnings = [];
  const info = new Map();
  for (const sp of kids(kid(root, 'part-list'), 'score-part')) {
    info.set(sp.attrs.id || '', { name: cleanText(txt(sp, 'part-name'), 60), instrument: cleanText(txt(kid(sp, 'score-instrument'), 'instrument-name'), 60) });
  }
  let partEls;
  if (root.name === 'score-partwise') {
    partEls = kids(root, 'part').map((p) => ({ id: p.attrs.id || '', measures: kids(p, 'measure') }));
  } else {
    // Timewise: measures hold parts. Regroup into parts holding measures.
    const map = new Map();
    for (const m of kids(root, 'measure')) {
      for (const p of kids(m, 'part')) {
        const id = p.attrs.id || '';
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ name: 'measure', attrs: m.attrs, children: p.children, text: '' });
      }
    }
    partEls = [...map].map(([id, measures]) => ({ id, measures }));
  }
  if (!partEls.length) throw new MusicXmlError('This score has no parts.');
  if (partEls.length > MAX_PARTS) {
    warnings.push(`This score has ${partEls.length} parts; only the first ${MAX_PARTS} were read.`);
    partEls.length = MAX_PARTS;
  }
  const parts = partEls.map((p) => {
    const i = info.get(p.id) || {};
    return { id: p.id, name: i.name || '', instrument: i.instrument || '', measures: readPart(p.measures) };
  });
  const title = txt(kid(root, 'work'), 'work-title') || txt(root, 'movement-title') || creditTitle(root);
  return { title, parts, warnings };
}

// One <lyric>. Two <text>s are one syllable (written in two styles) unless an <elision>
// comes between them: then they are two syllables sung on one note, joined with "‿". An
// extender line needs nothing: notes with no syllable after one are held anyway.
function readLyric(el) {
  let text = '';
  let elision = false;
  let syllabic = 'single';
  for (const c of el.children) {
    if (c.name === 'syllabic') syllabic = c.text.trim() || 'single';
    else if (c.name === 'elision') elision = true;
    else if (c.name === 'text') {
      const t = c.text.trim();
      if (t) text += (elision && text ? '‿' : '') + t;
      elision = false;
    }
  }
  return text ? { number: el.attrs.number || el.attrs.name || '1', text, syllabic } : null;
}

function readPart(measureEls) {
  let divisions = 1;
  let transpose = 0;
  let time = { num: 4, den: 4 };
  let key = { fifths: 0, mode: 'major', set: false };
  let q = 0;
  const measures = [];
  const graceLyrics = new Map(); // voice -> syllables typed onto a grace note, for the next note
  for (const mel of measureEls) {
    const M = {
      number: cleanText(String(mel.attrs.number || ''), 12) || String(measures.length + 1),
      implicit: mel.attrs.implicit === 'yes',
      q,
      len: 0,
      timeChange: false,
      keyChange: false,
      tempos: [],
      harmonies: [],
      notes: [],
      forward: false,
      backward: false,
      times: null,
      endingStart: null,
      endingStop: false,
      doubleBar: false,
      newSystem: mel.attrs['new-system'] === 'yes',
      marks: [],
      // Jumps: segno and coda mark where a D.S. or To Coda lands (with an id, or ''); tocoda,
      // dalsegno, dacapo and fine act at the end of the bar.
      segno: null,
      coda: null,
      tocoda: null,
      dalsegno: null,
      dacapo: false,
      fine: false,
    };
    let pos = 0;
    let maxPos = 0;
    let lastStart = 0;
    let layer = 1; // with no <voice> numbers, each <backup> starts another voice
    // <sound>: a tempo, and the jumps as they are played. Returns whether it had a jump.
    const readSound = (snd, at) => {
      if (!snd) return false;
      const a = snd.attrs;
      const t = Number(a.tempo);
      if (Number.isFinite(t) && t > 0) M.tempos.push({ at, bpm: t });
      for (const k of ['segno', 'coda', 'tocoda', 'dalsegno']) if (a[k] != null) M[k] = a[k];
      if (a.dacapo === 'yes') M.dacapo = true;
      if (a.fine != null) M.fine = true;
      return ['segno', 'coda', 'tocoda', 'dalsegno', 'dacapo', 'fine'].some((k) => a[k] != null);
    };
    // Files without <sound> jumps: read the signs and the words ("D.S. al Coda", "To Coda").
    const readSigns = (segno, coda, words) => {
      const w = words.trim();
      if (segno && M.segno == null) M.segno = '';
      if (/\bto\s+coda\b/i.test(w)) {
        if (M.tocoda == null) M.tocoda = '';
      } else if (coda && M.coda == null) M.coda = '';
      if (/(^|\s)d\.\s?s\.|\bdal\s+segno\b/i.test(w)) {
        if (M.dalsegno == null) M.dalsegno = '';
      } else if (/(^|\s)d\.\s?c\.|\bda\s+capo\b/i.test(w)) M.dacapo = true;
      if (/^fine\.?$/i.test(w)) M.fine = true;
    };
    for (const el of mel.children) {
      switch (el.name) {
        case 'attributes': {
          const d = num(el, 'divisions');
          if (d > 0) divisions = d;
          const k = kid(el, 'key');
          if (k && kid(k, 'fifths')) {
            key = { fifths: Math.max(-7, Math.min(7, Math.round(num(k, 'fifths', 0)))), mode: txt(k, 'mode') || 'major', set: true };
            M.keyChange = true;
          }
          const t = kid(el, 'time');
          if (t && kid(t, 'beats')) {
            const beats = txt(t, 'beats').split('+').reduce((a, x) => a + Number(x), 0);
            const bt = num(t, 'beat-type');
            if (beats > 0 && beats < 64 && bt > 0 && bt <= 64) {
              time = { num: beats, den: bt };
              M.timeChange = true;
            }
          }
          const tr = kid(el, 'transpose');
          if (tr) transpose = Math.round(num(tr, 'chromatic', 0) + 12 * num(tr, 'octave-change', 0));
          break;
        }
        case 'note': {
          const voice = cleanText(txt(el, 'voice'), 12) || String(layer);
          const staff = cleanText(txt(el, 'staff'), 4) || '1';
          if (kid(el, 'grace')) {
            const ls = kids(el, 'lyric').map(readLyric).filter(Boolean);
            if (ls.length) graceLyrics.set(voice, [...(graceLyrics.get(voice) || []), ...ls]);
            break;
          }
          const dur = Math.max(0, num(el, 'duration', 0)) / divisions;
          const chord = !!kid(el, 'chord');
          const start = chord ? lastStart : pos;
          if (!chord) {
            lastStart = pos;
            pos = r6(pos + dur);
            if (pos > maxPos) maxPos = pos;
          }
          // Cue notes (another part's line, printed small) and invisible notes take time but
          // aren't sung.
          const typeEl = kid(el, 'type');
          const size = typeEl ? typeEl.attrs.size : '';
          if (kid(el, 'cue') || size === 'cue' || size === 'grace-cue' || el.attrs['print-object'] === 'no') break;
          const pitch = kid(el, 'pitch');
          let m = null;
          if (pitch && !kid(el, 'rest')) {
            const step = STEP[txt(pitch, 'step').toUpperCase()];
            const oct = num(pitch, 'octave');
            if (step != null && oct != null) m = (oct + 1) * 12 + step + Math.round(num(pitch, 'alter', 0)) + transpose;
            if (m != null && (m < 0 || m > 127)) m = null;
          }
          const nots = kids(el, 'notations');
          const tieTypes = [...kids(el, 'tie'), ...nots.flatMap((n) => kids(n, 'tied'))].map((t) => t.attrs.type);
          const lyrics = kids(el, 'lyric').map(readLyric).filter(Boolean);
          if (m != null && !chord && graceLyrics.has(voice)) {
            for (const l of graceLyrics.get(voice)) if (!lyrics.some((x) => x.number === l.number && x.text)) lyrics.push(l);
            graceLyrics.delete(voice);
          }
          M.notes.push({
            at: start,
            dur,
            m,
            chord,
            voice,
            staff,
            tieStart: tieTypes.includes('start'),
            tieStop: tieTypes.includes('stop'),
            lyrics,
            fermata: nots.some((n) => !!kid(n, 'fermata')),
            breath: nots.some((n) => kids(n, 'articulations').some((a) => !!(kid(a, 'breath-mark') || kid(a, 'caesura')))),
          });
          break;
        }
        case 'backup':
          pos = Math.max(0, r6(pos - num(el, 'duration', 0) / divisions));
          layer++;
          break;
        case 'forward':
          pos = r6(pos + num(el, 'duration', 0) / divisions);
          if (pos > maxPos) maxPos = pos;
          break;
        case 'direction': {
          const at = pos + num(el, 'offset', 0) / divisions;
          let metro = null;
          let metroRaw = null; // the number written, and its beat in quarter notes
          let segno = false;
          let coda = false;
          let words = '';
          for (const dt of kids(el, 'direction-type')) {
            const met = kid(dt, 'metronome');
            if (met) {
              const unit = UNIT_Q[txt(met, 'beat-unit')];
              const dots = kids(met, 'beat-unit-dot').length;
              const pm = num(met, 'per-minute');
              if (unit && pm > 0) {
                metro = pm * unit * (2 - 0.5 ** dots);
                metroRaw = pm;
              }
            }
            for (const r of kids(dt, 'rehearsal')) if (r.text.trim()) M.marks.push(r.text.trim());
            if (kid(dt, 'segno')) segno = true;
            if (kid(dt, 'coda')) coda = true;
            for (const w of kids(dt, 'words')) words += ' ' + w.text;
          }
          const before = M.tempos.length;
          if (!readSound(kid(el, 'sound'), at)) readSigns(segno, coda, words);
          if (metro && M.tempos.length === before) M.tempos.push({ at, bpm: metro });
          else if (metro && M.tempos.length > before) {
            // <sound tempo> is in quarter notes a minute and is preferred. But some programs
            // write the marking's own number there: "dotted quarter = 56" with tempo="56", or
            // "eighth = 168" with tempo="168". Then the marking on the page is the tempo.
            const t = M.tempos[M.tempos.length - 1];
            if (Math.abs(t.bpm - metroRaw) < 0.01 * metroRaw && Math.abs(metro - metroRaw) > 0.04 * metroRaw) t.bpm = metro;
          }
          break;
        }
        case 'sound':
          readSound(el, pos);
          break;
        case 'harmony': {
          const root = kid(el, 'root');
          if (!root) break;
          const step = STEP[txt(root, 'root-step').toUpperCase()];
          if (step == null) break;
          const kindEl = kid(el, 'kind');
          const kind = kindEl ? kindEl.text.trim() : 'major';
          M.harmonies.push({
            at: Math.max(0, pos + num(el, 'offset', 0) / divisions),
            pc: mod12(step + Math.round(num(root, 'root-alter', 0)) + transpose),
            quality: KIND[kind] != null ? KIND[kind] : '',
            none: kind === 'none',
          });
          break;
        }
        case 'barline': {
          const rep = kid(el, 'repeat');
          if (rep && rep.attrs.direction === 'forward') M.forward = true;
          if (rep && rep.attrs.direction === 'backward') {
            M.backward = true;
            const t = Number(rep.attrs.times);
            if (Number.isInteger(t) && t >= 1 && t <= 16) M.times = t;
          }
          const end = kid(el, 'ending');
          if (end) {
            const nums = String(end.attrs.number || '')
              .split(/[\s,]+/)
              .map(Number)
              .filter((x) => Number.isInteger(x) && x > 0 && x < 32);
            if (end.attrs.type === 'start') M.endingStart = nums.length ? nums : [1];
            else if (end.attrs.type === 'stop' || end.attrs.type === 'discontinue') M.endingStop = true;
          }
          const style = txt(el, 'bar-style');
          if (/^(light-light|light-heavy|heavy-light|heavy-heavy)$/.test(style) && el.attrs.location !== 'left') M.doubleBar = true;
          readSigns(!!kid(el, 'segno'), !!kid(el, 'coda'), '');
          break;
        }
        case 'print':
          if (el.attrs['new-system'] === 'yes' || el.attrs['new-page'] === 'yes') M.newSystem = true;
          break;
      }
    }
    M.len = r6(maxPos > 0 ? maxPos : (time.num * 4) / time.den);
    M.time = time;
    M.key = key;
    M.transpose = transpose;
    measures.push(M);
    q = r6(q + M.len);
  }
  // Carry each ending's numbers across all of its measures, and mark the last ending of each
  // group (the one played after a D.C. or D.S.).
  let cur = null;
  for (const M of measures) {
    if (M.endingStart) cur = M.endingStart;
    M.ending = cur;
    if (M.endingStop) cur = null;
  }
  for (let a = 0; a < measures.length; a++) {
    if (!measures[a].ending) continue;
    let b = a;
    while (b + 1 < measures.length && measures[b + 1].ending) b++;
    let top = 0;
    for (let k = a; k <= b; k++) for (const x of measures[k].ending) top = Math.max(top, x);
    for (let k = a; k <= b; k++) measures[k].lastEnding = measures[k].ending.includes(top);
    a = b;
  }
  // Two coda signs and no "To Coda": the first one is where to leave for the second.
  const codas = measures.filter((M) => M.coda != null);
  if (codas.length >= 2 && !measures.some((M) => M.tocoda != null)) {
    codas[0].tocoda = codas[0].coda;
    codas[0].coda = null;
  }
  return measures;
}

// Play out repeats, endings and jumps: [{ mi, pass, jump, back }] in performance order. jump:
// the bar starts a new section (after a repeat or a jump); back: it was reached by going back.
// A D.C. or D.S. is taken once. After it, repeats are played once with their last ending (the
// usual convention), To Coda leaves for the coda, Fine ends the song, and the passes count on
// from the ones the jumped-over bars had, so the next verse is sung.
function expandRepeats(measures, versesIn, warn) {
  const out = [];
  const goneBack = new Map(); // backward repeat bar -> times gone back from it
  const jumpsTaken = new Set();
  let start = 0;
  let pass = 1;
  let base = 0;
  let afterJump = false;
  let jump = false;
  let back = false;
  let i = 0;
  // The bar with a segno or coda mark: the one with this id, else the first.
  const find = (kind, id, ok) => {
    let first = -1;
    for (let k = 0; k < measures.length; k++) {
      if (measures[k][kind] == null || !ok(k)) continue;
      if (id && measures[k][kind] === id) return k;
      if (first < 0) first = k;
    }
    return first;
  };
  while (i < measures.length && out.length < MAX_EXPANDED_MEASURES) {
    const M = measures[i];
    if (M.forward && start !== i && !back) {
      start = i;
      pass = 1;
    }
    if (M.ending && !(afterJump ? M.lastEnding : M.ending.includes(pass))) {
      i++;
      continue;
    }
    out.push({ mi: i, pass: base + pass, jump, back });
    jump = back = false;
    if (afterJump && M.fine) break;
    if (M.backward && !afterJump) {
      // How many times: the barline's times=, else the highest ending number, else as many
      // verses as the repeated stretch has (at least 2).
      let times = M.times;
      if (!times) {
        let maxEnding = 0;
        for (let k = start; k < measures.length && (k <= i || measures[k].ending); k++) {
          if (measures[k].ending) maxEnding = Math.max(maxEnding, ...measures[k].ending);
        }
        times = maxEnding >= 2 ? maxEnding : Math.max(2, Math.min(8, versesIn(start, i)));
      }
      const done = goneBack.get(i) || 0;
      if (done < times - 1) {
        goneBack.set(i, done + 1);
        pass++;
        i = start;
        jump = back = true;
        continue;
      }
      start = i + 1;
      pass = 1;
    } else if (M.endingStop && M.ending) {
      // The last ending finished: what follows is outside the repeat.
      const next = measures[i + 1];
      if (!next || !next.ending) {
        start = i + 1;
        pass = 1;
      }
    }
    if (afterJump && M.tocoda != null) {
      const coda = find('coda', M.tocoda, (k) => k > i);
      if (coda > i) {
        i = coda;
        jump = true;
        continue;
      }
      warn('A “To Coda” sign has no coda after it, so it was not followed.');
    }
    if (!afterJump && (M.dacapo || M.dalsegno != null) && !jumpsTaken.has(i)) {
      jumpsTaken.add(i);
      const target = M.dacapo ? 0 : find('segno', M.dalsegno, (k) => k <= i);
      if (target >= 0) {
        for (const e of out) if (e.mi >= target && e.mi <= i) base = Math.max(base, e.pass);
        afterJump = true;
        start = target;
        pass = 1;
        i = target;
        jump = back = true;
        continue;
      }
      warn('A D.S. sign has no segno to go back to, so it was not followed.');
    }
    i++;
  }
  return out;
}

const numericOrder = (a, b) => {
  const x = parseFloat(a);
  const y = parseFloat(b);
  if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return x - y;
  return 0;
};

function toSyl(ly, text = ly.text) {
  text = text.trim();
  if (!text) return null;
  let hyph = false;
  if (text.length > 1 && /[-‐]$/.test(text)) {
    text = text.slice(0, -1).trimEnd();
    hyph = true;
  }
  const joinNext = ly.syllabic === 'begin' || ly.syllabic === 'middle' ? 'join' : hyph ? 'hyphen' : null;
  return { text, joinNext };
}

const VOCAL_PART = /(voice|vocal|vox|melod|lead|sing|sopran|canto|voz|stimme|gesang|chant)/i;
const HARMONY_PART = /(alto|tenor|bass|bariton|backing|harmony|\bbvs?\b|b\.v\.)/i;
// A piano (or guitar...) part with the words on it: the tune is in its top line, and its notes
// with no words are often accompaniment, not a melisma.
const INSTRUMENT_PART = /(piano|keyboard|keys|organ|guitar|harp|accordion|synth|pno|klavier)/i;

// Where the tune could come from: every part and voice with notes, best first. The most
// lyrics wins, but a part or voice with nearly as many (a duet, or an alto line with one
// extra echo) ties with it. A tie goes to a Voice, Vocal, Lead or Soprano part over an Alto,
// Tenor, Bass or backing part, then to the higher line, then to the first in the score.
function rankChoices(score) {
  const choices = [];
  score.parts.forEach((p, pi) => {
    const per = new Map();
    for (const M of p.measures) {
      for (const n of M.notes) {
        const k = `${n.staff}\n${n.voice}`;
        if (!per.has(k)) per.set(k, { staff: n.staff, voice: n.voice, notes: 0, lyrics: 0, pitches: [] });
        const v = per.get(k);
        if (n.m != null && !n.chord) {
          v.notes++;
          v.pitches.push(n.m);
        }
        if (n.m != null && n.lyrics.some((l) => l.text)) v.lyrics++;
      }
    }
    const name = p.name || `Part ${pi + 1}`;
    const names = `${p.name} ${p.instrument}`;
    const sung = (VOCAL_PART.test(names) ? 1 : 0) - (HARMONY_PART.test(names) ? 1 : 0);
    const staves = new Set([...per.values()].filter((v) => v.notes).map((v) => v.staff));
    for (const v of per.values()) {
      if (!v.notes) continue;
      const { staff, voice } = v;
      v.pitches.sort((a, b) => a - b);
      const label = per.size > 1 ? `${name}, ${staves.size > 1 ? `staff ${staff}, ` : ''}voice ${voice}` : name;
      const id = staff === '1' ? `p${pi + 1}v${voice}` : `p${pi + 1}s${staff}v${voice}`;
      choices.push({ id, part: pi, staff, voice, label, notes: v.notes, lyrics: v.lyrics, sung, median: v.pitches[v.pitches.length >> 1] });
    }
  });
  const most = choices.reduce((x, c) => Math.max(x, c.lyrics), 0);
  const tied = (c) => (most > 0 && c.lyrics >= 0.85 * most ? 1 : 0);
  choices.sort((a, b) => tied(b) - tied(a) || (tied(a) ? b.sung - a.sung || b.median - a.median : b.lyrics - a.lyrics) || a.part - b.part || numericOrder(a.staff, b.staff) || numericOrder(a.voice, b.voice) || b.notes - a.notes);
  return choices.slice(0, MAX_CHOICES);
}

// A voice's notes in one bar as chords: the top note sounds, and the syllable can be on any
// note of the chord.
function chordGroups(vn) {
  const out = [];
  for (let k = 0; k < vn.length; k++) {
    const group = [vn[k]];
    while (k + 1 < vn.length && vn[k + 1].chord) group.push(vn[++k]);
    const pitched = group.filter((x) => x.m != null);
    if (!pitched.length) continue;
    const top = pitched.reduce((a, b) => (b.m > a.m ? b : a));
    out.push({ at: group[0].at, dur: top.dur || group[0].dur, m: top.m, tieStart: top.tieStart, tieStop: top.tieStop, breath: group.some((g) => g.breath), fermata: group.some((g) => g.fermata), staff: group[0].staff, notes: group });
  }
  return out;
}

// The lyric of a chord group in one verse, or null.
function lyricIn(g, verse) {
  for (const x of g.notes) {
    const l = x.lyrics.find((y) => y.number === verse && y.text);
    if (l) return l;
  }
  return null;
}

// The singing line of a score, laid out in time. opts.melody: a choice id ("p2v1": part 2,
// voice 1) to take the tune from somewhere other than the best guess.
export function musicxmlMelody(score, opts = {}) {
  const warnings = [...score.warnings];
  const warn = (w) => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  const choices = rankChoices(score);
  if (!choices.length) throw new MusicXmlError('This score has no notes.');
  let chosen = choices[0];
  if (opts.melody) chosen = choices.find((c) => c.id === opts.melody) || chosen;
  const part = score.parts[chosen.part];
  const voice = chosen.voice;
  const staff = chosen.staff;
  const mine = (n) => n.voice === voice && n.staff === staff;
  const measures = part.measures;
  if (score.parts.length > 1 || choices.length > 1) warnings.push(`The tune is from ${chosen.label}.`);

  // Verses: lyric numbers in this voice, and which measures have words for each. A verse
  // number typed into a verse's first syllable ("1. The") isn't sung.
  const all = new Set();
  const firstText = new Map(); // first lyric of each verse -> its text without the number
  const measVerses = measures.map((M) => {
    const s = new Set();
    for (const n of M.notes) {
      if (!mine(n) || n.m == null) continue;
      for (const l of n.lyrics) {
        if (!l.text) continue;
        s.add(l.number);
        if (all.has(l.number)) continue;
        all.add(l.number);
        const t = l.text.replace(/^\d{1,2}\.\s*/, '');
        if (t && t !== l.text) firstText.set(l, t);
      }
    }
    return s;
  });
  const verses = [...all].sort(numericOrder);
  if (verses.length > MAX_VERSES) {
    warnings.push(`Only the first ${MAX_VERSES} verses were used.`);
    verses.length = MAX_VERSES;
  }
  const versesIn = (a, b) => {
    const s = new Set();
    for (let k = a; k <= b; k++) for (const v of measVerses[k]) s.add(v);
    return s.size;
  };

  let seq = expandRepeats(measures, versesIn, warn);
  const jumps = measures.some((M) => M.dacapo || M.dalsegno != null);
  // Bars played more than once, and endings, are part of a repeat: their pass says which verse
  // they sing. When other bars have more verses than the repeats make room for (verses stacked
  // under bars that are played once), the whole song is sung through once per verse.
  const plays = new Map();
  for (const e of seq) plays.set(e.mi, (plays.get(e.mi) || 0) + 1);
  const inRepeat = (mi) => plays.get(mi) > 1 || !!measures[mi].ending;
  const passes = seq.reduce((x, e) => Math.max(x, e.pass), 1);
  let rounds = 1;
  if (!jumps && verses.length > passes) {
    const rank = new Map(verses.map((v, k) => [v, k + 1]));
    for (const mi of plays.keys()) if (!inRepeat(mi)) for (const v of measVerses[mi]) rounds = Math.max(rounds, rank.get(v) || 0);
  }
  if (rounds > 1) {
    const once = seq;
    seq = [];
    for (let r = 1; r <= rounds; r++) once.forEach((e, j) => seq.push({ ...e, round: r, jump: e.jump || (j === 0 && r > 1), back: e.back || (j === 0 && r > 1) }));
    seq.length = Math.min(seq.length, MAX_EXPANDED_MEASURES);
    warnings.push(`Sung through ${rounds} times, once for each verse.`);
  }
  if (seq.length >= MAX_EXPANDED_MEASURES) warnings.push('The repeats go on too long; the song was cut short.');

  // The verse a bar sings, and whether it has no words for it (a chorus written once).
  const verseOf = (e) => verses[(inRepeat(e.mi) ? e.pass : e.pass + (e.round || 1) - 1) - 1];
  const fallsBack = (e) => !!e && verses.length > 0 && !measVerses[e.mi].has(verseOf(e));

  // Tempo marks and chord symbols are often written on another part (the top staff, or the
  // piano in a piano-vocal score): use them when the singing part has none.
  const tempoBars = new Array(measures.length).fill(null);
  for (const p of [part, ...score.parts.filter((x) => x !== part)]) {
    const n = Math.min(p.measures.length, measures.length);
    for (let mi = 0; mi < n; mi++) if (!tempoBars[mi] && p.measures[mi].tempos.length) tempoBars[mi] = p.measures[mi].tempos;
  }
  const hasChords = (p) => p.measures.some((M) => M.harmonies.length);
  const chordPart = hasChords(part) ? part : score.parts.find(hasChords) || part;

  const notes = [];
  const chords = [];
  const tempos = [];
  const keys = [];
  const outMeasures = [];
  const used = new Set();
  let q = 0;
  let afterDouble = false;
  let ledIn = false; // the bar before ended with a pickup into this section
  for (let si = 0; si < seq.length && notes.length <= MAX_NOTES; si++) {
    const e = seq[si];
    const M = measures[e.mi];
    const sect = (e.jump || afterDouble || M.marks.length > 0) && !ledIn;
    outMeasures.push({ q, len: M.len, num: M.time.num, den: M.time.den, label: M.number });
    afterDouble = M.doubleBar;
    if (M.key.set) {
      const pc = mod12(7 * M.key.fifths + M.transpose);
      const last = keys[keys.length - 1];
      if (!last || last.pc !== pc) keys.push({ q, pc, minor: /minor|aeolian/i.test(M.key.mode) });
    }
    for (const t of tempoBars[e.mi] || []) tempos.push({ q: q + t.at, bpm: t.bpm });
    const hm = chordPart.measures[e.mi];
    if (hm) for (const h of hm.harmonies) chords.push({ q: r6(q + h.at), root: h.pc, quality: h.quality, none: h.none });

    const groups = chordGroups(M.notes.filter(mine));
    const sung = verses.length ? lyricsFor(M, groups, e, seq[si - 1], seq[si + 1]) : groups.map(() => ({ ly: null }));
    let first = true;
    let pickup = false;
    groups.forEach((g, gi) => {
      // Usually one note. A verse with an extra syllable here can sing another voice's notes.
      const s = sung[gi];
      const sing = s.instead ? s.instead.map((x) => ({ ...x, ly: lyricIn(x, verseOf(e)) })) : [{ ...g, ly: s.ly }];
      for (const x of sing) {
        if (x.ly) used.add(x.ly.number);
        // A section starts at the bar after a repeat or jump, or at the pickup into it.
        const starts = s.pickup && !pickup;
        pickup = pickup || s.pickup;
        notes.push({
          q: r6(q + x.at),
          d: x.dur,
          m: x.m,
          tieStart: x.tieStart,
          tieStop: x.tieStop,
          syl: x.ly ? toSyl(x.ly, firstText.get(x.ly)) : null,
          breath: x.breath,
          fermata: x.fermata,
          para: (first && e.jump && !ledIn) || starts,
          sect: (first && sect) || starts,
          sys: first && M.newSystem,
          bar: M.number,
        });
        first = false;
      }
    });
    ledIn = pickup;
    q = r6(q + M.len);
  }
  if (used.size < verses.length) warnings.push(`This score has ${verses.length} verses, but only ${used.size} fit its repeats; the others were left out.`);
  notes.sort((a, b) => a.q - b.q);
  if (notes.length > MAX_NOTES) {
    notes.length = MAX_NOTES;
    warnings.push(`This score is very long; only its first ${MAX_NOTES} notes were read.`);
  }

  // Which words each note group of a bar sings in this pass: { ly } (null: no syllable, held),
  // with pickup: true for a pickup into the next verse, or { instead: groups } of another
  // voice that sing the verse there.
  function lyricsFor(M, groups, e, prev, next) {
    const v = verseOf(e);
    const line1 = verses[0];
    const withV = groups.map((g) => lyricIn(g, v));
    const firstV = withV.findIndex(Boolean);
    let lastV = -1;
    let lastLine1 = -1;
    groups.forEach((g, gi) => {
      if (withV[gi]) lastV = gi;
      if (lyricIn(g, line1)) lastLine1 = gi;
    });
    const own = verses.find((x) => measVerses[e.mi].has(x));
    return groups.map((g, gi) => {
      const hasWords = g.notes.some((x) => x.lyrics.some((l) => l.text));
      // The pickup into the next verse, at the end of a repeat: after the last words of verse
      // 1 (or the chorus), with words only for later verses.
      if (next && next.back && gi > lastLine1 && hasWords && !lyricIn(g, line1)) return { ly: lyricIn(g, verseOf(next)), pickup: true };
      if (fallsBack(e)) return { ly: lyricIn(g, own) };
      if (withV[gi]) return { ly: withV[gi] };
      // Words written once (a chorus) can start with a pickup in a verse bar or end in one.
      const l1 = lyricIn(g, line1);
      if (l1 && ((gi > lastV && fallsBack(next)) || (gi < firstV && fallsBack(prev)))) return { ly: l1 };
      return (hasWords && otherVoice(M, g, v)) || { ly: null };
    });
  }

  // When a verse has more syllables than the tune has notes, some files split the note in a
  // second voice of the same staff that carries only that verse's words.
  function otherVoice(M, g, v) {
    const end = g.at + g.dur;
    const span = M.notes.filter((x) => !mine(x) && x.staff === g.staff && x.m != null && !x.chord && x.at > g.at - 1e-6 && x.at < end - 1e-6).sort((a, b) => a.at - b.at);
    if (!span.length || span[0].at > g.at + 1e-6) return null;
    const theirs = span.filter((x) => x.voice === span[0].voice);
    const onlyV = theirs.every((x) => x.lyrics.every((l) => !l.text || l.number === v));
    return onlyV && theirs.some((x) => x.lyrics.some((l) => l.text && l.number === v)) ? { instead: chordGroups(theirs) } : null;
  }

  // Ties: a note tied into the next one of the same pitch becomes one longer note.
  const line = [];
  for (const n of notes) {
    const a = line[line.length - 1];
    if (a && a.tieStart && n.tieStop && a.m === n.m && Math.abs(a.q + a.d - n.q) < 1e-6) {
      a.d = r6(a.d + n.d);
      a.tieStart = n.tieStart;
      a.fermata = a.fermata || n.fermata;
      a.breath = a.breath || n.breath;
      if (!a.syl && n.syl) a.syl = n.syl;
      continue;
    }
    line.push(n);
  }

  return {
    title: score.title,
    notes: line.map(({ tieStart, tieStop, ...n }) => n),
    measures: outMeasures,
    chords: chords.length ? chords : null,
    tempos,
    keys,
    keyFromFile: keys.length > 0,
    // Sheet music for a voice: its notes are all sung unless rests cut them off (js/import.js).
    vocal: !INSTRUMENT_PART.test(`${part.name} ${part.instrument}`) || VOCAL_PART.test(`${part.name} ${part.instrument}`),
    warnings,
    choices: choices.map(({ id, label, notes: count }) => ({ id, label, notes: count, chosen: id === chosen.id })),
    info: { part: chosen.part, staff, voice, verses: verses.length },
  };
}

// A compressed .mxl: find the score through META-INF/container.xml. maxBytes caps the score's
// unzipped size.
export async function readMxl(bytes, maxBytes) {
  const entries = listZip(bytes);
  let path = null;
  const container = entries.find((e) => e.name === 'META-INF/container.xml');
  if (container) {
    const doc = parseXML(decodeXmlBytes(await readZipEntry(bytes, container, 1024 * 1024)));
    const rootfiles = [];
    const walk = (el) => {
      for (const c of el.children) {
        if (c.name === 'rootfile') rootfiles.push(c);
        else walk(c);
      }
    };
    walk(doc);
    const rf = rootfiles.find((r) => !r.attrs['media-type'] || /musicxml|xml/i.test(r.attrs['media-type'])) || rootfiles[0];
    if (rf) path = rf.attrs['full-path'] || null;
  }
  let entry = path ? entries.find((e) => e.name === path) : null;
  // No container: the first score file, but not a copy macOS adds ("__MACOSX/", "._name").
  if (!entry) entry = entries.find((e) => /\.(musicxml|xml)$/i.test(e.name) && !/^(META-INF|__MACOSX)\//.test(e.name) && !/(^|\/)\._/.test(e.name));
  if (!entry) throw new MusicXmlError('There is no score inside this .mxl file.');
  return decodeXmlBytes(await readZipEntry(bytes, entry, maxBytes));
}
