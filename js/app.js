import { AudioEngine } from './audio.js';
import { LESSONS, UNITS, ORDER, WARMUP, CONTROL_TITLES, controlFor } from './lessons.js';
import { SONGS, buildSong, difficulty, songGlyph, setHarmonizer } from './songs.js';
import { Lane, drawOverview, drawSong } from './lane.js';
import { letterName, label, family, prefersFlats, pc, parseMelody, parseLyrics, fitShift } from './music.js';
import { STRICTNESS, scoreStep, summarize, verdict, tip, reportText, targetAt, foldDiff, creditFor, keyOf, keyAt, wasHeard, warmupCheck, offWords } from './score.js';
import { store, today, week, warmedToday, songPassToday } from './store.js';
import { findNotes, findKey, quantize, harmonize, arrange, describe, TEMPOS } from './tune.js';
import { writeFamilySongFile, familySongFileName, validateSong, isFamilySongId, SONG_LIMITS } from './nbn.js';
import { library, askToPersist } from './library.js';
import { makePin, checkPin, isPinShape, pinSupported } from './pin.js';
import { ICON, PHASE_ICON, MARK, SQUIGGLE, STAFF, BURST, AROUND, confetti, rating, hum, WARM_STEPS, CONTROL_STEP, MOVE_ART, moveRing } from './art.js';

const audio = new AudioEngine();
const root = document.getElementById('app');
const LEAD = 2.4;
const PRESETS = {
  child: { low: 60, high: 72 },
  high: { low: 57, high: 74 },
  low: { low: 45, high: 62 },
};
const PRESET_INFO = [
  ['child', 'Child', 'younger kids, about 4 to 8'],
  ['high', 'Higher voice', 'older kids, most girls and women'],
  ['low', 'Lower voice', 'men, and teen boys whose voice has dropped'],
];
const VOICE_CHANGING = 'Voice changing (cracks, squeaks, new low notes)? Do the range test instead. It finds where your voice is right now.';
const VERSION = '1.1';
// The app talks in one voice, as “I”: “I couldn’t hear you”, “I set How strict to Relaxed”.
const NOT_HEARD = 'I couldn’t hear you';
const NOT_FOLLOWED = 'I couldn’t hear the tune';
const TABS = ['today', 'lessons', 'songs'];
// The grown-ups' corner of the results and warm-up sheets: small and quiet, below everything a
// child needs.
const GROWN_UPS = `<div class="grown-ups"><span>For grown-ups:</span><button class="quiet-link" data-act="copy">Copy results for Claude</button></div>`;

let current = null;
let sheet = null;
let pendingOpen = null;
let pendingSong = null; // the song a child tapped while locked; the warm-up done sheet offers it
let wakeLock = null;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const setText = (el, txt) => {
  if (el && el.textContent !== txt) el.textContent = txt;
};
const S = () => store.data.settings;
const tolerance = () => STRICTNESS[S().strict] || STRICTNESS.standard;
const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Session memory (tab and unit). Private browsing can throw, so every access is guarded.
const sget = (k) => {
  try {
    return sessionStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const sset = (k, v) => {
  try {
    sessionStorage.setItem(k, v);
  } catch (e) {
    /* this session only */
  }
};

// ---------- Daily warm-up and the song lock ----------
// Songs open once today's warm-up has counted (the app heard every sung part, moving with the
// notes), until local midnight. Lessons, the warm-up and the range test never lock. A grown-up
// can switch the lock off in Settings. Every lock and "done today" visual, and the gate in
// openItem, read these.
const lockEnabled = () => S().warmupLock !== false;
const warmedUpToday = () => warmedToday();
// A grown-up can also open songs for the rest of today from the lock sheet (PIN), e.g. to try a
// new family song. It doesn't mark the warm-up as done.
const songsUnlocked = () => !lockEnabled() || warmedUpToday() || songPassToday();

// The warm-up's steps as pictures, for the Today hero and the "Up next" card. Step 5 is today's
// challenge, a control move (ctl: 'hold' | 'bounce' | 'swell' | 'slide'), marked { today: true }.
const warmTrail = (ctl = controlFor()) => WARM_STEPS.map((s) => (s.key === 'control' ? { ...s, ...CONTROL_STEP[ctl], today: true } : s));
const warmLength = () => `About ${WARMUP.minutes} minutes`;
const clockTime = (ms) => new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });

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
  const pad = compact ? 0 : 8; // room for the first and last octave labels
  let out = `<svg class="kbd" viewBox="${-pad} 0 ${W + 2 * pad} ${kh + (compact ? 0 : 14)}" role="img" aria-label="${range ? `Keyboard showing ${letterName(range.low)} to ${letterName(range.high)}` : 'Keyboard'}">`;
  whites.forEach((m, i) => {
    out += `<rect class="kw${inR(m) ? ' in' : ''}" x="${i * kw + 0.3}" y="0.3" width="${kw - 0.6}" height="${kh - 0.6}" rx="1.4"/>`;
    if (!compact && pc(m) === 0) out += `<text x="${i * kw + kw / 2}" y="${kh + 11}" text-anchor="middle">${letterName(m)}</text>`;
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

// Where the saved range came from, in a few words. No voice-type labels (Alto, Tenor…): a
// range alone can't tell, so the app shows the notes themselves (report Q12).
const RANGE_FROM = { test: 'From your test', child: 'Child range', high: 'Higher voice', low: 'Lower voice' };
const rangeSource = () => RANGE_FROM[store.data.rangeFrom] || '';
const rangeText = (r) => `${letterName(r.low)} to ${letterName(r.high)}`;

function presetsHTML(act = 'preset') {
  return `<div class="presets">${PRESET_INFO.map(([k, name, who]) => {
    const p = PRESETS[k];
    return `<button class="btn secondary" data-act="${act}" data-v="${k}">${name}<small>${letterName(p.low)} to ${letterName(p.high)} · ${who}</small></button>`;
  }).join('')}</div>`;
}

// ---------- Sheets ----------

// opts: { cls, label, onClose, dismissable, before (HTML beside the sheet, e.g. confetti),
//         key (re-opening a sheet with the same key updates it in place, without the entry animation) }
function openSheet(html, actions = {}, opts = {}) {
  const body = `<div class="grabber" aria-hidden="true"></div>${html}`;
  if (opts.key && sheet && sheet.key === opts.key) {
    const el = sheet.el.querySelector('.sheet');
    const y = el.scrollTop;
    el.innerHTML = body;
    el.scrollTop = y;
    sheet.actions = actions;
    sheet.onClose = opts.onClose;
    sheet.stuck();
    return sheet.el;
  }
  closeSheet(true);
  const bd = document.createElement('div');
  bd.className = 'sheet-backdrop';
  bd.innerHTML = `<div class="sheet-wrap">${opts.before || ''}<div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Dialog')}">${body}</div></div>`;
  document.body.appendChild(bd);
  if (opts.dismissable !== false)
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeSheet();
    });
  const sc = bd.querySelector('.sheet');
  if (opts.dismissable !== false) swipeToClose(bd, sc);
  sheet = { el: bd, actions, onClose: opts.onClose, key: opts.key, stuck: watchStuck(sc) };
  // Focus starts at the top, on the heading (or the sheet itself when it has none), so a screen
  // reader begins with the title and the content, not a button at the bottom.
  const top = bd.querySelector('.sheet h2') || sc;
  top.setAttribute('tabindex', '-1');
  top.focus({ preventScroll: true });
  return bd;
}

// A tall sheet's main buttons (.sheet-actions) stick to its bottom edge (CSS position: sticky).
// While they're stuck, with the sheet scrolling under them, they get .stuck so CSS can put paper
// behind them. Returns the check, to run again after the sheet's content changes.
function watchStuck(sc) {
  const update = () => {
    const bar = sc.querySelector('.sheet-actions');
    if (!bar) return;
    const lift = parseFloat(getComputedStyle(bar).bottom) || 0; // 10 px plus the home indicator
    bar.classList.toggle('stuck', bar.getBoundingClientRect().bottom + lift >= sc.getBoundingClientRect().bottom - 1);
  };
  sc.addEventListener('scroll', update, { passive: true });
  update();
  requestAnimationFrame(update); // again once labels have been fitted
  return update;
}
window.addEventListener('resize', () => sheet && sheet.stuck());

// Swipe a sheet down by its top (the handle and the title) to close it, as the handle suggests.
// Only a downward drag that starts there while the sheet is scrolled to the top, so scrolling inside
// a tall sheet still works, and a tap is still a tap. With reduced motion it closes without sliding.
const SWIPE_ZONE = 64; // px from the sheet's top edge
const SWIPE_CLOSE = 72; // px of drag that closes it (a quick flick does too)
function swipeToClose(bd, sc) {
  const wrap = bd.querySelector('.sheet-wrap');
  let drag = null; // { x, y, t, dy, on }
  const slide = (y) => (wrap.style.transform = y ? `translateY(${y})` : '');
  sc.addEventListener(
    'touchstart',
    (e) => {
      const p = e.touches[0];
      const inZone = p.clientY - sc.getBoundingClientRect().top <= SWIPE_ZONE;
      drag = e.touches.length === 1 && sc.scrollTop <= 0 && inZone ? { x: p.clientX, y: p.clientY, t: e.timeStamp, dy: 0, on: false } : null;
    },
    { passive: true }
  );
  sc.addEventListener(
    'touchmove',
    (e) => {
      if (!drag) return;
      const p = e.touches[0];
      const dx = Math.abs(p.clientX - drag.x);
      const dy = p.clientY - drag.y;
      if (!drag.on) {
        if (dx < 6 && Math.abs(dy) < 6) return; // still a tap
        if (dy <= dx || !e.cancelable) return (drag = null); // up or sideways: a scroll, not a swipe
        drag.on = true;
        wrap.classList.remove('settle');
      }
      e.preventDefault();
      drag.dy = Math.max(0, dy);
      slide(`${drag.dy}px`);
    },
    { passive: false }
  );
  const end = (e) => {
    const d = drag;
    drag = null;
    if (!d || !d.on) return;
    const flick = d.dy > 24 && d.dy / Math.max(1, e.timeStamp - d.t) > 0.5;
    if (e.type === 'touchend' && (d.dy >= SWIPE_CLOSE || flick)) {
      if (reducedMotion()) return closeSheet();
      wrap.classList.add('leave');
      bd.classList.add('leaving');
      slide('100%');
      setTimeout(() => sheet && sheet.el === bd && closeSheet(), 200);
    } else {
      if (!reducedMotion()) wrap.classList.add('settle');
      slide(0);
    }
  };
  sc.addEventListener('touchend', end);
  sc.addEventListener('touchcancel', end);
}

function closeSheet(silent = false) {
  if (!sheet) return;
  const s = sheet;
  sheet = null;
  s.el.remove();
  if (!silent && s.onClose) s.onClose();
}

function micSheet(then) {
  const owner = current; // the screen that asked
  const blocked = audio.micState === 'denied';
  const failed = audio.micState === 'error' || audio.micState === 'unsupported';
  const html = blocked
    ? `<h2>The microphone is blocked</h2>
       <p>In Safari, tap <b>aA</b> in the address bar, then <b>Website Settings</b>, and set <b>Microphone</b> to <b>Allow</b>.</p>
       <p class="muted">Also check <b>Settings → Safari → Microphone</b> isn't set to Deny. Then tap Start again.</p>
       <button class="btn primary big wide" data-act="mic-allow">Try again</button>
       <button class="btn text wide" data-act="sheet-close">Close</button>`
    : failed
      ? `<h2>The microphone didn't start</h2>
       <p>Another app may be using it, or this browser can't share it. Close other apps that use the mic, then try again.</p>
       <button class="btn primary big wide" data-act="mic-allow">Try again</button>
       <button class="btn text wide" data-act="sheet-close">Close</button>`
      : `<h2>Turn on the microphone</h2>
       <p>I listen so I can show your pitch as you sing. Nothing is recorded or sent anywhere.</p>
       <p class="muted">Tip: you'll hear the notes best with the phone's volume up and Silent mode off.</p>
       <button class="btn primary big wide" data-act="mic-allow">Allow microphone</button>
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
          // Gone back while the permission prompt was up: the mic is on, but nothing starts.
          if (current !== owner) return;
          closeSheet(true);
          if (then) then();
        } catch (e) {
          if (current === owner) micSheet(then);
        }
      },
    },
    { label: 'Microphone', cls: 'mic' }
  );
}

function needRangeSheet() {
  openSheet(
    `<h2>First, find your range</h2>
     <p>Every lesson moves into your key, so I need to know where your voice sits. It takes about a minute.</p>
     <button class="btn primary big wide" data-act="range">${ICON.play}Find my range</button>
     <p class="muted center">Or start with a typical range:</p>
     ${presetsHTML()}
     <p class="presets-note">${VOICE_CHANGING}</p>`,
    {},
    {
      label: 'Find your range',
      onClose: () => {
        pendingOpen = null;
        pendingSong = null;
      },
    }
  );
}

// The grown-up check for turning the warm-up lock off: a times-table sum with numbers from 6 to 9.
// It stops a 4-to-7-year-old; a teenager can answer it, and the copy says so.
const newGate = (err = false) => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4), err });

// gate: null, or the sum on show while a grown-up turns the lock off.
function settingsSheet(gate = null) {
  const s = S();
  const seg = (k, opts) =>
    `<div class="seg" role="radiogroup">${opts
      .map(([v, l]) => `<button role="radio" aria-checked="${s[k] === v}" class="${s[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`)
      .join('')}</div>`;
  const range = store.data.range;
  const lockOn = lockEnabled();
  const warm = store.data.warm;
  const status = warmedUpToday()
    ? `${ICON.check}Today: warmed up${warm.at ? ` at ${clockTime(warm.at)}` : ''}`
    : songPassToday()
      ? `${ICON.unlock}Today: songs opened by a grown-up`
      : 'Not yet today';
  const strictCents = Object.values(STRICTNESS).map((t) => `${t.good} (${t.label})`);
  const html = `
    <h2>Settings</h2>
    <div class="field">
      <div><b>Headphones</b><p>On: you also hear the guide note while you sing, except in the warm-up, where you always listen first, then sing. Wired headphones work best. Bluetooth drops to call quality while the mic is on.</p></div>
      <button class="switch ${s.headphones ? 'on' : ''}" role="switch" aria-checked="${s.headphones}" aria-label="Headphones" data-act="set" data-k="headphones" data-v="${!s.headphones}"><i></i></button>
    </div>
    <div class="field col"><b>Note names</b>${seg('names', [['letters', 'C D E'], ['solfa', 'Do Re Mi']])}</div>
    <div class="field col"><b>How strict</b>${seg('strict', [['relaxed', 'Relaxed'], ['standard', 'Standard'], ['strict', 'Strict']])}<p class="muted">${STRICTNESS[s.strict].blurb}</p></div>
    <div class="field">
      <div><b>Your comfy notes</b><p>${range ? esc([rangeText(range), rangeSource()].filter(Boolean).join(' · ')) : 'Not found yet'}</p></div>
      <button class="btn small secondary" data-act="range">${range ? 'Retest' : 'Find them'}</button>
    </div>
    <button class="field link-row" data-act="care"><span>${ICON.heart}<b>Look after your voice</b></span>${ICON.chev}</button>
    <h3 class="group-h">For grown-ups</h3>
    <div class="field lock-field">
      <div>
        <b id="lock-label">Warm-up before songs</b>
        ${gate ? '' : '<p>Songs open after today’s warm-up. Lessons are always open. Resets at midnight.</p>'}
        <p class="lock-today${warmedUpToday() ? ' done' : ''}">${status}</p>
      </div>
      <button class="switch ${lockOn ? 'on' : ''}" role="switch" aria-checked="${lockOn}" aria-labelledby="lock-label" data-act="lock-switch"><i></i></button>
    </div>
    ${
      gate
        ? `<div class="gate">
            ${gate.err ? '<p class="err" role="alert">Not quite. Try this one:</p>' : ''}
            <label for="gate">Grown-ups: what is ${gate.a} × ${gate.b}?</label>
            <input id="gate" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done">
            <button class="btn secondary" data-act="gate">Turn off</button>
          </div>`
        : ''
    }
    <p class="lock-note">This is a gentle nudge, not a real lock. I check that someone sang along with the warm-up, but I can’t be certain.</p>
    <div class="field">
      <div><b>Family songs</b><p>${familyState === 'unavailable' ? 'Can’t be saved in this browser window.' : `${familySongs.length || 'None'} on this phone. Songs you’ve bought, kept private.`}</p></div>
      ${familyState === 'unavailable' ? '' : '<button class="btn small secondary" data-act="fam-add">Add a song</button>'}
    </div>
    <div class="field">
      <div><b>Grown-up PIN</b><p>${store.data.pin ? 'Set. Needed to add, move or delete family songs, and to turn off the warm-up switch.' : 'Not set yet. I’ll ask for one the first time a grown-up needs it.'}</p></div>
      <button class="btn small secondary" data-act="pin-change">${store.data.pin ? 'Change PIN' : 'Set PIN'}</button>
    </div>
    <div class="field">
      <div><b>Reset progress</b><p>Clears scores and practice days. Keeps the range.</p></div>
      <button class="btn small danger" data-act="reset">Reset</button>
    </div>
    <div class="field">
      <div><b>How strict, in cents</b><p>Singing counts as in tune within ${strictCents.slice(0, -1).join(', ')} or ${strictCents[strictCents.length - 1]} cents of the note. 100 cents is one half step.</p></div>
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
        const refocus = document.activeElement === el;
        store.setSetting(k, v);
        settingsSheet();
        if (refocus) {
          const again = sheet && sheet.el.querySelector(`[data-act="set"][data-k="${k}"]${k === 'headphones' ? '' : `[data-v="${v}"]`}`);
          if (again) again.focus({ preventScroll: true });
        }
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
      care: () => careSheet(null, () => settingsSheet()),
      // On: switching off shows the grown-up check (tapping again cancels it): the PIN once there is
      // one, otherwise a times-table sum. Off: back on straight away.
      'lock-switch': () => {
        if (!lockEnabled()) store.setSetting('warmupLock', true);
        else if (store.data.pin) {
          return grownUp({
            why: 'Enter your PIN to turn off “Warm-up before songs”.',
            then: () => {
              store.setSetting('warmupLock', false);
              settingsSheet();
              focusIn('[data-act="lock-switch"]');
            },
            back: () => {
              settingsSheet();
              focusIn('[data-act="lock-switch"]');
            },
          });
        } else if (!gate) {
          settingsSheet(newGate());
          return focusIn('#gate');
        }
        settingsSheet();
        focusIn('[data-act="lock-switch"]');
      },
      gate: () => checkGate(),
      'pin-change': () => changePin(),
    },
    { label: 'Settings', key: 'settings', cls: 'settings', onClose: () => current && current.refresh && current.refresh() }
  );
  function checkGate() {
    const input = sheet && sheet.el.querySelector('#gate');
    const answer = input ? parseInt(input.value.trim(), 10) : NaN;
    if (answer === gate.a * gate.b) {
      store.setSetting('warmupLock', false);
      settingsSheet();
      focusIn('[data-act="lock-switch"]');
    } else {
      settingsSheet(newGate(true));
      focusIn('#gate');
    }
  }
  const input = gate && sheet && sheet.el.querySelector('#gate');
  if (input)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkGate();
      }
    });
}

