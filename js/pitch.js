// Pitch detection for singing.
// YIN (de Cheveigné & Kawahara, 2002) with an adaptive threshold,
// plus a small tracker that gates silence and removes one-frame glitches.

export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function createDetector(sampleRate, { minHz = 60, maxHz = 1250, threshold = 0.12 } = {}) {
  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.ceil(sampleRate / minHz);
  const W = Math.round(sampleRate * 0.0213); // about 1024 samples at 48 kHz
  const need = W + tauMax + 2;
  const d = new Float32Array(tauMax + 2);
  const cm = new Float32Array(tauMax + 2);

  function detect(buf) {
    const off = buf.length - need;
    if (off < 0) throw new Error('Pitch buffer too short');

    let e = 0;
    for (let i = off; i < off + W; i++) e += buf[i] * buf[i];
    const rms = Math.sqrt(e / W);
    if (rms < 1e-5) return { hz: 0, ap: 1, rms };

    // Difference function
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let j = off, end = off + W; j < end; j++) {
        const v = buf[j] - buf[j + tau];
        s += v * v;
      }
      d[tau] = s;
    }

    // Cumulative mean normalised difference
    let run = 0;
    cm[0] = 1;
    let gmin = 1e9;
    for (let tau = 1; tau <= tauMax; tau++) {
      run += d[tau];
      cm[tau] = run > 0 ? (d[tau] * tau) / run : 1;
      if (tau >= tauMin && tau < tauMax && cm[tau] < gmin) gmin = cm[tau];
    }

    // First dip under the threshold. When nothing is that clean, take the
    // first dip close to the global minimum, which avoids octave-down errors.
    const thr = gmin < threshold ? threshold : gmin * 1.2 + 0.03;
    // Take the lowest point of the whole dip, not the first ripple inside it.
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (cm[t] < thr) {
        let best = t;
        while (t + 1 < tauMax && cm[t + 1] < thr) {
          t++;
          if (cm[t] < cm[best]) best = t;
        }
        tau = best;
        break;
      }
    }
    if (tau < 0) return { hz: 0, ap: 1, rms };

    let refined = tau;
    if (tau > 1 && tau < tauMax) {
      const a = cm[tau - 1], b = cm[tau], c = cm[tau + 1];
      const den = a + c - 2 * b;
      if (Math.abs(den) > 1e-12) refined = tau + (a - c) / (2 * den);
    }
    return { hz: sampleRate / refined, ap: cm[tau], rms };
  }

  return { detect, need, sampleRate, W, tauMin, tauMax };
}

// A pitched sound that holds one pitch within STEADY_CENTS and one level within STEADY_LEVEL
// (both against its running average) for STEADY_SECS is a machine: a fridge or fan hum, or a
// tone from a speaker. Voices always wobble more than that, even on a straight-tone hold.
// Measured with this detector on synthetic sound: a hum or a speaker tone stays inside that band,
// so it turns into background about 3 s after it starts (one so quiet that room noise blurs its
// pitch may not). A straight-tone voice with just 3 cents of jitter and 5 cents of slow drift
// never stayed inside it for more than 1.5 s in 60 twelve-second holds.
const STEADY_CENTS = 5;
const STEADY_LEVEL = 0.12;
const STEADY_SECS = 3;

// Turns raw detections into a sung pitch (MIDI float) or null for silence.
export class Tracker {
  constructor() {
    this.floor = 0.002;
    this.lastPitched = -Infinity;
    this.recent = [];
    this.run = null; // the steady stretch under way: { m, rms, n, t } (running averages, start time)
    // When the pitch push() last returned was sung. The median of three readings follows a change
    // one reading late, so a median belongs to the middle reading's time, not the newest one's.
    this.at = null;
  }

  reset() {
    this.recent = [];
    this.at = null;
  }

  gate() {
    return Math.min(0.03, Math.max(0.0035, this.floor * 3.5));
  }

  // True while a pitched sound has been machine-steady for STEADY_SECS.
  steady(r, time) {
    const m = hzToMidi(r.hz);
    const s = this.run;
    if (!s || Math.abs(m - s.m) * 100 > STEADY_CENTS || Math.abs(r.rms / s.rms - 1) > STEADY_LEVEL) {
      this.run = { m, rms: r.rms, n: 1, t: time };
      return false;
    }
    s.n++;
    s.m += (m - s.m) / s.n;
    s.rms += (r.rms - s.rms) / s.n;
    return time - s.t >= STEADY_SECS;
  }

  push(r, time) {
    // The noise floor follows the room: it falls quickly in quiet moments and rises slowly,
    // but only after nothing has sounded like a pitch for a moment. Room noise has no clear
    // pitch, so the floor still rises with it. A held note, however quiet, never feeds the
    // floor, so the gate can't creep up and cut it off part way through.
    // A machine-steady hum is the exception: the floor learns it at half its level, so the gate
    // (3.5 times the floor) settles just above the hum and stays there when something else
    // sounds over it for a moment. A voice louder than the hum still gets through.
    const pitched = r.hz >= 60 && r.hz <= 1250 && r.ap < 0.3;
    const hum = pitched && this.steady(r, time);
    if (!pitched) this.run = null;
    if (pitched && !hum) this.lastPitched = time;
    if (r.rms < this.floor) this.floor = this.floor * 0.7 + r.rms * 0.3;
    else if (hum) this.floor = Math.max(this.floor, this.floor * 0.95 + r.rms * 0.5 * 0.05);
    else if (time - this.lastPitched > 0.3) this.floor = this.floor * 0.9985 + r.rms * 0.0015;

    const voiced = pitched && !hum && r.rms > this.gate();
    this.recent = this.recent.filter((p) => time - p.t < 0.1);
    this.at = time;
    if (!voiced) return null;

    const m = hzToMidi(r.hz);
    this.recent.push({ t: time, m });
    if (this.recent.length > 3) this.recent.shift();
    if (this.recent.length < 3) return m;
    this.at = this.recent[1].t;
    return median(this.recent.map((p) => p.m));
  }
}
