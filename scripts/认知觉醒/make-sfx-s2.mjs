import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 24680;
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
  const x = buf(1.2);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 40) * Math.exp(-t * 8);
    x[i] = (Math.sin(TAU * 180 * t) + 0.35 * Math.sin(TAU * 360 * t)) * env;
  }
  writeWav('tension.wav', reverb(x, 0.4, 0.5), 0.7);
}
{
  const x = buf(1.5);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const a = ((t * 120) % 1) * 2 - 1;
    const env = Math.min(1, t * 22) * Math.exp(-t * 6);
    x[i] = a * env * 0.8;
  }
  writeWav('split.wav', x, 0.6);
}
{
  const x = buf(1.2);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const sweep = 180 + 780 * (1 - Math.exp(-t * 12));
    x[i] = Math.sin(TAU * sweep * t) * Math.exp(-t * 18) * 0.7;
  }
  writeWav('line-flat.wav', reverb(x, 0.3, 0.45), 0.75);
}
{
  const x = buf(1.8);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 140 * Math.exp(t * 5.5);
    const env = Math.min(1, t * 16) * Math.exp(-t * 2.5);
    x[i] = Math.sin(TAU * f * t) * env * 0.6;
  }
  writeWav('line-expo.wav', reverb(x, 0.35, 0.5), 0.7);
}
{
  const x = buf(1.5);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 260 * (1 - 0.7 * Math.min(1, t * 3)) + 30 * Math.sin(TAU * 2 * t);
    x[i] = Math.sin(TAU * f * t) * Math.exp(-t * 6) * 0.7;
  }
  writeWav('valley.wav', reverb(x, 0.3, 0.45), 0.6);
}
{
  const x = buf(0.8);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = rnd() * Math.exp(-t * 50) * 0.7;
  }
  writeWav('drop.wav', x, 0.5);
}
{
  const x = buf(1.2);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    phase += (TAU * (50 + 280 * Math.sin(TAU * 0.3 * t))) / SR;
    x[i] = Math.sin(phase) * Math.exp(-t * 10) * 0.65;
  }
  writeWav('roll.wav', reverb(x, 0.2, 0.4), 0.6);
}
