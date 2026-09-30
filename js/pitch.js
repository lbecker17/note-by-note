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

// Turns raw detections into a sung pitch (MIDI float) or null for silence.
export class Tracker {
  constructor() {
    this.floor = 0.002;
    this.recent = [];
  }

  reset() {
    this.recent = [];
  }

  gate() {
    return Math.min(0.03, Math.max(0.0035, this.floor * 3.5));
  }

  push(r, time) {
    // Noise floor falls quickly and rises slowly, so a held note never becomes "noise".
    if (r.rms < this.floor) this.floor = this.floor * 0.7 + r.rms * 0.3;
    else this.floor = this.floor * 0.9985 + r.rms * 0.0015;

    const voiced = r.hz >= 60 && r.hz <= 1250 && r.ap < 0.3 && r.rms > this.gate();
    this.recent = this.recent.filter((p) => time - p.t < 0.1);
    if (!voiced) return null;

    const m = hzToMidi(r.hz);
    this.recent.push({ t: time, m });
    if (this.recent.length > 3) this.recent.shift();
    return this.recent.length >= 3 ? median(this.recent.map((p) => p.m)) : m;
  }
}
