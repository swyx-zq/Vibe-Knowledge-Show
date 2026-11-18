// 场景 8 + 9 的音效（独立脚本）
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 27182;
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

// 1) 日出：温暖上行的和声 + 合成鸟鸣
{
  const D = 2.6, x = buf(D);
  const ch = [261.63, 329.63, 392, 523.25];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    ch.forEach((f, k) => (s += Math.sin(TAU * f * (1 + 0.02 * t) * t + k) * 0.3));
    x[i] = s * Math.min(1, t / 1.0) * Math.exp(-Math.max(0, t - 1.6) * 2);
  }
  [0.6, 0.85, 1.3, 1.5].forEach((t0) => {
    const st = Math.round(t0 * SR);
    let ph = 0;
    for (let i = st; i < Math.min(x.length, st + 0.12 * SR); i++) {
      const t = (i - st) / SR;
      ph += (TAU * (3200 + 1500 * Math.sin(TAU * 18 * t))) / SR;
      x[i] += Math.sin(ph) * Math.sin((Math.PI * t) / 0.12) * 0.25;
    }
  });
  writeWav('sunrise.wav', reverb(x, 0.4, 0.6), 0.6);
}

// 2) 颂钵：非整数倍泛音 + 长衰减 + 轻微拍频
{
  const D = 3.2, x = buf(D);
  const f0 = 220;
  const parts = [[1, 1, 0.6], [2.71, 0.5, 0.9], [5.15, 0.25, 1.4], [8.43, 0.12, 2.2]];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    parts.forEach(([m, a, d]) => {
      s += a * Math.sin(TAU * f0 * m * t) * (1 + 0.2 * Math.sin(TAU * 1.3 * t)) * Math.exp(-t * d);
    });
    x[i] = s * Math.min(1, t * 200);
  }
  writeWav('bowl.wav', reverb(x, 0.4, 0.65), 0.6);
}

// 3) 跑步脚步（约 170 步/分）
{
  const D = 2.7, x = buf(D);
  for (let k = 0; k * 0.353 < D - 0.1; k++) {
    const st = Math.round(k * 0.353 * SR);
    let ph = 0, lp = 0;
    for (let i = st; i < Math.min(x.length, st + 0.15 * SR); i++) {
      const t = (i - st) / SR;
      ph += (TAU * (90 + 60 * Math.exp(-t * 40))) / SR;
      lp += 0.3 * (rnd() - lp);
      x[i] += (Math.sin(ph) * 0.7 + lp * 0.8) * Math.exp(-t * 28) * (k % 2 ? 0.85 : 1);
    }
  }
  writeWav('run.wav', x, 0.6);
}

// 4) 结尾：长和弦 + 钟声余韵
{
  const D = 5.0, x = buf(D);
  const ch = [130.81, 196, 261.63, 329.63, 392, 523.25];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    ch.forEach((f, k) => (s += Math.sin(TAU * f * t + k) * (1 + 0.25 * Math.sin(TAU * 0.4 * t + k))));
    const pad = s * Math.min(1, t / 1.2) * Math.exp(-Math.max(0, t - 2.5) * 1.1) * 0.5;
    const bell = (Math.sin(TAU * 1046.5 * t) + 0.4 * Math.sin(TAU * 2093 * t) + 0.2 * Math.sin(TAU * 3140 * t)) * Math.exp(-t * 1.2) * Math.min(1, t * 500) * 0.5;
    x[i] = pad + bell;
  }
  writeWav('outro.wav', reverb(x, 0.5, 0.7), 0.7);
}