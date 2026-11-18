// 程序化合成场景 0 的全部音效 → public/sfx/*.wav（无需下载、无版权问题）
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const OUT = new URL('../../public/sfx/', import.meta.url);
mkdirSync(OUT, {recursive: true});

// 确定性噪声
let seed = 12345;
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

// 简易混响（并联梳状滤波）
const reverb = (x, mix = 0.3, decay = 0.6) => {
  const y = Float32Array.from(x);
  for (const d of [1557, 1617, 1491, 1422].map((v) => v * 1.3)) {
    const D = Math.round(d), c = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) c[i] = x[i] + (i >= D ? c[i - D] * decay : 0);
    for (let i = 0; i < x.length; i++) y[i] += (c[i] * mix) / 4;
  }
  return y;
};

// 1) 键盘敲击（3 个变体，轮流使用更自然）
for (let v = 0; v < 3; v++) {
  const x = buf(0.09);
  let lp = 0;
  const f = [2300, 1900, 2700][v];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    lp += 0.35 * (rnd() - lp);
    const click = (rnd() - lp) * Math.exp(-t * 260);
    const body = Math.sin(TAU * f * t) * Math.exp(-t * 180) * 0.5;
    const thock = Math.sin(TAU * 180 * t) * Math.exp(-t * 70) * 0.6;
    x[i] = click + body + thock;
  }
  writeWav(`key${v + 1}.wav`, x, 0.8);
}

// 2) 故障音："做不到"抖动时
{
  const x = buf(0.6);
  let hold = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const saw = ((t * 55) % 1) * 2 - 1;
    const gate = Math.sin(TAU * 18 * t) > -0.2 ? 1 : 0.15;
    if (i % 40 === 0) hold = rnd();
    const env = Math.min(1, t * 60) * Math.exp(-t * 3.5);
    x[i] = (saw * 0.7 + hold * 0.5 + Math.sin(TAU * 110 * t) * 0.4) * gate * env;
  }
  writeWav('glitch.wav', reverb(x, 0.2, 0.4), 0.85);
}

// 3) 吐息粒子音：文字消散飞向大脑
{
  const x = buf(1.8);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const p = t / 1.8;
    const cut = 0.02 + 0.25 * Math.sin(Math.PI * Math.min(1, p * 1.3));
    lp += cut * (rnd() - lp);
    lp2 += cut * (lp - lp2);
    const env = Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 2;
    const sparkle = rnd() > 0.9993 ? rnd() * 2 : 0;
    x[i] = lp2 * 3 * env + sparkle * 0.4 * env;
  }
  writeWav('whoosh.wav', reverb(x, 0.35, 0.55), 0.8);
}

// 4) 晶莹上行音：大脑线框描绘
{
  const x = buf(2.2);
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
  notes.forEach((f, k) => {
    const st = Math.round(k * 0.12 * SR);
    for (let i = st; i < x.length; i++) {
      const t = (i - st) / SR;
      const env = Math.min(1, t * 200) * Math.exp(-t * 2.8);
      x[i] += (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.01 * t) + 0.12 * Math.sin(TAU * f * 3.02 * t)) * env * 0.35;
    }
  });
  writeWav('shimmer.wav', reverb(x, 0.5, 0.65), 0.7);
}

// 5) 标题重音：低频轰鸣 + 打击瞬态 + 铃音
{
  const x = buf(3.0);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 45 + 85 * Math.exp(-t * 9);
    ph += (TAU * f) / SR;
    const boom = Math.sin(ph) * Math.exp(-t * 1.6);
    const hit = rnd() * Math.exp(-t * 45) * 0.6;
    const bell = (Math.sin(TAU * 784 * t) + 0.5 * Math.sin(TAU * 1176 * t)) * Math.exp(-t * 1.8) * 0.18 * Math.min(1, t * 300);
    x[i] = boom + hit + bell;
  }
  writeWav('impact.wav', reverb(x, 0.35, 0.6), 0.95);
}

// 6) 字幕弹出：柔和的"啵"
{
  const x = buf(0.25);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (700 + 500 * Math.min(1, t * 25))) / SR;
    x[i] = Math.sin(ph) * Math.min(1, t * 400) * Math.exp(-t * 22);
  }
  writeWav('pop.wav', x, 0.6);
}

// 7) 环境底噪：低频氛围铺底（全程很轻）
{
  const x = buf(10.5);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    lp += 0.004 * (rnd() - lp);
    const lfo = 0.75 + 0.25 * Math.sin(TAU * 0.13 * t);
    x[i] = (Math.sin(TAU * 55 * t) * 0.5 + Math.sin(TAU * 82.4 * t) * 0.3 + Math.sin(TAU * 110.3 * t) * 0.15 + lp * 6) * lfo;
  }
  writeWav('drone.wav', x, 0.6);
}
