import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';
import {BRAIN_PARTS, CEREB_FILL_PATH, CX, CY, PartKind, Pt} from './brain';
import {Drone, Sfx, io, lerp, prog, sp} from './common';

export const SCENE9_DURATION = 300;

const T = {
  instinct: 5,
  emotion: 25,
  reason: 45,
  kw0: 80,
  kwStep: 5,
  absorb0: 130,
  absorbStep: 3,
  absorbDur: 18,
  rays: 160,
  q1: 175,
  q2: 195,
  title: 225,
  end: [275, 300] as const,
};

// 若想引用书中原句，替换这里（注意改署名）
const QUOTE = ['觉醒，就是看清自己的天性，', '然后温柔地驾驭它。'];
const KW = ['三重大脑', '焦虑', '模糊', '元认知', '舒适区', '关联', '专注', '行动', '早冥读写跑'];
const BC = {x: CX + 20, y: CY + 10};

const LIMBIC: Pt[] = Array.from({length: 81}, (_, i) => {
  const th = ((160 + (300 * i) / 80) * Math.PI) / 180;
  return {x: CX + 20 + 140 * Math.cos(th), y: CY + 15 + 90 * Math.sin(th)};
});
const LIMBIC_D = 'M ' + LIMBIC.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

const INSTINCT_KINDS: PartKind[] = ['cereb', 'folia', 'stem'];
const absorbEnd = (i: number) => T.absorb0 + i * T.absorbStep + T.absorbDur;

const Brain: React.FC<{frame: number}> = ({frame}) => {
  const pI = prog(frame, T.instinct, T.instinct + 25);
  const pE = prog(frame, T.emotion, T.emotion + 25, io);
  const pR = prog(frame, T.reason, T.reason + 35);
  // 吸收关键词时的闪光
  const flash = KW.reduce((s, _, i) => {
    const d = frame - absorbEnd(i);
    return d >= 0 && d < 12 ? Math.max(s, 1 - d / 12) : s;
  }, 0);
  const breath = frame > T.rays ? Math.sin((frame - T.rays) / 10) : 0;
  const glow = 8 + 10 * flash + 6 * prog(frame, T.rays, T.rays + 20) * (0.5 + 0.5 * breath);
  let ci = 0;
  let cr = 0;

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', filter: `drop-shadow(0 0 ${glow}px rgba(79,195,247,0.7))`}}>
      <defs>
        <radialGradient id="s9Fill" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor={C.reason} stopOpacity={0.18 + 0.2 * flash} />
          <stop offset="100%" stopColor={C.reason} stopOpacity={0.03} />
        </radialGradient>
        <linearGradient id="s9StemFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="s9StemMask" maskUnits="userSpaceOnUse">
          <rect x={CX} y={CY + 150} width={200} height={160} fill="url(#s9StemFade)" />
        </mask>
      </defs>
      <g transform={`translate(${CX} ${CY}) scale(${1 + 0.012 * breath + 0.02 * flash}) translate(${-CX} ${-CY})`}>
        <path d={BRAIN_PARTS[0].d} fill="url(#s9Fill)" opacity={pR} />
        <path d={CEREB_FILL_PATH} fill={C.instinct} opacity={0.18 * pI} />
        <path d={LIMBIC_D} fill="none" stroke={C.emotion} strokeWidth={20} strokeLinecap="round" opacity={0.25} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pE} />
        <path d={LIMBIC_D} fill="none" stroke={C.emotion} strokeWidth={3.5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pE} />
        {BRAIN_PARTS.map((p, i) => {
          const inst = INSTINCT_KINDS.includes(p.kind);
          const idx = inst ? ci++ : cr++;
          const start = inst ? T.instinct + idx * 2 : T.reason + idx * 0.8;
          const pr = prog(frame, start, start + (p.kind === 'outline' ? 30 : 16));
          if (pr <= 0) return null;
          return (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={inst ? C.instinct : C.reason}
              strokeWidth={p.kind === 'outline' ? 3.6 : p.kind === 'minor' || p.kind === 'folia' ? 1.6 : 2.5}
              strokeLinecap="round"
              opacity={p.kind === 'minor' ? 0.5 : 0.9}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - pr}
              mask={p.kind === 'stem' ? 'url(#s9StemMask)' : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
};

const Rays: React.FC<{frame: number}> = ({frame}) => {
  const k = prog(frame, T.rays, T.rays + 25);
  if (k <= 0) return null;
  const rot = (frame - T.rays) * 0.3;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {Array.from({length: 28}, (_, i) => {
        const a = ((i * 360) / 28 + rot) * (Math.PI / 180);
        const r0 = 350;
        const len = (80 + 60 * Math.sin(frame / 9 + i * 1.7)) * k;
        return (
          <line
            key={i}
            x1={BC.x + Math.cos(a) * r0}
            y1={BC.y + Math.sin(a) * r0 * 0.78}
            x2={BC.x + Math.cos(a) * (r0 + len)}
            y2={BC.y + Math.sin(a) * (r0 + len) * 0.78}
            stroke={C.reason}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.35 * k}
          />
        );
      })}
    </svg>
  );
};

const Keywords: React.FC<{frame: number; fps: number}> = ({frame, fps}) => (
  <>
    {KW.map((w, i) => {
      const at = T.kw0 + i * T.kwStep;
      if (frame < at || frame >= absorbEnd(i)) return null;
      const s = sp(frame - at, fps, 11, 170);
      const a = ((i / KW.length) * 360 - 90 + (frame - T.kw0) * 0.4) * (Math.PI / 180);
      const ex = BC.x + Math.cos(a) * 640;
      const ey = BC.y + Math.sin(a) * 300;
      const k = prog(frame, T.absorb0 + i * T.absorbStep, absorbEnd(i), io);
      const x = lerp(ex, BC.x, k);
      const y = lerp(ey, BC.y, k);
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x - 150,
            top: y - 26,
            width: 300,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 700,
            color: [C.instinct, C.emotion, C.reason][i % 3],
            opacity: s * (1 - k * 0.6),
            transform: `scale(${s * (1 - 0.7 * k)})`,
            textShadow: '0 0 14px rgba(0,0,0,0.8)',
          }}
        >
          {w}
        </div>
      );
    })}
  </>
);

