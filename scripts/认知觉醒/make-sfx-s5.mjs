import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 86420;
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
  const D = 1.5, x = buf(D);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (196 + 40 * Math.exp(-t * 8))) / SR;
    const env = Math.min(1, t * 25) * Math.exp(-t * 2.2);
    x[i] = (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * env;
  }
  writeWav('bloom.wav', reverb(x, 0.45, 0.6), 0.6);
}
{
  const D = 2.8, x = buf(D);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (130 + 12 * Math.sin(TAU * 0.7 * t))) / SR;
    const env = Math.min(1, t * 3, (D - t) * 3);
    x[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * env * (0.7 + 0.3 * Math.sin(TAU * 0.7 * t));
  }
  writeWav('lazy.wav', reverb(x, 0.3, 0.5), 0.5);
}
{
  const x = buf(0.9);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (520 * Math.exp(-t * 6) + 90) * (1 + 0.08 * Math.sin(TAU * 22 * t) * Math.exp(-t * 4))) / SR;
    const body = (Math.sin(ph) + 0.4 * Math.sin(2.7 * ph)) * Math.exp(-t * 5);
    const hit = rnd() * Math.exp(-t * 80);
    x[i] = body + hit;
  }
  writeWav('bonk.wav', reverb(x, 0.25, 0.5), 0.85);
}
{
  const D = 0.9, x = buf(D);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (392 * (1 + 0.08 * Math.min(1, t * 6)))) / SR;
    const env = Math.min(1, t * 30) * Math.exp(-t * 4);
    x[i] = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * env;
  }
  writeWav('grow.wav', reverb(x, 0.4, 0.55), 0.55);
}
{
  const D = 3.0, x = buf(D);
  let t = 0;
  while (t < D - 0.05) {
    const st = Math.round(t * SR);
    const f = 900 + 1100 * (t / D);
    for (let i = st; i < Math.min(x.length, st + 0.03 * SR); i++) {
      const tt = (i - st) / SR;
      x[i] += Math.sin(TAU * f * tt) * Math.exp(-tt * 140);
    }
    const p = t / D;
    t += 0.16 * (1 - p) ** 1.5 + 0.025;
  }
  writeWav('count.wav', x, 0.55);
}