// How many lines the text in el wraps onto (el holds text only).
function lineCount(el) {
  const text = document.createRange();
  text.selectNodeContents(el);
  return text.getClientRects().length;
}

// Keeps a button's label to one line: if its <span> wraps, it gets the short label instead.
// Returns true when it did.
function fitLabel(btn, short) {
  const span = btn && btn.querySelector('span');
  if (!span || lineCount(span) <= 1) return false;
  span.textContent = short;
  return true;
}

// Focus something in the open sheet without scrolling it (after a sheet re-renders in place).
function focusIn(sel) {
  const el = sheet && sheet.el.querySelector(sel);
  if (el) el.focus({ preventScroll: true });
}

// ---------- "Look after your voice" (warm-up spec §5.2) ----------

const CARE = [
  ['shout', 'Sing, don’t shout', 'Shouting and screaming are the hardest thing on your voice, and so is singing over loud music.'],
  ['volume', 'Comfy volume', 'Medium is plenty. I can hear you fine.'],
  ['easy', 'Easy notes only', 'Never push for a high note. If it pinches, go lower.'],
  ['water', 'Scratchy or sore? Stop.', 'Have a drink of water and rest your voice. Tell a grown-up if it’s still sore tomorrow.'],
  ['rest', 'Sick? Rest.', 'When you have a cold or a croaky voice, skip singing until your voice feels normal, then start with the warm-up. Songs will still be here tomorrow.', 'rest'],
  ['grow', 'Voices grow', 'Your voice changes as you grow, especially as a teenager. Cracks and squeaks are normal. Sing where it’s comfy, and redo your range test every few weeks.'],
];

const CARE_GROWNUPS = `
  <h3>What I can and can’t do</h3>
  <p>I measure pitch and timing only. I can’t hear strain, breathiness or tension, and my scores say nothing about vocal health. Warm-ups help singing feel easier and, in choir studies, more in tune. No study shows they prevent voice injury.</p>
  <h3>Everyday voice care for children</h3>
  <p>These habits matter more than any warm-up:</p>
  <ul>
    <li>Avoid shouting and screaming, and talking over noise (car, playground, TV).</li>
    <li>Build quiet times into the day.</li>
    <li>Sip water through the day.</li>
    <li>Keep children away from smoke.</li>
  </ul>
  <p>Hoarseness in children usually comes from voice-use habits or colds, not singing technique. A croaky voice from a cold usually settles within 1–2 weeks. (Sources: RCH Kids Health Info, BVA, ASHA, Seattle Children’s.)</p>
  <h3>How much singing?</h3>
  <p>No safe daily amount has been established for children or adults. Little and often is best, with breaks. A ${WARMUP.minutes}-minute warm-up and 10–20 minutes of lessons and songs is a sensible day. Stop when the voice feels tired.</p>
  <h3>When to see your GP</h3>
  <ul>
    <li>A hoarse or croaky voice that is getting worse, or not getting better.</li>
    <li>A voice change that has lasted more than about two weeks, especially without a cold.</li>
    <li>Any time you are worried about your child’s voice.</li>
  </ul>
  <p>Specialist doctors’ guidelines say that if hoarseness hasn’t gone away or improved within <b>4 weeks</b>, the voice box should be looked at. This is a quick camera check, usually by an ear, nose and throat (ENT) specialist. <b>If a serious cause is suspected, it should happen sooner, whatever the timing.</b> (AAO-HNS 2018, which applies to all ages; RCH; BVA.)</p>
  <h3>Get help straight away (call 000 if it’s severe)</h3>
  <ul>
    <li>Breathing is hard or noisy (a harsh sound when breathing in).</li>
    <li>Your child can’t swallow, or is drooling.</li>
  </ul>
  <h3>See a doctor soon, without waiting 4 weeks, if hoarseness comes with:</h3>
  <ul>
    <li>A lump in the neck.</li>
    <li>Coughing up blood, pain when swallowing, or ear pain.</li>
    <li>Fevers, night sweats or unexplained weight loss.</li>
    <li>A recent operation on the head, neck or chest, or a recent anaesthetic with a breathing tube.</li>
    <li>(Teenagers) smoking.</li>
  </ul>
  <p>Also tell the GP if your child sings or performs a lot (choir, lessons, shows). The guideline treats regular voice users as needing a check sooner. (AAO-HNS 2018 KAS 1; RACGP Australian Family Physician 2016.)</p>
  <h3>Who to see in Australia</h3>
  <ul>
    <li>Your <b>GP</b> can examine your child and refer to an ENT specialist, a paediatrician or a speech pathologist.</li>
    <li>You can also see a <b>speech pathologist</b> without a referral. A GP referral may make some costs claimable through Medicare (healthdirect).</li>
    <li>Speech Pathology Australia’s <b>Find a Speech Pathologist</b> search can filter for voice.</li>
    <li>In Victoria, the Royal Children’s Hospital runs a Voice/Laryngology clinic by referral.</li>
  </ul>
  <h3>Voices change as children grow</h3>
  <ul>
    <li>Boys’ voices usually start changing at about 13, anywhere from about 10½ to 16½. The change takes around 18 months and sometimes more than three years.</li>
    <li>Cracks and sudden flips are normal. Let boys sing where it’s comfortable, usually the new lower notes, rather than forcing high notes they used to have.</li>
    <li>Girls’ voices change too: breathiness, a lower bottom, cracks and an unsteady range are normal and settle with time.</li>
    <li>Redo the range test every few weeks while the voice is changing. I’ll remind you. (VoiceScience; Williams, Welch &amp; Howard 2020; Gackle; Cooksey.)</li>
  </ul>
  <h3>Preventer inhalers</h3>
  <p>If your child uses a preventer (steroid) inhaler and you notice hoarseness, mention it to your GP or pharmacist.</p>
  <h3>The warm-up lock</h3>
  <p>Songs open after the day’s warm-up. Lessons are always open. You can turn this off in Settings, under For grown-ups. It is a nudge, not security.</p>`;

// section: 'rest' opens at the "Sick? Rest." card. back: re-opens the sheet this one replaced.
function careSheet(section = null, back = null) {
  const cards = CARE.map(
    ([icon, title, text, id]) =>
      `<div class="care-card"${id ? ` data-care="${id}"` : ''}><i>${ICON[icon]}</i><div><b>${title}</b><span>${text}</span></div></div>`
  ).join('');
  const bd = openSheet(
    `<h2 class="care-title">${ICON.heart}Look after your voice</h2>
     <div class="care-grid">${cards}</div>
     <details><summary>For grown-ups${ICON.chev}</summary>${CARE_GROWNUPS}</details>
     <p class="muted center">Ask a grown-up to read this with you.</p>
     <p class="about">This page is general information, not medical advice.</p>
     <button class="btn primary wide" data-act="sheet-close">Done</button>`,
    {},
    { cls: 'care', label: 'Look after your voice', onClose: back || undefined }
  );
  const card = section && bd.querySelector(`[data-care="${section}"]`);
  if (card) {
    requestAnimationFrame(() => card.scrollIntoView({ block: 'center' }));
    if (!reducedMotion()) {
      card.classList.add('ring');
      setTimeout(() => card.classList.remove('ring'), 1500);
    }
  }
}

// ---------- Navigation ----------

function show(ctrl, push = true) {
  closeSheet(true);
  if (current && current !== ctrl && current.destroy) current.destroy();
  current = ctrl;
  window.scrollTo(0, ctrl.scrollTop ? ctrl.scrollTop() : 0);
  if (push) history.pushState({ nbn: 1 }, '');
}

// Back to the tab bar, on the tab (and at the scroll position) the screen was opened from.
function goHome() {
  show(homeCtrl(), false);
}

function goBack() {
  if (history.state && history.state.nbn) history.back();
  else goHome();
}

// Close the screen and land on a tab, from its top (e.g. "Go to Songs" after the warm-up).
function goToTab(v) {
  tab = v;
  sset('nbn:tab', v);
  scrollMem[v] = 0;
  goBack();
}

window.addEventListener('popstate', () => {
  closeSheet(true);
  if (!current || current.name !== 'home') goHome();
});

function openItem(kind, id) {
  if (kind === 'free') return show(freeCtrl());
  if (kind === 'lesson' && id === 'range') return show(rangeCtrl());
  if (kind === 'song' && !findSong(id)) return;
  if (kind === 'song' && !songsUnlocked()) return lockSheet({ kind, id });
  if (!store.data.range) {
    pendingOpen = { kind, id };
    return needRangeSheet();
  }
  show(playerCtrl({ kind, id }));
}

// A locked song was tapped (from Songs, or a "Next" button). The song is remembered so the
// warm-up's done sheet can offer it straight away.
function lockSheet(target) {
  pendingSong = target;
  openSheet(
    `${hum('sing')}
     <h2>Warm up first</h2>
     <p>Singers warm up before songs, like stretching before sport. It takes about ${WARMUP.minutes} minutes. Then every song is open until midnight.</p>
     <p>Today’s challenge: <span class="ctl">${esc(WARMUP.controlTitle())}</span></p>
     <button class="btn primary big wide" data-act="lock-warm">${ICON.play}Start warm-up</button>
     <button class="btn text wide" data-act="sheet-close">Not now</button>
     <button class="care-link" data-act="lock-care">${ICON.heart}Throat sore today? Rest your voice</button>
     <div class="grown-ups"><span>For grown-ups:</span><button class="quiet-link" data-act="lock-pass">Open songs for today</button></div>`,
    {
      'lock-pass': () => {
        const song = pendingSong;
        grownUp({
          why: 'Enter your PIN to open songs for the rest of today without a warm-up.',
          then: () => {
            store.setSongPass();
            closeSheet(true);
            if (current && current.refresh) current.refresh();
            if (song) openItem(song.kind, song.id);
          },
          back: () => lockSheet(song),
        });
      },
      'lock-warm': () => {
        closeSheet(true);
        openItem('warmup', 'warmup');
      },
      // A sore throat means rest, not the warm-up: open the care page at its "rest" card.
      'lock-care': () => {
        pendingSong = null;
        careSheet('rest');
      },
    },
    { cls: 'lock', label: 'Warm up first', onClose: () => (pendingSong = null) }
  );
}

// The Child preset also sets How strict to Relaxed while it's still on the default, since young
// singers' pitch is still developing. Returns true when it did.
function applyPreset(key) {
  store.setRange({ ...PRESETS[key] }, key);
  if (key !== 'child' || S().strict !== 'standard') return false;
  store.setSetting('strict', 'relaxed');
  return true;
}

// Says so once, after whatever the preset tap opened (or went back to) has settled.
function relaxedNote() {
  setTimeout(() => {
    if (sheet) return;
    openSheet(
      `<h2>How strict: Relaxed</h2>
       <p>I set How strict to Relaxed, which suits young singers. Change it any time in Settings.</p>
       <button class="btn primary big wide" data-act="sheet-close">OK</button>`,
      {},
      { cls: 'centered', label: 'How strict' }
    );
  }, 400);
}

function afterRangeSaved(replace) {
  if (pendingOpen) {
    const p = pendingOpen;
    pendingOpen = null;
    if (replace) openItemReplace(p.kind, p.id);
    else openItem(p.kind, p.id);
    return true;
  }
  return false;
}

const GLOBAL = {
  settings: () => settingsSheet(),
  'sheet-close': () => closeSheet(),
  close: () => goBack(),
  open: (el) => openItem(el.dataset.kind, el.dataset.id),
  free: () => openItem('free'),
  care: (el) => careSheet(el.dataset.v || null),
  range: () => {
    closeSheet(true);
    show(rangeCtrl(), !(current && current.name === 'range'));
  },
  'fam-add': () => familyAdd(),
  'fam-menu': (el) => familyMenu(el.dataset.id),
  preset: (el) => {
    const relaxed = applyPreset(el.dataset.v);
    closeSheet(true);
    if (!afterRangeSaved(false) && current && current.refresh) current.refresh();
    if (relaxed) relaxedNote();
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
  // Arrow keys move between the unit tabs (the ARIA tabs pattern).
  const ut = e.target.closest && e.target.closest('.utab');
  if (ut && current && current.actions && current.actions.unit) {
    const ids = UNITS.map((u) => u.id);
    const i = ids.indexOf(ut.dataset.v);
    const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : null;
    if (j == null) return;
    e.preventDefault();
    const v = ids[(j + ids.length) % ids.length];
    current.actions.unit({ dataset: { v } }, null, true);
  }
});

async function requestWake() {
  // Still held? The browser lets go of it whenever the page is hidden, so then ask again.
  if (wakeLock && wakeLock.released === false) return;
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
  if (document.hidden) {
    if (current && current.pause) current.pause();
  } else if (current && current.name === 'home' && current.refresh) {
    // Back in the app, maybe the next morning: redraw so the greeting, week and locks are current.
    current.refresh();
  }
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

// ---------- Progress helpers ----------

const unitOf = (id) => UNITS.find((u) => u.lessons.includes(id));
const lessonDone = (id) => (id === 'range' ? !!store.data.range : ((store.data.progress[id] || {}).best || 0) >= 0.6);

// "Up next": the first lesson not done yet (range only until a range is set). With everything
// done, the lowest-scoring lesson still under a star, as { id, star: true }; null if all have stars.
function upNext() {
  const prog = store.data.progress;
  for (const id of ORDER) if (!lessonDone(id)) return { id, star: false };
  let pick = null;
  for (const id of ORDER) {
    if (id === 'range') continue;
    const b = prog[id].best;
    if (b < 0.85 && (!pick || b < prog[pick].best)) pick = id;
  }
  return pick ? { id: pick, star: true } : null;
}

function badgeHTML(id, isNext = false) {
  if (isNext) return '<span class="badge upnext">Up next</span>';
  if (id === 'range') return store.data.range ? `<span class="badge done">${ICON.check}Set</span>` : '<span class="badge new">New</span>';
  const p = store.data.progress[id];
  if (!p) return '<span class="badge new">New</span>';
  const pct = Math.round(p.best * 100);
  const al = `aria-label="Best ${pct} percent"`;
  if (p.best >= 0.85) return `<span class="badge star" ${al}>${ICON.star}${pct}%</span>`;
  if (p.best >= 0.6) return `<span class="badge done" ${al}>${ICON.check}${pct}%</span>`;
  return `<span class="badge" ${al}>${pct}%</span>`;
}

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// The range re-test nudge (warm-up spec §6.2): its message when due, otherwise null.
function rangeDue() {
  const d = store.data;
  if (!d.range || !d.rangeAt) return null;
  const moving = d.rangePrev && (Math.abs(d.range.low - d.rangePrev.low) >= 3 || Math.abs(d.range.high - d.rangePrev.high) >= 3);
  const age = daysBetween(d.rangeAt, today());
  const snoozed = d.nudge && d.nudge.range && daysBetween(d.nudge.range, today()) < 7;
  if (age < (moving ? 28 : 42) || snoozed) return null;
  if (d.rangeFrom && d.rangeFrom !== 'test') return 'You’re using a typical range. Want to find your own? It takes about a minute.';
  if (moving) return 'Your range has been changing lately. Check it again? It takes about a minute.';
  return `Voices grow, just like you. It’s been ${Math.floor(age / 7)} weeks since your range test. Check it again? It takes about a minute.`;
}

// ---------- Tabs: Today, Lessons, Songs ----------

let tab = TABS.includes(sget('nbn:tab')) ? sget('nbn:tab') : 'today';
const scrollMem = {};
window.addEventListener(
  'scroll',
  () => {
    if (current && current.name === 'home') scrollMem[tab] = window.scrollY;
  },
  { passive: true }
);

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5 || h >= 18) return 'Good evening';
  return h < 12 ? 'Good morning' : 'Good afternoon';
}

function stepsHTML(trail, done) {
  return `<ol class="steps" style="--n:${trail.length}">${trail
    .map(
      (s) =>
        `<li class="step${s.today && !done ? ' today' : ''}" aria-label="${esc(s.title)}${done ? ', done' : ''}"><i>${done ? ICON.check : ICON[s.icon]}</i>${esc(s.label)}</li>`
    )
    .join('')}</ol>`;
}

function heroHTML() {
  const trail = warmTrail();
  if (warmedUpToday()) {
    const warm = store.data.warm;
    const at = warm && warm.at ? clockTime(warm.at) : null;
    const lock = lockEnabled();
    return `<section class="hero done" aria-label="Daily warm-up, done today">
      ${STAFF}${hum('happy')}
      <span class="chip">${lock ? `${ICON.unlock}Songs unlocked` : `${ICON.check}Done today`}</span>
      <h2>Warmed up!</h2>
      <p class="sub">${at ? `Done at ${at}. ` : ''}${lock ? 'Songs are open until midnight.' : 'Your voice is ready.'}</p>
      <span class="stamp" aria-hidden="true">Done today</span>
      ${stepsHTML(trail, true)}
      <div class="hero-actions">
        <button class="btn primary big" data-act="tab" data-v="songs">${ICON.songs}Sing a song</button>
        <button class="btn small again" data-act="open" data-kind="warmup" data-id="warmup">Again</button>
      </div>
    </section>`;
  }
  const noRange = !store.data.range;
  const chip = noRange
    ? `<span class="chip">${ICON.sprout}Find your range first</span>`
    : !songsUnlocked()
      ? `<span class="chip">${ICON.lock}Warm up to unlock songs</span>`
      : '';
  return `<section class="hero${noRange ? ' no-range' : ''}" aria-label="Daily warm-up">
    ${STAFF}${hum('sing')}
    ${chip}
    <h2>${esc(WARMUP.title)}</h2>
    <p class="sub">${warmLength()}.<br>Today: <b>${esc(WARMUP.controlTitle())}</b></p>
    ${stepsHTML(trail, false)}
    <button class="btn ${noRange ? 'secondary' : 'primary'} big wide" data-act="open" data-kind="warmup" data-id="warmup">${ICON.play}Start warm-up</button>
    <button class="safe-line" data-act="care" aria-label="Sing easy and comfy. Stop if anything hurts. Look after your voice"><span>${ICON.heart}Sing easy and comfy. Stop if anything hurts.</span></button>
  </section>`;
}

