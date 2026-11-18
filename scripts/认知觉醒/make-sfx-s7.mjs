import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 31415;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const TAU = Math.PI * 2;
const writeWav = (name, data, gain = 0.9) => {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? gain / peak : 1;
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * k * 32767))), 44 + i * 2));
  writeFileSync(new URL(name, OUT), b);
  console.log('✔', name, (data.length / SR).toFixed(2) + 's');
};
const reverb = (x, mix = 0.3, decay = 0.6) => {
  const y = Float32Array.from(x);
  for (const d of [1557, 1617, 1491, 1422].map((v) => v * 1.3)) {
    const D = Math.round(d), c = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) c[i] = x[i] + (i >= D ? c[i - D] * decay : 0);
    for (let i = 0; i < x.length; i++) y[i] += (c[i] * mix) / 4;
  }
  return y;
};
{
  const D = 3, x = buf(D);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const n = rnd();
    lp += 0.35 * (n - lp);
    lp2 += 0.05 * (lp - lp2);
    const hiss = (lp - lp2) * 1.2;
    let bub = 0;
    if (rnd() > 0.9992) bub = 1;
    x[i] = hiss * (0.8 + 0.2 * Math.sin(TAU * 3.3 * t)) + bub * 0.5;
    if (i > 0 && bub) {
      const f = 600 + (rnd() + 1) * 700;
      for (let j = 0; j < 0.03 * SR && i + j < x.length; j++) x[i + j] += Math.sin((TAU * f * j) / SR) * Math.exp((-j / SR) * 120) * 0.3;
    }
    x[i] *= Math.min(1, t / 0.05, (D - t) / 0.05);
  }
  writeWav('water.wav', x, 0.55);
}
{
  const D = 3, x = buf(D);
  const voices = Array.from({length: 5}, (_, k) => ({f0: 110 + k * 37, rate: 2.5 + k * 0.9, ph: k * 1.3}));
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    voices.forEach((v) => {
      const syll = Math.max(0, Math.sin(TAU * v.rate * t + v.ph));
      const f = v.f0 * (1 + 0.08 * Math.sin(TAU * 0.7 * t + v.ph));
      const formant = Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 3 * t) + 0.3 * Math.sin(TAU * f * 5 * t);
      s += formant * syll;
    });
    x[i] = s * Math.min(1, t / 0.05, (D - t) / 0.05);
  }
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    lp += 0.15 * (x[i] - lp);
    x[i] = lp;
  }
  writeWav('mumble.wav', reverb(x, 0.35, 0.5), 0.5);
}
{
  const D = 2.0, x = buf(D);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    lp += (0.3 - 0.27 * p) * (rnd() - lp);
    const f = 880 * (1 - 0.5 * p);
    const tone = Math.sin(TAU * f * t) + Math.sin(TAU * f * 1.5 * t) * 0.5;
    const env = p < 0.8 ? p / 0.8 : Math.exp(-(p - 0.8) * 12);
    x[i] = (lp * 1.5 * (1 - p) + tone * 0.4 * p) * env;
  }
  writeWav('focus.wav', reverb(x, 0.45, 0.6), 0.6);
}
{
  const D = 4, x = buf(D);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const cut = 0.02 + 0.03 * (0.5 + 0.5 * Math.sin(TAU * 0.4 * t));
    lp += cut * (rnd() - lp);
    lp2 += cut * (lp - lp2);
    x[i] = lp2 * (0.6 + 0.4 * Math.sin(TAU * 0.25 * t)) * Math.min(1, t / 0.1, (D - t) / 0.1);
  }
  writeWav('wind.wav', x, 0.6);
}
{
  const x = buf(0.45);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (3000 * Math.exp(-t * 6) + 400)) / SR;
    const n = rnd();
    lp += 0.6 * (n - lp);
    x[i] = (Math.sin(ph) * 0.6 + (n - lp) * 0.4) * Math.min(1, t * 800) * Math.exp(-t * 9);
  }
  writeWav('slice.wav', reverb(x, 0.2, 0.4), 0.55);
}
{
  const D = 2.6, x = buf(D);
  const notes = [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36]];
  notes.forEach(([f, t0], k) => {
    const st = Math.round(t0 * SR);
    let lp = 0;
    for (let i = st; i < x.length; i++) {
      const t = (i - st) / SR;
      const saw = ((f * t) % 1) * 2 - 1;
      lp += 0.12 * (saw - lp);
      const hold = k === notes.length - 1 ? Math.exp(-t * 1.2) : Math.exp(-t * 4);
      x[i] += lp * Math.min(1, t * 60) * hold * 0.6;
    }
  });
  writeWav('fanfare.wav', reverb(x, 0.4, 0.6), 0.65);
}
