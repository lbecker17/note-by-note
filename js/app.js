import { AudioEngine } from './audio.js';
import { LESSONS, UNITS, ORDER, WARMUP } from './lessons.js';
import { SONGS, buildSong, songData, difficulty, songGlyph } from './songs.js';
import { Lane, drawOverview } from './lane.js';
import { letterName, label, family, prefersFlats, voiceType, spanWords, pc } from './music.js';
import { STRICTNESS, scoreStep, summarize, verdict, tip, reportText, targetAt, foldDiff, creditFor } from './score.js';
import { store, streak, week } from './store.js';

const audio = new AudioEngine();
const root = document.getElementById('app');
const LEAD = 2.4;
const PRESETS = { low: { low: 45, high: 62 }, high: { low: 57, high: 74 } };
const VERSION = '1.0';

let current = null;
let sheet = null;
let pendingOpen = null;
let wakeLock = null;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const setText = (el, txt) => {
  if (el && el.textContent !== txt) el.textContent = txt;
};
const S = () => store.data.settings;
const tolerance = () => STRICTNESS[S().strict] || STRICTNESS.standard;

const ICON = {
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14.1 2.6h-4.2l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.4h4.2l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  phones:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13c2 0 2-6 4-6s2 10 4 10 2-12 4-12 2 9 4 9 2-4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ---------- Small pictures ----------

function glyphSVG(gl, songOffset = 0) {
  const W = 44, H = 28;
  if (gl.type === 'hold') {
    const w = gl.long ? 36 : 26;
    return `<svg class="glyph-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect x="${(W - w) / 2}" y="11" width="${w}" height="6" rx="3" fill="var(--mi)"/></svg>`;
  }
  if (gl.type === 'glide') {
    return `<svg class="glyph-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M4 22 C 12 22, 14 5, 22 5 S 32 22, 40 22" fill="none" stroke="var(--sol)" stroke-width="3.2" stroke-linecap="round"/></svg>`;
  }
  if (gl.type === 'range') {
    return `<svg class="glyph-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M22 7v14" stroke="var(--line-strong)" stroke-width="1.6" stroke-dasharray="2 2.5"/><rect x="10" y="20" width="24" height="5" rx="2.5" fill="var(--do)"/><rect x="10" y="3" width="24" height="5" rx="2.5" fill="var(--sol)"/></svg>`;
  }
  const pts = gl.pts;
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = Math.max(hi - lo, 4);
  const n = pts.length;
  const xs = pts.map((_, i) => (n === 1 ? W / 2 : 5 + (i * (W - 10)) / (n - 1)));
  const ys = pts.map((p) => H - 5 - ((p - lo) / span) * (H - 10) - (span > hi - lo ? ((span - (hi - lo)) / span) * (H - 10) * 0.5 : 0));
  const line = gl.separate ? '' : `<polyline points="${xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')}" fill="none" stroke="var(--line-strong)" stroke-width="1.3" stroke-linejoin="round"/>`;
  const dots = pts
    .map((p, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${n > 7 ? 2.4 : 2.9}" fill="var(--${family(p + songOffset, 0)})"/>`)
    .join('');
  return `<svg class="glyph-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">${line}${dots}</svg>`;
}

const isBlack = (m) => [1, 3, 6, 8, 10].includes(pc(m));

function keyboardSVG(range, { from = 36, to = 84, compact = false } = {}) {
  const whites = [];
  for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
  const kw = 10, kh = compact ? 34 : 46, bh = kh * 0.6;
  const W = whites.length * kw;
  const inR = (m) => range && m >= range.low && m <= range.high;
  let out = `<svg class="kbd" viewBox="0 0 ${W} ${kh + (compact ? 0 : 10)}" role="img" aria-label="${range ? `Keyboard showing ${letterName(range.low)} to ${letterName(range.high)}` : 'Keyboard'}">`;
  whites.forEach((m, i) => {
    out += `<rect class="kw${inR(m) ? ' in' : ''}" x="${i * kw + 0.3}" y="0.3" width="${kw - 0.6}" height="${kh - 0.6}" rx="1.4"/>`;
    if (!compact && pc(m) === 0) out += `<text x="${i * kw + kw / 2}" y="${kh + 7.5}" text-anchor="middle">${letterName(m)}</text>`;
  });
  whites.forEach((m, i) => {
    if (m + 1 <= to && isBlack(m + 1)) {
      out += `<rect class="kb${inR(m + 1) ? ' in' : ''}" x="${(i + 1) * kw - 3.1}" y="0" width="6.2" height="${bh}" rx="1"/>`;
    }
  });
  if (range) {
    for (const m of [range.low, range.high]) {
      const wi = whites.findIndex((w) => w >= m);
      const cx = isBlack(m) ? wi * kw : wi * kw + kw / 2;
      const cy = isBlack(m) ? bh - 4 : kh - 5;
      out += `<circle class="kdot" cx="${cx}" cy="${cy}" r="2.3"/>`;
    }
  }
  return out + '</svg>';
}

// ---------- Sheets ----------

function openSheet(html, actions = {}, opts = {}) {
  closeSheet(true);
  const bd = document.createElement('div');
  bd.className = 'sheet-backdrop';
  bd.innerHTML = `<div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Dialog')}">${html}</div>`;
  document.body.appendChild(bd);
  if (opts.dismissable !== false)
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeSheet();
    });
  sheet = { el: bd, actions, onClose: opts.onClose };
  const first = bd.querySelector('.sheet button');
  if (first) first.focus({ preventScroll: true });
  return bd;
}

function closeSheet(silent = false) {
  if (!sheet) return;
  const s = sheet;
  sheet = null;
  s.el.remove();
  if (!silent && s.onClose) s.onClose();
}

function micSheet(then) {
  const blocked = audio.micState === 'denied';
  const failed = audio.micState === 'error' || audio.micState === 'unsupported';
  const html = blocked
    ? `<h2>The microphone is blocked</h2>
       <p>In Safari, tap <b>aA</b> in the address bar, then <b>Website Settings</b>, and set <b>Microphone</b> to <b>Allow</b>.</p>
       <p class="muted">Also check <b>Settings → Safari → Microphone</b> isn't set to Deny. Then tap Start again.</p>
       <button class="btn primary wide" data-act="mic-allow">Try again</button>
       <button class="btn text wide" data-act="sheet-close">Close</button>`
    : failed
      ? `<h2>The microphone didn't start</h2>
       <p>Another app may be using it, or this browser can't share it. Close other apps that use the mic, then try again.</p>
       <button class="btn primary wide" data-act="mic-allow">Try again</button>
       <button class="btn text wide" data-act="sheet-close">Close</button>`
      : `<h2>Turn on the microphone</h2>
       <p>Note by Note listens so it can show your pitch as you sing. Nothing is recorded or sent anywhere.</p>
       <p class="muted">Tip: you'll hear the notes best with the phone's volume up and Silent mode off.</p>
       <button class="btn primary wide" data-act="mic-allow">Allow microphone</button>
       <button class="btn text wide" data-act="sheet-close">Not now</button>`;
  openSheet(
    html,
    {
      'mic-allow': async (btn) => {
        audio.unlock();
        btn.disabled = true;
        btn.textContent = 'Waiting for permission…';
        try {
          await audio.startMic();
          closeSheet(true);
          if (then) then();
        } catch (e) {
          micSheet(then);
        }
      },
    },
    { label: 'Microphone' }
  );
}

function needRangeSheet() {
  openSheet(
    `<h2>First, find your range</h2>
     <p>Every lesson moves into your key, so the app needs to know where your voice sits. It takes about a minute.</p>
     <button class="btn primary wide" data-act="range">Find my range</button>
     <p class="muted center">Or start with a typical range:</p>
     <div class="preset-row">
       <button class="btn secondary" data-act="preset" data-v="low">Lower voice<small>Most men</small></button>
       <button class="btn secondary" data-act="preset" data-v="high">Higher voice<small>Most women and children</small></button>
     </div>`,
    {},
    { label: 'Find your range', onClose: () => (pendingOpen = null) }
  );
}

function settingsSheet() {
  const s = S();
  const seg = (k, opts) =>
    `<div class="seg" role="radiogroup">${opts
      .map(([v, l]) => `<button role="radio" aria-checked="${s[k] === v}" class="${s[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`)
      .join('')}</div>`;
  const range = store.data.range;
  const html = `
    <h2>Settings</h2>
    <div class="field">
      <div><b>Headphones</b><p>On: you also hear the guide note while you sing. Wired headphones work best. Bluetooth drops to call quality while the mic is on.</p></div>
      <button class="switch ${s.headphones ? 'on' : ''}" role="switch" aria-checked="${s.headphones}" aria-label="Headphones" data-act="set" data-k="headphones" data-v="${!s.headphones}"><i></i></button>
    </div>
    <div class="field col"><b>Note names</b>${seg('names', [['letters', 'C D E'], ['solfa', 'Do Re Mi']])}</div>
    <div class="field col"><b>How strict</b>${seg('strict', [['relaxed', 'Relaxed'], ['standard', 'Standard'], ['strict', 'Strict']])}<p class="muted">${STRICTNESS[s.strict].blurb}. 100 cents is one half step.</p></div>
    <div class="field">
      <div><b>Your range</b><p>${range ? `${letterName(range.low)} to ${letterName(range.high)} · ${voiceType(range)}` : 'Not set yet'}</p></div>
      <button class="btn small secondary" data-act="range">${range ? 'Retest' : 'Find it'}</button>
    </div>
    <div class="field">
      <div><b>Progress</b><p>Clears scores and your streak. Keeps your range.</p></div>
      <button class="btn small danger" data-act="reset">Reset</button>
    </div>
    <p class="about">Note by Note ${VERSION} · Nothing you sing is recorded or leaves this device.</p>
    <button class="btn primary wide" data-act="sheet-close">Done</button>`;
  let armed = false;
  openSheet(
    html,
    {
      set: (el) => {
        const k = el.dataset.k;
        const v = el.dataset.v === 'true' ? true : el.dataset.v === 'false' ? false : el.dataset.v;
        store.setSetting(k, v);
        settingsSheet();
      },
      reset: (el) => {
        if (!armed) {
          armed = true;
          el.textContent = 'Tap to confirm';
          setTimeout(() => {
            armed = false;
            if (el.isConnected) el.textContent = 'Reset';
          }, 4000);
          return;
        }
        store.reset();
        settingsSheet();
      },
    },
    { label: 'Settings', onClose: () => current && current.refresh && current.refresh() }
  );
}

// ---------- Navigation ----------

function show(ctrl, push = true) {
  closeSheet(true);
  if (current && current.destroy) current.destroy();
  current = ctrl;
  window.scrollTo(0, 0);
  if (push) history.pushState({ nbn: 1 }, '');
}

function goHome() {
  show(homeCtrl(), false);
}

function goBack() {
  if (history.state && history.state.nbn) history.back();
  else goHome();
}

window.addEventListener('popstate', () => {
  closeSheet(true);
  if (!current || current.name !== 'home') goHome();
});

function openItem(kind, id) {
  if (kind === 'free') return show(freeCtrl());
  if (kind === 'lesson' && id === 'range') return show(rangeCtrl());
  if (!store.data.range) {
    pendingOpen = { kind, id };
    return needRangeSheet();
  }
  show(playerCtrl({ kind, id }));
}

const GLOBAL = {
  settings: () => settingsSheet(),
  'sheet-close': () => closeSheet(),
  close: () => goBack(),
  open: (el) => openItem(el.dataset.kind, el.dataset.id),
  free: () => openItem('free'),
  range: () => {
    closeSheet(true);
    show(rangeCtrl(), !(current && current.name === 'range'));
  },
  preset: (el) => {
    store.setRange({ ...PRESETS[el.dataset.v] });
    closeSheet(true);
    if (pendingOpen) {
      const p = pendingOpen;
      pendingOpen = null;
      openItem(p.kind, p.id);
    } else if (current && current.refresh) current.refresh();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const fn = (sheet && sheet.actions[act]) || (current && current.actions && current.actions[act]) || GLOBAL[act];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet) closeSheet();
});

async function requestWake() {
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {
    wakeLock = null;
  }
}
function releaseWake() {
  try {
    if (wakeLock) wakeLock.release();
  } catch (e) {
    /* ignore */
  }
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && current && current.pause) current.pause();
});
// iPhones can drop audio for a moment (a notification, the mic starting up).
// Try to recover, and only stop the lesson if the sound stays down.
audio.onInterrupt = () => {
  setTimeout(() => {
    if (!audio.ctx || audio.ctx.state === 'running') return;
    audio.ctx.resume().catch(() => {});
    setTimeout(() => {
      if (audio.ctx && audio.ctx.state !== 'running' && current && current.pause) current.pause();
    }, 700);
  }, 250);
};

// Keep a lane's canvas matched to its box, e.g. after fonts load or the lyrics wrap.
function watchSize(lane, box) {
  if (!window.ResizeObserver) {
    const on = () => lane.resize();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }
  const ro = new ResizeObserver(() => lane.resize());
  ro.observe(box);
  return () => ro.disconnect();
}

// ---------- Home ----------

function homeHTML() {
  const d = store.data;
  const range = d.range;
  const prog = d.progress;
  const wk = week(d.days);
  const st = streak(d.days);
  let n = 0;

  const voice = range
    ? `<section class="card voice">
        <div class="voice-top">
          <div>
            <p class="eyebrow">Your voice</p>
            <p class="voice-range">${letterName(range.low)} <span>to</span> ${letterName(range.high)}</p>
            <p class="muted">${voiceType(range)} range · ${spanWords(range.high - range.low)}</p>
          </div>
          <button class="btn small secondary" data-act="range">Retest</button>
        </div>
        ${keyboardSVG(range, { compact: true })}
      </section>`
    : `<section class="card voice empty">
        <p class="eyebrow">Your voice</p>
        <h2>Start by finding your range</h2>
        <p class="muted">Sing a low note and a high note. Every lesson then moves into your key.</p>
        <button class="btn primary wide" data-act="range">Find my range</button>
        <div class="preset-row">
          <button class="btn secondary" data-act="preset" data-v="low">Lower voice<small>Most men</small></button>
          <button class="btn secondary" data-act="preset" data-v="high">Higher voice<small>Most women and children</small></button>
        </div>
      </section>`;

  const badge = (id) => {
    const p = prog[id];
    if (!p) return '<span class="badge new" aria-hidden="true"></span>';
    const pct = Math.round(p.best * 100);
    return `<span class="badge ${p.best >= 0.6 ? 'done' : ''}" aria-label="Best score ${pct} percent">${pct}%</span>`;
  };

  const units = UNITS.map(
    (u) => `<section class="unit">
      <h3 class="unit-title">${u.title}</h3>
      <ol class="lessons">
        ${u.lessons
          .map((id) => {
            const L = LESSONS[id];
            n++;
            const done = id === 'range' ? (range ? '<span class="badge done">Set</span>' : '<span class="badge new" aria-hidden="true"></span>') : badge(id);
            return `<li><button class="lesson" data-act="open" data-kind="lesson" data-id="${id}">
              <span class="glyph">${glyphSVG(L.glyph)}</span>
              <span class="lesson-text"><span class="lesson-title"><span class="num">${n}</span>${esc(L.title)}</span><span class="lesson-blurb">${esc(L.blurb)}</span></span>
              ${done}
            </button></li>`;
          })
          .join('')}
      </ol>
    </section>`
  ).join('');

  const songs = `<section class="unit">
      <h3 class="unit-title">Songs</h3>
      <p class="unit-note">Public domain, and each one opens in your key. Learn it line by line, then sing it through.</p>
      <ol class="lessons">
        ${SONGS.map((s) => {
          const gl = songGlyph(s);
          return `<li><button class="lesson" data-act="open" data-kind="song" data-id="${s.id}">
            <span class="glyph">${glyphSVG(gl, gl.songTonicOffset)}</span>
            <span class="lesson-text"><span class="lesson-title">${esc(s.title)}</span><span class="lesson-blurb">${difficulty(s)} · ${esc(s.credit)}</span></span>
            ${badge('song:' + s.id)}
          </button></li>`;
        }).join('')}
      </ol>
    </section>`;

  return `<main class="home">
    <header class="masthead">
      <div class="brand">
        <svg class="mark" viewBox="0 0 34 22" aria-hidden="true"><circle cx="4" cy="18" r="3.2" fill="var(--do)"/><circle cx="12.5" cy="14" r="3.2" fill="var(--re)"/><circle cx="21" cy="10" r="3.2" fill="var(--mi)"/><circle cx="29.5" cy="5" r="3.2" fill="var(--sol)"/></svg>
        <h1>Note by Note</h1>
      </div>
      <button class="icon-btn" data-act="settings" aria-label="Settings">${ICON.gear}</button>
    </header>
    ${voice}
    <section class="card today">
      <div class="today-main">
        <div>
          <p class="eyebrow">Today</p>
          <h2>${esc(WARMUP.title)}</h2>
          <p class="muted">${esc(WARMUP.blurb)}</p>
        </div>
        <button class="btn primary round" data-act="open" data-kind="warmup" data-id="warmup" aria-label="Start the daily warmup">${ICON.play}</button>
      </div>
      <div class="week">
        <div class="days">${wk
          .map((x) => `<span class="day${x.done ? ' done' : ''}${x.isToday ? ' today' : ''}"><i></i>${x.label}</span>`)
          .join('')}</div>
        <p class="streak">${st ? `${st}-day streak` : 'Practise today to start a streak'}</p>
      </div>
    </section>
    <button class="free-row" data-act="free">
      <span class="free-ico">${ICON.wave}</span>
      <span class="lesson-text"><span class="lesson-title">Free sing</span><span class="lesson-blurb">See your voice as a line. No score.</span></span>
      <span class="chev">${ICON.chev}</span>
    </button>
    ${units}
    ${songs}
    <footer class="foot">Nothing you sing is recorded or leaves this device.</footer>
  </main>`;
}

function homeCtrl() {
  root.innerHTML = homeHTML();
  document.body.dataset.screen = 'home';
  return {
    name: 'home',
    refresh() {
      const y = window.scrollY;
      root.innerHTML = homeHTML();
      window.scrollTo(0, y);
    },
  };
}

// ---------- Player (lessons, warmup, songs) ----------

function buildPlan(kind, id, mode) {
  const range = store.data.range;
  if (kind === 'warmup') return { id: 'warmup', title: WARMUP.title, steps: WARMUP.build(range) };
  if (kind === 'song') {
    const song = SONGS.find((s) => s.id === id);
    return { id: 'song:' + id, title: song.title, song, steps: buildSong(song, range, { mode, headphones: S().headphones }) };
  }
  const L = LESSONS[id];
  return { id, title: L.title, steps: L.build(range) };
}

function nextAfter(kind, id) {
  if (kind === 'lesson') {
    const i = ORDER.indexOf(id);
    const nx = ORDER[i + 1];
    return nx ? { kind: 'lesson', id: nx, title: LESSONS[nx].title } : null;
  }
  if (kind === 'song') {
    const i = SONGS.findIndex((s) => s.id === id);
    const nx = SONGS[i + 1];
    return nx ? { kind: 'song', id: nx.id, title: nx.title } : null;
  }
  return null;
}

function playerCtrl({ kind, id }) {
  let mode = kind === 'song' ? 'learn' : null;
  let plan = buildPlan(kind, id, mode);
  let stepIdx = 0;
  let state = 'ready';
  let T0 = 0;
  let frames = [];
  let ai = 0;
  let evIdx = 0;
  let uiIdx = 0;
  let live = null;
  let results = [];
  let betweenUntil = 0;
  let lastLyr = '';
  let lastLevel = -1;
  let lastSum = null;
  let tol = tolerance();

  document.body.dataset.screen = 'player';
  root.innerHTML = `<section class="player" data-state="ready">
    <header class="p-head">
      <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      <div class="p-title"><h2>${esc(plan.title)}</h2><p id="p-sub"></p></div>
      <button class="icon-btn hp${S().headphones ? ' on' : ''}" data-act="hp" aria-pressed="${S().headphones}" aria-label="Headphones">${ICON.phones}</button>
    </header>
    <p class="cue" id="cue" aria-live="polite"></p>
    <div class="lane-wrap">
      <canvas id="lane"></canvas>
      <div class="countin" id="countin" hidden></div>
      <div class="between" id="between" hidden></div>
    </div>
    <p class="lyrics" id="lyrics" ${plan.song ? '' : 'hidden'}></p>
    <div class="readout">
      <span class="note-now" id="note">–</span>
      <span class="note-info"><span id="cents">Tap Start to begin</span><span class="level"><i id="level"></i></span></span>
    </div>
    <div class="p-controls">
      ${
        plan.song
          ? `<div class="seg mode" role="radiogroup" aria-label="Mode">
              <button role="radio" data-act="mode" data-v="learn" class="on" aria-checked="true">Line by line</button>
              <button role="radio" data-act="mode" data-v="along" aria-checked="false">Sing it through</button>
            </div>`
          : ''
      }
      <button class="btn primary wide" data-act="start" id="startBtn">Start</button>
    </div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  const el = {
    player: $('.player'),
    cue: $('#cue'),
    sub: $('#p-sub'),
    note: $('#note'),
    cents: $('#cents'),
    level: $('#level'),
    lyrics: $('#lyrics'),
    countin: $('#countin'),
    between: $('#between'),
    start: $('#startBtn'),
  };
  const lane = new Lane($('#lane'));
  const step = () => plan.steps[stepIdx];
  const modelFor = (st) => ({
    events: st.events,
    tonic: st.tonic,
    minor: !!st.minor,
    flats: prefersFlats(st.tonic, !!st.minor),
    names: S().names,
  });
  lane.setModel(modelFor(step()));
  const unwatch = watchSize(lane, $('.lane-wrap'));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => lane.readColors();
  if (mq.addEventListener) mq.addEventListener('change', onTheme);

  function cueAt(st, t) {
    let text = '';
    for (const c of st.cues) {
      if (c.t <= t + 0.001) text = c.text;
      else break;
    }
    return text;
  }

  function subtitle(t) {
    const st = step();
    const parts = [];
    if (plan.steps.length > 1) parts.push(`${st.title} · ${stepIdx + 1} of ${plan.steps.length}`);
    const c = cueAt(st, Math.max(0, t));
    if (c) parts.push(c);
    if (st.vowel && !plan.song) parts.push(`on “${st.vowel}”`);
    return parts.join(' · ');
  }

  function previewTime(st) {
    const first = st.events.length ? st.events[0].t : 0;
    return first - (0.5 * (lane.w - lane.playX)) / lane.pps;
  }

  function setReady() {
    state = 'ready';
    el.player.dataset.state = 'ready';
    setText(el.cue, step().intro || '');
    setText(el.sub, subtitle(0));
    el.start.textContent = results.length ? 'Start again' : 'Start';
    el.countin.hidden = true;
    el.between.hidden = true;
    lastLyr = '';
    renderLyrics(previewTime(step()));
  }

  function clearHits() {
    for (const st of plan.steps) for (const e of st.events) delete e.hits;
  }

  function rebuild() {
    plan = buildPlan(kind, id, mode);
    stepIdx = 0;
    lane.setModel(modelFor(step()));
    setReady();
  }

  function startStep() {
    const st = step();
    lane.setModel(modelFor(st));
    frames = [];
    ai = 0;
    evIdx = 0;
    uiIdx = 0;
    live = null;
    lastLyr = '';
    audio.openBus();
    audio.tracker.reset();
    T0 = audio.now() + LEAD;
    state = 'running';
    el.player.dataset.state = 'running';
    el.start.textContent = 'Stop';
    el.between.hidden = true;
  }

  function begin() {
    tol = tolerance();
    results = [];
    stepIdx = 0;
    clearHits();
    startStep();
    requestWake();
  }

  function stop(message) {
    audio.closeBus();
    releaseWake();
    results = [];
    stepIdx = 0;
    frames = [];
    live = null;
    clearHits();
    lane.setModel(modelFor(step()));
    setReady();
    if (message) setText(el.cue, message);
  }

  function schedule(st, t, now) {
    const A = st.audio;
    while (ai < A.length && A[ai].t < t + 0.7) {
      const a = A[ai++];
      if (a.hp && !S().headphones) continue;
      let at = T0 + a.t;
      if (a.kind === 'click') {
        if (at < now - 0.03) continue;
        audio.play(a, Math.max(at, now + 0.005));
        continue;
      }
      let d = a.d;
      let m = a.m;
      if (at < now + 0.005) {
        const late = now + 0.005 - at;
        d -= late;
        if (d < 0.08) continue;
        if (a.m2 != null) m = a.m + (a.m2 - a.m) * (late / a.d);
        at = now + 0.005;
      }
      audio.play({ ...a, d, m }, at);
    }
  }

  function decorate(st, f) {
    const evs = st.events;
    while (evIdx < evs.length && evs[evIdx].t + evs[evIdx].d <= f.t) evIdx++;
    const ev = evIdx < evs.length && evs[evIdx].t <= f.t ? evs[evIdx] : null;
    const prev = evIdx > 0 ? evs[evIdx - 1] : null;
    f.hide = !!((ev && ev.role === 'listen') || (!ev && prev && prev.role === 'listen' && f.t - (prev.t + prev.d) < 0.3));
    if (f.m == null) return;
    if (ev && ev.role === 'sing') {
      const target = targetAt(ev, f.t);
      const x = foldDiff(f.m, target);
      f.dm = target + x.d;
      f.octave = x.octave;
      f.k = creditFor(x.d * 100, tol, ev.m2 != null ? 2 : 1);
      f.fam = family(ev.m, st.tonic);
      if (f.k > 0) {
        if (!ev.hits) ev.hits = [];
        const h = ev.hits[ev.hits.length - 1];
        if (h && h.k === f.k && f.t - h.b < 0.07) h.b = f.t;
        else ev.hits.push({ a: Math.max(ev.t, f.t - 1 / 60), b: f.t, k: f.k });
      }
    } else {
      f.dm = f.m;
      f.k = null;
    }
  }

  function eventsAround(st, t) {
    const evs = st.events;
    while (uiIdx < evs.length && evs[uiIdx].t + evs[uiIdx].d <= t) uiIdx++;
    const cur = uiIdx < evs.length && evs[uiIdx].t <= t ? evs[uiIdx] : null;
    const next = cur ? cur : uiIdx < evs.length ? evs[uiIdx] : null;
    return { cur, next };
  }

  function updateCue(st, t, cur, next) {
    let text;
    if (t < 0) text = 'Get ready';
    else if (cur) {
      if (cur.role === 'listen') text = cur.m2 != null ? 'Listen to the slide' : 'Listen';
      else if (cur.m2 != null) text = 'Your turn: slide with it';
      else if (cur.hold) text = `Hold it · ${Math.max(1, Math.ceil(cur.t + cur.d - t))}`;
      else if (plan.song) text = 'Your turn';
      else text = `Your turn: sing on “${st.vowel}”`;
    } else if (!next) text = 'Nicely done';
    else if (next.role === 'sing') text = 'Breathe in…';
    else text = 'Listen';
    setText(el.cue, text);
    setText(el.sub, subtitle(t));
  }

  function renderLyrics(t) {
    if (!plan.song) return;
    const st = step();
    const evs = st.events;
    let ev = null;
    for (const e of evs) {
      if (t < e.t + e.d) {
        ev = e;
        break;
      }
    }
    if (!ev) ev = evs[evs.length - 1];
    const seg = evs.filter((e) => e.phrase === ev.phrase && e.role === ev.role);
    const act = seg.find((e) => t >= e.t && t < e.t + e.d);
    const key = `${ev.phrase}:${ev.role}:${act ? act.si : -1}`;
    if (key === lastLyr) return;
    lastLyr = key;
    let html = '';
    for (const e of seg) {
      if (e.melisma) continue;
      const cls = act && e.si === act.si ? 'now' : act && e.si < act.si ? 'done' : '';
      html += `<span class="syl ${cls}">${esc(e.text)}</span>${e.join ? '' : ' '}`;
    }
    el.lyrics.innerHTML = html;
  }

  function readout(r, target) {
    let noteTxt = '–';
    let centsTxt;
    if (r && r.m != null) {
      const st = step();
      const solfa = S().names === 'solfa';
      noteTxt = label(r.m, { tonic: st.tonic, flats: prefersFlats(st.tonic, !!st.minor), names: S().names, octave: !solfa });
      if (target != null) {
        const x = foldDiff(r.m, target);
        const c = Math.round(x.d * 100);
        centsTxt = Math.abs(c) <= tol.good ? 'In tune' : `${Math.abs(c)}¢ ${c < 0 ? 'flat' : 'sharp'}`;
      } else {
        const c = Math.round((r.m - Math.round(r.m)) * 100);
        centsTxt = c === 0 ? 'Right on the note' : `${c > 0 ? '+' : '−'}${Math.abs(c)}¢ from ${label(Math.round(r.m), { tonic: st.tonic, flats: prefersFlats(st.tonic, !!st.minor), names: S().names, octave: !solfa })}`;
      }
    } else {
      centsTxt = audio.micOn ? 'Listening…' : state === 'ready' ? 'Tap Start to begin' : 'Mic is off';
    }
    setText(el.note, noteTxt);
    setText(el.cents, centsTxt);
    const lv = r ? Math.max(0, Math.min(1, (20 * Math.log10(r.rms + 1e-9) + 58) / 46)) : 0;
    if (Math.abs(lv - lastLevel) > 0.02) {
      lastLevel = lv;
      el.level.style.width = `${Math.round(lv * 100)}%`;
    }
  }

  function endStep() {
    const st = step();
    results.push({ step: st, notes: scoreStep(st, frames, tol), frames });
    if (stepIdx + 1 < plan.steps.length) {
      state = 'between';
      el.player.dataset.state = 'between';
      const nx = plan.steps[stepIdx + 1];
      lane.setModel(modelFor(nx));
      el.between.innerHTML = `<p class="eyebrow">Up next</p><h3>${esc(nx.title)}</h3><p>${esc(nx.intro || '')}</p><p class="between-count" id="bcount">4</p><button class="btn small secondary" data-act="skip">Start now</button>`;
      el.between.hidden = false;
      betweenUntil = audio.now() + 4;
      setText(el.cue, 'Nice. Take a breath.');
    } else finish();
  }

  function finish() {
    state = 'done';
    el.player.dataset.state = 'done';
    audio.closeBus();
    releaseWake();
    const sum = summarize(results);
    lastSum = sum;
    store.record(plan.id, sum.score);
    el.start.textContent = 'Start again';
    setText(el.cue, verdict(sum.score));
    resultsSheet(sum);
  }

  function resultsSheet(sum) {
    const pct = Math.round(sum.score * 100);
    const lean =
      sum.avgAbs == null ? '–' : Math.abs(sum.tendency) < 6 ? 'Centred' : `${Math.round(Math.abs(sum.tendency))}¢ ${sum.tendency < 0 ? 'flat' : 'sharp'}`;
    const stats = [
      [`${sum.landed}/${sum.total}`, 'notes landed'],
      [sum.avgAbs == null ? '–' : `${Math.round(sum.avgAbs)}¢`, 'average miss'],
      sum.steadiness != null ? [`${Math.round(sum.steadiness * 100)}%`, 'held steady'] : [lean, 'overall lean'],
    ];
    const nx = nextAfter(kind, id);
    const html = `
      <p class="eyebrow">${esc(plan.title)}</p>
      <div class="score-row"><span class="score">${pct}<small>%</small></span><span class="verdict">${verdict(sum.score)}</span></div>
      <div class="stats">${stats.map(([b, s]) => `<div><b>${esc(b)}</b><span>${s}</span></div>`).join('')}</div>
      <canvas class="replay" aria-label="Your pitch across the whole exercise"></canvas>
      <p class="tip">${esc(tip(sum))}</p>
      <div class="sheet-actions">
        <button class="btn secondary" data-act="again">Try again</button>
        ${nx ? `<button class="btn primary" data-act="next">Next: ${esc(nx.title)}</button>` : `<button class="btn primary" data-act="done">Done</button>`}
      </div>
      <button class="btn text wide" data-act="copy">Copy results for Claude</button>`;
    const bd = openSheet(
      html,
      {
        again: () => {
          closeSheet(true);
          stop();
        },
        next: () => {
          closeSheet(true);
          openItemReplace(nx.kind, nx.id);
        },
        done: () => {
          closeSheet(true);
          goBack();
        },
        copy: (btn) => copyReport(btn, sum),
      },
      { cls: 'results', label: 'Results', onClose: () => stop() }
    );
    requestAnimationFrame(() => drawOverview(bd.querySelector('.replay'), results));
  }

  async function copyReport(btn, sum) {
    const range = store.data.range;
    const text = reportText({
      title: plan.title + (plan.song ? (mode === 'learn' ? ' (line by line)' : ' (sung through)') : ''),
      sum,
      range,
      voice: range ? voiceType(range) : '',
      strictKey: S().strict,
      date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied. Paste it into a chat with Claude.';
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.className = 'report';
      ta.readOnly = true;
      ta.value = text;
      btn.replaceWith(ta);
      ta.focus();
      ta.setSelectionRange(0, text.length);
    }
  }

  const ctrl = {
    name: 'player',
    actions: {
      start: () => {
        if (state === 'running' || state === 'between') return stop();
        audio.unlock();
        if (!audio.micOn) return micSheet(begin);
        begin();
      },
      hp: (btn) => {
        const on = !S().headphones;
        store.setSetting('headphones', on);
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
        if (plan.song && state === 'ready') rebuild();
        if (state === 'ready') setText(el.cue, on ? 'Headphones on: you’ll hear the guide while you sing.' : 'Headphones off: you’ll hear each part first, then sing.');
      },
      mode: (btn) => {
        if (state !== 'ready') return;
        mode = btn.dataset.v;
        root.querySelectorAll('.seg.mode button').forEach((b) => {
          const on = b.dataset.v === mode;
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
        });
        rebuild();
      },
      skip: () => {
        betweenUntil = audio.now();
      },
    },
    frame() {
      const r = audio.micOn ? audio.read() : null;
      const now = audio.now();
      if (state === 'running') {
        const st = step();
        const t = now - T0;
        schedule(st, t, now);
        if (r) {
          const f = { t: r.t - T0, m: r.m };
          decorate(st, f);
          frames.push(f);
          live = f;
        }
        const { cur, next } = eventsAround(st, t);
        lane.draw(t, frames, live && t - live.t < 0.2 ? live : null);
        if (t < 0) {
          el.countin.hidden = false;
          setText(el.countin, String(Math.min(3, Math.ceil(-t / (LEAD / 3)))));
        } else if (!el.countin.hidden) el.countin.hidden = true;
        updateCue(st, t, cur, next);
        renderLyrics(t);
        readout(r, cur && cur.role === 'sing' ? targetAt(cur, t) : null);
        if (t > st.end + 0.35) endStep();
      } else if (state === 'between') {
        const nx = plan.steps[stepIdx + 1];
        const left = betweenUntil - now;
        const bc = el.between.querySelector('#bcount');
        if (bc) setText(bc, String(Math.max(1, Math.ceil(left))));
        lane.draw(previewTime(nx), [], null);
        readout(r, null);
        if (left <= 0) {
          stepIdx++;
          startStep();
        }
      } else {
        const t = previewTime(step());
        const dot = r && r.m != null ? { t, m: r.m, dm: r.m } : null;
        lane.draw(t, [], dot);
        readout(r, null);
      }
    },
    pause() {
      if (state === 'running' || state === 'between') stop('Stopped because the app lost focus. Tap Start to go again.');
    },
    probe() {
      const st = step();
      const t = audio.now() - T0;
      const cur = st.events.find((e) => t >= e.t && t < e.t + e.d);
      return { state, t, step: stepIdx, role: cur ? cur.role : null, target: cur ? targetAt(cur, t) : null };
    },
    destroy() {
      if (state !== 'ready' && state !== 'done') {
        audio.closeBus();
        releaseWake();
      }
      unwatch();
      if (mq.removeEventListener) mq.removeEventListener('change', onTheme);
    },
  };
  setReady();
  return ctrl;
}

function openItemReplace(kind, id) {
  // Swap the current screen without growing the history stack.
  if (!store.data.range) return openItem(kind, id);
  if (current && current.destroy) current.destroy();
  current = kind === 'lesson' && id === 'range' ? rangeCtrl() : playerCtrl({ kind, id });
  window.scrollTo(0, 0);
}

// ---------- Range test ----------

function rangeCtrl() {
  let state = 'intro'; // intro | low | high | result
  let frames = [];
  let progress = 0;
  let lastNow = 0;
  let found = { low: null, high: null };
  let lastLevel = -1;
  document.body.dataset.screen = 'player';

  root.innerHTML = `<section class="player range-screen" data-state="ready">
    <header class="p-head">
      <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      <div class="p-title"><h2>Find your range</h2><p id="p-sub">About a minute</p></div>
      <span></span>
    </header>
    <p class="cue" id="cue" aria-live="polite">You'll sing a comfortable low note, then a comfortable high note. Hold each one until the bar fills.</p>
    <div class="lane-wrap">
      <canvas id="lane"></canvas>
      <div class="hold" aria-hidden="true"><i id="hold"></i></div>
    </div>
    <div class="readout">
      <span class="note-now" id="note">–</span>
      <span class="note-info"><span id="cents">Tap Start to begin</span><span class="level"><i id="level"></i></span></span>
    </div>
    <div class="p-controls">
      <button class="btn primary wide" data-act="r-start" id="startBtn">Start</button>
      <button class="btn text wide" data-act="r-presets">Skip and pick a typical range</button>
    </div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const el = { player: $('.player'), cue: $('#cue'), sub: $('#p-sub'), note: $('#note'), cents: $('#cents'), level: $('#level'), hold: $('#hold'), start: $('#startBtn') };
  const lane = new Lane($('#lane'));
  const prior = store.data.range;
  lane.setModel({ events: [], free: true, center: prior ? (prior.low + prior.high) / 2 : 57, marks: [] });
  const unwatch = watchSize(lane, $('.lane-wrap'));

  function setMarks() {
    const marks = [];
    if (found.low != null) marks.push({ m: found.low, label: `Low ${letterName(found.low)}`, color: 'do' });
    if (found.high != null) marks.push({ m: found.high, label: `High ${letterName(found.high)}`, color: 'sol' });
    lane.model.marks = marks;
  }

  function begin() {
    state = 'low';
    found = { low: null, high: null };
    frames = [];
    progress = 0;
    setMarks();
    el.player.dataset.state = 'running';
    setText(el.sub, 'Step 1 of 2');
    setText(el.cue, 'Sing a comfortable low note on “ah” and hold it. Low, but not growly.');
    el.start.textContent = 'Stop';
    requestWake();
  }

  function showResult() {
    state = 'result';
    releaseWake();
    const r = found;
    el.player.dataset.state = 'done';
    const html = () => `
      <p class="eyebrow">Your comfortable range</p>
      <p class="big-range">${letterName(r.low)} <span>to</span> ${letterName(r.high)}</p>
      <p class="muted">Closest voice type: <b>${voiceType(r)}</b>. That's ${spanWords(r.high - r.low)}.</p>
      ${keyboardSVG(r)}
      <div class="adjust">
        <div class="adj"><span>Lowest</span><button class="step" data-act="adj" data-k="low" data-d="-1" aria-label="Lower">−</button><button class="note-btn" data-act="hear" data-m="${r.low}">${letterName(r.low)}</button><button class="step" data-act="adj" data-k="low" data-d="1" aria-label="Higher">+</button></div>
        <div class="adj"><span>Highest</span><button class="step" data-act="adj" data-k="high" data-d="-1" aria-label="Lower">−</button><button class="note-btn" data-act="hear" data-m="${r.high}">${letterName(r.high)}</button><button class="step" data-act="adj" data-k="high" data-d="1" aria-label="Higher">+</button></div>
      </div>
      <p class="muted small">Tap a note to hear it. Nudge the edges if they felt like a stretch.</p>
      <button class="btn primary wide" data-act="r-save">Save my range</button>
      <button class="btn text wide" data-act="r-again">Test again</button>`;
    const acts = {
      adj: (b) => {
        const k = b.dataset.k;
        const d = Number(b.dataset.d);
        if (k === 'low') r.low = Math.max(36, Math.min(r.high - 4, r.low + d));
        else r.high = Math.min(88, Math.max(r.low + 4, r.high + d));
        audio.blip(r[k]);
        sheet.el.querySelector('.sheet').innerHTML = html();
      },
      hear: (b) => {
        audio.unlock();
        audio.blip(Number(b.dataset.m));
      },
      'r-save': () => {
        store.setRange({ low: r.low, high: r.high });
        closeSheet(true);
        if (pendingOpen) {
          const p = pendingOpen;
          pendingOpen = null;
          openItemReplace(p.kind, p.id);
        } else goBack();
      },
      'r-again': () => {
        closeSheet(true);
        begin();
      },
    };
    openSheet(html(), acts, { label: 'Your range', dismissable: false, cls: 'range-result' });
  }

  function stop() {
    state = 'intro';
    progress = 0;
    releaseWake();
    el.player.dataset.state = 'ready';
    el.start.textContent = 'Start';
    setText(el.sub, 'About a minute');
    setText(el.cue, 'You’ll sing a comfortable low note, then a comfortable high note. Hold each one until the bar fills.');
    el.hold.style.width = '0%';
  }

  function median(a) {
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  }

  function track(now) {
    const dt = Math.min(0.1, now - lastNow);
    lastNow = now;
    const win = frames.filter((f) => now - f.t <= 0.5);
    const voiced = win.filter((f) => f.m != null).map((f) => f.m);
    let stable = false;
    if (win.length >= 10 && voiced.length / win.length >= 0.7) {
      const med = median(voiced);
      stable = voiced.filter((m) => Math.abs(m - med) <= 0.5).length / voiced.length >= 0.85;
      // In step 2, a note near the low one is just the singer still holding it.
      if (state === 'high' && med < found.low + 4) stable = false;
    }
    progress = stable ? progress + dt : Math.max(0, progress - dt * 1.5);
    el.hold.style.width = `${Math.min(100, (progress / 1.2) * 100).toFixed(0)}%`;
    if (progress >= 1.2) {
      const held = frames.filter((f) => now - f.t <= 1.2 && f.m != null).map((f) => f.m);
      const note = Math.round(median(held));
      progress = 0;
      if (state === 'low') {
        found.low = note;
        setMarks();
        audio.blip(note, 0.5);
        state = 'high';
        setText(el.sub, 'Step 2 of 2');
        setText(el.cue, `Low note: ${letterName(note)}. Now a comfortable high note, still on “ah”. Not a squeak.`);
      } else if (state === 'high') {
        if (note < found.low + 4) {
          setText(el.cue, `That's close to your low note (${letterName(found.low)}). Try a higher note.`);
          return;
        }
        found.high = note;
        setMarks();
        audio.blip(note, 0.5);
        showResult();
      }
    }
  }

  return {
    name: 'range',
    actions: {
      'r-start': () => {
        if (state === 'low' || state === 'high') return stop();
        audio.unlock();
        if (!audio.micOn) return micSheet(begin);
        begin();
      },
      'r-presets': () => {
        stop();
        openSheet(
          `<h2>Pick a typical range</h2>
           <p>You can run the test any time from the home screen.</p>
           <div class="preset-row">
             <button class="btn secondary" data-act="r-preset" data-v="low">Lower voice<small>${letterName(PRESETS.low.low)} to ${letterName(PRESETS.low.high)} · most men</small></button>
             <button class="btn secondary" data-act="r-preset" data-v="high">Higher voice<small>${letterName(PRESETS.high.low)} to ${letterName(PRESETS.high.high)} · most women and children</small></button>
           </div>`,
          {
            'r-preset': (b) => {
              store.setRange({ ...PRESETS[b.dataset.v] });
              closeSheet(true);
              if (pendingOpen) {
                const p = pendingOpen;
                pendingOpen = null;
                openItemReplace(p.kind, p.id);
              } else goBack();
            },
          },
          { label: 'Typical ranges' }
        );
      },
    },
    frame() {
      const r = audio.micOn ? audio.read() : null;
      const now = audio.now();
      if (r) {
        frames.push({ t: r.t, m: r.m });
        if (frames.length > 400) frames.splice(0, frames.length - 400);
      }
      if (state === 'low' || state === 'high') track(now);
      const vis = frames.map((f) => ({ ...f, dm: f.m }));
      const liveF = r && r.m != null ? { t: r.t, m: r.m, dm: r.m } : null;
      lane.draw(now, state === 'low' || state === 'high' ? vis : [], liveF);
      setText(el.note, r && r.m != null ? letterName(r.m) : '–');
      setText(el.cents, r && r.m != null ? `${Math.round(440 * Math.pow(2, (r.m - 69) / 12))} Hz` : audio.micOn ? 'Listening…' : 'Tap Start to begin');
      const lv = r ? Math.max(0, Math.min(1, (20 * Math.log10(r.rms + 1e-9) + 58) / 46)) : 0;
      if (Math.abs(lv - lastLevel) > 0.02) {
        lastLevel = lv;
        el.level.style.width = `${Math.round(lv * 100)}%`;
      }
    },
    pause() {
      if (state === 'low' || state === 'high') stop();
    },
    destroy() {
      releaseWake();
      unwatch();
    },
  };
}

