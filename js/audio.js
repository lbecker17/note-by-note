// Microphone capture, pitch reading and a small synthesizer for guide notes,
// piano chords, count-in clicks and a little drum kit. Everything is generated in the browser.

import { createDetector, Tracker, hzToMidi } from './pitch.js';
import { midiToHz } from './music.js';

const levelOf = (ev, fallback) => (Number.isFinite(ev.vel) ? ev.vel : fallback);

// ---------- Timing ----------
// Two delays sit between the app's clock (AudioContext.currentTime) and the singer:
//   output: a sound scheduled for time t is heard a little later (the audio system and the
//     speaker; Bluetooth adds a lot). The child sings with what they hear, so the lane and the
//     scoring run on the "heard" clock: currentTime minus outputLag().
//   input: the mic's own delay, then the analysis. read() works out the analysis part exactly
//     (see there) and subtracts inputLag() for the mic itself.
// A grown-up can measure this device's real delay in Settings (the Timing check). It is kept on
// this device only (a different iPad, or Bluetooth headphones, needs its own) and replaces the guess.
export const LAG_KEY = 'nbn:lag';
export const LAG_MAX = 0.5;
const isIOS = () => {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch (e) {
    return false;
  }
};
const finite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
// Used when the browser doesn't say (Safari 15 has no outputLatency): a built-in speaker on an
// iPad or iPhone is usually 30 to 50 ms behind, a laptop's 20 to 40 ms.
export const DEFAULT_OUTPUT = { ios: 0.04, other: 0.03 };
// The mic's own delay when the browser doesn't report it (getSettings().latency).
export const DEFAULT_INPUT = 0.01;
// How far either side of a mic reading's time the app's own output is compared (see readRef).
export const REF_SPAN = 0.08;

// { lag (seconds), how: 'tap' | 'sing', at (ms) } or null.
export function savedLag() {
  try {
    const v = JSON.parse(localStorage.getItem(LAG_KEY) || 'null');
    return v && finite(v.lag) && v.lag <= LAG_MAX ? v : null;
  } catch (e) {
    return null;
  }
}
export function saveLag(v) {
  try {
    if (v == null) localStorage.removeItem(LAG_KEY);
    else localStorage.setItem(LAG_KEY, JSON.stringify(v));
  } catch (e) {
    /* private mode: the guess is used */
  }
}

// What the browser says (or the platform's usual) about output delay, in seconds.
export function guessOutputLag(ctx, ios = isIOS()) {
  if (!ctx) return 0;
  const base = finite(ctx.baseLatency) ? ctx.baseLatency : 0;
  const out = finite(ctx.outputLatency) && ctx.outputLatency > 0 ? ctx.outputLatency : null;
  const total = out != null ? base + out : Math.max(base, ios ? DEFAULT_OUTPUT.ios : DEFAULT_OUTPUT.other);
  return Math.min(LAG_MAX, total);
}

