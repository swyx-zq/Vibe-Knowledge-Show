import React from 'react';
import {Audio, Easing, interpolate, Sequence, spring, staticFile} from 'remotion';
import {C} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const io = Easing.inOut(Easing.cubic);
export const eo = Easing.out(Easing.cubic);
export const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sp = (frame: number, fps: number, damping = 12, stiffness = 150) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});

export const GREEN = '#3FB950';
export const RED = '#E5484D';
export const SKIN = '#30363D';

export type Cap = [number, number, React.ReactNode];

export const Captions: React.FC<{frame: number; caps: Cap[]}> = ({frame, caps}) => (
  <>
    {caps.map(([a, b, text], i) => {
      const op = Math.min(prog(frame, a, a + 8), 1 - prog(frame, b - 8, b));
      if (op <= 0) return null;
      return (
        <div key={i} style={{position: 'absolute', bottom: 50, width: '100%', display: 'flex', justifyContent: 'center', opacity: op}}>
          <div style={{fontSize: 46, color: C.text, background: 'rgba(0,0,0,0.6)', padding: '10px 28px', borderRadius: 10}}>{text}</div>
        </div>
      );
    })}
  </>
);

export const ChapterTag: React.FC<{num: string; text: string; op: number}> = ({num, text, op}) => (
  <div style={{position: 'absolute', left: 60, top: 44, fontSize: 30, color: C.dim, letterSpacing: 2, opacity: op}}>
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>{num}</span>
    {text}
  </div>
);

export const Sfx: React.FC<{from: number; src: string; vol?: number; rate?: number; dur?: number}> = ({
  from,
  src,
  vol = 1,
  rate = 1,
  dur = 90,
}) => (
  <Sequence from={Math.round(from)} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`sfx/${src}`)} volume={vol} playbackRate={rate} />
  </Sequence>
);

export const Drone: React.FC<{duration: number; vol?: number}> = ({duration, vol = 0.14}) => (
  <Audio
    src={staticFile('sfx/drone.wav')}
    loop
    volume={(f) => interpolate(f, [0, 30, duration - 20, duration], [0, vol, vol, 0], clamp)}
  />
);