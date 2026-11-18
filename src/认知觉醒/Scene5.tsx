import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C, FONT} from './theme';

export const SCENE5_DURATION = 750;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (frame: number, fps: number, damping = 12, stiffness = 150) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});
const GREEN = '#3FB950';
const RED = '#E5484D';
const DEG = Math.PI / 180;

// ---------- 时间轴（帧） ----------
const T = {
  bloom: [10, 45, 80],
  ballIn: 140,
  orbit: [150, 230] as const,
  rush: [230, 275] as const,
  bounce: [275, 310] as const,
  toEdge: [310, 340] as const,
  hop0: 340,
  hopStep: 24,
  hops: 8,
  shrink: [560, 590] as const,
  panel: 585,
  count: [600, 690] as const,
  end: [735, 750] as const,
};
const HOP_END = T.hop0 + T.hops * T.hopStep; // 532

// ---------- 圆环几何 ----------
const CEN = {x: 900, y: 500};
const R0 = {comfort: 150, stretch: 270, hard: 380};
const GROW = {comfort: 12, stretch: 10, hard: 8}; // 每次练习后的扩张量
const ZONES = [
  {key: 'hard' as const, name: '困难区', desc: '太难 · 易放弃', color: RED},
  {key: 'stretch' as const, name: '拉伸区', desc: '有挑战 · 能学会', color: C.reason},
  {key: 'comfort' as const, name: '舒适区', desc: '轻松 · 没有成长', color: GREEN},
];

// 第 k 次练习完成（跳回来落地）的帧
const growAt = (k: number) => T.hop0 + k * T.hopStep + 22;

const growth = (frame: number, fps: number) => {
  let g = 0;
  for (let k = 0; k < T.hops; k++) g += spring({frame: frame - growAt(k), fps, config: {damping: 14, stiffness: 120}});
  return g;
};

const radii = (frame: number, fps: number) => {
  const g = growth(frame, fps);
  return {
    comfort: R0.comfort + GROW.comfort * g,
    stretch: R0.stretch + GROW.stretch * g,
    hard: R0.hard + GROW.hard * g,
    g,
  };
};

const polar = (deg: number, r: number) => ({x: CEN.x + Math.cos(deg * DEG) * r, y: CEN.y + Math.sin(deg * DEG) * r});

// ---------- 小球轨迹 ----------
const RUSH_DEG = -28;
const EDGE_DEG = -42;

const ballPos = (frame: number, fps: number) => {
  const {comfort} = radii(frame, fps);
  const orbitAt = (f: number) => polar((f - T.orbit[0]) * 3.2 - 90, 70);

  if (frame < T.rush[0]) {
    const p = orbitAt(Math.max(frame, T.orbit[0]));
    return {...p, lift: 0, squash: 1};
  }
  if (frame < T.rush[1]) {
    const k = prog(frame, T.rush[0], T.rush[1], Easing.in(Easing.cubic));
    const a = orbitAt(T.rush[0]);
    const b = polar(RUSH_DEG, R0.stretch + 75);
    return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), lift: 0, squash: 1};
  }
  if (frame < T.bounce[1]) {
    const k = prog(frame, T.bounce[0], T.bounce[1], Easing.out(Easing.back(1.6)));
    const a = polar(RUSH_DEG, R0.stretch + 75);
    const b = polar(RUSH_DEG, 40);
    const hitSquash = frame - T.bounce[0] < 6 ? 0.7 : 1;
    return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), lift: Math.sin(Math.PI * k) * 60, squash: hitSquash};
  }
  if (frame < T.hop0) {
    const k = prog(frame, T.toEdge[0], T.toEdge[1], io);
    const a = polar(RUSH_DEG, 40);
    const b = polar(EDGE_DEG, comfort - 25);
    return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), lift: 0, squash: 1};
  }
  // 边缘往返跳：前半程跳出去，后半程跳回来
  const k = Math.min(T.hops - 1, Math.floor((frame - T.hop0) / T.hopStep));
  const t = frame - T.hop0 - k * T.hopStep;
  const deg = EDGE_DEG + Math.min(k, T.hops) * 3;
  const inR = comfort - 25;
  const outR = comfort + 42;
  if (frame >= HOP_END) {
    const p = polar(EDGE_DEG + (T.hops - 1) * 3, inR);
    return {...p, lift: 0, squash: 1};
  }
  const half = T.hopStep / 2;
  const goingOut = t < half;
  const u = goingOut ? t / half : (t - half) / half;
  const r = goingOut ? lerp(inR, outR, io(u)) : lerp(outR, inR, io(u));
  const p = polar(deg, r);
  const landing = u > 0.9 ? 0.82 : 1;
  return {...p, lift: Math.sin(Math.PI * u) * 34, squash: landing};
};