function periodicWave(ctx, harmonics) {
  const imag = new Float32Array(harmonics);
  const real = new Float32Array(harmonics.length);
  return ctx.createPeriodicWave(real, imag);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
    this.buf = null;
    this.bytes = null;
    this.detector = null;
    this.tracker = new Tracker();
    this.micState = 'off'; // off | asking | on | denied | error | unsupported
    this.bus = null;
    this.nodes = new Set();
    this.onInterrupt = null;
    this.inLag = DEFAULT_INPUT;
  }

  // Seconds from scheduling a sound to the singer hearing it: the Timing check's measurement
  // when there is one, else what the browser reports (or the platform's usual).
  outputLag() {
    const s = savedLag();
    return s ? s.lag : guessOutputLag(this.ctx);
  }

  guessLag() {
    return guessOutputLag(this.ctx);
  }

  get micOn() {
    return this.micState === 'on' && !!this.analyser;
  }

  // Must run synchronously inside a tap handler: iOS only lets sound start from a gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const ctx = this.ctx;
      this.master = ctx.createDynamicsCompressor();
      this.master.threshold.value = -16;
      this.master.knee.value = 12;
      this.master.ratio.value = 3;
      this.master.attack.value = 0.004;
      this.master.release.value = 0.25;
      this.out = ctx.createGain();
      this.out.gain.value = 1;
      this.master.connect(this.out).connect(ctx.destination);
      this.guideWave = periodicWave(ctx, [0, 1, 0.5, 0.26, 0.14, 0.08, 0.05, 0.03]);
      // The tune while singing without headphones: nearly a sine, clear and gentle, and easy for
      // a child to match (and, as a machine-exact tone, easy to tell from their voice).
      this.tuneWave = periodicWave(ctx, [0, 1, 0.18, 0.06, 0.02]);
      this.pianoWave = periodicWave(ctx, [0, 1, 0.62, 0.36, 0.22, 0.15, 0.1, 0.07, 0.05, 0.03, 0.02]);
      ctx.onstatechange = () => {
        if (ctx.state !== 'running' && this.onInterrupt) this.onInterrupt(ctx.state);
      };
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    try {
      const b = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.ctx.destination);
      s.start(0);
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  async startMic() {
    if (this.micOn) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.micState = 'unsupported';
      throw new Error('unsupported');
    }
    this.micState = 'asking';
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'play-and-record';
    } catch (e) {
      /* older Safari */
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      this.micState = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'error';
      throw e;
    }
    const ctx = this.ctx;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const src = ctx.createMediaStreamSource(this.stream);
    this.detector = createDetector(ctx.sampleRate);
    let size = 2048;
    while (size < this.detector.need) size *= 2;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = size;
    this.analyser.smoothingTimeConstant = 0;
    this.buf = new Float32Array(size);
    // The analyser only runs if the graph reaches the speakers, so route it through silence.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    src.connect(this.analyser);
    this.analyser.connect(sink).connect(ctx.destination);
    this.tracker = new Tracker();
    // The mic's own delay, when the browser reports it (Chrome does; Safari 15 doesn't).
    try {
      const lat = this.stream.getAudioTracks()[0].getSettings().latency;
      this.inLag = finite(lat) && lat < 0.2 ? lat : DEFAULT_INPUT;
    } catch (e) {
      this.inLag = DEFAULT_INPUT;
    }
    this.micState = 'on';
    this.stream.getAudioTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        this.micState = 'off';
        this.analyser = null;
      })
    );
  }

  now() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  // One pitch reading: { t, m (MIDI float or null), rms }
  read() {
    if (!this.micOn) return null;
    const a = this.analyser;
    if (a.getFloatTimeDomainData) {
      a.getFloatTimeDomainData(this.buf);
    } else {
      if (!this.bytes) this.bytes = new Uint8Array(this.buf.length);
      a.getByteTimeDomainData(this.bytes);
      for (let i = 0; i < this.bytes.length; i++) this.buf[i] = (this.bytes[i] - 128) / 128;
    }
    const r = this.detector.detect(this.buf);
    // When was this sung? The detector compares the oldest W samples of the last `need` with the
    // same samples one period later, so a reading describes the middle of those W + period samples
    // (measured: stamping it at the middle of the whole window put readings 6 ms late). Then the
    // mic's own delay, and the tracker's median, which follows a change one reading late, so its
    // result belongs to the middle reading's time (another 17 ms at 60 frames a second, 33 at 30).
    const d = this.detector;
    const sr = this.ctx.sampleRate;
    const period = r.hz > 0 ? sr / r.hz : 0;
    const t = this.ctx.currentTime - (d.need - (d.W + period) / 2) / sr - this.inLag;
    const m = this.tracker.push(r, t);
    const at = m != null && this.tracker.at != null ? this.tracker.at : t;
    // The app's own output (only while a song plays without headphones: a second detection).
    const ref = this.readRef(at);
    return { t: at, m, rms: r.rms, hz: r.hz, ref: m != null ? ref : null };
  }

  // ---------- The speaker's own sound ----------
  // Songs without headphones play the tune (and soft chords) while the child sings, and the mic
  // hears them. A lone tune note reads machine-exact; with chords under it the reading moves a
  // little off the note (measured in Chromium: 5 to 20 cents). So the app also reads its own
  // output through the same detector, delayed by as long as it takes to come back in through the
  // mic, and a mic reading that matches it is the speaker (see sameAsRef in score.js). The guess
  // of that delay can be out, and chords read a little differently from one moment to the next,
  // so the output is read REF_SPAN ahead and a mic reading is compared with every output reading
  // from REF_SPAN before it to REF_SPAN after.
  startRef(delay) {
    this.stopRef();
    if (!this.ctx || !this.analyser) return;
    const ctx = this.ctx;
    const dl = ctx.createDelay(1);
    dl.delayTime.value = Math.min(0.99, Math.max(0, delay - REF_SPAN));
    const an = ctx.createAnalyser();
    an.fftSize = this.analyser.fftSize;
    an.smoothingTimeConstant = 0;
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this.out.connect(dl);
    dl.connect(an).connect(sink).connect(ctx.destination);
    this.ref = { dl, an, sink, buf: new Float32Array(an.fftSize), past: [], lead: delay >= REF_SPAN ? REF_SPAN : Math.max(0, delay) };
  }

  stopRef() {
    const r = this.ref;
    if (!r) return;
    this.ref = null;
    try {
      this.out.disconnect(r.dl);
    } catch (e) {
      /* already gone */
    }
    try {
      r.dl.disconnect();
      r.an.disconnect();
      r.sink.disconnect();
    } catch (e) {
      /* ignore */
    }
  }

  // The output's readings (MIDI) from REF_SPAN before time t to REF_SPAN after, as the mic would
  // read them; [] when the output has no pitch then (or there is no reference).
  readRef(t) {
    const r = this.ref;
    if (!r || !r.an.getFloatTimeDomainData) return [];
    r.an.getFloatTimeDomainData(r.buf);
    const x = this.detector.detect(r.buf);
    const at = t + r.lead; // what the mic will hear then
    r.past = r.past.filter((p) => p.t >= t - REF_SPAN - 0.02);
    if (x.hz >= 60 && x.hz <= 1250 && x.ap < 0.3 && x.rms > 1e-4) r.past.push({ t: at, m: hzToMidi(x.hz) });
    return r.past.filter((p) => Math.abs(p.t - t) <= REF_SPAN + 1e-6).map((p) => p.m);
  }

  // ---------- Synth ----------

  openBus() {
    this.closeBus();
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
    return this.bus;
  }

  closeBus() {
    const bus = this.bus;
    if (!bus) return;
    this.bus = null;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(0, t, 0.02);
    const nodes = [...this.nodes];
    this.nodes.clear();
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
        } catch (e) {
          /* already stopped */
        }
      }
      try {
        bus.disconnect();
      } catch (e) {
        /* ignore */
      }
    }, 160);
  }

  track(node) {
    this.nodes.add(node);
    node.onended = () => this.nodes.delete(node);
  }

  // A warm sustained tone that is easy to match.
  guide(m, t, d, level = 0.24, m2 = null) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.guideWave);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    f.Q.value = 0.4;
    const g = ctx.createGain();
    const hz = midiToHz(m);
    o.frequency.setValueAtTime(hz, t);
    if (m2 != null) o.frequency.exponentialRampToValueAtTime(midiToHz(m2), t + d);
    const end = t + Math.max(0.1, d - 0.05);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.03);
    g.gain.setTargetAtTime(level * 0.8, t + 0.03, 0.2);
    g.gain.setTargetAtTime(0, end, 0.035);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(end + 0.3);
    this.track(o);
  }

  // The tune while singing without headphones: soft, with a gentle start and end.
  tune(m, t, d, level = 0.06, m2 = null) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.tuneWave);
    const g = ctx.createGain();
    o.frequency.setValueAtTime(midiToHz(m), t);
    if (m2 != null) o.frequency.exponentialRampToValueAtTime(midiToHz(m2), t + d);
    const end = t + Math.max(0.1, d - 0.04);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.025);
    g.gain.setTargetAtTime(level * 0.85, t + 0.025, 0.25);
    g.gain.setTargetAtTime(0, end, 0.03);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(end + 0.25);
    this.track(o);
  }

  piano(m, t, d, vel = 0.1) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const hz = midiToHz(m);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.3;
    f.frequency.setValueAtTime(Math.min(9000, hz * 9 + 900), t);
    f.frequency.setTargetAtTime(hz * 2.5 + 500, t, 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.005);
    g.gain.setTargetAtTime(vel * 0.22, t + 0.005, 0.45);
    const end = t + Math.max(0.12, d - 0.02);
    g.gain.setTargetAtTime(0, end, 0.09);
    f.connect(g).connect(bus);
    for (const detune of [-3, 3]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this.pianoWave);
      o.frequency.value = hz;
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      o.stop(end + 0.5);
      this.track(o);
    }
  }

  click(t, accent = false) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = accent ? 1760 : 1320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(accent ? 0.16 : 0.1, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.07);
    this.track(o);
  }

  // Short noise, made once and shared by every snare and hi-hat.
  noise() {
    if (!this.noiseBuf) {
      const ctx = this.ctx;
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    return this.noiseBuf;
  }

  // Noise through a filter with a fast decay: the body of a snare or a hi-hat.
  hiss(t, type, hz, level, decay) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    n.connect(f).connect(g).connect(bus);
    // Start somewhere different in the noise each time so repeated hits don't sound pasted.
    n.start(t, (t * 0.37) % 0.5, decay + 0.02);
    this.track(n);
  }

  // A quick falling tone: a kick drum's thump, or the ring under a snare.
  thump(t, from, to, level, decay) {
    const ctx = this.ctx;
    const bus = this.bus || this.openBus();
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + decay * 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + decay + 0.02);
    this.track(o);
  }

  // Drums for "play my tune as a song". A phone speaker can't play a kick's real 50 Hz
  // thump, so its pitch drop starts high enough to hear (a triangle wave adds overtones)
  // with a little click on top. All three stay well under the melody.
  kick(t, vel = 0.8) {
    this.thump(t, 190, 50, 0.32 * vel, 0.25);
    this.hiss(t, 'bandpass', 2500, 0.03 * vel, 0.012);
  }

  snare(t, vel = 0.6) {
    this.hiss(t, 'highpass', 1500, 0.13 * vel, 0.15);
    this.thump(t, 230, 170, 0.08 * vel, 0.09);
  }

  hat(t, vel = 0.35) {
    this.hiss(t, 'highpass', 7000, 0.06 * vel, 0.04);
  }

  // Play one event from a lesson's audio list at an absolute context time.
  // Song events (tune.js arrange()) carry a vel from 0 to 1; the levels here keep the
  // tune on top, the chords soft and the drums quiet.
  play(ev, at) {
    if (ev.kind === 'guide') this.guide(ev.m, at, ev.d, ev.level);
    else if (ev.kind === 'glide') this.guide(ev.m, at, ev.d, ev.level, ev.m2);
    else if (ev.kind === 'tune') this.tune(ev.m, at, ev.d, ev.level, ev.m2);
    else if (ev.kind === 'piano') this.piano(ev.m, at, ev.d, ev.vel);
    else if (ev.kind === 'click') this.click(at, ev.accent);
    else if (ev.kind === 'melody') this.piano(ev.m, at, ev.d, 0.13 * levelOf(ev, 0.9));
    else if (ev.kind === 'bass') this.piano(ev.m, at, ev.d, 0.11 * levelOf(ev, 0.7));
    else if (ev.kind === 'chord') for (const m of Array.isArray(ev.ms) ? ev.ms : []) this.piano(m, at, ev.d, 0.045 * levelOf(ev, 0.5));
    else if (ev.kind === 'kick') this.kick(at, levelOf(ev, 0.8));
    else if (ev.kind === 'snare') this.snare(at, levelOf(ev, 0.6));
    else if (ev.kind === 'hat') this.hat(at, levelOf(ev, 0.35));
  }

  // Play an arranged song (tune.js arrange()) starting at context time `at`, on a fresh bus
  // (like a lesson step). Events go to the synth a moment ahead in small batches, so a long
  // song never builds thousands of nodes at once. Every node is tracked: stop() (or
  // closeBus()) silences it at once and ends the batches.
  playSong(song, at = this.ctx.currentTime + 0.1) {
    const bus = this.openBus();
    const evs = (song.events || []).slice().sort((a, b) => a.t - b.t);
    let i = 0;
    let timer = null;
    const pump = () => {
      if (this.bus !== bus) return clearInterval(timer);
      const now = this.ctx.currentTime;
      while (i < evs.length && at + evs[i].t < now + 1.5) {
        const ev = evs[i++];
        const when = at + ev.t;
        // Missed while the page was busy: skip it rather than play a pile-up.
        if (when >= now - 0.02) this.play(ev, Math.max(when, now + 0.005));
      }
      if (i >= evs.length) clearInterval(timer);
    };
    timer = setInterval(pump, 250);
    pump();
    return {
      at,
      end: at + (song.duration || 0),
      stop: () => {
        if (this.bus === bus) this.closeBus();
        clearInterval(timer);
      },
    };
  }

  // A quick note for previews (e.g. hearing the edges of your range).
  blip(m, d = 0.7) {
    if (!this.ctx) return;
    this.openBus();
    this.guide(m, this.ctx.currentTime + 0.03, d, 0.22);
  }
}
