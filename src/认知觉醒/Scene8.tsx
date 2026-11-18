import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';
import {Cap, Captions, ChapterTag, Drone, GREEN, Sfx, io, lerp, prog, sp} from './common';

export const SCENE8_DURATION = 540;

const PURPLE = '#A371F7';
const DEG = Math.PI / 180;

const T = {
  card0: 15,
  cardStep: 80,
  morph: [420, 460] as const,
  ring: [460, 490] as const,
  title: 470,
  orbit: 490,
  end: [525, 540] as const,
};

const HABITS = [
  {ch: '早', name: '早起', desc: '拥有独处时间', color: C.emotion},
  {ch: '冥', name: '冥想', desc: '训练专注', color: C.reason},
  {ch: '读', name: '阅读', desc: '获取认知', color: GREEN},
  {ch: '写', name: '写作', desc: '输出与反思', color: PURPLE},
  {ch: '跑', name: '运动', desc: '激活大脑', color: C.instinct},
];

const CW = 300;
const CH = 400;
const GAP = 40;
const X0 = (1920 - (5 * CW + 4 * GAP)) / 2;
const Y0 = 190;
const RING = {x: 960, y: 500, r: 300};
const BADGE = 170;
const cardAt = (i: number) => T.card0 + i * T.cardStep;

// ---------- 五个小动画（局部坐标 300×230） ----------
const Sunrise: React.FC<{t: number; color: string}> = ({t, color}) => {
  const rise = prog(t, 0, 60, io);
  const sunY = lerp(215, 100, rise);
  const mins = Math.round(30 * rise);
  return (
    <svg width={300} height={230} viewBox="0 0 300 230">
      <defs>
        <linearGradient id="s8Sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2A44" />
          <stop offset="100%" stopColor={color} stopOpacity={0.15 + 0.4 * rise} />
        </linearGradient>
        <clipPath id="s8Hz">
          <rect x={10} y={10} width={280} height={160} rx={12} />
        </clipPath>
      </defs>
      <rect x={10} y={10} width={280} height={160} rx={12} fill="url(#s8Sky)" />
      <g clipPath="url(#s8Hz)">
        {Array.from({length: 12}, (_, k) => {
          const a = (k * 30 + t * 1.2) * DEG;
          return (
            <line key={k} x1={150 + Math.cos(a) * 50} y1={sunY + Math.sin(a) * 50} x2={150 + Math.cos(a) * 70} y2={sunY + Math.sin(a) * 70} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.7 * rise} />
          );
        })}
        <circle cx={150} cy={sunY} r={38} fill={color} style={{filter: `drop-shadow(0 0 14px ${color})`}} />
      </g>
      <line x1={10} y1={170} x2={290} y2={170} stroke={C.dim} strokeWidth={3} />
      <text x={150} y={214} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.text}>
        5:{String(mins).padStart(2, '0')}
      </text>
    </svg>
  );
};

const Meditate: React.FC<{t: number; color: string}> = ({t, color}) => {
  const calm = prog(t, 0, 70, io);
  const A = lerp(45, 3, calm);
  const chaos = 1 - calm;
  const pts = Array.from({length: 66}, (_, k) => {
    const x = 20 + k * 4;
    const y = 110 + A * (Math.sin(x * 0.09 + t * 0.3) * 0.6 + Math.sin(x * 0.23 - t * 0.5) * 0.4 * chaos);
    return `${x} ${y.toFixed(1)}`;
  });
  const br = 26 + 8 * Math.sin(t / 12);
  return (
    <svg width={300} height={230} viewBox="0 0 300 230">
      <circle cx={150} cy={110} r={br * 2} fill={color} opacity={0.08 + 0.08 * calm} />
      <circle cx={150} cy={110} r={br} fill={color} opacity={0.15 + 0.1 * calm} />
      <path d={'M ' + pts.join(' L ')} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <text x={150} y={214} textAnchor="middle" fontSize={28} fill={C.dim}>
        呼吸 · 觉察
      </text>
    </svg>
  );
};

