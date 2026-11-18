// 场景 1 的音效（独立脚本，不依赖 make-sfx.mjs）
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 67890;
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

// 上升音：时间轴放大
{
  const D = 1.7, x = buf(D);
  let lp = 0, ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    lp += (0.02 + 0.3 * p) * (rnd() - lp);
    ph += (TAU * (180 + 1000 * p * p)) / SR;
    const env = p ** 1.6 * (p > 0.94 ? (1 - p) / 0.06 : 1);
    x[i] = (lp * 2 + Math.sin(ph) * 0.5 * (0.7 + 0.3 * Math.sin(TAU * 14 * t))) * env;
  }
  writeWav('riser.wav', reverb(x, 0.3, 0.5), 0.75);
}

// 下降音：时间轴还原
{
  const D = 1.0, x = buf(D);
  let lp = 0, ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    lp += (0.3 - 0.27 * p) * (rnd() - lp);
    ph += (TAU * (900 * Math.exp(-p * 2) + 120)) / SR;
    const env = Math.min(1, t * 40) * (1 - p) ** 1.5;
    x[i] = (lp * 1.5 + Math.sin(ph) * 0.5) * env;
  }
  writeWav('fall.wav', reverb(x, 0.3, 0.5), 0.7);
}

// 叮：揭示 0.7%
{
  const x = buf(2.0);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.min(1, t * 500) * (Math.sin(TAU * 1318.5 * t) * Math.exp(-t * 2.5)
      + 0.5 * Math.sin(TAU * 2637 * t) * Math.exp(-t * 4)
      + 0.25 * Math.sin(TAU * 3950 * t) * Math.exp(-t * 7));
  }
  writeWav('ding.wav', reverb(x, 0.4, 0.6), 0.6);
}

// 三层大脑出场音：拨弦，低（本能）/ 中（情绪）/ 高（理智）
const pluck = (name, f, dur, damp, gain) => {
  const x = buf(dur), N = Math.round(SR / f), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = rnd();
  let idx = 0;
  for (let i = 0; i < x.length; i++) {
    const a = ring[idx], b = ring[(idx + 1) % N];
    ring[idx] = (a + b) * 0.5 * damp;
    x[i] = a + Math.sin(TAU * f * 0.5 * (i / SR)) * 0.4 * Math.exp(-(i / SR) * 3);
    idx = (idx + 1) % N;
  }
  writeWav(name, reverb(x, 0.35, 0.6), gain);
};
pluck('tone-low.wav', 98, 2.2, 0.996, 0.85);
pluck('tone-mid.wav', 196, 2.0, 0.995, 0.75);
pluck('tone-high.wav', 587.3, 2.0, 0.994, 0.65);

// 落地闷响
{
  const x = buf(0.6);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (40 + 60 * Math.exp(-t * 25))) / SR;
    lp += 0.08 * (rnd() - lp);
    x[i] = Math.sin(ph) * Math.exp(-t * 7) + lp * 3 * Math.exp(-t * 30);
  }
  writeWav('thud.wav', x, 0.9);
}

// 绳子紧绷的吱嘎声：拔河
{
  const D = 4.6, x = buf(D);
  let lp = 0, res = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    lp += 0.01 * (rnd() - lp);
    const am = 0.5 + 0.5 * Math.sin(TAU * 2.3 * t) ** 2;
    const pulse = Math.sin(TAU * 1.7 * t) > 0.6 && i % 220 < 3 ? 1 : 0;
    res = res * 0.995 + pulse;
    const creak = Math.sin(TAU * 320 * t) * res * 0.15;
    const env = Math.min(1, t * 3) * Math.min(1, (D - t) * 4);
    x[i] = (lp * 5 * am + creak + Math.sin(TAU * 62 * t) * 0.15 * am) * env;
  }
  writeWav('strain.wav', x, 0.7);
}

// 跳跃
{
  const x = buf(0.4);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (260 * Math.exp(t * 3.6))) / SR;
    x[i] = Math.sin(ph) * Math.min(1, t * 300) * Math.exp(-t * 9);
  }
  writeWav('hop.wav', x, 0.6);
}

// 和弦：顿悟时刻
{
  const D = 3.6, x = buf(D);
  const ch = [261.63, 329.63, 392.0, 523.25, 659.25];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 2.5) * Math.exp(-Math.max(0, t - 0.6) * 0.9);
    let s = 0;
    ch.forEach((f, k) => (s += Math.sin(TAU * f * t + k) * (1 + 0.3 * Math.sin(TAU * 0.5 * t + k)) + 0.2 * Math.sin(TAU * f * 2 * t)));
    x[i] = s * env;
  }
  writeWav('resolve.wav', reverb(x, 0.45, 0.65), 0.6);
}