function voiceStartHTML() {
  return `<section class="card voice-start" aria-label="Find your voice">
    <span class="eyebrow">Start here</span>
    <h2>Find your voice</h2>
    <p>Sing a low note and a high note. Every lesson then moves into your key. It takes about a minute.</p>
    <button class="btn primary big wide" data-act="range">${ICON.play}Find my range</button>
    <p class="presets-note">Or pick a typical range:</p>
    ${presetsHTML()}
    <p class="presets-note">${VOICE_CHANGING}</p>
  </section>`;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function weekHTML() {
  const wk = week(store.data.days);
  const n = wk.filter((x) => x.done).length;
  const note =
    n < 3 ? 'Aim for 3 days a week. Rest days are part of singing too.' : n === 3 ? 'Three days. That’s your goal for the week, met.' : `${n} days this week. Goal met, and then some.`;
  const sung = wk.map((x, i) => (x.done ? DAY_NAMES[i] : null)).filter(Boolean);
  const days = wk
    .map((x) => {
      const cls = x.done ? ' done' : x.isToday ? '' : x.future ? '' : ' past';
      return `<span class="day${cls}${x.isToday ? ' today' : ''}"><i>${x.done ? ICON.check : ''}</i>${x.label}</span>`;
    })
    .join('');
  return `<section class="card week-card" aria-label="This week">
    <div class="week-head"><h3>This week</h3><p><b>${n}</b> ${n === 1 ? 'day' : 'days'} sung</p></div>
    <div class="days" role="img" aria-label="${sung.length ? `Sung on ${sung.join(', ')}` : 'No days sung yet this week'}">${days}</div>
    <p class="note">${note}</p>
  </section>`;
}

function nextLessonHTML() {
  const nx = upNext();
  // With no range yet, the first-run card above already says what to do first.
  if (!nx || nx.id === 'range') return '';
  const L = LESSONS[nx.id];
  const lead = nx.star ? 'Go for a star' : 'Next lesson';
  return `<button class="row-card" data-act="open" data-kind="lesson" data-id="${nx.id}" aria-label="${lead}: ${esc(L.title)}. ${esc(L.blurb)}">
    <span class="gtile">${glyphSVG(L.glyph)}</span>
    <span><span class="eyebrow">${lead} · ${esc(unitOf(nx.id).title)}</span><span class="ttl">${esc(L.title)}</span><span class="blurb">${esc(L.blurb)}</span></span>
    <span class="go">${ICON.arrow}</span>
  </button>`;
}

function tilesHTML(due) {
  const r = store.data.range;
  const src = rangeSource();
  const voice = r
    ? `<button class="tile" data-act="range" aria-label="Your comfy notes: ${rangeText(r)}${src ? `, ${esc(src.toLowerCase())}` : ''}. ${due ? 'Check again' : 'Retest'}">
        <span class="eyebrow">Your comfy notes</span>
        <span class="vr">${letterName(r.low)}<span>to</span>${letterName(r.high)}</span>
        ${keyboardSVG(r, { compact: true })}
        <span class="tile-foot">${src ? `<span>${esc(src)}</span>` : ''}<b${due ? ' class="due"' : ''}>${due ? 'Check again' : 'Retest'}</b></span>
      </button>`
    : `<button class="tile" data-act="range" aria-label="Your comfy notes: not found yet. Find them">
        <span class="eyebrow">Your comfy notes</span>
        <span class="blurb">Not found yet</span>
        ${keyboardSVG(null, { compact: true })}
        <span class="tile-foot"><b>Find them</b></span>
      </button>`;
  return `<div class="tiles">
    ${voice}
    <button class="tile" data-act="free">
      <span class="free-ico">${ICON.wave}</span>
      <span class="ttl">Free sing</span>
      <span class="blurb">Make up a song and hear it back.</span>
    </button>
  </div>`;
}

function todayHTML() {
  const noRange = !store.data.range;
  const due = rangeDue();
  return `<header class="top">
      <div><p class="brandline">${MARK}Note by Note</p><h1>${greeting()}</h1>${SQUIGGLE}</div>
      <button class="icon-btn" data-act="settings" aria-label="Settings">${ICON.gear}</button>
    </header>
    ${noRange ? voiceStartHTML() : ''}
    ${heroHTML()}
    ${weekHTML()}
    ${nextLessonHTML()}
    ${tilesHTML(!!due)}
    ${
      due
        ? `<section class="card nudge" aria-label="Check your range">
            <i>${ICON.grow}</i>
            <div><p>${due}</p><div class="row"><button class="btn primary small" data-act="range">Check my range</button><button class="btn text small" data-act="nudge-later">Later</button></div></div>
          </section>`
        : ''
    }
    <p class="foot">${ICON.heart}Nothing you sing is recorded or leaves this phone.</p>`;
}

const UNIT_META = {
  start: { icon: 'sprout', tab: 'Start here', intro: 'Find your voice and your first notes.' },
  pitch: { icon: 'ladder', tab: 'Pitch', intro: 'Find the notes and move between them.' },
  breath: { icon: 'wind', tab: 'Breath skills', intro: 'Long notes, smooth slides, quick notes.' },
};

// The remembered unit, else the one holding "Up next".
function currentUnit() {
  const saved = sget('nbn:unit');
  if (UNIT_META[saved]) return saved;
  const nx = upNext();
  return nx ? unitOf(nx.id).id : 'start';
}

function lessonsHTML(unit) {
  const nx = upNext();
  const nextId = nx && !nx.star ? nx.id : null;
  const tabs = UNITS.map((u) => {
    const m = UNIT_META[u.id];
    const done = u.lessons.filter(lessonDone).length;
    const sel = u.id === unit;
    return `<button role="tab" id="utab-${u.id}" class="utab ${u.id}" aria-selected="${sel}"${sel ? ` aria-controls="unit-${u.id}"` : ''} tabindex="${sel ? 0 : -1}" data-act="unit" data-v="${u.id}" aria-label="${u.title}, ${done} of ${u.lessons.length} done"><span class="uico">${ICON[m.icon]}</span>${m.tab}<small>${done} of ${u.lessons.length}</small></button>`;
  }).join('');
  const u = UNITS.find((x) => x.id === unit);
  const list = u.lessons
    .map((id) => {
      const L = LESSONS[id];
      const isNext = id === nextId;
      return `<li><button class="lcard${isNext ? ' next' : ''}" data-act="open" data-kind="lesson" data-id="${id}">
        <span class="gtile">${glyphSVG(L.glyph)}<span class="num">${ORDER.indexOf(id) + 1}</span></span>
        <span><span class="ttl">${esc(L.title)}</span><span class="blurb">${esc(L.blurb)}</span></span>
        ${badgeHTML(id, isNext)}
      </button></li>`;
    })
    .join('');
  return `<header class="top"><div><h1>Lessons</h1><p class="sub">Always open. Go in order, or pick one.</p></div></header>
    <div class="unit-tabs" role="tablist" aria-label="Units">${tabs}</div>
    <section class="unit-page" role="tabpanel" id="unit-${unit}" aria-labelledby="utab-${unit}">
      <p class="intro">${UNIT_META[unit].intro}</p>
      <ol class="lesson-list">${list}</ol>
    </section>`;
}

// One song in a list. Family songs get a small grown-ups' button beside the row (PIN first).
function songRowHTML(s, locked, fam = false) {
  const gl = songGlyph(s);
  const diff = difficulty(s);
  const row = `<button class="srow" data-act="open" data-kind="song" data-id="${esc(s.id)}"${locked ? ` aria-label="${esc(s.title)}, ${diff}, locked until you warm up"` : ''}>
      <span class="gtile">${glyphSVG(gl, gl.songTonicOffset)}</span>
      <span><span class="ttl">${esc(s.title)}</span><span class="meta"><span class="diff ${diff.toLowerCase()}">${diff}</span></span></span>
      ${locked ? `<span class="lockpill">${ICON.lock}</span>` : badgeHTML('song:' + s.id)}
    </button>`;
  if (!fam) return `<li>${row}</li>`;
  return `<li class="fam-item">${row}<button class="fam-more" data-act="fam-menu" data-id="${esc(s.id)}" aria-label="Grown-ups: change ${esc(s.title)}">${ICON_MORE}</button></li>`;
}

const FAMILY_FOOT = 'These songs are private to your family. They stay on this phone and are never shared by the app.';

// Family songs: above the built-in songs once there are some; before that, a small card for
// grown-ups below them.
function familyHTML(locked) {
  if (familyState === 'loading') return '';
  if (familyState === 'unavailable') {
    return `<section class="card fam-empty" aria-labelledby="fam-h">
        <h2 id="fam-h">Family songs</h2>
        <p>${esc(LIBRARY_OFF)}</p>
      </section>`;
  }
  if (!familySongs.length) {
    return `<section class="card fam-empty" aria-labelledby="fam-h">
        <h2 id="fam-h">Family songs</h2>
        <p>Grown-ups can add a song they’ve bought, like a karaoke file or sheet music. It stays on this phone only.</p>
        <button class="btn secondary" data-act="fam-add">${ICON_PLUS}Add a song</button>
      </section>`;
  }
  const rows = familySongs.map((r) => songRowHTML(r.song, locked, true)).join('');
  return `<section class="family" aria-labelledby="fam-h">
      <div class="section-label"><h2 id="fam-h">Family songs</h2><p class="only-here">${ICON.lock}Only on this phone</p></div>
      <ol class="song-list${locked ? ' locked' : ''}">${rows}</ol>
      <div class="fam-foot">
        <p>${FAMILY_FOOT}</p>
        <button class="btn small secondary" data-act="fam-add">${ICON_PLUS}Add a song</button>
      </div>
    </section>`;
}

function songsHTML() {
  const locked = !songsUnlocked();
  const banner = locked
    ? `<section class="lock-banner" aria-label="Songs are locked until you warm up">
        <div><h2>${ICON.lock}Warm up first</h2></div>
        ${hum('sing')}
        <p>Singers warm up before songs, like stretching before sport.</p>
        <button class="btn primary big" data-act="open" data-kind="warmup" data-id="warmup">${ICON.play}Warm up · about&nbsp;${WARMUP.minutes}&nbsp;min</button>
        <button class="care" data-act="care" data-v="rest">Throat sore today? Rest your voice</button>
      </section>`
    : '';
  const rows = SONGS.map((s) => songRowHTML(s, locked)).join('');
  const hasFamily = familyState === 'ready' && familySongs.length > 0;
  return `<header class="top"><div><h1>Songs</h1><p class="sub">Each one opens in your key.</p></div></header>
    ${banner}
    ${hasFamily ? familyHTML(locked) : ''}
    <div class="section-label"><h2>All songs</h2><p>${SONGS.length} songs</p></div>
    <ol class="song-list${locked ? ' locked' : ''}">${rows}</ol>
    ${hasFamily ? '' : familyHTML(locked)}`;
}

function tabbarHTML(active) {
  const locked = !songsUnlocked();
  const t = (v, name, extra = '', aria = '') =>
    `<button class="tab" data-act="tab" data-v="${v}"${v === active ? ' aria-current="page"' : ''}${aria ? ` aria-label="${aria}"` : ''}><span class="tab-ico">${ICON[v]}</span>${name}${extra}</button>`;
  return `<nav class="tabbar" aria-label="Main">${t('today', 'Today')}${t('lessons', 'Lessons')}${t(
    'songs',
    'Songs',
    locked ? `<span class="tab-lock" aria-hidden="true">${ICON.lock}</span>` : '',
    locked ? 'Songs, locked until you warm up' : ''
  )}</nav>`;
}

function homeCtrl() {
  document.body.dataset.screen = 'home';
  const render = () => {
    const html = tab === 'lessons' ? lessonsHTML(currentUnit()) : tab === 'songs' ? songsHTML() : todayHTML();
    root.innerHTML = `<main class="tabscreen" id="main">${html}</main>${tabbarHTML(tab)}`;
  };
  render();
  const ctrl = {
    name: 'home',
    actions: {
      tab: (el) => {
        const v = el.dataset.v;
        if (!TABS.includes(v)) return;
        if (v === tab) {
          window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
          return;
        }
        const a = document.activeElement;
        const keepFocus = a && a.closest && a.closest('.tabbar');
        scrollMem[tab] = window.scrollY;
        tab = v;
        sset('nbn:tab', v);
        render();
        window.scrollTo(0, scrollMem[v] || 0);
        if (keepFocus) root.querySelector(`.tab[data-v="${v}"]`).focus({ preventScroll: true });
      },
      unit: (el, e, fromKeys = false) => {
        const v = el.dataset.v;
        if (!UNIT_META[v]) return;
        const a = document.activeElement;
        const keepFocus = fromKeys || (a && a.closest && a.closest('.utab'));
        sset('nbn:unit', v);
        ctrl.refresh();
        if (keepFocus) root.querySelector(`.utab[data-v="${v}"]`).focus({ preventScroll: true });
      },
      'nudge-later': () => {
        store.putOffNudge('range');
        ctrl.refresh();
      },
    },
    refresh() {
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
    },
    scrollTop: () => scrollMem[tab] || 0,
    probe: () => ({ screen: 'home', tab }),
  };
  return ctrl;
}

// ---------- Player (lessons, warm-up, songs) ----------

function buildPlan(kind, id, mode) {
  const range = store.data.range;
  if (kind === 'warmup') {
    const date = new Date();
    return { id: 'warmup', title: WARMUP.title, ctl: controlFor(date), steps: WARMUP.build(range, date) };
  }
  if (kind === 'song') {
    const song = findSong(id);
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
    // Built-in songs lead on to the next built-in one, family songs to the next family song.
    const list = isFamilySongId(id) ? familySongs.map((r) => r.song) : SONGS;
    const i = list.findIndex((s) => s.id === id);
    const nx = i >= 0 ? list[i + 1] : null;
    return nx ? { kind: 'song', id: nx.id, title: nx.title } : null;
  }
  return null;
}

// Cue line with a phase badge (ear = listen, mic = your turn, wind = breathe). The first
// “curly-quoted” sound goes in its own chip, so a child who can't read it can still find it.
function cueHTML(text) {
  // Punctuation straight after the chip stays on its line.
  return esc(text).replace(/(“[^”]*”)([.,;:!?…]*)/, (m, q, p) => `<span class="say-w"><span class="say">${q}</span>${p}</span>`);
}
const CUE_MARKUP = `<p class="cue" id="cue" aria-live="polite"><span class="phase" aria-hidden="true"></span><span id="cueText"></span></p>`;
function cueWriter(cueEl) {
  const textEl = cueEl.querySelector('#cueText');
  const badge = cueEl.querySelector('.phase');
  let lastText = null;
  let lastPhase = null;
  return (text, phase = '') => {
    if (text !== lastText) {
      lastText = text;
      textEl.innerHTML = cueHTML(text);
    }
    if (phase !== lastPhase) {
      lastPhase = phase;
      cueEl.dataset.phase = phase;
      badge.innerHTML = PHASE_ICON[phase] || '';
    }
  };
}

const BTN_LOOK = {
  start: ['btn primary big wide', () => `${ICON.play}Start`],
  again: ['btn primary big wide', () => `${ICON.play}Start again`],
  carry: ['btn primary big wide', () => `${ICON.play}Carry on`],
  stop: ['btn quiet big wide', () => `${ICON.stop}Stop`],
  done: ['btn quiet big wide', () => 'Done'],
};
function setBtn(btn, look) {
  if (btn.dataset.look === look) return;
  btn.dataset.look = look;
  btn.className = BTN_LOOK[look][0];
  btn.innerHTML = BTN_LOOK[look][1]();
}

// Tune pill under the note readout. Only touches the DOM when what it shows changes.
function tuneWriter(el) {
  let last = '';
  return (cls, html) => {
    const k = cls + '|' + html;
    if (k === last) return;
    last = k;
    el.className = cls;
    el.innerHTML = html;
  };
}

const upper = (w) => w[0].toUpperCase() + w.slice(1);

// The tune pill with no note to aim at: how close the voice is to the nearest note, in words.
function nearestWords(m) {
  const c = (m - Math.round(m)) * 100;
  return Math.abs(c) <= 15 ? 'Right on the note' : upper(offWords(c));
}

function levelOf(r) {
  return r ? clamp01((20 * Math.log10(r.rms + 1e-9) + 58) / 46) : 0;
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
  let tol = tolerance();
  // Warm-up only: the finished steps kept after an interruption, for "Carry on" ({ results, at }).
  let kept = null;
  // Move cards (a step with nothing to sing): which card, and when it runs out (audio clock).
  let cardIdx = 0;
  let cardEnd = 0;
  let lastSecs = -1;
  // The warm-up is always hear-then-sing, whatever the headphones setting: nothing plays while
  // the child sings, so sound from the phone's speaker can't count as their voice and open songs.
  const guideWhileSinging = () => kind !== 'warmup' && S().headphones;
  // The song a locked tap asked for, offered on the warm-up's done sheet.
  const forSong = kind === 'warmup' ? pendingSong : null;
  if (kind === 'warmup') pendingSong = null;
  const shortCredit = plan.song && plan.song.credit ? plan.song.credit.split(' · ')[0] : '';

  document.body.dataset.screen = 'player';
  root.innerHTML = `<section class="player" data-state="ready">
    <header class="p-head">
      <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      <div class="p-title"><h2>${esc(plan.title)}</h2><p id="p-sub"></p></div>
      ${kind === 'warmup' ? '<span></span>' : `<button class="icon-btn hp${S().headphones ? ' on' : ''}" data-act="hp" aria-pressed="${S().headphones}" aria-label="Headphones">${ICON.phones}</button>`}
    </header>
    <div class="p-progress" id="prog" role="img" hidden></div>
    ${CUE_MARKUP}
    <div class="lane-wrap">
      <canvas id="lane"></canvas>
      <div class="countin" id="countin" hidden></div>
      <div class="between" id="between" hidden></div>
      <div class="move" id="move" hidden></div>
    </div>
    <p class="lyrics" id="lyrics" ${plan.song ? '' : 'hidden'}></p>
    <div class="readout">
      <span class="note-now" id="note"></span>
      <span class="note-info"><span class="tune" id="cents">Tap Start to begin</span><span class="level"><i id="level"></i></span></span>
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
      <button class="btn primary big wide" data-act="start" id="startBtn"></button>
      <button class="btn text wide" data-act="restart" id="restartBtn" hidden>Start over</button>
    </div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  const el = {
    player: $('.player'),
    move: $('#move'),
    restart: $('#restartBtn'),
    cue: $('#cue'),
    sub: $('#p-sub'),
    note: $('#note'),
    cents: $('#cents'),
    level: $('#level'),
    lyrics: $('#lyrics'),
    countin: $('#countin'),
    between: $('#between'),
    start: $('#startBtn'),
    prog: $('#prog'),
  };
  const setCue = cueWriter(el.cue);
  const setTune = tuneWriter(el.cents);
  const lane = new Lane($('#lane'));
  const step = () => plan.steps[stepIdx];
  // A move step has nothing to sing and its cards cover the lane, so it gets a plain free lane.
  const modelFor = (st) =>
    st.kind === 'move'
      ? { events: [], free: true, center: (store.data.range.low + store.data.range.high) / 2 }
      : {
          events: st.events,
          tonic: st.tonic,
          minor: !!st.minor,
          names: S().names,
        };
  lane.setModel(modelFor(step()));
  const unwatch = watchSize(lane, $('.lane-wrap'));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => lane.readColors();
  if (mq.addEventListener) mq.addEventListener('change', onTheme);

  // Progress strip: one segment per step; a one-step exercise gets one per key it climbs
  // through (one per line for songs). Hidden when there would only be one segment.
  let seg = null;
  let progKey = '';
  let progAt = 0;
  function segmentsFor() {
    if (plan.steps.length > 1) return { word: 'Step', n: plan.steps.length };
    const st = plan.steps[0];
    const runs = [];
    for (const ev of st.events) {
      const k = plan.song ? ev.phrase : keyOf(ev, st);
      const last = runs[runs.length - 1];
      if (last && last.k === k) continue;
      runs.push({ k, t0: ev.t });
    }
    runs.forEach((r, i) => (r.t1 = i + 1 < runs.length ? runs[i + 1].t0 : st.end));
    return { word: plan.song ? 'Line' : 'Key', n: runs.length, runs };
  }
  // idx: the segment under way (-1 before starting); frac: how far through it, 0 to 1.
  function setProgress(idx, frac = 0, force = false) {
    if (seg.n < 2) {
      el.prog.hidden = true;
      return;
    }
    const key = `${seg.n}:${idx}`;
    if (key !== progKey) {
      progKey = key;
      el.prog.hidden = false;
      el.prog.style.setProperty('--n', seg.n);
      el.prog.innerHTML = Array.from({ length: seg.n }, (_, i) => `<i${i < idx ? ' class="done"' : i === idx ? ' class="now"' : ''}></i>`).join('');
      el.prog.setAttribute('aria-label', idx < 0 ? `${seg.n} ${seg.word.toLowerCase()}s` : `${seg.word} ${Math.min(idx + 1, seg.n)} of ${seg.n}`);
      force = true;
    }
    const now = performance.now();
    if (!force && now - progAt < 100) return;
    progAt = now;
    const cur = el.prog.querySelector('.now');
    if (cur) cur.style.setProperty('--p', `${(clamp01(frac) * 100).toFixed(1)}%`);
  }
  function progressAt(t) {
    if (!seg.runs) return setProgress(stepIdx, t / step().end);
    let i = 0;
    while (i + 1 < seg.runs.length && seg.runs[i + 1].t0 <= t) i++;
    const r = seg.runs[i];
    setProgress(i, (t - r.t0) / Math.max(0.01, r.t1 - r.t0));
  }

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
    if (st.kind === 'move' && state === 'moving') return `${st.title} · ${stepIdx + 1} of ${plan.steps.length} · ${st.cards[cardIdx].title}`;
    const parts = [];
    if (plan.steps.length > 1) parts.push(`Step ${stepIdx + 1} of ${plan.steps.length} · ${st.title}`);
    const c = cueAt(st, Math.max(0, t));
    if (c) parts.push(c);
    if (st.vowel && !plan.song) parts.push(`on “${st.vowel}”`);
    if (shortCredit) parts.push(shortCredit);
    return parts.join(' · ');
  }

  function previewTime(st) {
    const first = st.events.length ? st.events[0].t : 0;
    return first - (0.5 * (lane.w - lane.playX)) / lane.pps;
  }

  function setReady() {
    state = 'ready';
    el.player.dataset.state = 'ready';
    setCue(step().intro || '', '');
    setText(el.sub, subtitle(0));
    setBtn(el.start, kept ? 'carry' : results.length ? 'again' : 'start');
    el.restart.hidden = !kept;
    el.countin.hidden = true;
    el.between.hidden = true;
    showStepKind(step());
    // Before Start, a move step shows what's coming (its first picture) instead of an empty lane.
    if (step().kind === 'move') {
      const st = step();
      el.move.innerHTML = `<div class="move-pic">${MOVE_ART[st.cards[0].id] || ''}</div>
        <h3>${esc(st.title)}</h3>
        <p>${st.cards.length} quick moves for your body and breath. Then it’s time to sing.</p>
        <div class="move-foot"><span class="move-dots" aria-hidden="true">${st.cards.map(() => '<i></i>').join('')}</span></div>`;
      el.move.hidden = false;
    } else el.move.hidden = true;
    lastLyr = '';
    setProgress(kept ? kept.at : -1);
    renderLyrics(previewTime(step()));
  }

  // data-step="move" hides the lane's canvas (its panel sits in the same box).
  function showStepKind(st) {
    el.player.dataset.step = st.kind === 'move' ? 'move' : 'sing';
  }

  function clearHits() {
    for (const st of plan.steps) for (const e of st.events) delete e.hits;
  }

  function rebuild() {
    plan = buildPlan(kind, id, mode);
    seg = segmentsFor();
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
    setBtn(el.start, 'stop');
    el.restart.hidden = true;
    el.between.hidden = true;
    showStepKind(st);
    if (st.kind === 'move') return startMove(st);
    audio.openBus();
    audio.tracker.reset();
    T0 = audio.now() + LEAD;
    state = 'running';
    el.player.dataset.state = 'running';
  }

  // ---- Move cards: a picture, what to do, a countdown ring and Next. The mic stays on, but the
  // note readout is hidden (there's nothing to sing), nothing is kept or scored, and the warm-up
  // check skips the step.
  let moveBits = null;
  function startMove(st) {
    state = 'moving';
    el.player.dataset.state = 'moving';
    el.countin.hidden = true;
    T0 = audio.now();
    el.move.innerHTML = `<div class="move-pic"></div>
      <h3></h3>
      <p aria-live="polite"></p>
      <div class="move-foot"><span aria-hidden="true">${moveRing(0, 0)}</span><span class="move-dots" role="img"></span></div>
      <button class="btn primary" data-act="move-next">Next</button>`;
    moveBits = {
      pic: el.move.querySelector('.move-pic'),
      h: el.move.querySelector('h3'),
      say: el.move.querySelector('p'),
      dots: el.move.querySelector('.move-dots'),
      arc: el.move.querySelector('.move-ring circle:last-of-type'),
      secs: el.move.querySelector('.move-ring b'),
    };
    el.move.hidden = false;
    cardIdx = 0;
    showCard(st);
    setCue(st.title, '');
  }

  function showCard(st) {
    const card = st.cards[cardIdx];
    cardEnd = audio.now() + card.secs;
    lastSecs = -1;
    moveBits.pic.innerHTML = MOVE_ART[card.id] || '';
    moveBits.h.textContent = card.title;
    moveBits.say.innerHTML = cueHTML(card.say);
    moveBits.dots.innerHTML = st.cards.map((_, i) => `<i class="${i < cardIdx ? 'done' : i === cardIdx ? 'on' : ''}"></i>`).join('');
    moveBits.dots.setAttribute('aria-label', `Card ${cardIdx + 1} of ${st.cards.length}`);
    setText(el.sub, subtitle(0));
    moveTick(st, audio.now());
  }

  function moveTick(st, now) {
    const card = st.cards[cardIdx];
    const left = cardEnd - now;
    const frac = clamp01(1 - left / card.secs);
    const secs = Math.max(0, Math.ceil(left));
    if (secs !== lastSecs) {
      lastSecs = secs;
      setText(moveBits.secs, String(secs));
    }
    moveBits.arc.setAttribute('stroke-dashoffset', (163.4 * (1 - frac)).toFixed(1));
    setProgress(stepIdx, (cardIdx + frac) / st.cards.length);
    return left;
  }

  // Next card, or on to the next step after the last one.
  function nextCard() {
    const st = step();
    if (cardIdx + 1 < st.cards.length) {
      cardIdx++;
      showCard(st);
    } else {
      el.move.hidden = true;
      endStep();
    }
  }

  function begin() {
    tol = tolerance();
    kept = null;
    results = [];
    stepIdx = 0;
    clearHits();
    startStep();
    requestWake();
  }

  // After an interruption, the warm-up picks up at the step it was on: the steps already
  // finished still count, so a phone call doesn't cost the child their warm-up.
  function carryOn() {
    const k = kept;
    if (!k) return begin();
    kept = null;
    tol = tolerance();
    results = k.results;
    stepIdx = k.at;
    for (const st of plan.steps.slice(k.at)) for (const e of st.events) delete e.hits;
    startStep();
    requestWake();
  }

  // keep: { results, at } to offer "Carry on" (warm-up only), else null.
  function stop(message, keep = null) {
    audio.closeBus();
    releaseWake();
    results = [];
    kept = keep;
    stepIdx = keep ? keep.at : 0;
    frames = [];
    live = null;
    clearHits();
    lane.setModel(modelFor(step()));
    setReady();
    if (message) setCue(message, '');
  }

  function schedule(st, t, now) {
    const A = st.audio;
    while (ai < A.length && A[ai].t < t + 0.7) {
      const a = A[ai++];
      if (a.hp && !guideWhileSinging()) continue;
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
      f.c = x.d * 100;
      f.octave = x.octave;
      f.k = creditFor(f.c, tol, ev.m2 != null ? 2 : 1);
      f.fam = family(ev.m, keyOf(ev, st));
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

  // Badge for the cue: sing while singing or about to (0.6 s), listen while the app plays
  // or counts in, breathe while the cue says to.
  function phaseOf(text, t, cur, next) {
    if (t < 0) return 'listen';
    if (cur ? cur.role === 'sing' : next && next.role === 'sing' && next.t - t <= 0.6) return 'sing';
    if (cur && cur.role === 'listen') return 'listen';
    if (text.startsWith('Breathe')) return 'breathe';
    if (!cur && next && next.role === 'listen') return 'listen';
    return '';
  }

  function updateCue(st, t, cur, next) {
    let text;
    if (t < 0) text = 'Get ready';
    else if (cur) {
      if (cur.role === 'listen') text = cur.m2 != null ? 'Listen to the slide' : 'Listen';
      else if (cur.m2 != null) text = 'Your turn: slide with it';
      else if (cur.hold) text = `${cur.swell ? 'Grow, then shrink' : 'Hold it'} · ${Math.max(1, Math.ceil(cur.t + cur.d - t))}`;
      else if (plan.song) text = 'Your turn';
      else text = `Your turn: sing on “${st.vowel}”`;
    } else if (!next) text = 'Nicely done';
    else if (next.role === 'sing') text = 'Breathe in…';
    else text = 'Listen';
    setCue(text, phaseOf(text, t, cur, next));
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

  // st and t say which key to name notes in: the one at that moment of that step.
  // f: this moment's frame from decorate(), while running. On a note to sing, the readout agrees
  // with the bar: it names the note in the bar's octave (the right note sung higher or lower
  // counts) and gives the bar's verdict.
  function readout(r, f, st, t) {
    let noteTxt = state === 'running' ? '–' : '';
    if (r && r.m != null) {
      const solfa = S().names === 'solfa';
      const tonic = keyAt(st, t);
      const key = { tonic, flats: prefersFlats(tonic, !!st.minor), names: S().names, octave: !solfa };
      const onNote = f && f.k != null;
      noteTxt = label(onNote ? f.dm : r.m, key);
      if (onNote) setTune(f.k === 1 ? 'tune ok' : 'tune near', f.k === 1 ? `${ICON.check}In tune` : upper(offWords(f.c)));
      else setTune('tune', nearestWords(r.m));
    } else {
      setTune('tune', audio.micOn ? 'Listening…' : state === 'ready' ? 'Tap Start to begin' : 'Mic is off');
    }
    setText(el.note, noteTxt);
    const lv = levelOf(r);
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
      const i = stepIdx + 1;
      const nx = plan.steps[i];
      lane.setModel(modelFor(nx));
      showStepKind(nx);
      const trail = plan.id === 'warmup' ? warmTrail(plan.ctl) : [];
      const pic = trail[i] ? `<span class="bico">${ICON[trail[i].icon]}</span>` : '';
      el.between.innerHTML = `${pic}<span class="eyebrow">Up next · step ${i + 1} of ${plan.steps.length}</span><h3>${esc(nx.title)}</h3><p>${cueHTML(nx.intro || '')}</p><span class="between-count" id="bcount" aria-hidden="true">4</span><button class="btn text" data-act="skip">Start now</button>`;
      el.between.hidden = false;
      betweenUntil = audio.now() + 4;
      setCue('Nice. Take a breath.', '');
      setProgress(i, 0, true);
    } else finish();
  }

  function finish() {
    state = 'done';
    el.player.dataset.state = 'done';
    audio.closeBus();
    releaseWake();
    const sum = summarize(results);
    if (plan.id === 'warmup') return finishWarmup(sum);
    // A run the mic barely heard still shows its result, but doesn't count as practice.
    const heard = wasHeard(sum);
    const prev = store.data.progress[plan.id];
    const prevBest = prev ? prev.best : null; // read before this run is recorded
    if (heard) store.record(plan.id, sum.score);
    setBtn(el.start, 'again');
    setCue(heard ? verdict(sum.score) : NOT_HEARD, '');
    setProgress(seg.n, 1, true);
    resultsSheet(sum, heard, prevBest);
  }

  // settled: re-shown after the care sheet, so no confetti or stamp animation the second time.
  function resultsSheet(sum, heard, prevBest, settled = false) {
    const pct = Math.round(sum.score * 100);
    // Numbers a child can read. Low or high goes in the tip, in words; cents stay in the report.
    const stats = [
      [`${sum.landed}/${sum.total}`, 'notes landed'],
      [`${Math.round(sum.coverage * 100)}%`, 'voice heard'],
    ];
    if (sum.steadiness != null) stats.push([`${Math.round(sum.steadiness * 100)}%`, 'held steady']);
    const nx = nextAfter(kind, id);
    // Celebrate honestly (spec §6.9): only what the mic heard, and only good runs or a real new best.
    const newBest = heard && prevBest != null && sum.score > prevBest;
    const good = heard && sum.score >= 0.65;
    const celebrate = heard && (sum.score >= 0.85 || (newBest && sum.score >= 0.65));
    const stars = sum.score >= 0.85 ? 3 : sum.score >= 0.65 ? 2 : sum.score >= 0.4 ? 1 : 0;
    const verdictHTML = !heard
      ? `<span class="verdict">${NOT_HEARD}</span>`
      : good
        ? `<span class="stamp big">${verdict(sum.score)}!</span>`
        : `<span class="verdict">${verdict(sum.score)}</span>`;
    const care = plan.song || plan.id === 'sirens' || plan.id === 'warmup';
    const html = `
      <div class="sheet-head"><p class="eyebrow">${esc(plan.title)}</p>${newBest ? `<span class="pb">${ICON.star}New best</span>` : ''}</div>
      <div class="score-row">
        <div class="score-col"><span class="score">${pct}<small>%</small></span>${heard ? rating(stars) : ''}</div>
        ${verdictHTML}
      </div>
      <div class="stats${stats.length === 2 ? ' two' : ''}">${stats.map(([b, s]) => `<div><b>${esc(b)}</b><span>${s}</span></div>`).join('')}</div>
      <canvas class="replay" aria-label="Your pitch across the whole exercise"></canvas>
      <p class="tip">${esc(heard ? tip(sum) : 'The mic hardly heard you that time, so this one won’t count toward your practice days or best score. Hold the phone a little closer, sing out, and try again.')}</p>
      ${care ? '<p class="care-line">Throat scratchy or sore? Stop for today and have a drink of water.</p>' : ''}
      ${plan.song ? `<p class="care-line">${esc(plan.song.credit)}</p>` : ''}
      <div class="sheet-actions">
        <button class="btn ${heard ? 'secondary' : 'primary'}" data-act="again">Try again</button>
        ${nx ? `<button class="btn ${heard ? 'primary' : 'secondary'}" data-act="next"><span>Next: ${esc(nx.title)}</span></button>` : `<button class="btn ${heard ? 'primary' : 'secondary'}" data-act="done">Done</button>`}
      </div>
      <div class="sheet-links">
        <button class="care-link" data-act="care">${ICON.heart}Look after your voice</button>
      </div>
      ${GROWN_UPS}`;
    const width = Math.min(window.innerWidth, 560);
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
        care: () => careSheet(null, () => resultsSheet(sum, heard, prevBest, true)),
      },
      {
        cls: `results${settled ? ' settled' : ''}`,
        label: 'Results',
        onClose: () => stop(),
        before: celebrate && !settled ? confetti(BURST, [75, 128], width) : '',
      }
    );
    // "Next: Minor mood" on one line if it fits. If not, a small "Next" goes above the title, so the
    // title isn't split after "Next: Minor". A title that still needs two lines ("Twinkle, Twinkle,
    // Little Star") becomes "Next song".
    const nextBtn = nx && bd.querySelector('[data-act="next"]');
    if (nextBtn && lineCount(nextBtn.querySelector('span')) > 1) {
      nextBtn.setAttribute('aria-label', `Next ${nx.kind}: ${nx.title}`);
      nextBtn.innerHTML = `<span class="two-line"><small>Next</small><span>${esc(nx.title)}</span></span>`;
      if (lineCount(nextBtn.querySelector('.two-line > span')) > 1) nextBtn.innerHTML = `<span>Next ${nx.kind}</span>`;
    }
    requestAnimationFrame(() => drawOverview(bd.querySelector('.replay'), results));
  }

  // ---- The daily warm-up's ending: it counts only if the app heard every sung part and the
  // voice went up and down with the notes (warmupCheck).
  // Then it opens songs until midnight and counts as a practice day. No score headline: it isn't a test.
  function finishWarmup(sum) {
    const check = warmupCheck(results);
    if (check.ok) {
      store.setWarm({ day: today(), at: Date.now(), heard: +check.coverage.toFixed(2), ctl: plan.ctl });
      store.record('warmup', sum.score);
      cheer();
    }
    setBtn(el.start, 'again');
    setCue(check.ok ? 'Warmed up' : check.heard ? NOT_FOLLOWED : NOT_HEARD, '');
    setProgress(seg.n, 1, true);
    warmupSheet(sum, check);
  }

  // A quiet rising do, mi, sol, do from the five-note scale's first key.
  function cheer() {
    if (!audio.ctx) return;
    const scale = plan.steps.find((st) => st.title === 'Five-note scale');
    const T = scale ? scale.tonic : 60;
    audio.openBus();
    const t0 = audio.now() + 0.1;
    [0, 4, 7, 12].forEach((d, i) => audio.guide(T + d, t0 + i * 0.17, i === 3 ? 0.6 : 0.2, 0.11));
  }

  // The day's control move, measured for the done sheet: [value, what it is].
  function controlStat(sum, check) {
    const p = check.perStep.find((x) => x.title === CONTROL_TITLES[plan.ctl]);
    if (plan.ctl === 'hold') return [sum.longest != null ? `${sum.longest.toFixed(1)} s` : '–', 'longest steady hold'];
    if (plan.ctl === 'swell') return [sum.steadiness != null ? `${Math.round(sum.steadiness * 100)}%` : '–', 'held steady'];
    if (plan.ctl === 'bounce') return [p ? `${p.heard} of ${p.total}` : '–', 'bouncy “ha” notes'];
    return [p ? `${p.heard} of ${p.total}` : '–', 'slides'];
  }

  // The range re-test row on the done sheet: when the re-test is due, or the range looks narrow
  // (a warm voice is the best time to test). "Later" puts both off for a week.
  function warmNudge() {
    const d = store.data;
    if (!d.range) return null;
    const due = rangeDue();
    if (due) return due;
    const snoozed = d.nudge && d.nudge.range && daysBetween(d.nudge.range, today()) < 7;
    if (!snoozed && d.range.high - d.range.low < 9) return 'Your range looks quite narrow. Most voices can do more once they’re warm. Check it now?';
    return null;
  }

  // settled: shown again (after the care sheet or "Later"), so no confetti the second time.
  function warmupSheet(sum, check, settled = false) {
    const lock = lockEnabled();
    const song = forSong && findSong(forSong.id);
    const acts = {
      again: () => {
        closeSheet(true);
        stop();
      },
      done: () => {
        closeSheet(true);
        goBack();
      },
      songs: () => {
        closeSheet(true);
        if (song) openItemReplace('song', song.id);
        else goToTab('songs');
      },
      copy: (btn) => copyReport(btn, sum),
      care: () => careSheet(null, () => warmupSheet(sum, check, true)),
      'nudge-later': () => {
        store.putOffNudge('range');
        warmupSheet(sum, check, true);
      },
    };
    const links = `<div class="sheet-links">
        <button class="care-link" data-act="care">${ICON.heart}Look after your voice</button>
      </div>
      ${GROWN_UPS}`;
    if (!check.ok) {
      // Sound was heard, but it didn't move with the notes like a voice (a hum, a drone, a speaker).
      const offTune = check.heard;
      // Songs may already be open from an earlier warm-up today; this one just didn't count.
      const songsLine = !lock ? '' : warmedUpToday() ? '<p>Songs are still open from your earlier warm-up.</p>' : '<p>Songs open after a warm-up I can hear.</p>';
      openSheet(
        `<p class="eyebrow">${esc(WARMUP.title)}</p>
         ${hum('sing')}
         <h2>${offTune ? NOT_FOLLOWED : NOT_HEARD}</h2>
         ${!offTune && check.missed.length ? `<p>I didn’t hear you in:</p><div class="missed">${check.missed.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
         <p>${
           offTune
             ? 'I heard sound, but not a voice singing along with the notes. Listen to each part, then sing it back: up when it goes up, down when it goes down.'
             : 'Sing each note right to the end of its bar, at a medium volume, with the phone about an arm’s length away.'
         }</p>
         ${songsLine}
         <div class="sheet-actions">
           <button class="btn secondary" data-act="done">Done</button>
           <button class="btn primary" data-act="again">Try again</button>
         </div>
         ${links}`,
        acts,
        { cls: 'warm-miss', label: 'Warm-up not heard', key: 'warm', onClose: () => stop() }
      );
      return;
    }
    const [v, what] = controlStat(sum, check);
    const nudge = warmNudge();
    const width = Math.min(window.innerWidth, 560);
    const bd = openSheet(
      `<p class="eyebrow">${esc(WARMUP.title)}</p>
       ${hum('happy')}
       <h2>Warmed up!</h2>
       ${lock ? `<span class="unlock-chip">${ICON.unlock}Songs are open until midnight</span>` : '<p>Your voice is ready.</p>'}
       <div class="stats two">
         <div><b>${Math.round(check.coverage * 100)}%</b><span>voice heard</span></div>
         <div><b>${esc(v)}</b><span>${esc(what)}</span></div>
       </div>
       ${
         nudge
           ? `<section class="card nudge" aria-label="Check your range">
               <i>${ICON.grow}</i>
               <div><p>${esc(nudge)}</p><div class="row"><button class="btn secondary small" data-act="range">Check my range</button><button class="btn text small" data-act="nudge-later">Later</button></div></div>
             </section>`
           : ''
       }
       <div class="sheet-actions">
         <button class="btn secondary" data-act="done">Done</button>
         <button class="btn primary" data-act="songs"${song ? ` aria-label="Sing a song: ${esc(song.title)}"` : ''}>${ICON.songs}<span>${song ? esc(song.title) : 'Sing a song'}</span></button>
       </div>
       <p class="care-line">Throat scratchy or sore? Stop for today and have a drink of water.</p>
       ${links}`,
      acts,
      {
        cls: `warm-done${settled ? ' settled' : ''}`,
        label: 'Warm-up done',
        key: 'warm',
        onClose: () => stop(),
        before: settled ? '' : confetti(AROUND, [50, 130], width),
      }
    );
    // The main button names the song the child tapped while songs were locked, if the title fits
    // on one line. Otherwise it says "Sing a song" (and still opens that song).
    if (song) fitLabel(bd.querySelector('[data-act="songs"]'), 'Sing a song');
  }

  async function copyReport(btn, sum) {
    const range = store.data.range;
    // A family song's words never leave the app; its title is marked as a family song.
    const fam = !!(plan.song && isFamilySongId(plan.song.id));
    const how = plan.song ? (mode === 'learn' ? 'line by line' : 'sung through') : '';
    const text = reportText({
      title: plan.title + (fam ? ` (family song, ${how})` : how ? ` (${how})` : ''),
      family: fam,
      sum,
      range,
      rangeFrom: store.data.rangeFrom,
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
        if (state === 'running' || state === 'between' || state === 'moving') return stop();
        audio.unlock();
        const go = kept ? carryOn : begin;
        if (!audio.micOn) return micSheet(go);
        go();
      },
      restart: () => {
        kept = null;
        audio.unlock();
        if (!audio.micOn) return micSheet(begin);
        begin();
      },
      'move-next': () => {
        if (state === 'moving') nextCard();
      },
      hp: (btn) => {
        const on = !S().headphones;
        store.setSetting('headphones', on);
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
        if (plan.song && state === 'ready') rebuild();
        if (state === 'ready') setCue(on ? 'Headphones on: you’ll hear the guide while you sing.' : 'Headphones off: you’ll hear each part first, then sing.', '');
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
        readout(r, r ? live : null, st, t);
        progressAt(Math.max(0, t));
        if (t > st.end + 0.35) endStep();
      } else if (state === 'moving') {
        // A soft accented click when a card runs out, so non-readers hear when to switch.
        if (moveTick(step(), now) <= 0) {
          audio.play({ kind: 'click', accent: true }, now + 0.01);
          nextCard();
        }
      } else if (state === 'between') {
        const nx = plan.steps[stepIdx + 1];
        const left = betweenUntil - now;
        const bc = el.between.querySelector('#bcount');
        if (bc) setText(bc, String(Math.max(1, Math.ceil(left))));
        lane.draw(previewTime(nx), [], null);
        readout(r, null, nx, previewTime(nx));
        if (left <= 0) {
          stepIdx++;
          startStep();
        }
      } else {
        const t = previewTime(step());
        const dot = r && r.m != null ? { t, m: r.m, dm: r.m } : null;
        lane.draw(t, [], dot);
        readout(r, null, step(), t);
      }
    },
    pause() {
      if (state !== 'running' && state !== 'between' && state !== 'moving') return;
      const at = state === 'between' ? stepIdx + 1 : stepIdx;
      const keep = plan.id === 'warmup' && results.length ? { results: results.slice(), at } : null;
      if (keep) stop('Paused while you were away. Tap Carry on to keep going.', keep);
      else stop('Stopped while you were away. Tap Start to go again.');
    },
    probe() {
      const st = step();
      if (state === 'moving') return { state, t: audio.now() - T0, step: stepIdx, card: cardIdx, role: null, target: null };
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
  seg = segmentsFor();
  setReady();
  return ctrl;
}

function openItemReplace(kind, id) {
  // Swap the current screen without growing the history stack.
  if (kind === 'song' && !findSong(id)) return;
  if (kind === 'song' && !songsUnlocked()) return lockSheet({ kind, id });
  if (!store.data.range) return openItem(kind, id);
  if (current && current.destroy) current.destroy();
  current = kind === 'lesson' && id === 'range' ? rangeCtrl() : playerCtrl({ kind, id });
  window.scrollTo(0, 0);
}

// ---------- Range test ----------

// Short cues, so a young reader isn't faced with a paragraph. Each keeps its safety words.
const RANGE_INTRO = 'Sing a comfy low note, then a comfy high note. Stop if anything hurts.';

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
    ${CUE_MARKUP}
    <button class="care-link r-care" data-act="care">${ICON.heart}Look after your voice</button>
    <div class="lane-wrap">
      <canvas id="lane"></canvas>
      <div class="hold" aria-hidden="true"><i id="hold"></i></div>
    </div>
    <div class="readout">
      <span class="note-now" id="note"></span>
      <span class="note-info"><span class="tune" id="cents">Tap Start to begin</span><span class="level"><i id="level"></i></span></span>
    </div>
    <div class="p-controls">
      <button class="btn primary big wide" data-act="r-start" id="startBtn"></button>
      <p class="p-note">Little singer? A grown-up can help, or pick Child.</p>
      <button class="btn text wide" data-act="r-presets">Skip and pick a typical range</button>
    </div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const el = { player: $('.player'), cue: $('#cue'), sub: $('#p-sub'), note: $('#note'), cents: $('#cents'), level: $('#level'), hold: $('#hold'), start: $('#startBtn') };
  const setCue = cueWriter(el.cue);
  const setTune = tuneWriter(el.cents);
  setCue(RANGE_INTRO, '');
  setBtn(el.start, 'start');
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
    setCue('Sing a low “ah” and hold it. Easy, not growly.', 'sing');
    setBtn(el.start, 'stop');
    requestWake();
  }

  function showResult() {
    state = 'result';
    releaseWake();
    const r = found;
    el.player.dataset.state = 'done';
    const html = () => `
      <p class="eyebrow">Your comfy notes</p>
      <p class="big-range">${letterName(r.low)} <span>to</span> ${letterName(r.high)}</p>
      <p class="muted">That’s ${r.high - r.low + 1} piano keys, black and white.</p>
      ${keyboardSVG(r)}
      <div class="adjust">
        <div class="adj"><span>Lowest</span><button class="step" data-act="adj" data-k="low" data-d="-1" aria-label="Lowest note down">−</button><button class="note-btn" data-act="hear" data-m="${r.low}" aria-label="Hear ${letterName(r.low)}">${letterName(r.low)}</button><button class="step" data-act="adj" data-k="low" data-d="1" aria-label="Lowest note up">+</button></div>
        <div class="adj"><span>Highest</span><button class="step" data-act="adj" data-k="high" data-d="-1" aria-label="Highest note down">−</button><button class="note-btn" data-act="hear" data-m="${r.high}" aria-label="Hear ${letterName(r.high)}">${letterName(r.high)}</button><button class="step" data-act="adj" data-k="high" data-d="1" aria-label="Highest note up">+</button></div>
      </div>
      <p class="muted small">Tap a note to hear it. Pick notes that feel easy, not your very highest.</p>
      <div class="sheet-actions one"><button class="btn primary big wide" data-act="r-save">Save my range</button></div>
      <button class="btn text wide" data-act="r-again">Test again</button>`;
    const opts = { label: 'Your range', dismissable: false, cls: 'range-result', key: 'range-result' };
    const acts = {
      adj: (b) => {
        const k = b.dataset.k;
        const d = Number(b.dataset.d);
        if (k === 'low') r.low = Math.max(36, Math.min(r.high - 4, r.low + d));
        else r.high = Math.min(88, Math.max(r.low + 4, r.high + d));
        audio.blip(r[k]);
        openSheet(html(), acts, opts);
        const again = sheet && sheet.el.querySelector(`[data-act="adj"][data-k="${k}"][data-d="${d}"]`);
        if (again) again.focus({ preventScroll: true });
      },
      hear: (b) => {
        audio.unlock();
        audio.blip(Number(b.dataset.m));
      },
      'r-save': () => {
        store.setRange({ low: r.low, high: r.high }, 'test');
        closeSheet(true);
        if (!afterRangeSaved(true)) goBack();
      },
      'r-again': () => {
        closeSheet(true);
        begin();
      },
    };
    openSheet(html(), acts, opts);
  }

  function stop() {
    state = 'intro';
    progress = 0;
    releaseWake();
    el.player.dataset.state = 'ready';
    setBtn(el.start, 'start');
    setText(el.sub, 'About a minute');
    setCue(RANGE_INTRO, '');
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
        setCue('Now a high “ah”. Easy, not a squeak. Stop if it pinches.', 'sing');
      } else if (state === 'high') {
        if (note < found.low + 4) {
          setCue('That’s close to your low note. Try a higher one.', 'sing');
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
           <p>You can run the test any time from Today.</p>
           ${presetsHTML('r-preset')}
           <p class="presets-note">${VOICE_CHANGING}</p>`,
          {
            'r-preset': (b) => {
              const relaxed = applyPreset(b.dataset.v);
              closeSheet(true);
              if (!afterRangeSaved(true)) goBack();
              if (relaxed) relaxedNote();
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
      const testing = state === 'low' || state === 'high';
      const voiced = r && r.m != null;
      setText(el.note, voiced ? letterName(r.m) : testing ? '–' : '');
      setTune('tune', voiced ? (testing ? 'Hold it…' : 'I can hear you') : audio.micOn ? 'Listening…' : 'Tap Start to begin');
      const lv = levelOf(r);
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
// Sing, see, hear, sing again. The take's whole pitch line is kept (never any sound), up to
// TAKE_MAX seconds. Done turns it into notes, a key, beats and chords (tune.js) and shows "Your
// song": the notes as blocks, a few kind facts, and the tune played back on piano or as a song.

const TAKE_MAX = 180; // seconds of singing one take keeps
const QUIET = 0.3; // seconds after the app's own playback before the mic counts as singing again
const SETTLE = 0.8; // seconds after Start, Done or Sing again before the buttons in that spot work
const GAP_MAX = 1.5; // seconds: a longer silence inside a take (stopping to think) ...
const GAP_KEEP = 1; // ... is heard back, and drawn, this long
const FREE_SUB = 'Make up a song. Hear it back.';
const FREE_CUE = 'Tap Start, then sing any tune you like.';
const FREE_RUN = 'Sing your tune. Tap Done at the end.';
const FREE_FULL = 'That’s a long song! Tap Done to hear it.';
const FREE_KEEP = 'Tap Start so I can keep it';
// Song starters: a picture and a few words for children who freeze at "sing anything". They
// only change the cue.
const STARTERS = [
  { id: 'pet', icon: 'paw', label: 'Sing about your pet', cue: 'Sing about your pet, or a pet you’d love to have.' },
  { id: 'dragon', icon: 'dragon', label: 'Sing like a sleepy dragon', cue: 'Sing like a sleepy dragon: slow and yawny.' },
  { id: 'name', icon: 'name', label: 'Sing your name', cue: 'Sing your name, then sing it a new way.' },
  { id: 'happy', icon: 'sun', label: 'Make up a happy tune', cue: 'Make up a happy tune, with any notes you like.' },
  { id: 'breakfast', icon: 'bowl', label: 'Sing about breakfast', cue: 'Sing about what you had for breakfast.' },
];
// describe()'s shapes in a child's words, each with a picture.
const SHAPE_WORDS = {
  'up-down': ['siren', 'Your tune went up and back down, like a hill.'],
  'down-up': ['dip', 'Your tune dipped down and came back up.'],
  wave: ['wave', 'You sang a wavy tune, up and down and up again.'],
  up: ['scale', 'Your tune went climbing up.'],
  down: ['oodown', 'Your tune stepped down.'],
  flat: ['hold', 'Your tune stayed nice and steady.'],
};
const SONG_STYLES = [['pop', 'Pop with drums'], ['gentle', 'Gentle']];
const SONG_SPEEDS = [['slow', 'Slow'], ['medium', 'Medium'], ['fast', 'Fast']];
// "Make it a song" choices, kept for the next take.
let songStyle = 'pop';
let songSpeed = 'medium';

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// A long silence inside a take (stopping to think, or a look around) is heard back and drawn
// as about a second, so the song doesn't run on for bars of drums with no tune. The middle of
// the silence goes, and everything after it moves earlier.
function closeGaps(frames) {
  const out = [];
  let shift = 0;
  let last = null; // the last voiced frame's time, as sung
  let quiet = []; // the silent frames since then
  const keep = (f) => out.push(shift ? { ...f, t: f.t - shift } : f);
  for (const f of frames) {
    if (f.m == null) {
      quiet.push(f);
      continue;
    }
    if (last != null && f.t - last > GAP_MAX) {
      const a = last + GAP_KEEP / 2;
      const b = f.t - GAP_KEEP / 2;
      for (const x of quiet) if (x.t <= a) keep(x);
      shift += b - a;
      for (const x of quiet) if (x.t >= b) keep(x);
    } else quiet.forEach(keep);
    quiet = [];
    keep(f);
    last = f.t;
  }
  quiet.forEach(keep);
  return out;
}

// The take, heard: its notes, key, beats and chords, and the plain facts for the feedback card.
// The blocks show the notes that play back: a motif sung twice plays (and shows) the same notes
// both times. A take that is mostly slides says nothing about a key.
function hearTake(take) {
  const frames = closeGaps(take);
  const found = findNotes(frames);
  const q = quantize(found.notes, { bpm: TEMPOS.medium });
  const notes = q.notes.length === found.notes.length ? found.notes.map((n, i) => ({ ...n, p: q.notes[i].p })) : found.notes;
  const key = findKey(notes);
  const glides = found.glideShare >= 0.5 && found.sungSeconds >= 1;
  return { frames, found, notes, key, sure: !!key.enough && !glides, glides, q, chords: harmonize(q, key), facts: describe(notes, key) };
}

const keyFlats = (key) => !!key.enough && prefersFlats(key.tonic, key.mode === 'minor');
const keyName = (key) => `${letterName(key.tonic, { flats: keyFlats(key), octave: false })} ${key.mode}`;

// The note grid in words: its text alternative, and the caption under it. Notes are named the
// way the blocks name them.
function songSummary(res) {
  const { notes, facts, key, sure } = res;
  const nm = (m) => label(m, { tonic: sure ? key.tonic : null, flats: sure && keyFlats(key), names: sure ? S().names : 'letters', octave: false });
  if (!notes.length) return 'Your pitch line, with no held notes';
  if (notes.length === 1) return `1 note, ${nm(notes[0].p)}`;
  if (facts.low === facts.high) return `${notes.length} notes, all ${nm(facts.low)}`;
  return `${notes.length} notes from ${nm(facts.low)} to ${nm(facts.high)}`;
}

// The feedback card: plain facts and kind words, never a grade or a percentage. The key is
// named only when findKey is sure; a take that is mostly slides gets praise for sliding.
// Plenty of voice with no notes held at all is most likely talking, not too quiet or too short.
function songWords(res) {
  const { notes, found, facts, key, glides, sure } = res;
  const n = notes.length;
  if (!n && !glides) {
    const talk = found.sungSeconds >= 3;
    return { stats: [], lines: [talk ? ['hold', 'That sounded like talking. Try holding some long notes.'] : ['mic', 'I couldn’t hear a tune. Try singing a bit louder, or longer.']] };
  }
  const secs = Math.max(1, Math.round(n ? facts.seconds : found.sungSeconds));
  const stats = [[String(secs), secs === 1 ? 'second of singing' : 'seconds of singing']];
  if (n > 1 && facts.distinct === 1) stats.push([String(n), 'notes, all the same']);
  else if (n) stats.push([String(facts.distinct), facts.distinct === 1 ? 'note' : 'different notes']);
  const lines = [];
  if (glides) lines.push(['slide', 'Great sliding! Try some notes you can hold too.']);
  else if (n < 3) lines.push(['hold', 'A short tune. Try a few more notes next time.']);
  if (n >= 3) {
    lines.push(SHAPE_WORDS[facts.shape] || SHAPE_WORDS.flat);
    // One exclamation mark per screen: sliding praise already has it.
    if (facts.endsHome && !glides) lines.push(['home', 'Your tune came home!']);
    if (sure) lines.push(['songs', `Your song is in ${keyName(key)}.`]);
  }
  return { stats, lines };
}

function freeCtrl() {
  let state = 'ready'; // ready | running | song
  let starter = null;
  let take = []; // the whole take: { t (seconds from Start), m, rms }
  let T0 = 0;
  let full = false;
  let quietUntil = 0; // audio clock: the mic is ignored until then (playback, and just after)
  let play = null; // { kind: 'tune' | 'song', h (audio.playSong), song, mel (its tune notes), k }
  let res = null; // hearTake() of the last take
  let lit = -1; // the note block playing now
  let xs = []; // each block's [x0, x1] on the grid
  let lastLevel = -1;
  let lastSecs = -1;
  let draws = 0; // lane draws, and what the last one showed (for tests)
  let drawn = { frames: 0, live: false };
  let ro = null;
  // Done and Sing again sit where Done and Start were a moment before, so a double tap (or a
  // second tap a little late) would throw the song away. Until then, taps there do nothing.
  let settled = 0;
  document.body.dataset.screen = 'player';
  root.innerHTML = `<section class="player free-screen" data-state="ready">
    <header class="p-head">
      <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      <div class="p-title"><h2>Free sing</h2><p id="p-sub"></p></div>
      <span></span>
    </header>
    ${CUE_MARKUP}
    <div class="lane-wrap"><canvas id="lane"></canvas></div>
    <div class="readout">
      <span class="note-now" id="note"></span>
      <span class="note-info"><span class="tune" id="cents">Tap Start to turn on the mic</span><span class="level"><i id="level"></i></span></span>
    </div>
    <div class="p-controls">
      <p class="eyebrow starters-h" id="ideas" aria-hidden="true">Need an idea?</p>
      <div class="starters" role="group" aria-labelledby="ideas">
        ${STARTERS.map((s) => `<button class="starter" data-act="f-starter" data-v="${s.id}" aria-pressed="false">${ICON[s.icon]}<span>${esc(s.label)}</span></button>`).join('')}
      </div>
      <button class="btn primary big wide" data-act="f-start" id="startBtn"></button>
    </div>
    <div class="song-view" id="songView"></div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const el = { player: $('.player'), cue: $('#cue'), sub: $('#p-sub'), note: $('#note'), cents: $('#cents'), level: $('#level'), start: $('#startBtn'), view: $('#songView') };
  const setCue = cueWriter(el.cue);
  const setTune = tuneWriter(el.cents);
  const lane = new Lane($('#lane'));
  const range = store.data.range;
  lane.setModel({ events: [], free: true, center: range ? (range.low + range.high) / 2 : 57 });
  const unwatch = watchSize(lane, $('.lane-wrap'));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => {
    lane.readColors();
    drawGrid();
  };
  if (mq.addEventListener) mq.addEventListener('change', onTheme);

  const cueText = () => (starter ? STARTERS.find((s) => s.id === starter).cue : state === 'running' ? FREE_RUN : FREE_CUE);
  const setState = (s) => {
    state = s;
    el.player.dataset.state = s;
    settled = performance.now() + SETTLE * 1000;
  };
  const settling = () => performance.now() < settled;

  // Throw the last take and its song away. Anything still playing stops first, and the mic
  // waits QUIET seconds after it.
  function clear() {
    stopPlay();
    if (ro) ro.disconnect();
    ro = null;
    res = null;
    lit = -1;
    take = [];
    full = false;
    el.view.innerHTML = '';
  }

  // Sing again: back to Start, with the song-starter ideas, so the next take can have a new one.
  function ready() {
    clear();
    setState('ready');
    setBtn(el.start, 'start');
    setText(el.sub, FREE_SUB);
    setCue(cueText(), '');
    el.player.scrollTop = 0;
  }

  // A new take.
  function begin() {
    clear();
    T0 = audio.now();
    lastSecs = -1;
    setState('running');
    setBtn(el.start, 'done');
    setCue(cueText(), 'sing');
    requestWake();
  }

  function finish() {
    res = hearTake(take);
    setState('song');
    setText(el.sub, FREE_SUB);
    renderSong();
  }

  function renderSong() {
    const words = songWords(res);
    const has = res.notes.length > 0;
    // A grid only for notes, or the slides that the card praises.
    const shown = has || res.glides;
    const summary = songSummary(res);
    const seg = (name, value, opts) =>
      `<div class="seg" role="radiogroup" aria-labelledby="f-${name}-h">${opts
        .map(([v, l]) => `<button role="radio" aria-checked="${v === value}" class="${v === value ? 'on' : ''}" data-act="f-${name}" data-v="${v}">${l}</button>`)
        .join('')}</div>`;
    const stats = words.stats.length
      ? `<div class="stats ${words.stats.length === 2 ? 'two' : 'one'}">${words.stats.map(([b, s]) => `<div><b>${esc(b)}</b><span>${s}</span></div>`).join('')}</div>`
      : '';
    // Play my tune sits right under the grid, so it's in sight on the smallest phone too.
    el.view.innerHTML = `
      <h2 class="song-title" tabindex="-1">${shown ? 'Your song' : 'Let’s sing again'}</h2>
      ${
        shown
          ? `<div class="song-pic">
               <div class="song-grid" id="songGrid" role="group" aria-label="Note blocks"><canvas role="img" aria-label="${esc(summary)}"></canvas></div>
               <p class="song-cap" aria-hidden="true">${esc(summary)}</p>
             </div>`
          : ''
      }
      ${has ? '<button class="btn primary big wide" data-act="f-tune" id="tuneBtn"></button>' : ''}
      <div class="card song-card">
        ${stats}
        <ul class="song-facts">${words.lines.map(([ic, t]) => `<li><i>${ICON[ic]}</i><span>${esc(t)}</span></li>`).join('')}</ul>
      </div>
      ${
        has
          ? `<div class="card song-maker">
               <h3>Make it a song</h3>
               <p class="seg-h" id="f-style-h">Style</p>
               ${seg('style', songStyle, SONG_STYLES)}
               <p class="seg-h" id="f-speed-h">Speed</p>
               ${seg('speed', songSpeed, SONG_SPEEDS)}
               <button class="btn secondary wide" data-act="f-song" id="songBtn"></button>
             </div>`
          : ''
      }
      <div class="song-actions">
        <button class="btn secondary" data-act="f-done">Done</button>
        <button class="btn ${has ? 'secondary' : 'primary'}" data-act="f-again">${ICON.mic}Sing again</button>
      </div>`;
    playButtons();
    el.player.scrollTop = 0;
    drawGrid();
    const box = el.view.querySelector('#songGrid');
    if (box && window.ResizeObserver) {
      ro = new ResizeObserver(() => drawGrid());
      ro.observe(box);
    }
    // Canvas text is drawn once per change, so draw again once the font has loaded.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawGrid());
    el.view.querySelector('.song-title').focus({ preventScroll: true });
  }

  function drawGrid() {
    const box = state === 'song' && el.view.querySelector('#songGrid');
    if (!box || !res) return;
    xs = drawSong(box.querySelector('canvas'), { notes: res.notes, frames: res.frames, key: { ...res.key, enough: res.sure }, names: S().names, lit, width: box.clientWidth });
    // A grid wider than the screen scrolls, so it needs to be reachable from the keyboard.
    if (box.scrollWidth > box.clientWidth + 1) box.setAttribute('tabindex', '0');
    else box.removeAttribute('tabindex');
  }

  // Light up the block that is playing, and keep it in view on a grid that scrolls.
  function setLit(k) {
    if (k === lit) return;
    lit = k;
    drawGrid();
    const box = el.view.querySelector('#songGrid');
    if (!box || k < 0 || !xs[k]) return;
    const [a, b] = xs[k];
    if (a < box.scrollLeft + 16 || b > box.scrollLeft + box.clientWidth - 16)
      box.scrollTo({ left: Math.max(0, a - box.clientWidth * 0.25), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  const PLAY_LOOK = {
    tune: ['btn primary big wide', 'btn quiet big wide', `${ICON.play}Play my tune`],
    song: ['btn secondary wide', 'btn quiet wide', `${ICON.songs}Play my song`],
  };
  // While a button's playback runs, it becomes its Stop button, and the grid stays in sight.
  function playButtons() {
    el.view.classList.toggle('playing', !!play);
    for (const kind of ['tune', 'song']) {
      const b = el.view.querySelector(kind === 'tune' ? '#tuneBtn' : '#songBtn');
      if (!b) continue;
      const on = !!play && play.kind === kind;
      b.className = PLAY_LOOK[kind][on ? 1 : 0];
      b.innerHTML = on ? `${ICON.stop}Stop` : PLAY_LOOK[kind][2];
    }
  }

  // 'tune': the tune alone on piano, at the speed it was sung, tidied onto the beat and the
  // notes. 'song': chords and bass too (and drums for pop), at the speed picked.
  function startPlay(kind) {
    stopPlay();
    audio.unlock();
    if (!audio.ctx || !res || !res.notes.length) return;
    const { q, chords, key } = res;
    let song;
    if (kind === 'tune') {
      const events = arrange(q, chords, key, { style: 'gentle' }).events.filter((e) => e.kind === 'melody');
      song = { events, duration: events.reduce((d, e) => Math.max(d, e.t + e.d), 0) };
    } else song = arrange(q, chords, key, { style: songStyle, bpm: TEMPOS[songSpeed] });
    const mel = song.events.filter((e) => e.kind === 'melody');
    // One tune note per block, in order; anything else and nothing lights up.
    play = { kind, h: audio.playSong(song), song, mel: mel.length === res.notes.length ? mel : [], k: -1 };
    quietUntil = Infinity;
    playButtons();
  }

  function stopPlay() {
    if (!play) return;
    play.h.stop();
    endPlay();
  }

  // After playback, stopped or run to its end. The last notes ring on a moment, so the mic waits.
  function endPlay() {
    play = null;
    quietUntil = audio.now() + QUIET;
    setLit(-1);
    playButtons();
  }

  function pick(what, v) {
    if (what === 'style') {
      if (!SONG_STYLES.some(([k]) => k === v)) return;
      songStyle = v;
    } else {
      if (!TEMPOS[v]) return;
      songSpeed = v;
    }
    el.view.querySelectorAll(`[data-act="f-${what}"]`).forEach((b) => {
      const on = b.dataset.v === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    // Changing the style or speed while the song plays starts it again that way.
    if (play && play.kind === 'song') startPlay('song');
  }

  function drawLane(t, frames, live) {
    lane.draw(t, frames, live);
    draws++;
    drawn = { frames: frames.length, live: !!live };
  }

  setState('ready');
  settled = 0;
  setBtn(el.start, 'start');
  setText(el.sub, FREE_SUB);
  setCue(cueText(), '');

  return {
    name: 'free',
    actions: {
      'f-start': () => {
        if (settling()) return;
        if (state === 'running') return finish();
        audio.unlock();
        if (!audio.micOn) return micSheet(begin);
        begin();
      },
      'f-starter': (btn) => {
        starter = starter === btn.dataset.v ? null : btn.dataset.v;
        root.querySelectorAll('.starter').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === starter)));
        setCue(cueText(), state === 'running' ? 'sing' : '');
      },
      'f-tune': () => (play && play.kind === 'tune' ? stopPlay() : startPlay('tune')),
      'f-song': () => (play && play.kind === 'song' ? stopPlay() : startPlay('song')),
      'f-style': (btn) => pick('style', btn.dataset.v),
      'f-speed': (btn) => pick('speed', btn.dataset.v),
      'f-again': () => {
        if (settling()) return;
        ready();
        el.start.focus({ preventScroll: true });
      },
      'f-done': () => {
        if (!settling()) goBack();
      },
    },
    frame() {
      const now = audio.now();
      if (state === 'song') {
        // Nothing from the mic here: just follow the playback with the highlight.
        if (!play) return;
        // Sound that won't start again (an iPhone in a phone call) never reaches its end.
        if (audio.ctx.state !== 'running') {
          if (!play.down) play.down = performance.now();
          else if (performance.now() - play.down > 1000) stopPlay();
          return;
        }
        play.down = 0;
        // What is heard now left the app a moment ago (Bluetooth headphones add a lot).
        const lag = Math.min(0.5, Math.max(0, audio.ctx.outputLatency || audio.ctx.baseLatency || 0));
        if (now - lag >= play.h.end) return endPlay();
        const t = now - lag - play.h.at;
        const mel = play.mel;
        while (play.k + 1 < mel.length && mel[play.k + 1].t <= t) play.k++;
        const k = play.k;
        setLit(k >= 0 && t < mel[k].t + mel[k].d ? k : -1);
        return;
      }
      const r = audio.micOn ? audio.read() : null;
      // The app's own playback, and the moment after it, is never singing: it's neither kept nor
      // drawn. A reading's time is the middle of the sound it heard, so that is what must be clear.
      const heard = r && r.t >= quietUntil ? r : null;
      if (state === 'running') {
        const t = now - T0;
        if (!full && t >= TAKE_MAX) {
          full = true;
          setCue(FREE_FULL, '');
        }
        if (heard && !full) take.push({ t: heard.t - T0, m: heard.m, rms: heard.rms });
        drawLane(t, take, heard && !full && heard.m != null ? { t: heard.t - T0, m: heard.m } : null);
        const secs = Math.min(TAKE_MAX, Math.floor(t));
        if (secs !== lastSecs) {
          lastSecs = secs;
          setText(el.sub, `Singing · ${clock(secs)}`);
        }
      } else drawLane(0, [], heard && heard.m != null ? { t: 0, m: heard.m } : null);
      if (full) {
        setText(el.note, '');
        setTune('tune', 'Tap Done to hear it');
      } else if (heard && heard.m != null) {
        setText(el.note, letterName(heard.m));
        // Before Start, singing shows but isn't kept: say so.
        setTune('tune', state === 'ready' ? FREE_KEEP : nearestWords(heard.m));
      } else {
        setText(el.note, audio.micOn ? '–' : '');
        setTune('tune', !audio.micOn ? 'Tap Start to turn on the mic' : state === 'ready' ? 'Tap Start to begin' : 'Listening…');
      }
      const lv = full ? 0 : levelOf(heard);
      if (Math.abs(lv - lastLevel) > 0.02) {
        lastLevel = lv;
        el.level.style.width = `${Math.round(lv * 100)}%`;
      }
    },
    // The app went to the background, or the sound dropped: stop playback. A take ends there with
    // what it has, so time away never becomes part of the song; back in the app, it's ready to hear.
    pause() {
      stopPlay();
      if (state === 'running') finish();
    },
    probe() {
      const kinds = {};
      if (play) for (const e of play.song.events) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
      return {
        screen: 'free',
        state,
        starter,
        take: take.length,
        first: take.length ? take[0].t : null,
        seconds: Math.max(0, audio.now() - T0),
        full,
        quiet: audio.now() < quietUntil,
        draws,
        drawn,
        playing: play ? { kind: play.kind, at: play.h.at, end: play.h.end, bpm: play.song.bpm || null, kinds } : null,
        lit,
        song: res && {
          notes: res.notes.map((n) => ({ p: n.p, t0: n.t0, t1: n.t1 })),
          key: res.key,
          facts: res.facts,
          glideShare: res.found.glideShare,
          sungSeconds: res.found.sungSeconds,
          bpm: res.q.bpm,
          chords: res.chords.map((c) => c.numeral),
        },
      };
    },
    destroy() {
      stopPlay();
      releaseWake();
      unwatch();
      if (ro) ro.disconnect();
      if (mq.removeEventListener) mq.removeEventListener('change', onTheme);
    },
  };
}

// ---------- Family songs (private, on this phone only) ----------
// A grown-up imports a song file they bought (karaoke MIDI or MusicXML, js/import.js) and it is
// kept in IndexedDB on this phone (js/library.js): only the melody and words, never the file.
// Adding, moving and deleting need the grown-up PIN (js/pin.js). Moving sends a private .nbn
// file (js/nbn.js) through the share sheet, then deletes the song here once it has arrived.
// Every string from a file is escaped before it reaches the page.

const ICON_MORE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="18" cy="12" r="1.9" fill="currentColor"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 5.5v13M5.5 12h13"/></svg>`;
const ICON_SEND = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 15V4M7.5 8.5 12 4l4.5 4.5M6 12.5v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"/></svg>`;

const NOTICE_ADD = 'Only add a song file that you bought or have permission to use. Family songs are saved only on this phone. Note by Note never uploads them, and they are never part of the public app or website.';
const NOTICE_SEND = 'Only send songs to phones belonging to your own family. Song shops usually allow personal use only, and some don’t allow extra copies. Moving the song (not copying it) is the safest choice. Never post song files online or share them outside your family.';
const LIBRARY_OFF = 'Family songs can’t be saved in this browser window. Private Browsing turns saving off: open Note by Note from the Home Screen, or in a normal Safari tab.';
const FILE_MAX = 16 * 1024 * 1024; // bigger than any song file (the importers have their own limits)
const PIECE_LINES = 16; // a part offered on its own: up to this many lines

let familySongs = []; // library records, oldest first
let familyState = 'loading'; // 'loading' | 'ready' | 'unavailable'
let famInput = null; // the hidden file picker

const findSong = (id) => SONGS.find((s) => s.id === id) || (familySongs.find((r) => r.id === id) || {}).song || null;
const findRecord = (id) => familySongs.find((r) => r.id === id) || null;

async function loadFamily() {
  try {
    familySongs = await library.list();
    familyState = 'ready';
  } catch (e) {
    familySongs = [];
    familyState = 'unavailable';
  }
  if (current && current.name === 'home' && !sheet && current.refresh) current.refresh();
}

function refreshHome() {
  if (current && current.name === 'home' && current.refresh) current.refresh();
}

// Songs from files often have no chord symbols: the piano then follows tune.js's harmonize(),
// about one chord a bar. A short first bar (a pickup) is lined up first so the chords fall on
// the bars the file had.
function familyChords(mel, song) {
  if (!isFamilySongId(song.id) || !mel.notes.length) return [];
  const bpb = Math.max(1, Math.round(song.meter));
  let pre = 0;
  let bar = false;
  for (const tok of song.melody.trim().split(/\s+/)) {
    if (tok === '|') {
      bar = true;
      break;
    }
    if (tok === '//') continue;
    const d = tok.split('/')[1];
    pre += d ? Number(d) : 1;
  }
  const pickup = bar && pre > 0 && pre < bpb - 1e-6 ? bpb - pre : 0;
  const q = { beatsPerBar: bpb, notes: mel.notes.map((n) => ({ beat: n.beat + pickup, beats: n.beats, p: n.m })) };
  const out = [];
  for (const c of harmonize(q)) {
    const a = Math.max(0, c.beat - pickup);
    const z = c.beat - pickup + c.beats;
    if (z <= a) continue;
    // Bare fifths (key in doubt) play as the major chord: the voicing has no fifths-only shape.
    out.push({ root: ((c.root % 12) + 12) % 12, quality: c.quality === 'm' ? 'm' : '', beat: a, beats: z - a });
  }
  return out;
}
setHarmonizer(familyChords);

// The words of some lyric tokens, as a child reads them.
function wordsOfTokens(tokens) {
  let s = '';
  for (const t of tokens) {
    if (t === '~') continue;
    if (t.endsWith('=')) s += t.slice(0, -1) + '-';
    else if (t.endsWith('-')) s += t.slice(0, -1);
    else s += t + ' ';
  }
  return s.replace(/‿/g, ' ').trim();
}

function firstLines(song, n = 2) {
  if (!song.lyrics) return [];
  const mel = parseMelody(song.melody);
  const toks = parseLyrics(song.lyrics);
  return mel.phrases.slice(0, n).map(([a, z]) => wordsOfTokens(toks.slice(a, z)));
}

const shortDate = (iso) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

// ---- The grown-up PIN ----

// Ask for the grown-up PIN, then run then(). With no PIN yet, the times-table sum comes first and
// then a new PIN is set: otherwise a child could set the first PIN and use it to turn the warm-up
// lock off. why: one sentence for the grown-up. back(): where Cancel goes (default: just close).
function grownUp({ why, then, back = null }) {
  if (store.data.pin) pinSheet({ mode: 'check', why, then, back });
  else sumSheet({ why: 'Before you set a PIN, show me you’re a grown-up.', then: () => pinSheet({ mode: 'new', then, back }), back });
}

function changePin() {
  const back = () => settingsSheet();
  grownUp({ why: 'Enter your PIN first.', then: store.data.pin ? () => pinSheet({ mode: 'new', then: back, back }) : back, back });
}

// The times-table check (as in Settings) on a sheet of its own, for grown-up steps that come
// before there is a PIN: setting the first one, and resetting a forgotten one.
function sumSheet(o) {
  const g = o.gate || newGate();
  const bd = openSheet(
    `<div class="pin-art" aria-hidden="true">${ICON.lock}</div>
     <h2>Grown-ups only</h2>
     <p>${esc(o.why)}</p>
     <div class="gate">
       ${g.err ? '<p class="err" role="alert">Not quite. Try this one:</p>' : ''}
       <label for="gate">Grown-ups: what is ${g.a} × ${g.b}?</label>
       <input id="gate" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done">
       <button class="btn secondary" data-act="sum-go">Check</button>
     </div>
     <button class="btn text wide" data-act="sum-cancel">Cancel</button>`,
    {
      'sum-go': () => check(),
      'sum-cancel': () => (o.back ? o.back() : closeSheet()),
    },
    { label: 'Grown-ups only', key: 'sum', cls: 'pin' }
  );
  const input = bd.querySelector('#gate');
  function check() {
    if (parseInt(input.value.trim(), 10) === g.a * g.b) return o.then();
    sumSheet({ ...o, gate: newGate(true) });
    focusIn('#gate');
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      check();
    }
  });
  input.focus({ preventScroll: true });
}

// Wrong PINs: { fails, until, lockouts }, kept in the saved data so a reload doesn't clear a
// lockout. Every 5 misses lock the PIN for longer: 30 s, 1 min, 2 min, … up to 30 min.
let pinTimer = 0;
const pinLock = () => ({ fails: 0, until: 0, lockouts: 0, ...(store.data.pinLock || {}) });
const setPinLock = (v) => {
  store.data.pinLock = v;
  store.save();
};
const waitWords = (ms) => {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s} seconds`;
  const m = Math.ceil(s / 60);
  return m === 1 ? '1 minute' : `${m} minutes`;
};

// mode: 'check' | 'new' | 'again' (first: the PIN typed in 'new'). msg: a kind word on a miss.
function pinSheet(o) {
  const { mode, why, then, back, first = null } = o;
  if (!pinSupported()) {
    openSheet(
      `<h2>Grown-ups only</h2>
       <p>This browser window can’t keep a PIN safe. Open Note by Note from the Home Screen, then try again.</p>
       <button class="btn primary wide" data-act="pin-cancel">OK</button>`,
      { 'pin-cancel': () => (back ? back() : closeSheet()) },
      { label: 'Grown-up PIN', key: 'pin', cls: 'pin' }
    );
    return;
  }
  clearTimeout(pinTimer);
  const left = pinLock().until - Date.now();
  const waiting = mode === 'check' && left > 0;
  if (waiting) {
    const again = { ...o, msg: '' };
    o = { ...o, msg: `Too many tries. Wait ${waitWords(left)}, then try again.` };
    pinTimer = setTimeout(() => {
      if (sheet && sheet.key === 'pin') pinSheet(again);
    }, left + 200);
  }
  const { msg: shownMsg } = o;
  const head =
    mode === 'check'
      ? `<h2>Grown-ups only</h2><p>${esc(why)}</p>`
      : mode === 'new'
        ? `<h2>${store.data.pin ? 'Choose a new PIN' : 'Set a grown-up PIN'}</h2><p>Choose 4 numbers that only grown-ups know. You’ll need them to add, move or delete family songs, and to turn off the warm-up switch.</p>`
        : `<h2>Type it again</h2><p>The same 4 numbers, so I know they’re right.</p>`;
  const label = mode === 'check' ? 'PIN' : mode === 'new' ? 'New PIN' : 'New PIN again';
  const go = mode === 'check' ? 'Continue' : mode === 'new' ? 'Next' : 'Save PIN';
  const bd = openSheet(
    `<div class="pin-art" aria-hidden="true">${ICON.lock}</div>
     ${head}
     <label class="pin-label" for="pin">${label}</label>
     <input id="pin" class="pin-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"${waiting ? ' disabled' : ''}${shownMsg ? ' aria-describedby="pin-msg"' : ''}>
     ${shownMsg ? `<p class="err" id="pin-msg" role="alert">${esc(shownMsg)}</p>` : ''}
     <div class="sheet-actions">
       <button class="btn secondary" data-act="pin-cancel">Cancel</button>
       <button class="btn primary" data-act="pin-go"${waiting ? ' disabled' : ''}>${go}</button>
     </div>
     ${mode === 'check' ? '<button class="quiet-link pin-forgot" data-act="pin-forgot">Forgot PIN?</button>' : ''}`,
    {
      'pin-go': () => submit(),
      'pin-cancel': () => (back ? back() : closeSheet()),
      'pin-forgot': () => forgotPinSheet(o),
    },
    { label: 'Grown-up PIN', key: 'pin', cls: 'pin' }
  );
  const input = bd.querySelector('#pin');
  let busy = false;
  async function submit() {
    if (busy || !input || input.disabled) return;
    const v = input.value.trim();
    if (!isPinShape(v)) {
      pinSheet({ ...o, msg: 'A PIN is 4 numbers.' });
      return focusIn('#pin');
    }
    if (mode === 'new') {
      pinSheet({ ...o, mode: 'again', first: v, msg: '' });
      return focusIn('#pin');
    }
    if (mode === 'again') {
      if (v !== first) {
        pinSheet({ ...o, mode: 'new', first: null, msg: 'Those didn’t match. Choose a PIN again.' });
        return focusIn('#pin');
      }
      busy = true;
      store.setPin(await makePin(v));
      setPinLock(null);
      return then();
    }
    busy = true;
    const ok = await checkPin(store.data.pin, v);
    busy = false;
    if (!sheet || sheet.key !== 'pin') return; // closed while checking
    if (ok) {
      setPinLock(null);
      return then();
    }
    const lk = pinLock();
    lk.fails++;
    if (lk.fails >= 5) {
      lk.fails = 0;
      lk.lockouts++;
      lk.until = Date.now() + Math.min(30 * 60e3, 30e3 * 2 ** (lk.lockouts - 1));
      setPinLock(lk);
      pinSheet({ ...o, msg: '' }); // shows the wait
      return;
    }
    setPinLock(lk);
    pinSheet({ ...o, msg: 'That’s not the PIN. Try again.' });
    focusIn('#pin');
  }
  if (input) {
    // Keep it to digits, and go on by itself once there are four.
    input.addEventListener('input', () => {
      const d = input.value.replace(/\D/g, '').slice(0, 4);
      if (d !== input.value) input.value = d;
      if (d.length === 4) submit();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    if (!waiting) input.focus({ preventScroll: true });
  }
}

// Resetting a forgotten PIN deletes the family songs, and needs the times-table sum: so it is no
// way around the PIN. Afterwards a new PIN is set and Settings opens; the action that asked for
// the PIN is not carried out.
function forgotPinSheet(o) {
  let armed = false;
  const toSettings = () => settingsSheet();
  const n = familySongs.length;
  openSheet(
    `<h2>Forgot the PIN?</h2>
     <p>I can reset it, but resetting the PIN also deletes ${n ? `all ${n === 1 ? 'the family song' : `${n} family songs`}` : 'every family song'} on this phone. That way a reset can’t be used to get around the PIN.</p>
     <p class="muted">To add songs again afterwards, use the files you bought.</p>
     <div class="sheet-actions">
       <button class="btn secondary" data-act="pin-keep">Go back</button>
       <button class="btn danger" data-act="pin-reset">Reset PIN</button>
     </div>`,
    {
      'pin-keep': () => pinSheet({ ...o, mode: 'check', msg: '' }),
      'pin-reset': async (btn) => {
        if (!armed) {
          armed = true;
          btn.textContent = 'Tap to delete songs';
          return;
        }
        sumSheet({ why: 'Show me you’re a grown-up to reset the PIN.', then: reset, back: () => forgotPinSheet(o) });
      },
    },
    { label: 'Forgot PIN', key: 'pin-forgot', cls: 'pin-forgot-sheet' }
  );
  async function reset() {
    // The PIN changes only once the songs are really gone. Where this browser window has no song
    // storage at all (Private Browsing), there are none to delete.
    if (familyState !== 'unavailable') {
      try {
        await library.clear();
      } catch (e) {
        openSheet(
          `<h2>PIN not reset</h2><p>I couldn’t delete the family songs. Try again.</p><button class="btn primary wide" data-act="sheet-close">OK</button>`,
          {},
          { label: 'PIN not reset', key: 'pin-forgot', cls: 'pin' }
        );
        return;
      }
    }
    for (const r of familySongs) delete store.data.progress['song:' + r.id];
    familySongs = [];
    store.setPin(null);
    setPinLock(null);
    refreshHome();
    pinSheet({ mode: 'new', then: toSettings, back: toSettings });
  }
}

// ---- Adding a song ----

function familyAdd() {
  if (familyState === 'unavailable') {
    openSheet(`<h2>Family songs</h2><p>${esc(LIBRARY_OFF)}</p><button class="btn primary wide" data-act="sheet-close">OK</button>`, {}, { label: 'Family songs' });
    return;
  }
  grownUp({ why: 'Enter your PIN to add a song.', then: () => addSheet() });
}

function addSheet(msg = '') {
  openSheet(
    `<p class="eyebrow">Family songs</p>
     <h2>Add a song from a file</h2>
     <p class="notice">${NOTICE_ADD}</p>
     ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
     <button class="btn primary big wide" data-act="fam-pick">${ICON_PLUS}Choose a file</button>
     <details class="fam-help">
       <summary>Where to get songs${ICON.chev}</summary>
       <ol class="fam-steps">
         <li><b>Buy the song</b> in Safari: at <b>midi.com.au</b> (Hit Trax), one marked “Karaoke Lyrics” with a melody guide. Or on <b>musescore.com</b> with MuseScore PRO, a score that shows the words under the singer’s notes: tap Download, then MusicXML.</li>
         <li><b>Save it to Files.</b> Tap Download. It goes to Files, in Downloads. If it’s a .zip, tap it once in Files to unzip it.</li>
         <li><b>Come back here</b>, tap Choose a file and pick it. I’ll show you the song before it’s added.</li>
       </ol>
       <p class="muted">From another family phone? Save the .nbn file to Files, then choose it here.</p>
     </details>
     <button class="btn text wide" data-act="sheet-close">Cancel</button>`,
    {
      'fam-pick': () => pickFile(),
    },
    { label: 'Add a song', key: 'fam-add', cls: 'fam' }
  );
}

// No accept filter: iOS greys out file types it doesn't know (.kar, .mxl, .nbn) when there is one.
function pickFile() {
  if (!famInput) {
    famInput = document.createElement('input');
    famInput.type = 'file';
    famInput.className = 'fam-input';
    famInput.tabIndex = -1;
    famInput.setAttribute('aria-hidden', 'true');
    famInput.addEventListener('change', () => {
      const f = famInput.files && famInput.files[0];
      famInput.value = '';
      if (f) readFamilyFile(f);
    });
    document.body.appendChild(famInput);
  }
  famInput.value = '';
  famInput.click();
}

const isNbnBytes = (b) => {
  let i = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0;
  while (i < b.length && i < 64 && (b[i] === 0x20 || b[i] === 0x09 || b[i] === 0x0a || b[i] === 0x0d)) i++;
  return b[i] === 0x7b;
};

// A kind message for anything that goes wrong while reading a file. Never a stack trace.
// (ImportError messages are already kind and are shown as they are, by the caller.)
function importMessage(e) {
  if (e && e.code === 'unavailable') return LIBRARY_OFF;
  return 'I couldn’t read this file. It may be damaged: try downloading it again.';
}

async function readFamilyFile(file) {
  openSheet(`<h2>Reading the song…</h2><p class="muted">${esc(cleanName(file.name))}</p>`, {}, { label: 'Reading', key: 'fam-add', cls: 'fam', dismissable: false });
  try {
    if (!file.size) throw new Error('empty');
    if (file.size > FILE_MAX) return addSheet('This file is too big to be a song file.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imp = await import('./import.js');
    let result;
    try {
      result = await imp.importSongFile(bytes, file.name);
    } catch (e) {
      return addSheet(e instanceof imp.ImportError ? e.message : importMessage(e));
    }
    if (!sheet || sheet.key !== 'fam-add') return; // closed meanwhile
    previewSheet({ imp, bytes, name: file.name, result, viaNbn: isNbnBytes(bytes) });
  } catch (e) {
    addSheet(file.size ? importMessage(e) : 'This file is empty.');
  }
}

const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').slice(0, 120);

// The parts a grown-up can choose from a long song: each section, two sections in a row
// (often a verse and its chorus) and, when it fits, the whole song.
function pieceOptions(result) {
  const { sections, fits, long } = result;
  const lines = result.stats.lines;
  if (fits && !long) return [{ from: 0, to: lines - 1, whole: true }];
  const out = [];
  if (fits) out.push({ from: 0, to: lines - 1, whole: true });
  sections.forEach((s, i) => {
    out.push({ from: s.from, to: s.to, sec: s });
    const nx = sections[i + 1];
    if (nx && nx.to - s.from + 1 <= PIECE_LINES) out.push({ from: s.from, to: nx.to, sec: s, end: nx, pair: true });
  });
  return out;
}

function pieceLabel(p) {
  if (p.whole) return 'The whole song';
  const a = p.from + 1;
  const b = p.to + 1;
  const lines = a === b ? `Line ${a}` : `Lines ${a}–${b}`;
  const first = p.sec.firstBar;
  const last = (p.end || p.sec).lastBar;
  const bars = first && last ? ` (bars ${first}–${last})` : '';
  return `${lines}${bars}${p.sec.words ? `: “${p.sec.words}”` : ''}`;
}

// The first verse and chorus when there are sections to pair, or the first part.
function defaultPiece(opts) {
  if (opts.length === 1) return 0;
  const pair = opts.findIndex((p) => p.pair && p.from === 0);
  if (pair >= 0) return pair;
  const first = opts.findIndex((p) => !p.whole);
  return first >= 0 ? first : 0;
}

let preview = null; // the playing preview: { handle, timer }
function stopPreview() {
  if (!preview) return;
  clearTimeout(preview.timer);
  try {
    preview.handle.stop();
  } catch (e) {
    /* already stopped */
  }
  preview = null;
}

// The tune on the piano, in the singer's key when there's a range.
function playTune(song, onEnd) {
  stopPreview();
  if (!audio.unlock()) return false;
  const mel = parseMelody(song.melody);
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of mel.notes) {
    lo = Math.min(lo, n.m);
    hi = Math.max(hi, n.m);
  }
  const range = store.data.range;
  const shift = range ? fitShift(range, lo, hi) : 0;
  const spb = 60 / song.bpm;
  const events = mel.notes.map((n) => ({ t: n.beat * spb, d: n.beats * spb, kind: 'melody', m: n.m + shift, vel: 0.9 }));
  const duration = mel.totalBeats * spb + 0.6;
  const handle = audio.playSong({ events, duration });
  preview = { handle, timer: setTimeout(() => (stopPreview(), onEnd && onEnd()), duration * 1000 + 300) };
  return true;
}

// pv: { imp, bytes, name, result, viaNbn, title?, pick?, msg? }
function previewSheet(pv) {
  stopPreview();
  const { result } = pv;
  if (pv.title == null) pv.title = result.song.title;
  const opts = pieceOptions(result);
  if (pv.pick == null || pv.pick >= opts.length) pv.pick = defaultPiece(opts);
  const opt = opts[pv.pick];
  let piece;
  try {
    piece = opt.whole ? { ...result.song } : pv.imp.sliceSong(result.song, opt.from, opt.to);
  } catch (e) {
    piece = { ...result.song };
  }
  const { stats } = pv.imp.songSections(piece);
  const lines = firstLines(piece);
  const choices = result.choices || [];
  const chosen = choices.find((c) => c.chosen);
  const warnings = (result.warnings || []).filter(Boolean);
  const html = `
    <p class="eyebrow">New family song</p>
    <h2>Check the song</h2>
    <div class="fam-field">
      <label for="fam-title">Title</label>
      <input id="fam-title" class="text-input" type="text" maxlength="${SONG_LIMITS.title}" autocomplete="off" value="${esc(pv.title)}">
      <p class="muted">From the file “${esc(cleanName(pv.name))}”</p>
    </div>
    <div class="stats four">
      <div><b>${stats.notes}</b><span>notes</span></div>
      <div><b>${stats.lines}</b><span>${stats.lines === 1 ? 'line' : 'lines'}</span></div>
      <div><b>${clock(stats.seconds)}</b><span>long</span></div>
      <div><b>${letterName(stats.low)}–${letterName(stats.high)}</b><span>lowest to highest</span></div>
    </div>
    <div class="fam-words">
      <h3>${lines.length ? 'How it starts' : 'No words'}</h3>
      ${lines.length ? lines.map((l) => `<p>${esc(l)}</p>`).join('') : '<p>This file has no words, so it will be sung on “la”.</p>'}
    </div>
    <button class="btn secondary wide" data-act="fam-play" aria-pressed="${!!preview}">${ICON.play}<span>Play the tune</span></button>
    ${
      choices.length > 1
        ? `<div class="fam-field">
            <label for="fam-melody">Tune from</label>
            <select id="fam-melody" class="select">${choices.map((c) => `<option value="${esc(c.id)}"${c === chosen ? ' selected' : ''}>${esc(c.label)}${Number.isFinite(c.notes) ? ` · ${c.notes} notes` : ''}</option>`).join('')}</select>
            <p class="muted">Wrong tune? Pick another part of the file.</p>
          </div>`
        : ''
    }
    ${
      opts.length > 1
        ? `<div class="fam-field">
            <label for="fam-part">Part to learn</label>
            <select id="fam-part" class="select">${opts.map((p, i) => `<option value="${i}"${i === pv.pick ? ' selected' : ''}>${esc(pieceLabel(p))}</option>`).join('')}</select>
            <p class="muted">${result.fits ? 'This is a long song. A verse and chorus is plenty to learn at once.' : 'This song is too long to keep whole. Pick a part, like a verse and chorus.'}</p>
          </div>`
        : ''
    }
    ${warnings.length ? `<div class="fam-warn"><h3>Good to know</h3><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <p class="notice">${NOTICE_ADD}</p>
    ${pv.msg ? `<p class="err" role="alert">${esc(pv.msg)}</p>` : ''}
    <div class="sheet-actions">
      <button class="btn secondary" data-act="fam-cancel">Cancel</button>
      <button class="btn primary" data-act="fam-save">Add song</button>
    </div>`;
  const setPlayBtn = (btn, on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = on ? `${ICON.stop}<span>Stop</span>` : `${ICON.play}<span>Play the tune</span>`;
  };
  const bd = openSheet(
    html,
    {
      'fam-play': (btn) => {
        if (preview) {
          stopPreview();
          return setPlayBtn(btn, false);
        }
        if (playTune(piece, () => btn.isConnected && setPlayBtn(btn, false))) setPlayBtn(btn, true);
      },
      'fam-cancel': () => {
        stopPreview();
        closeSheet();
      },
      'fam-save': (btn) => saveFamily(pv, piece, btn),
    },
    { label: 'Check the song', key: 'fam-preview', cls: 'fam', onClose: () => stopPreview() }
  );
  const t = bd.querySelector('#fam-title');
  t.addEventListener('input', () => (pv.title = t.value));
  const mel = bd.querySelector('#fam-melody');
  if (mel)
    mel.addEventListener('change', async () => {
      mel.disabled = true;
      try {
        const r = await pv.imp.importSongFile(pv.bytes, pv.name, { melody: mel.value });
        // Keep a title the grown-up typed; otherwise take the file's.
        const typed = pv.title !== pv.result.song.title;
        pv.result = r;
        if (!typed) pv.title = r.song.title;
        pv.pick = null;
        pv.msg = '';
      } catch (e) {
        pv.msg = e instanceof pv.imp.ImportError ? e.message : importMessage(e);
      }
      previewSheet(pv);
      focusIn('#fam-melody');
    });
  const part = bd.querySelector('#fam-part');
  if (part)
    part.addEventListener('change', () => {
      pv.pick = Number(part.value);
      pv.msg = '';
      previewSheet(pv);
      focusIn('#fam-part');
    });
}

async function saveFamily(pv, piece, btn) {
  stopPreview();
  const title = String(pv.title || '').trim();
  if (!title) {
    pv.msg = 'Give the song a title.';
    previewSheet(pv);
    return focusIn('#fam-title');
  }
  const v = validateSong({ ...piece, title });
  if (!v.ok) {
    pv.msg = /title/i.test(v.error) ? 'That title has characters I can’t use. Try plain letters and numbers.' : v.error;
    previewSheet(pv);
    return focusIn('.err');
  }
  if (findRecord(v.song.id)) {
    pv.msg = 'This song is already in Family songs.';
    previewSheet(pv);
    return focusIn('.err');
  }
  btn.disabled = true;
  const src = pv.result.source || null;
  const rec = {
    id: v.song.id,
    song: v.song,
    source: src,
    via: pv.viaNbn ? 'nbn' : (src && src.kind) || null,
    addedAt: new Date().toISOString(),
  };
  try {
    const saved = await library.put(rec);
    familySongs = [...familySongs.filter((r) => r.id !== saved.id), saved];
  } catch (e) {
    pv.msg = e && e.message ? e.message : 'I couldn’t save that. Try again.';
    previewSheet(pv);
    return focusIn('.err');
  }
  // Ask once for storage the browser won't clear when space runs low.
  if (!store.data.persistAsked) {
    store.data.persistAsked = true;
    store.save();
    askToPersist();
  }
  pv.bytes = null; // the bought file is never kept
  refreshHome();
  openSheet(
    `${hum('happy')}
     <h2>Song added</h2>
     <p>“${esc(v.song.title)}” is in Family songs now. It opens in each singer’s key, like the other songs.</p>
     <button class="btn primary big wide" data-act="sheet-close">Done</button>`,
    {},
    { label: 'Song added', cls: 'centered' }
  );
}

// ---- A family song's menu (grown-ups) ----

function familyMenu(id) {
  if (!findRecord(id)) return;
  grownUp({ why: 'Enter your PIN to change this song.', then: () => songMenuSheet(id) });
}

function songMenuSheet(id) {
  const rec = findRecord(id);
  if (!rec) return closeSheet();
  const from = rec.via === 'nbn' ? 'from another family phone' : rec.source && rec.source.fileName ? `from “${cleanName(rec.source.fileName)}”` : '';
  const added = shortDate(rec.addedAt);
  openSheet(
    `<p class="eyebrow">Family song</p>
     <h2>${esc(rec.song.title)}</h2>
     ${added || from ? `<p class="muted">${esc([added && `Added ${added}`, from].filter(Boolean).join(', '))}</p>` : ''}
     <div class="fam-menu">
       <button class="field link-row" data-act="fam-rename"><span><b>Rename</b></span>${ICON.chev}</button>
       <button class="field link-row" data-act="fam-move"><span>${ICON_SEND}<b>Move to another family phone</b></span>${ICON.chev}</button>
       <button class="field link-row danger" data-act="fam-delete"><span><b>Delete</b></span>${ICON.chev}</button>
     </div>
     <button class="btn primary wide" data-act="sheet-close">Done</button>`,
    {
      'fam-rename': () => renameSheet(id),
      'fam-move': () => moveSheet(id),
      'fam-delete': () => deleteSheet(id),
    },
    { label: 'Family song', key: 'fam-menu', cls: 'fam' }
  );
}

function renameSheet(id, msg = '') {
  const rec = findRecord(id);
  if (!rec) return closeSheet();
  const bd = openSheet(
    `<h2>Rename</h2>
     <div class="fam-field">
       <label for="fam-name">Title</label>
       <input id="fam-name" class="text-input" type="text" maxlength="${SONG_LIMITS.title}" autocomplete="off" value="${esc(rec.song.title)}">
     </div>
     ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
     <div class="sheet-actions">
       <button class="btn secondary" data-act="fam-back">Cancel</button>
       <button class="btn primary" data-act="fam-rename-save">Save</button>
     </div>`,
    {
      'fam-back': () => songMenuSheet(id),
      'fam-rename-save': () => save(),
    },
    { label: 'Rename', key: 'fam-rename', cls: 'fam' }
  );
  const input = bd.querySelector('#fam-name');
  input.focus({ preventScroll: true });
  input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });
  let busy = false;
  async function save() {
    if (busy) return;
    const title = input.value.trim();
    if (!title) return renameSheet(id, 'Give the song a title.');
    const v = validateSong({ ...rec.song, title });
    if (!v.ok) return renameSheet(id, 'That title has characters I can’t use. Try plain letters and numbers.');
    busy = true;
    // The id stays, so the song keeps its scores.
    try {
      const saved = await library.put({ ...rec, song: { ...v.song, id: rec.id } });
      familySongs = familySongs.map((r) => (r.id === id ? saved : r));
    } catch (e) {
      return renameSheet(id, e && e.message ? e.message : 'I couldn’t save that. Try again.');
    }
    refreshHome();
    songMenuSheet(id);
  }
}

