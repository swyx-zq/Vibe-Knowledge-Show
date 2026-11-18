// 场景 3 的音效（独立脚本）
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

// 1) 不安的嗡鸣（可循环）：频率略微错开 → 拍频带来"发晕"感
{
  const D = 8, x = buf(D);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    lp += 0.006 * (rnd() - lp);
    const wind = lp * 7 * (0.6 + 0.4 * Math.sin(TAU * 0.25 * t));
    const beat =
      Math.sin(TAU * 110 * t) * 0.35 + Math.sin(TAU * 113.4 * t) * 0.35 +
      Math.sin(TAU * 164.8 * t) * 0.18 + Math.sin(TAU * 167.9 * t) * 0.18;
    const edge = Math.min(1, t / 0.4, (D - t) / 0.4); // 首尾淡化，避免循环时出现爆音
    x[i] = (beat * (0.75 + 0.25 * Math.sin(TAU * 0.5 * t)) + wind) * edge;
  }
  writeWav('fogbed.wav', x, 0.7);
}

// 2) 心跳（咚-咚）
{
  const x = buf(0.8);
  const thump = (t0, amp) => {
    let ph = 0, lp = 0;
    for (let i = Math.round(t0 * SR); i < x.length; i++) {
      const t = i / SR - t0;
      ph += (TAU * (45 + 50 * Math.exp(-t * 30))) / SR;
      lp += 0.05 * (rnd() - lp);
      x[i] += (Math.sin(ph) + lp * 1.5) * Math.exp(-t * 16) * Math.min(1, t * 400) * amp;
    }
  };
  thump(0, 1);
  thump(0.26, 0.7);
  writeWav('heartbeat.wav', x, 0.9);
}

// 3) 纸张摩擦声
{
  const D = 0.7, x = buf(D);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    const n = rnd();
    lp += 0.25 * (n - lp);
    const hp = n - lp;
    const crackle = rnd() > 0.997 ? rnd() * 3 : 0;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.2)) ** 1.5;
    x[i] = (hp * 0.8 + crackle) * env;
  }
  writeWav('paper.wav', reverb(x, 0.15, 0.4), 0.6);
}

// 4) 铅笔沙沙声：一笔一画的节奏
{
  const D = 1.4, x = buf(D);
  let lp = 0, lp2 = 0;
  const strokes = [];
  let t = 0.02;
  while (t < D - 0.05) {
    const len = 0.05 + (rnd() + 1) * 0.045;
    strokes.push([t, len]);
    t += len + 0.015 + (rnd() + 1) * 0.02;
  }
  for (let i = 0; i < x.length; i++) {
    const tt = i / SR;
    const n = rnd();
    lp += 0.5 * (n - lp);
    lp2 += 0.12 * (lp - lp2);
    const band = lp - lp2;
    let env = 0;
    for (const [s, len] of strokes) {
      if (tt >= s && tt < s + len) env = Math.sin((Math.PI * (tt - s)) / len);
    }
    const grain = rnd() > 0.995 ? rnd() * 0.8 : 0;
    x[i] = (band * 1.8 + grain) * env;
  }
  writeWav('pencil.wav', x, 0.6);
}

// 5) 吸入声：迷雾被吸进卡片（反向的气流声）
{
  const D = 0.9, x = buf(D);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    lp += (0.01 + 0.35 * p * p) * (rnd() - lp);
    const env = p ** 2.2 * (p > 0.96 ? (1 - p) / 0.04 : 1);
    x[i] = lp * 2.5 * env + Math.sin(TAU * (300 + 900 * p) * t) * 0.15 * env;
  }
  writeWav('gather.wav', reverb(x, 0.25, 0.5), 0.7);
}

// 6) 卡片落定：咔嗒 + 双音提示
{
  const x = buf(0.35);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const click = rnd() * Math.exp(-t * 300) * 0.8;
    const n1 = Math.sin(TAU * 880 * t) * Math.exp(-t * 18) * (t < 0.06 ? 1 : 0.3);
    const n2 = t > 0.06 ? Math.sin(TAU * 1318.5 * (t - 0.06)) * Math.exp(-(t - 0.06) * 14) : 0;
    x[i] = click + n1 * 0.6 + n2 * 0.7;
  }
  writeWav('card.wav', reverb(x, 0.2, 0.4), 0.6);
}