const Read: React.FC<{t: number; color: string}> = ({t, color}) => {
  const flipping = t < 90;
  const phase = (t % 30) / 30;
  const sx = flipping ? Math.cos(Math.PI * phase) : 1;
  const nodes = [
    {x: 85, y: 75, at: 20},
    {x: 150, y: 40, at: 35},
    {x: 215, y: 75, at: 50},
  ];
  const lineP = prog(t, 60, 75);
  return (
    <svg width={300} height={230} viewBox="0 0 300 230">
      {nodes.map((n, k) => {
        const s = prog(t, n.at, n.at + 12);
        const y = lerp(170, n.y, s);
        return <circle key={k} cx={n.x} cy={y} r={11 * s} fill={color} style={{filter: `drop-shadow(0 0 8px ${color})`}} />;
      })}
      {lineP > 0 && (
        <path d="M 85 75 L 150 40 L 215 75" fill="none" stroke={color} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineP} />
      )}
      <path d="M 150 200 L 40 190 L 40 140 L 150 150 Z" fill="#E6EDF3" />
      <path d="M 150 200 L 260 190 L 260 140 L 150 150 Z" fill="#C9D1D9" />
      <g transform={`translate(150 0) scale(${sx} 1) translate(-150 0)`}>
        <path d="M 150 200 L 255 189 L 255 142 L 150 150 Z" fill={sx < 0 ? '#E6EDF3' : '#DDE3EA'} stroke="#8B949E" strokeWidth={1} />
      </g>
      <line x1={150} y1={150} x2={150} y2={200} stroke="#8B949E" strokeWidth={2} />
    </svg>
  );
};

const Write: React.FC<{t: number; color: string}> = ({t, color}) => {
  const rows = [62, 96, 130, 164];
  const lineD = (y: number, w: number) =>
    'M ' + Array.from({length: Math.round(w / 4) + 1}, (_, k) => `${70 + k * 4} ${(y + Math.sin(k * 1.3) * 4 + Math.sin(k * 0.4) * 2).toFixed(1)}`).join(' L ');
  let pen = {x: 70, y: rows[0], on: false};
  return (
    <svg width={300} height={230} viewBox="0 0 300 230">
      <rect x={50} y={30} width={200} height={170} rx={8} fill="#F6F1E7" />
      {rows.map((y, k) => {
        const w = k === 3 ? 100 : 160;
        const p = prog(t, 5 + k * 16, 5 + k * 16 + 15, (x) => x);
        if (p > 0 && p < 1) pen = {x: 70 + w * p, y, on: true};
        return <path key={k} d={lineD(y, w)} fill="none" stroke="#2B2B2B" strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
      })}
      {pen.on && (
        <g transform={`translate(${pen.x} ${pen.y}) rotate(30)`}>
          <rect x={-6} y={-70} width={12} height={60} rx={3} fill={color} />
          <path d="M -6 -10 L 0 4 L 6 -10 Z" fill="#2B2B2B" />
        </g>
      )}
      <text x={150} y={222} textAnchor="middle" fontSize={24} fill={C.dim}>
        输出 · 反思
      </text>
    </svg>
  );
};

