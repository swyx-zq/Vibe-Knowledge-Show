// 场景 4 的音效（独立脚本）
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

let seed = 97531;
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

// 1) 快速钟表滴答（可循环，每 0.125 秒一下，交替高低音）
{
  const D = 2, x = buf(D);
  for (let k = 0; k < 16; k++) {
    const st = Math.round(k * 0.125 * SR);
    const f = k % 2 ? 2600 : 3200;
    for (let i = st; i < Math.min(x.length, st + 0.04 * SR); i++) {
      const t = (i - st) / SR;
      x[i] += (Math.sin(TAU * f * t) * 0.6 + rnd() * 0.4) * Math.exp(-t * 160);
    }
  }
  writeWav('tick.wav', x, 0.6);
}

// 2) 手机提示音（木琴感双音）
{
  const x = buf(0.7);
  [[1046.5, 0], [1568, 0.09]].forEach(([f, t0]) => {
    const st = Math.round(t0 * SR);
    for (let i = st; i < x.length; i++) {
      const t = (i - st) / SR;
      x[i] += (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30)) * Math.exp(-t * 9) * Math.min(1, t * 800);
    }
  });
  writeWav('notify.wav', reverb(x, 0.25, 0.5), 0.6);
}

// 3) 镜头后撤：深沉气流 + 下行音
{
  const D = 2.6, x = buf(D);
  let lp = 0, ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    lp += (0.04 + 0.12 * Math.sin(Math.PI * p)) * (rnd() - lp);
    ph += (TAU * (240 * Math.exp(-p * 1.4) + 60)) / SR;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.1)) ** 1.5;
    x[i] = (lp * 3 + Math.sin(ph) * 0.35) * env;
  }
  writeWav('pullback.wav', reverb(x, 0.4, 0.6), 0.7);
}

// 4) 空灵上升（另一个自己飘出）：合唱式和声 + 上滑
{
  const D = 2.4, x = buf(D);
  const base = [392, 493.9, 587.3, 784];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = t / D;
    const glide = 1 + 0.12 * p;
    let s = 0;
    base.forEach((f, k) => {
      s += Math.sin(TAU * f * glide * t + k) + Math.sin(TAU * f * glide * 1.004 * t);
    });
    x[i] = s * Math.min(1, t * 2) * Math.exp(-Math.max(0, t - 1.2) * 1.8);
  }
  writeWav('ghost.wav', reverb(x, 0.55, 0.7), 0.55);
}

// 5) "！"警觉提示：短促上行双击
{
  const x = buf(0.5);
  [[880, 0], [1760, 0.07]].forEach(([f, t0]) => {
    const st = Math.round(t0 * SR);
    for (let i = st; i < x.length; i++) {
      const t = (i - st) / SR;
      x[i] += (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 1.5 * t)) * Math.exp(-t * 12) * Math.min(1, t * 1000);
    }
  });
  for (let i = 0; i < 0.02 * SR; i++) x[i] += rnd() * Math.exp(-(i / SR) * 300) * 0.6;
  writeWav('alert.wav', reverb(x, 0.25, 0.5), 0.6);
}

// 6) 台灯开关"咔哒"
{
  const x = buf(0.15);
  [0, 0.035].forEach((t0, k) => {
    const st = Math.round(t0 * SR);
    for (let i = st; i < x.length; i++) {
      const t = (i - st) / SR;
      x[i] += (rnd() * 0.7 + Math.sin(TAU * (k ? 2400 : 1800) * t) * 0.5) * Math.exp(-t * 400) * (k ? 0.6 : 1);
    }
  });
  writeWav('click.wav', x, 0.7);
}