function deleteSheet(id) {
  const rec = findRecord(id);
  if (!rec) return closeSheet();
  openSheet(
    `<h2>Delete this song?</h2>
     <p>“${esc(rec.song.title)}” and its scores will be gone from this phone. To sing it again, a grown-up adds the song file again.</p>
     <div class="sheet-actions">
       <button class="btn secondary" data-act="fam-back">Keep it</button>
       <button class="btn danger" data-act="fam-delete-yes">Delete song</button>
     </div>`,
    {
      'fam-back': () => songMenuSheet(id),
      'fam-delete-yes': async (btn) => {
        btn.disabled = true;
        if (await removeFamily(id)) {
          openSheet(`<h2>Deleted</h2><p>“${esc(rec.song.title)}” is gone from this phone.</p><button class="btn primary wide" data-act="sheet-close">Done</button>`, {}, { label: 'Deleted' });
        }
      },
    },
    { label: 'Delete song', key: 'fam-delete', cls: 'fam' }
  );
}

async function removeFamily(id) {
  try {
    await library.remove(id);
  } catch (e) {
    openSheet(`<h2>Not deleted</h2><p>${esc(e && e.message ? e.message : 'Something went wrong. Try again.')}</p><button class="btn primary wide" data-act="sheet-close">OK</button>`, {}, { label: 'Not deleted' });
    return false;
  }
  familySongs = familySongs.filter((r) => r.id !== id);
  if (store.data.progress['song:' + id]) {
    delete store.data.progress['song:' + id];
    store.save();
  }
  refreshHome();
  return true;
}

