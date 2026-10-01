// Microphone capture, pitch reading and a small synthesizer for guide notes,
// piano chords, count-in clicks and a little drum kit. Everything is generated in the browser.

import { createDetector, Tracker } from './pitch.js';
import { midiToHz } from './music.js';

const levelOf = (ev, fallback) => (Number.isFinite(ev.vel) ? ev.vel : fallback);

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
    // The reading describes the middle of the analysis window, plus a little input delay.
    const t = this.ctx.currentTime - this.detector.need / 2 / this.ctx.sampleRate - 0.02;
    const m = this.tracker.push(r, t);
    return { t, m, rms: r.rms };
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