const Run: React.FC<{t: number; color: string}> = ({t, color}) => {
  const ph = t * 0.35;
  const bounce = -Math.abs(Math.sin(ph)) * 6;
  const limb = (base: {x: number; y: number}, ang: number, len: number, knee: number) => {
    const a1 = (90 + ang) * DEG;
    const k = {x: base.x + Math.cos(a1) * len, y: base.y + Math.sin(a1) * len};
    const a2 = (90 + ang + knee) * DEG;
    const e = {x: k.x + Math.cos(a2) * len, y: k.y + Math.sin(a2) * len};
    return `M ${base.x} ${base.y} L ${k.x} ${k.y} L ${e.x} ${e.y}`;
  };
  const hip = {x: 150, y: 150 + bounce};
  const sh = {x: 150, y: 112 + bounce};
  const s = Math.sin(ph);
  const ecg = (x: number) => {
    const u = (((x + t * 3) % 70) + 70) % 70;
    if (u < 30) return 0;
    if (u < 34) return -5;
    if (u < 38) return 0;
    if (u < 41) return -26;
    if (u < 44) return 12;
    return 0;
  };
  const ecgPts = Array.from({length: 70}, (_, k) => `${10 + k * 4} ${(42 + ecg(10 + k * 4)).toFixed(1)}`);
  return (
    <svg width={300} height={230} viewBox="0 0 300 230">
      <path d={'M ' + ecgPts.join(' L ')} fill="none" stroke={color} strokeWidth={3} />
      <text x={290} y={22} textAnchor="end" fontSize={20} fill={color} fontWeight={700}>
        心率 120
      </text>
      {Array.from({length: 6}, (_, k) => {
        const x = ((((k * 60 - t * 6) % 360) + 360) % 360) - 30;
        return <line key={k} x1={x} y1={205} x2={x + 30} y2={205} stroke={C.dim} strokeWidth={3} />;
      })}
      <g stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={limb(hip, 30 * s, 28, s > 0 ? 40 : 10)} />
        <path d={limb(hip, -30 * s, 28, s < 0 ? 40 : 10)} />
        <path d={limb(sh, -40 * s, 20, -50)} />
        <path d={limb(sh, 40 * s, 20, -50)} />
        <line x1={sh.x} y1={sh.y} x2={hip.x} y2={hip.y} />
      </g>
      <circle cx={150} cy={88 + bounce} r={15} fill={color} />
    </svg>
  );
};

const ICONS = [Sunrise, Meditate, Read, Write, Run];

// ---------- 卡片 → 徽章 ----------
const Card: React.FC<{i: number; frame: number; fps: number}> = ({i, frame, fps}) => {
  const h = HABITS[i];
  const at = cardAt(i);
  if (frame < at) return null;
  const s = sp(frame - at, fps, 13, 150);
  const isLast = i === HABITS.length - 1;
  const focusEnd = isLast ? T.morph[0] : at + T.cardStep;
  const focus = prog(frame, at, at + 10) * (1 - prog(frame, focusEnd, focusEnd + 10));
  const m = prog(frame, T.morph[0], T.morph[1], io);
  const rot = frame > T.ring[0] ? (frame - T.ring[0]) * 0.35 : 0;
  const ang = (-90 + i * 72 + rot) * DEG;
  const bx = RING.x + Math.cos(ang) * RING.r;
  const by = RING.y + Math.sin(ang) * RING.r;
  const cx0 = X0 + i * (CW + GAP) + CW / 2;
  const cy0 = Y0 + CH / 2;
  const cx = lerp(cx0, bx, m);
  const cy = lerp(cy0, by, m);
  const w = lerp(CW, BADGE, m);
  const hh = lerp(CH, BADGE, m);
  const past = frame >= focusEnd + 10 && m === 0;
  const dim = past ? 0.7 : 1;
  const Icon = ICONS[i];
  const inner = m < 0.5 ? 1 - m * 2 : 0;
  const badge = m > 0.5 ? (m - 0.5) * 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - hh / 2 + (1 - s) * 80,
        width: w,
        height: hh,
        boxSizing: 'border-box',
        borderRadius: lerp(24, BADGE / 2, m),
        background: '#161B22',
        border: `3px solid ${h.color}`,
        boxShadow: `0 0 ${10 + 30 * Math.max(focus, m)}px ${h.color}66`,
        opacity: s * Math.max(dim, m),
        transform: `scale(${1 + 0.07 * focus})`,
        overflow: 'hidden',
      }}
    >
      {inner > 0 && (
        <div style={{opacity: inner, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Icon t={frame - at} color={h.color} />
          <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6}}>
            <span style={{fontSize: 64, fontWeight: 900, color: h.color}}>{h.ch}</span>
            <span style={{fontSize: 34, fontWeight: 700, color: C.text}}>{h.name}</span>
          </div>
          <div style={{fontSize: 26, color: C.dim, marginTop: 6}}>{h.desc}</div>
        </div>
      )}
      {badge > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: badge,
          }}
        >
          <div style={{fontSize: 72, fontWeight: 900, color: h.color, lineHeight: 1}}>{h.ch}</div>
          <div style={{fontSize: 26, color: C.text, marginTop: 6}}>{h.name}</div>
        </div>
      )}
    </div>
  );
};