// ---- Moving a song to another family phone ----

function moveSheet(id, keep = false) {
  const rec = findRecord(id);
  if (!rec) return closeSheet();
  openSheet(
    `<p class="eyebrow">Move to another family phone</p>
     <h2>${esc(rec.song.title)}</h2>
     <p class="notice">${NOTICE_SEND}</p>
     <ol class="fam-steps">
       <li>Tap <b>Send</b>, then choose AirDrop or Messages, to your own family’s phone.</li>
       <li>On that phone, save the file to Files.</li>
       <li>Open Note by Note there, go to Songs, tap <b>Add a song</b> and choose the file.</li>
     </ol>
     <div class="field keep-field">
       <div><b id="keep-l">Also keep a copy here</b><p>Song shops usually allow personal use only. Check the shop’s terms before keeping a song on two phones.</p></div>
       <button class="switch ${keep ? 'on' : ''}" role="switch" aria-checked="${keep}" aria-labelledby="keep-l" data-act="fam-keep"><i></i></button>
     </div>
     <div class="sheet-actions">
       <button class="btn secondary" data-act="fam-back">Cancel</button>
       <button class="btn primary" data-act="fam-send">${ICON_SEND}<span>Send</span></button>
     </div>`,
    {
      'fam-back': () => songMenuSheet(id),
      'fam-keep': () => {
        moveSheet(id, !keep);
        focusIn('[data-act="fam-keep"]');
      },
      'fam-send': (btn) => sendFamily(rec, keep, btn),
    },
    { label: 'Move to another family phone', key: 'fam-move', cls: 'fam' }
  );
}

