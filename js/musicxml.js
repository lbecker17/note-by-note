// MusicXML reader, for sheet music a grown-up has bought (.musicxml, .xml or zipped .mxl).
//
// readMusicXML(text) reads a partwise or timewise score into plain measures and notes
// (positions in quarter notes, sounding pitches as MIDI numbers, transposing instruments
// already moved to concert pitch via <transpose>).
//
// musicxmlMelody(score) picks the singing line and lays it out in time:
// - the part with the most lyrics, and in it the voice with the most lyrics;
// - chords in that voice keep their top note; grace and cue notes are skipped; ties join;
// - repeats and first/second endings are played out, and each pass sings the next verse
//   (pass 1 sings lyric number 1, pass 2 lyric number 2...). A score with several verses
//   and no repeats is sung through once per verse. A measure that has no words for the
//   current verse (often a chorus written once) sings the first verse's words.
//   D.C., D.S., Coda and Fine are NOT followed: the music is read once, with its repeats.
// - <harmony> chord symbols are kept as chords.
// The result is the same "line" shape js/import.js makes from MIDI files.

import { parseXML, kids, kid, txt, num, decodeXmlBytes } from './xml.js';
import { listZip, readZipEntry } from './unzip.js';

export class MusicXmlError extends Error {}

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const UNIT_Q = { maxima: 32, long: 16, breve: 8, whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625 };
const MAX_EXPANDED_MEASURES = 3000;
const MAX_VERSES = 16;

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
    info.set(sp.attrs.id || '', { name: txt(sp, 'part-name'), instrument: txt(kid(sp, 'score-instrument'), 'instrument-name') });
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
  const parts = partEls.map((p) => {
    const i = info.get(p.id) || {};
    return { id: p.id, name: i.name || '', instrument: i.instrument || '', measures: readPart(p.measures) };
  });
  const title = txt(kid(root, 'work'), 'work-title') || txt(root, 'movement-title') || creditTitle(root);
  return { title, parts, warnings };
}

function readLyric(el) {
  const texts = [];
  let syllabic = 'single';
  let extend = null;
  for (const c of el.children) {
    if (c.name === 'syllabic') syllabic = c.text.trim() || 'single';
    else if (c.name === 'text') texts.push(c.text.trim());
    else if (c.name === 'extend') extend = c.attrs.type || 'start';
  }
  const text = texts.filter(Boolean).join('‿');
  if (!text) return extend ? { number: el.attrs.number || el.attrs.name || '1', text: '', syllabic, extend } : null;
  return { number: el.attrs.number || el.attrs.name || '1', text, syllabic, extend };
}