// ---------- Free sing ----------

function freeCtrl() {
  let lastLevel = -1;
  let frames = [];
  document.body.dataset.screen = 'player';
  root.innerHTML = `<section class="player free-screen" data-state="ready">
    <header class="p-head">
      <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      <div class="p-title"><h2>Free sing</h2><p id="p-sub">No score. Just your voice.</p></div>
      <span></span>
    </header>
    <p class="cue" id="cue">Sing anything. The line follows your pitch and the names on the left show where you are.</p>
    <div class="lane-wrap"><canvas id="lane"></canvas></div>
    <div class="readout">
      <span class="note-now" id="note">–</span>
      <span class="note-info"><span id="cents">Tap Start to turn on the mic</span><span class="level"><i id="level"></i></span></span>
    </div>
    <div class="p-controls"><button class="btn primary wide" data-act="f-start" id="startBtn">Start</button></div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const el = { note: $('#note'), cents: $('#cents'), level: $('#level'), start: $('#startBtn'), player: $('.player') };
  const lane = new Lane($('#lane'));
  const range = store.data.range;
  lane.setModel({ events: [], free: true, center: range ? (range.low + range.high) / 2 : 57 });
  const unwatch = watchSize(lane, $('.lane-wrap'));
  const on = () => {
    el.player.dataset.state = 'running';
    el.start.textContent = 'Done';
    requestWake();
  };
  if (audio.micOn) on();
  return {
    name: 'free',
    actions: {
      'f-start': () => {
        if (audio.micOn && el.player.dataset.state === 'running') return goBack();
        audio.unlock();
        if (!audio.micOn) return micSheet(on);
        on();
      },
    },
    frame() {
      const r = audio.micOn ? audio.read() : null;
      const now = audio.now();
      if (r) {
        frames.push({ t: r.t, m: r.m, dm: r.m });
        if (frames.length > 600) frames.splice(0, frames.length - 600);
      }
      lane.draw(now, frames, r && r.m != null ? { t: r.t, m: r.m, dm: r.m } : null);
      if (r && r.m != null) {
        setText(el.note, letterName(r.m));
        const c = Math.round((r.m - Math.round(r.m)) * 100);
        setText(el.cents, c === 0 ? 'Right on the note' : `${c > 0 ? '+' : '−'}${Math.abs(c)}¢ from ${letterName(Math.round(r.m))}`);
      } else {
        setText(el.note, '–');
        setText(el.cents, audio.micOn ? 'Listening…' : 'Tap Start to turn on the mic');
      }
      const lv = r ? Math.max(0, Math.min(1, (20 * Math.log10(r.rms + 1e-9) + 58) / 46)) : 0;
      if (Math.abs(lv - lastLevel) > 0.02) {
        lastLevel = lv;
        el.level.style.width = `${Math.round(lv * 100)}%`;
      }
    },
    destroy() {
      releaseWake();
      unwatch();
    },
  };
}

// ---------- Boot ----------

function loop() {
  requestAnimationFrame(loop);
  if (current && current.frame) {
    try {
      current.frame();
    } catch (e) {
      console.error(e);
    }
  }
}

current = homeCtrl();
history.replaceState({ nbn: 0 }, '');
requestAnimationFrame(loop);

// Read-only hook used by automated tests.
window.__nbn = {
  probe: () => (current && current.probe ? current.probe() : null),
  screen: () => (current ? current.name : null),
};

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
