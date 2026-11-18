import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 11235;
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
  const x = buf(0.6);
  const f = 523.25;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = (Math.sin(TAU * f * t) * Math.exp(-t * 9) + 0.35 * Math.sin(TAU * f * 3.98 * t) * Math.exp(-t * 30) + 0.2 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t * 60)) * Math.min(1, t * 900);
  }
  writeWav('block.wav', reverb(x, 0.25, 0.5), 0.6);
}
{
  const x = buf(0.2);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.sin(TAU * 1760 * t) * Math.exp(-t * 35) * Math.min(1, t * 1500);
  }
  writeWav('blip.wav', reverb(x, 0.3, 0.5), 0.5);
}
{
  const D = 3.0, x = buf(D);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    const f = 440 * (1 - 0.25 * p);
    p1 += (TAU * f) / SR;
    p2 += (TAU * f * (1.012 + 0.01 * p)) / SR;
    const wob = 1 + 0.3 * Math.sin(TAU * (3 + 4 * p) * t);
    x[i] = (Math.sin(p1) + Math.sin(p2)) * wob * Math.min(1, t * 4) * (1 - p) ** 1.2;
  }
  writeWav('forget.wav', reverb(x, 0.45, 0.6), 0.5);
}
{
  const x = buf(0.3);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (600 + 2400 * Math.min(1, t * 10))) / SR;
    lp += 0.4 * (rnd() - lp);
    const crackle = (rnd() > 0.7 ? 1 : 0) * (rnd() - lp) * 0.5;
    x[i] = (Math.sin(ph) * 0.5 + crackle) * Math.min(1, t * 600) * Math.exp(-t * 14);
  }
  writeWav('zap.wav', reverb(x, 0.2, 0.4), 0.5);
}
{
  const D = 2.4, x = buf(D);
  const fs = [65.4, 98, 130.8, 196];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const lfo = 0.6 + 0.4 * Math.sin(TAU * 1.9 * t);
    let s = 0;
    fs.forEach((f, k) => (s += Math.sin(TAU * f * t + k) * (k === 0 ? 1 : 0.5)));
    x[i] = s * lfo * Math.min(1, t * 3) * Math.exp(-Math.max(0, t - 0.8) * 1.5);
  }
  writeWav('pulse.wav', reverb(x, 0.4, 0.6), 0.65);
}