const Ring: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = prog(frame, T.ring[0], T.ring[1], io);
  if (p <= 0) return null;
  const s = sp(frame - T.title, fps, 13, 140);
  const orbitA = ((frame - T.orbit) * 2.2 - 90) * DEG;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <circle
          cx={RING.x}
          cy={RING.y}
          r={RING.r}
          fill="none"
          stroke={C.reason}
          strokeWidth={4}
          opacity={0.6}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          transform={`rotate(-90 ${RING.x} ${RING.y})`}
          style={{filter: `drop-shadow(0 0 8px ${C.reason})`}}
        />
        {frame >= T.orbit && (
          <circle cx={RING.x + Math.cos(orbitA) * RING.r} cy={RING.y + Math.sin(orbitA) * RING.r} r={10} fill="#fff" style={{filter: 'drop-shadow(0 0 12px #fff)'}} />
        )}
      </svg>
      <div style={{position: 'absolute', top: RING.y - 70, width: '100%', textAlign: 'center', opacity: s, transform: `scale(${0.7 + 0.3 * s})`}}>
        <div style={{fontSize: 70, fontWeight: 900, color: C.text, letterSpacing: 8}}>五项基本功</div>
        <div style={{fontSize: 36, color: C.reason, marginTop: 10, letterSpacing: 6}}>早 · 冥 · 读 · 写 · 跑</div>
      </div>
    </>
  );
};

const CAPS: Cap[] = [
  [10, 95, <><b style={{color: C.emotion}}>早起</b>：拥有一段不被打扰的独处时间。</>],
  [95, 175, <><b style={{color: C.reason}}>冥想</b>：训练专注，觉察自己的念头。</>],
  [175, 255, <><b style={{color: GREEN}}>阅读</b>：获取认知，站在巨人的肩膀上。</>],
  [255, 335, <><b style={{color: PURPLE}}>写作</b>：输出与反思，把想法变清晰。</>],
  [335, 420, <><b style={{color: C.instinct}}>运动</b>：激活大脑，让身体为思考供能。</>],
  [425, 540, '人生成长的五项基本功：早、冥、读、写、跑。'],
];

const SoundTrack: React.FC = () => (
  <>
    <Drone duration={SCENE8_DURATION} vol={0.12} />
    {HABITS.map((_, i) => (
      <Sfx key={`c${i}`} from={cardAt(i)} src="bloom.wav" vol={0.35} rate={0.9 + i * 0.1} dur={30} />
    ))}
    <Sfx from={cardAt(0) + 4} src="sunrise.wav" vol={0.5} dur={76} />
    <Sfx from={cardAt(1) + 4} src="bowl.wav" vol={0.55} dur={76} />
    {[0, 30, 60].map((d) => (
      <Sfx key={`r${d}`} from={cardAt(2) + d + 6} src="paper.wav" vol={0.4} rate={1.3} dur={18} />
    ))}
    <Sfx from={cardAt(3) + 5} src="pencil.wav" vol={0.45} dur={66} />
    <Sfx from={cardAt(4) + 2} src="run.wav" vol={0.5} dur={78} />
    <Sfx from={cardAt(4) + 10} src="heartbeat.wav" vol={0.35} dur={24} />
    <Sfx from={cardAt(4) + 40} src="heartbeat.wav" vol={0.35} dur={24} />
    <Sfx from={T.morph[0]} src="whoosh.wav" vol={0.45} dur={40} />
    <Sfx from={T.ring[0]} src="shimmer.wav" vol={0.35} dur={60} />
    <Sfx from={T.title} src="resolve.wav" vol={0.4} dur={SCENE8_DURATION - T.title} />
  </>
);

export const Scene8: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneOp = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 48%, #16202C 0%, ${C.bg} 65%)`, fontFamily: FONT, color: C.text, opacity: sceneOp}}>
      <SoundTrack />
      <Ring frame={frame} fps={fps} />
      {HABITS.map((_, i) => (
        <Card key={i} i={i} frame={frame} fps={fps} />
      ))}
      <ChapterTag num="08" text="早冥读写跑 · 五项基本功" op={prog(frame, 0, 20)} />
      <Captions frame={frame} caps={CAPS} />
    </AbsoluteFill>
  );
};