// The .nbn file goes out through the share sheet (AirDrop, Messages) as JSON with a .nbn name,
// or is downloaded where sharing files isn't supported. share() is called straight from the
// tap, before anything is awaited, so the browser counts it as the grown-up's own action.
async function sendFamily(rec, keep, btn) {
  let file;
  try {
    const text = writeFamilySongFile(rec.song, rec.source);
    file = new File([text], familySongFileName(rec.song), { type: 'application/json' });
  } catch (e) {
    openSheet(`<h2>Can’t send this song</h2><p>${esc(e && e.message ? e.message : 'Something went wrong.')}</p><button class="btn primary wide" data-act="sheet-close">OK</button>`, {}, { label: 'Can’t send' });
    return;
  }
  let how = 'shared';
  let canShare = false;
  try {
    canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
  } catch (e) {
    canShare = false;
  }
  if (canShare) {
    btn.disabled = true;
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      btn.disabled = false;
      if (e && e.name === 'AbortError') return; // the grown-up closed the share sheet
      how = 'saved';
      if (!downloadFile(file)) return;
    }
  } else {
    how = 'saved';
    if (!downloadFile(file)) return;
  }
  arrivedSheet(rec.id, keep, how);
}

function downloadFile(file) {
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch (e) {
    return false;
  }
}