function readPart(measureEls) {
  let divisions = 1;
  let transpose = 0;
  let time = { num: 4, den: 4 };
  let key = { fifths: 0, mode: 'major', set: false };
  let q = 0;
  const measures = [];
  for (const mel of measureEls) {
    const M = {
      number: String(mel.attrs.number || measures.length + 1).slice(0, 12),
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
      jumps: [],
    };
    let pos = 0;
    let maxPos = 0;
    let lastStart = 0;
    const tempoAt = (snd, at) => {
      if (!snd) return;
      const t = Number(snd.attrs.tempo);
      if (Number.isFinite(t) && t > 0) M.tempos.push({ at, bpm: t, sound: true });
      for (const a of ['dacapo', 'dalsegno', 'tocoda', 'fine', 'segno', 'coda']) if (snd.attrs[a] != null && snd.attrs[a] !== 'no') M.jumps.push(a);
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
          if (kid(el, 'grace')) break;
          const dur = Math.max(0, num(el, 'duration', 0)) / divisions;
          const chord = !!kid(el, 'chord');
          const start = chord ? lastStart : pos;
          if (!chord) {
            lastStart = pos;
            pos = r6(pos + dur);
            if (pos > maxPos) maxPos = pos;
          }
          if (kid(el, 'cue')) break;
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
          M.notes.push({
            at: start,
            dur,
            m,
            chord,
            voice: txt(el, 'voice') || '1',
            staff: txt(el, 'staff') || '1',
            tieStart: tieTypes.includes('start'),
            tieStop: tieTypes.includes('stop'),
            lyrics: kids(el, 'lyric').map(readLyric).filter(Boolean),
            fermata: nots.some((n) => !!kid(n, 'fermata')),
            breath: nots.some((n) => kids(n, 'articulations').some((a) => !!(kid(a, 'breath-mark') || kid(a, 'caesura')))),
          });
          break;
        }
        case 'backup':
          pos = Math.max(0, r6(pos - num(el, 'duration', 0) / divisions));
          break;
        case 'forward':
          pos = r6(pos + num(el, 'duration', 0) / divisions);
          if (pos > maxPos) maxPos = pos;
          break;
        case 'direction': {
          const at = pos + num(el, 'offset', 0) / divisions;
          let metro = null;
          for (const dt of kids(el, 'direction-type')) {
            const met = kid(dt, 'metronome');
            if (met) {
              const unit = UNIT_Q[txt(met, 'beat-unit')];
              const dots = kids(met, 'beat-unit-dot').length;
              const pm = num(met, 'per-minute');
              if (unit && pm > 0) metro = pm * unit * (2 - 0.5 ** dots);
            }
            for (const r of kids(dt, 'rehearsal')) if (r.text.trim()) M.marks.push(r.text.trim());
            if (kid(dt, 'segno')) M.jumps.push('segno');
            if (kid(dt, 'coda')) M.jumps.push('coda');
            for (const w of kids(dt, 'words')) {
              if (/(^|\s)d\.\s?[cs]\.|\b(da capo|dal segno|to coda|fine)\b/i.test(w.text)) M.jumps.push('words');
            }
          }
          const snd = kid(el, 'sound');
          const before = M.tempos.length;
          tempoAt(snd, at);
          if (metro && M.tempos.length === before) M.tempos.push({ at, bpm: metro });
          break;
        }
        case 'sound':
          tempoAt(el, pos);
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
          if (kid(el, 'segno') || kid(el, 'coda')) M.jumps.push('segno');
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
  // Carry each ending's numbers across all of its measures.
  let cur = null;
  for (const M of measures) {
    if (M.endingStart) cur = M.endingStart;
    M.ending = cur;
    if (M.endingStop) cur = null;
  }
  return measures;
}

// Play out repeats and endings: [{ mi, pass, jump }] in performance order.
function expandRepeats(measures, versesIn) {
  const out = [];
  const jumps = new Map();
  let start = 0;
  let pass = 1;
  let i = 0;
  let jumped = false;
  while (i < measures.length && out.length < MAX_EXPANDED_MEASURES) {
    const M = measures[i];
    if (M.forward && start !== i && !jumped) {
      start = i;
      pass = 1;
    }
    if (M.ending && !M.ending.includes(pass)) {
      i++;
      continue;
    }
    out.push({ mi: i, pass, jump: jumped });
    jumped = false;
    if (M.backward) {
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
      const done = jumps.get(i) || 0;
      if (done < times - 1) {
        jumps.set(i, done + 1);
        pass++;
        i = start;
        jumped = true;
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

function toSyl(ly) {
  let text = ly.text.trim();
  if (!text) return null;
  let hyph = false;
  if (text.length > 1 && /[-‐]$/.test(text)) {
    text = text.slice(0, -1).trimEnd();
    hyph = true;
  }
  const joinNext = ly.syllabic === 'begin' || ly.syllabic === 'middle' ? 'join' : hyph ? 'hyphen' : null;
  return { text, joinNext, ext: !!ly.extend && ly.extend !== 'stop' };
}

// The singing line of a score, laid out in time. opts.melody: a choice id ("p2v1": part 2,
// voice 1) to take the tune from somewhere other than the best guess.
export function musicxmlMelody(score, opts = {}) {
  const warnings = [...score.warnings];
  // Lyrics and notes per part and voice.
  const choices = [];
  score.parts.forEach((p, pi) => {
    const per = new Map();
    for (const M of p.measures) {
      for (const n of M.notes) {
        if (!per.has(n.voice)) per.set(n.voice, { notes: 0, lyrics: 0 });
        const v = per.get(n.voice);
        if (n.m != null && !n.chord) v.notes++;
        if (n.m != null && n.lyrics.some((l) => l.text)) v.lyrics++;
      }
    }
    for (const [voice, v] of per) {
      if (!v.notes) continue;
      const name = p.name || `Part ${pi + 1}`;
      choices.push({ id: `p${pi + 1}v${voice}`, part: pi, voice, label: per.size > 1 ? `${name}, voice ${voice}` : name, notes: v.notes, lyrics: v.lyrics });
    }
  });
  if (!choices.length) throw new MusicXmlError('This score has no notes.');
  choices.sort((a, b) => b.lyrics - a.lyrics || a.part - b.part || numericOrder(a.voice, b.voice) || b.notes - a.notes);
  let chosen = choices[0];
  if (opts.melody) chosen = choices.find((c) => c.id === opts.melody) || chosen;
  choices.forEach((c) => (c.chosen = c === chosen));
  const part = score.parts[chosen.part];
  const voice = chosen.voice;
  const measures = part.measures;
  if (score.parts.length > 1 || choices.length > 1) warnings.push(`The tune is from ${chosen.label}.`);

  // Verses: lyric numbers in this voice, and which measures have words for each.
  const verses = [];
  const measVerses = measures.map((M) => {
    const s = new Set();
    for (const n of M.notes) {
      if (n.voice !== voice || n.m == null) continue;
      for (const l of n.lyrics) {
        if (!l.text) continue;
        s.add(l.number);
        if (!verses.includes(l.number)) verses.push(l.number);
      }
    }
    return s;
  });
  verses.sort(numericOrder);
  if (verses.length > MAX_VERSES) {
    warnings.push(`Only the first ${MAX_VERSES} verses were used.`);
    verses.length = MAX_VERSES;
  }
  const versesIn = (a, b) => {
    const s = new Set();
    for (let k = a; k <= b; k++) for (const v of measVerses[k]) s.add(v);
    return s.size;
  };

  let seq = expandRepeats(measures, versesIn);
  const passes = Math.max(...seq.map((s) => s.pass));
  const hasRepeats = measures.some((M) => M.backward || M.ending);
  if (verses.length > passes) {
    if (!hasRepeats) {
      const once = seq;
      seq = [];
      for (let k = 1; k <= verses.length; k++) once.forEach((s, j) => seq.push({ mi: s.mi, pass: k, jump: j === 0 && k > 1 }));
      seq.length = Math.min(seq.length, MAX_EXPANDED_MEASURES);
      warnings.push(`Sung through ${verses.length} times, once for each verse.`);
    } else {
      warnings.push(`This score has ${verses.length} verses but its repeats only make room for ${passes}; the others were left out.`);
    }
  }
  if (seq.length >= MAX_EXPANDED_MEASURES) warnings.push('The repeats go on too long; the song was cut short.');
  if (measures.some((M) => M.jumps.length)) warnings.push('D.C., D.S., Coda and Fine signs were not followed; the music is read once, with its repeats.');

  // Tempo marks and chord symbols are often written on another part (the top staff, or the
  // piano in a piano-vocal score): use them when the singing part has none.
  const tempoParts = [part, ...score.parts.filter((p) => p !== part)];
  const tempoAt = (mi) => {
    for (const p of tempoParts) if (p.measures[mi] && p.measures[mi].tempos.length) return p.measures[mi].tempos;
    return [];
  };
  const countHarmonies = (p) => p.measures.reduce((s, M) => s + M.harmonies.length, 0);
  let chordPart = part;
  for (const p of score.parts) if (!countHarmonies(chordPart) && countHarmonies(p)) chordPart = p;

  const notes = [];
  const chords = [];
  const tempos = [];
  const keys = [];
  const outMeasures = [];
  let q = 0;
  let afterDouble = false;
  for (const { mi, pass, jump } of seq) {
    const M = measures[mi];
    const verse = verses.length ? (verses[pass - 1] != null ? verses[pass - 1] : verses[0]) : null;
    const here = measVerses[mi];
    // A measure with no words for this verse (a chorus written once) sings the first verse it has.
    const useVerse = verse == null ? null : here.has(verse) ? verse : verses.find((v) => here.has(v)) || null;
    const sect = jump || afterDouble || M.marks.length > 0;
    outMeasures.push({ q, len: M.len, num: M.time.num, den: M.time.den, label: M.number });
    afterDouble = M.doubleBar;
    if (M.key.set) {
      const pc = mod12(7 * M.key.fifths + M.transpose);
      const last = keys[keys.length - 1];
      if (!last || last.pc !== pc) keys.push({ q, pc, minor: /minor|aeolian/i.test(M.key.mode) });
    }
    for (const t of tempoAt(mi)) tempos.push({ q: q + t.at, bpm: t.bpm });
    const hm = chordPart.measures[mi];
    if (hm) for (const h of hm.harmonies) chords.push({ q: r6(q + h.at), root: h.pc, quality: h.quality, none: h.none });

    const vn = M.notes.filter((n) => n.voice === voice);
    let first = true;
    for (let k = 0; k < vn.length; k++) {
      const group = [vn[k]];
      while (k + 1 < vn.length && vn[k + 1].chord) group.push(vn[++k]);
      const pitched = group.filter((x) => x.m != null);
      if (!pitched.length) continue;
      const top = pitched.reduce((a, b) => (b.m > a.m ? b : a));
      let ly = null;
      if (useVerse != null) {
        for (const g of group) {
          ly = g.lyrics.find((l) => l.number === useVerse && l.text);
          if (ly) break;
        }
      }
      notes.push({
        q: r6(q + group[0].at),
        d: top.dur || group[0].dur,
        m: top.m,
        tieStart: top.tieStart,
        tieStop: top.tieStop,
        syl: ly ? toSyl(ly) : null,
        breath: group.some((g) => g.breath),
        fermata: group.some((g) => g.fermata),
        para: first && jump,
        sect: first && sect,
        sys: first && M.newSystem,
        bar: M.number,
      });
      first = false;
    }
    q = r6(q + M.len);
  }
  notes.sort((a, b) => a.q - b.q);

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
    hardLines: false,
    warnings,
    choices: choices.map(({ id, label, notes: count, chosen: c }) => ({ id, label, notes: count, chosen: !!c })),
    info: { part: chosen.part, voice, verses: verses.length },
  };
}

// A compressed .mxl: find the score through META-INF/container.xml.
export async function readMxl(bytes) {
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
  if (!entry) entry = entries.find((e) => /\.(musicxml|xml)$/i.test(e.name) && !e.name.startsWith('META-INF/'));
  if (!entry) throw new MusicXmlError('There is no score inside this .mxl file.');
  return decodeXmlBytes(await readZipEntry(bytes, entry));
}