const Ending: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const q1 = prog(frame, T.q1, T.q1 + 20);
  const q2 = prog(frame, T.q2, T.q2 + 20);
  const t = sp(frame - T.title, fps, 14, 130);
  const line = (txt: string, k: number, color: string) => (
    <div style={{opacity: k, transform: `translateY(${(1 - k) * 20}px)`, filter: `blur(${(1 - k) * 6}px)`, color}}>{txt}</div>
  );
  return (
    <>
      <div style={{position: 'absolute', top: 720, width: '100%', textAlign: 'center', fontSize: 58, fontWeight: 700, lineHeight: 1.5, letterSpacing: 4}}>
        {line(QUOTE[0], q1, C.text)}
        {line(QUOTE[1], q2, C.reason)}
      </div>
      <div style={{position: 'absolute', top: 930, width: '100%', textAlign: 'center', fontSize: 32, color: C.dim, letterSpacing: 4, opacity: t}}>
        读《认知觉醒》 · 周岭 著
      </div>
      <div style={{position: 'absolute', right: 60, bottom: 40, fontSize: 30, fontWeight: 700, color: C.reason, opacity: t}}>#vibe知识大赏</div>
    </>
  );
};

const SoundTrack: React.FC = () => (
  <>
    <Drone duration={SCENE9_DURATION} vol={0.14} />
    <Sfx from={T.instinct} src="tone-low.wav" vol={0.6} dur={60} />
    <Sfx from={T.emotion} src="tone-mid.wav" vol={0.55} dur={60} />
    <Sfx from={T.reason} src="tone-high.wav" vol={0.5} dur={60} />
    <Sfx from={T.reason + 4} src="shimmer.wav" vol={0.3} dur={60} />
    {KW.map((_, i) => (
      <Sfx key={`k${i}`} from={T.kw0 + i * T.kwStep} src="blip.wav" vol={0.22} rate={0.9 + i * 0.05} dur={6} />
    ))}
    <Sfx from={T.absorb0} src="gather.wav" vol={0.45} dur={30} />
    <Sfx from={absorbEnd(KW.length - 1) - 4} src="pulse.wav" vol={0.45} dur={60} />
    <Sfx from={T.rays} src="shimmer.wav" vol={0.3} dur={60} />
    <Sfx from={T.q1} src="outro.wav" vol={0.55} dur={SCENE9_DURATION - T.q1} />
  </>
);

export const Scene9: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const op = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, #16202C 0%, ${C.bg} 62%)`, fontFamily: FONT, color: C.text, opacity: op}}>
        <SoundTrack />
        <Rays frame={frame} />
        <Brain frame={frame} />
        <Keywords frame={frame} fps={fps} />
        <Ending frame={frame} fps={fps} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};