function arrivedSheet(id, keep, how) {
  const rec = findRecord(id);
  if (!rec) return closeSheet();
  const saved = how === 'saved' ? '<p>I saved the song file to your downloads. Send it to the other phone from Files.</p>' : '';
  if (keep) {
    openSheet(
      `<h2>Sent</h2>
       ${saved}
       <p>A copy of “${esc(rec.song.title)}” stays on this phone too.</p>
       <button class="btn primary wide" data-act="sheet-close">Done</button>`,
      {},
      { label: 'Sent', key: 'fam-arrived', cls: 'fam' }
    );
    return;
  }
  openSheet(
    `<h2>Did it arrive?</h2>
     ${saved}
     <p>Check that “${esc(rec.song.title)}” is on the other phone. Then I’ll delete it here, so the song is moved, not copied.</p>
     <div class="sheet-actions">
       <button class="btn secondary" data-act="fam-notyet">Not yet</button>
       <button class="btn primary" data-act="fam-arrived">Yes, delete it here</button>
     </div>`,
    {
      'fam-notyet': () => moveSheet(id, false),
      'fam-arrived': async (btn) => {
        btn.disabled = true;
        if (await removeFamily(id)) {
          openSheet(
            `<h2>Moved</h2><p>“${esc(rec.song.title)}” is on the other phone now, and gone from this one.</p><button class="btn primary wide" data-act="sheet-close">Done</button>`,
            {},
            { label: 'Moved', key: 'fam-moved', cls: 'fam' }
          );
        }
      },
    },
    { label: 'Did it arrive?', key: 'fam-arrived', cls: 'fam' }
  );
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

// The app puts each tab back at its own scroll position, so the browser shouldn't also try.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
current = homeCtrl();
history.replaceState({ nbn: 0 }, '');
loadFamily();
requestAnimationFrame(loop);

// Read-only hook used by automated tests.
window.__nbn = {
  probe: () => (current && current.probe ? current.probe() : null),
  screen: () => (current ? current.name : null),
  tab: () => (current && current.name === 'home' ? tab : null),
};

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