// =====================================================================
// 圆环
// =====================================================================
const Rings: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const R = radii(frame, fps);
  const hitK = frame >= T.rush[1] ? 1 - prog(frame, T.rush[1], T.rush[1] + 18) : 0;
  const shake = hitK > 0 ? Math.sin(frame * 3.1) * 12 * hitK : 0;
  const ghostOp = prog(frame, growAt(0) - 4, growAt(0) + 10);

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
      <g transform={`translate(${shake} ${shake * 0.4})`}>
        {ZONES.map((z, i) => {
          const s = sp(frame - T.bloom[2 - i], fps, 13, 110);
          const r = R[z.key] * s;
          if (r <= 0.5) return null;
          const flash = z.key === 'hard' ? hitK : 0;
          return (
            <g key={z.key}>
              <circle cx={CEN.x} cy={CEN.y} r={r} fill={z.color} opacity={0.13 + 0.3 * flash} />
              <circle cx={CEN.x} cy={CEN.y} r={r} fill="none" stroke={z.color} strokeWidth={3 + 4 * flash} opacity={0.9} />
            </g>
          );
        })}

        {/* 原来的舒适区（虚线），用来对比成长 */}
        {ghostOp > 0 && (
          <circle cx={CEN.x} cy={CEN.y} r={R0.comfort} fill="none" stroke={C.text} strokeWidth={2} strokeDasharray="8 8" opacity={0.45 * ghostOp} />
        )}
      </g>
    </svg>
  );
};

// 区域名称：写在圆环带的下半部分
const RingLabels: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const R = radii(frame, fps);
  const ys = {
    comfort: CEN.y + R.comfort * 0.55,
    stretch: CEN.y + (R.comfort + R.stretch) / 2,
    hard: CEN.y + (R.stretch + R.hard) / 2,
  };
  return (
    <>
      {ZONES.map((z, i) => {
        const s = sp(frame - T.bloom[2 - i] - 8, fps);
        return (
          <div
            key={z.key}
            style={{
              position: 'absolute',
              left: CEN.x - 150,
              width: 300,
              top: ys[z.key] - 24,
              textAlign: 'center',
              fontSize: 38,
              fontWeight: 700,
              color: z.color,
              opacity: s,
            }}
          >
            {z.name}
          </div>
        );
      })}
    </>
  );
};

// =====================================================================
// 小球
// =====================================================================
const Ball: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.ballIn) return null;
  const s = sp(frame - T.ballIn, fps, 9, 180);
  const b = ballPos(frame, fps);
  const sq = b.squash;
  const ouch = frame >= T.rush[1] && frame < T.bounce[1] + 20;
  const ouchS = sp(frame - T.rush[1], fps, 8, 220);
  const lazy = frame >= T.orbit[0] && frame < T.rush[0];
  const hit = polar(RUSH_DEG, R0.stretch + 75);

  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
        <ellipse cx={b.x} cy={b.y + 4} rx={16 * s} ry={6 * s} fill="#000" opacity={0.35} />
        <ellipse
          cx={b.x}
          cy={b.y - b.lift - 18 * (sq - 1)}
          rx={18 * s * (2 - sq)}
          ry={18 * s * sq}
          fill="#fff"
          style={{filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))'}}
        />
      </svg>

      {/* z z z */}
      {lazy &&
        [0, 1, 2].map((k) => {
          const t = (frame - T.orbit[0] + k * 18) % 54;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: b.x + 14 + t * 0.6,
                top: b.y - 40 - t * 1.1,
                fontSize: 22 + k * 6,
                fontWeight: 700,
                color: C.dim,
                opacity: 1 - t / 54,
              }}
            >
              z
            </div>
          );
        })}
      {lazy && (
        <div style={{position: 'absolute', left: CEN.x - 250, width: 500, top: CEN.y - 150, textAlign: 'center', fontSize: 30, color: C.text, opacity: prog(frame, T.orbit[0] + 10, T.orbit[0] + 25) * (1 - prog(frame, T.rush[0] - 10, T.rush[0]))}}>
          舒服，但原地打转
        </div>
      )}

      {/* 太难了！ */}
      {ouch && (
        <div
          style={{
            position: 'absolute',
            left: hit.x - 140,
            width: 280,
            top: hit.y - 110,
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 900,
            color: RED,
            opacity: 1 - prog(frame, T.bounce[1], T.bounce[1] + 20),
            transform: `scale(${ouchS}) rotate(-6deg)`,
            textShadow: `0 0 16px ${RED}`,
          }}
        >
          太难了！
        </div>
      )}
    </>
  );
};

