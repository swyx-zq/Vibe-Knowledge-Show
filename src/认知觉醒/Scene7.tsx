import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';

export const SCENE7_DURATION = 660;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const FocusRing: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const pulse = 1 + 0.18 * Math.sin(t * 3.2);
  const ring = 220 + 50 * Math.sin(t * 2.1);
  const drift = 20 * Math.sin(t * 1.4);

  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <defs>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.reason} stopOpacity={0.72} />
          <stop offset="100%" stopColor={C.reason} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={960} cy={540} r={ring * pulse} fill="url(#ringGlow)" opacity={0.45} />
      <circle cx={960} cy={540} r={ring} fill="none" stroke={C.reason} strokeWidth={4} opacity={0.8} />
      <circle cx={960} cy={540} r={ring * 0.72} fill="none" stroke={C.text} strokeWidth={2} opacity={0.7} />
      <circle cx={960 + drift} cy={540 + drift * 0.4} r={ring * 0.32} fill="none" stroke={C.emotion} strokeWidth={3} opacity={0.8} />
    </svg>
  );
};

export const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const bar = Math.min(1, frame / 180);
  const glow = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 5));

  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at center, #111827 0%, #0b1020 42%, #070b12 100%)', color: C.text, fontFamily: FONT}}>
      <FocusRing />

      <Sequence from={0} durationInFrames={SCENE7_DURATION} layout="none">
        <Audio src={staticFile('sfx/water.wav')} volume={0.2} />
      </Sequence>
      <Sequence from={30} durationInFrames={140} layout="none">
        <Audio src={staticFile('sfx/mumble.wav')} volume={0.4} />
      </Sequence>
      <Sequence from={120} durationInFrames={120} layout="none">
        <Audio src={staticFile('sfx/wind.wav')} volume={0.25} />
      </Sequence>
      <Sequence from={200} durationInFrames={110} layout="none">
        <Audio src={staticFile('sfx/slice.wav')} volume={0.45} />
      </Sequence>
      <Sequence from={520} durationInFrames={140} layout="none">
        <Audio src={staticFile('sfx/fanfare.wav')} volume={0.55} />
      </Sequence>

      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20}}>
        <div style={{fontSize: 34, letterSpacing: 10, color: C.dim, textTransform: 'uppercase', opacity: 0.9}}>Deep Work</div>
        <div style={{fontSize: 110, fontWeight: 700, color: C.text, textShadow: `0 0 ${20 + 20 * glow}px ${C.reason}99`, opacity: 0.9}}>
          Focus
        </div>
        <div style={{fontSize: 34, color: C.reason, opacity: 0.95}}>排除干扰 · 只做下一步</div>
      </div>

      <div style={{position: 'absolute', left: 180, right: 180, bottom: 120, height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden'}}>
        <div style={{width: `${Math.round(100 * bar)}%`, height: '100%', background: `linear-gradient(90deg, ${C.reason} 0%, ${C.emotion} 100%)`, boxShadow: `0 0 18px ${C.reason}`}} />
      </div>

      <div style={{position: 'absolute', left: 200, bottom: 160, fontSize: 26, color: C.dim}}>
        1. 关闭噪音
      </div>
      <div style={{position: 'absolute', right: 200, bottom: 160, fontSize: 26, color: C.dim}}>
        2. 做出决定
      </div>
    </AbsoluteFill>
  );
};