// =====================================================================
// 右侧图例 + 计数
// =====================================================================
const Legend: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const out = prog(frame, T.shrink[0], T.shrink[0] + 15);
  if (out >= 1) return null;
  const R = radii(frame, fps);
  const practiced = Math.min(T.hops, [...Array(T.hops)].filter((_, k) => frame >= growAt(k)).length);
  const pct = Math.round(((R.comfort - R0.comfort) / R0.comfort) * 100);
  const statOp = prog(frame, T.hop0, T.hop0 + 15);

  return (
    <div style={{position: 'absolute', left: 1400, top: 260, width: 460, opacity: 1 - out}}>
      {[...ZONES].reverse().map((z, i) => {
        const s = sp(frame - T.bloom[i] - 6, fps, 14, 150);
        return (
          <div
            key={z.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 34,
              opacity: s,
              transform: `translateX(${(1 - s) * 40}px)`,
            }}
          >
            <div style={{width: 26, height: 26, borderRadius: '50%', background: z.color, boxShadow: `0 0 12px ${z.color}`}} />
            <div>
              <div style={{fontSize: 40, fontWeight: 700, color: z.color}}>{z.name}</div>
              <div style={{fontSize: 28, color: C.dim, marginTop: 4}}>{z.desc}</div>
            </div>
          </div>
        );
      })}
      <div style={{marginTop: 30, opacity: statOp, borderTop: '2px solid #30363D', paddingTop: 26}}>
        <div style={{fontSize: 34, color: C.text}}>
          练习 <b style={{color: C.reason}}>×{practiced}</b>
        </div>
        <div style={{fontSize: 34, color: C.text, marginTop: 10}}>
          舒适区 <b style={{color: GREEN}}>+{pct}%</b>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// D. 复利计数
// =====================================================================
const Compound: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.panel) return null;
  const s = sp(frame - T.panel, fps, 14, 130);
  const p = prog(frame, T.count[0], T.count[1], Easing.inOut(Easing.quad));
  const days = Math.max(1, Math.round(365 * p));
  const up = Math.pow(1.01, 365 * p);
  const down = Math.pow(0.99, 365 * p);
  const done = frame >= T.count[1];
  const glow = prog(frame, T.count[1], T.count[1] + 15);

  const Row: React.FC<{label: string; base: string; value: string; color: string}> = ({label, base, value, color}) => (
    <div style={{marginBottom: 56}}>
      <div style={{fontSize: 32, color: C.dim, marginBottom: 6}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 22, fontWeight: 700}}>
        <span style={{fontSize: 80, color: C.text}}>
          {base}
          <sup style={{fontSize: 40, color: C.dim, marginLeft: 4}}>{days}</sup>
        </span>
        <span style={{fontSize: 70, color: C.dim}}>≈</span>
        <span
          style={{
            fontSize: 104,
            color,
            fontVariantNumeric: 'tabular-nums',
            textShadow: done ? `0 0 ${30 * glow}px ${color}` : 'none',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{position: 'absolute', left: 1000, top: 230, opacity: s, transform: `translateX(${(1 - s) * 60}px)`}}>
      <div style={{fontSize: 34, color: C.text, marginBottom: 30}}>
        第 <b style={{color: C.reason, fontVariantNumeric: 'tabular-nums'}}>{days}</b> 天
      </div>
      <Row label="每天进步 1%" base="1.01" value={up.toFixed(1)} color={GREEN} />
      <Row label="每天退步 1%" base="0.99" value={down.toFixed(2)} color={RED} />
    </div>
  );
};

// =====================================================================
// 字幕 / 章节标签
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [10, 145, <>学习有三个区域：<span style={{color: GREEN}}>舒适区</span>、<span style={{color: C.reason}}>拉伸区</span>、<span style={{color: RED}}>困难区</span>。</>],
  [150, 228, '待在舒适区很轻松，但只是原地打转。'],
  [232, 328, '冲进困难区？太难，只会被弹回来，然后放弃。'],
  [335, 450, <>最佳位置是<span style={{color: C.reason}}>舒适区边缘</span>：每次只比现在难一点点。</>],
  [452, 560, '一次次练习，圈子会悄悄变大，这就是成长。'],
  [565, 750, <>每天进步 1%，一年后是 <span style={{color: GREEN}}>37 倍</span>。</>],
];

const Captions: React.FC<{frame: number}> = ({frame}) => (
  <>
    {CAPS.map(([a, b, text], i) => {
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

const ChapterTag: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', left: 60, top: 44, fontSize: 30, color: C.dim, letterSpacing: 2, opacity: prog(frame, 0, 20)}}>
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>05</span>
    学习力 · 舒适区边缘
  </div>
);

// =====================================================================
// 音效
// =====================================================================
const Sfx: React.FC<{from: number; src: string; vol?: number; rate?: number; dur?: number}> = ({
  from,
  src,
  vol = 1,
  rate = 1,
  dur = 90,
}) => (
  <Sequence from={from} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`sfx/${src}`)} volume={vol} playbackRate={rate} />
  </Sequence>
);

const SoundTrack: React.FC = () => (
  <>
    <Audio
      src={staticFile('sfx/drone.wav')}
      loop
      volume={(f) => interpolate(f, [0, 30, SCENE5_DURATION - 20, SCENE5_DURATION], [0, 0.14, 0.14, 0], clamp)}
    />
    {/* A 圆环绽开：内 → 外，音高升高 */}
    {T.bloom.map((f, i) => (
      <Sfx key={`bl${i}`} from={f} src="bloom.wav" vol={0.5} rate={1 + i * 0.2} dur={45} />
    ))}
    {/* B */}
    <Sfx from={T.ballIn} src="pop.wav" vol={0.4} dur={10} />
    <Sfx from={T.orbit[0]} src="lazy.wav" vol={0.4} dur={T.rush[0] - T.orbit[0]} />
    <Sfx from={T.rush[0]} src="riser.wav" vol={0.45} rate={1.25} dur={T.rush[1] - T.rush[0]} />
    <Sfx from={T.rush[1]} src="bonk.wav" vol={0.7} dur={30} />
    <Sfx from={T.bounce[0] + 3} src="fall.wav" vol={0.4} dur={30} />
    {/* C 边缘练习 */}
    {Array.from({length: T.hops}, (_, k) => (
      <React.Fragment key={`h${k}`}>
        <Sfx from={T.hop0 + k * T.hopStep} src="hop.wav" vol={0.35} rate={1 + k * 0.03} dur={12} />
        <Sfx from={growAt(k)} src="grow.wav" vol={0.4} rate={1 + k * 0.06} dur={30} />
      </React.Fragment>
    ))}
    {/* D 复利 */}
    <Sfx from={T.shrink[0]} src="whoosh.wav" vol={0.35} rate={1.3} dur={40} />
    <Sfx from={T.count[0]} src="count.wav" vol={0.45} dur={T.count[1] - T.count[0]} />
    <Sfx from={T.count[1]} src="ding.wav" vol={0.5} dur={50} />
    <Sfx from={T.count[1] + 4} src="resolve.wav" vol={0.4} dur={SCENE5_DURATION - T.count[1] - 4} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneOp = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));

  // D 阶段：圆环缩小并左移
  const k = prog(frame, T.shrink[0], T.shrink[1], io);
  const sc = lerp(1, 0.6, k);
  const dx = lerp(0, 520 - CEN.x, k);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 47% 46%, #16202C 0%, ${C.bg} 65%)`,
        fontFamily: FONT,
        color: C.text,
        opacity: sceneOp,
      }}
    >
      <SoundTrack />
      <AbsoluteFill style={{transformOrigin: `${CEN.x}px ${CEN.y}px`, transform: `translateX(${dx}px) scale(${sc})`}}>
        <Rings frame={frame} fps={fps} />
        <RingLabels frame={frame} fps={fps} />
        <Ball frame={frame} fps={fps} />
      </AbsoluteFill>
      <Legend frame={frame} fps={fps} />
      <Compound frame={frame} fps={fps} />
      <ChapterTag frame={frame} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};