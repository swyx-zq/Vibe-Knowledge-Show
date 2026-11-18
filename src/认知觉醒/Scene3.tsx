import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  interpolateColors,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C, FONT} from './theme';

const HAND = '"STKaiti", "Kaiti SC", "PingFang SC", "Microsoft YaHei", serif';

export const SCENE3_DURATION = 600;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;
const GREEN = '#3FB950';
const FOG_GRAY = '#8B949E';

// ---------- 时间轴（帧） ----------
const T = {
  fogIn: [0, 40] as const,
  wordStart: 12,
  wordStep: 11,
  heartStart: 40,
  heartStep: 26,
  qmarks: [60, 95, 130, 165],
  paperIn: 232,
  lineStart: 270,
  lineGap: 85,
  qDur: 30,
  aGap: 32,
  aDur: 22,
  gatherDelay: 56,
  gatherDur: 28,
  cardDelay: 72,
  done: 530,
  sweep: 545,
  end: [585, 600] as const,
};

const lineT = (i: number) => {
  const q0 = T.lineStart + i * T.lineGap;
  return {
    q0,
    q1: q0 + T.qDur,
    a0: q0 + T.aGap,
    a1: q0 + T.aGap + T.aDur,
    g0: q0 + T.gatherDelay,
    g1: q0 + T.gatherDelay + T.gatherDur,
    card: q0 + T.cardDelay,
  };
};

const HEARTS = Array.from({length: 8}, (_, k) => T.heartStart + k * T.heartStep);

// 清晰度：三组问题依次解决 → 0 到 1
const clarityAt = (f: number) => [0, 1, 2].reduce((s, i) => s + prog(f, lineT(i).g0, lineT(i).g1, io), 0) / 3;
const resolvedAt = (f: number, cl: number) => prog(f, lineT(cl).g0, lineT(cl).g1, io);

// ---------- 内容 ----------
const LINES = [
  {q: '1. 我到底在担心什么？', a: '→ 怕期末考试挂科', tag: '担心', color: C.reason, text: '怕期末考试挂科'},
  {q: '2. 最坏的结果是什么？', a: '→ 补考一次，不是世界末日', tag: '最坏', color: C.emotion, text: '补考一次，不是世界末日'},
  {q: '3. 现在能做的一件事？', a: '→ 今晚做完第 3 章习题', tag: '行动', color: GREEN, text: '今晚做完第 3 章习题'},
];

// ---------- 布局 ----------
const FOG = {x: 620, y: 470, rx: 300, ry: 200};
const CARD_X = 290;
const CARD_W = 660;
const CARD_H = 128;
const cardY = (i: number) => 260 + i * 168;

const PAPER = {x: 1090, y: 190, w: 650, h: 660};
const Q_FS = 44;
const A_FS = 36;
const lineTop = (i: number) => 130 + i * 168; // 纸内坐标

// ---------- 预计算（固定 seed） ----------
const BLOBS = Array.from({length: 12}, (_, i) => ({
  x: FOG.x + (random(`bx${i}`) - 0.5) * FOG.rx * 1.6,
  y: FOG.y + (random(`by${i}`) - 0.5) * FOG.ry * 1.5,
  r: 110 + random(`br${i}`) * 90,
  ph: random(`bp${i}`) * TAU,
  cl: i % 3,
}));

const PARTS = Array.from({length: 210}, (_, i) => {
  const cl = i % 3;
  const ang = random(`pa${i}`) * TAU;
  const rr = Math.sqrt(random(`pr${i}`));
  return {
    cl,
    x: FOG.x + Math.cos(ang) * rr * FOG.rx,
    y: FOG.y + Math.sin(ang) * rr * FOG.ry,
    ph: random(`pp${i}`) * TAU,
    sp: 0.02 + random(`ps${i}`) * 0.03,
    r: 2 + random(`pz${i}`) * 3,
    tx: CARD_X + 20 + random(`tx${i}`) * (CARD_W - 40),
    ty: 15 + random(`ty${i}`) * (CARD_H - 30),
    delay: random(`pd${i}`) * 10,
  };
});

const WORDS: [string, number][] = [
  ['考试', 0], ['未来', 1], ['来不及', 2], ['挂科', 0], ['完蛋', 1],
  ['怎么办', 2], ['压力', 0], ['焦虑', 1], ['别人都', 2],
];
const WORD_POS = WORDS.map((_, i) => {
  const ang = (i / WORDS.length) * TAU + random(`wa${i}`) * 0.6;
  const rr = 0.25 + random(`wr${i}`) * 0.55;
  return {
    x: FOG.x + Math.cos(ang) * rr * FOG.rx,
    y: FOG.y + Math.sin(ang) * rr * FOG.ry,
    size: 40 + random(`ws${i}`) * 26,
    ph: random(`wp${i}`) * TAU,
  };
});

const QMARKS = T.qmarks.map((at, i) => ({
  at,
  x: FOG.x + (random(`qx${i}`) - 0.5) * FOG.rx * 1.4,
  y: FOG.y + (random(`qy${i}`) - 0.5) * FOG.ry * 1.2,
  size: 70 + random(`qs${i}`) * 40,
}));

// =====================================================================
// 迷雾
// =====================================================================
const Fog: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const fogIn = prog(frame, T.fogIn[0], T.fogIn[1]);
  const pulse = frame < T.paperIn + 20
    ? HEARTS.reduce((s, h) => (frame >= h ? s + Math.exp(-(frame - h) / 5) : s), 0) * 0.04
    : 0;
  const scale = 1 + Math.min(0.05, pulse);
  const qFade = 1 - prog(frame, T.paperIn, T.paperIn + 20);

  return (
    <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: `${FOG.x}px ${FOG.y}px`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <filter id="fogBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={42} />
          </filter>
          <filter id="dotBlur">
            <feGaussianBlur stdDeviation={1.6} />
          </filter>
        </defs>

        <g filter="url(#fogBlur)">
          {BLOBS.map((b, i) => {
            const op = 0.26 * fogIn * (1 - resolvedAt(frame, b.cl));
            if (op <= 0.001) return null;
            return (
              <circle
                key={i}
                cx={b.x + Math.sin(frame / 40 + b.ph) * 30}
                cy={b.y + Math.cos(frame / 52 + b.ph) * 18}
                r={b.r * (1 - 0.4 * resolvedAt(frame, b.cl))}
                fill={FOG_GRAY}
                opacity={op}
              />
            );
          })}
        </g>

        {/* 粒子：漂浮 → 被吸进卡片 */}
        {PARTS.map((p, i) => {
          const lt = lineT(p.cl);
          const s = lt.g0 + p.delay;
          const e = lt.g1 + p.delay - 4;
          const k = prog(frame, s, e, io);
          const dx = Math.sin(frame * p.sp + p.ph) * 18;
          const dy = Math.cos(frame * p.sp * 1.3 + p.ph) * 12;
          const x = lerp(p.x + dx, p.tx, k);
          const y = lerp(p.y + dy, cardY(p.cl) + p.ty, k);
          const op = fogIn * 0.6 * (1 - prog(frame, e - 6, e));
          const lineColor = LINES[p.cl]?.color ?? C.reason;
          if (op <= 0.001) return null;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={p.r * (1 - 0.4 * k)}
              fill={interpolateColors(k, [0, 1], [FOG_GRAY, lineColor])}
              opacity={op}
              filter={k < 0.3 ? 'url(#dotBlur)' : undefined}
            />
          );
        })}
      </svg>

      {/* 模糊的焦虑词 */}
      {WORDS.map(([w, cl], i) => {
        const pos = WORD_POS[i];
        const appear = prog(frame, T.wordStart + i * T.wordStep, T.wordStart + i * T.wordStep + 20);
        const lt = lineT(cl);
        const k = prog(frame, lt.g0, lt.g1 - 6, io);
        const x = lerp(pos.x + Math.sin(frame / 30 + pos.ph) * 22, CARD_X + CARD_W / 2, k);
        const y = lerp(pos.y + Math.cos(frame / 38 + pos.ph) * 14, cardY(cl) + CARD_H / 2, k);
        const blur = 3 + 2.5 * Math.sin(frame / 14 + pos.ph);
        const op = appear * 0.75 * (1 - k);
        if (op <= 0.001) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 150,
              top: y - pos.size * 0.6,
              width: 300,
              textAlign: 'center',
              fontSize: pos.size,
              fontWeight: 700,
              color: '#AAB2BD',
              opacity: op,
              filter: `blur(${blur}px)`,
              transform: `scale(${1 - 0.6 * k})`,
            }}
          >
            {w}
          </div>
        );
      })}

      {/* 问号 */}
      {QMARKS.map((q, i) => {
        const s = spring({frame: frame - q.at, fps, config: {damping: 8, stiffness: 180}});
        const op = (frame >= q.at ? 1 : 0) * qFade;
        if (op <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: q.x - 60,
              top: q.y - q.size * 0.6,
              width: 120,
              textAlign: 'center',
              fontSize: q.size,
              fontWeight: 700,
              color: C.instinct,
              opacity: op * 0.85,
              transform: `scale(${s}) rotate(${Math.sin(frame / 7 + i) * 12}deg)`,
            }}
          >
            ?
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// =====================================================================
// 清晰卡片
// =====================================================================
const Cards: React.FC<{frame: number; fps: number}> = ({frame, fps}) => (
  <>
    {LINES.map((l, i) => {
      const at = lineT(i).card;
      const s = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 160}});
      if (frame < at - 1) return null;
      const check = prog(frame, at + 12, at + 26);
      const sweepX = interpolate(frame, [T.sweep + i * 6, T.sweep + i * 6 + 30], [-0.3, 1.3], clamp);
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: CARD_X,
            top: cardY(i),
            width: CARD_W,
            height: CARD_H,
            boxSizing: 'border-box',
            borderRadius: 18,
            background: 'rgba(22,27,34,0.92)',
            border: `2px solid ${l.color}`,
            boxShadow: `0 0 ${30 * s}px ${l.color}44`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
            gap: 26,
            overflow: 'hidden',
            opacity: s,
            transform: `scale(${0.85 + 0.15 * s})`,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '8px 18px',
              borderRadius: 10,
              background: l.color,
              color: '#0E1117',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {l.tag}
          </div>
          <div style={{flex: 1, fontSize: 40, color: C.text, fontWeight: 700}}>{l.text}</div>
          <svg width={52} height={52} viewBox="0 0 52 52">
            <circle cx={26} cy={26} r={23} fill="none" stroke={l.color} strokeWidth={3} opacity={check} />
            <path
              d="M 14 27 L 23 36 L 39 18"
              fill="none"
              stroke={l.color}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - check}
            />
          </svg>
          {/* 扫光 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sweepX * 100}%`,
              width: 160,
              marginLeft: -80,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
        </div>
      );
    })}
  </>
);

// =====================================================================
// 纸 + 手写
// =====================================================================
const Pen: React.FC<{x: number; y: number; op: number; frame: number}> = ({x, y, op, frame}) => (
  <svg
    width={60}
    height={180}
    viewBox="0 0 60 180"
    style={{
      position: 'absolute',
      left: x - 4,
      top: y - 170 + Math.sin(frame * 1.7) * 3,
      opacity: op,
      transform: 'rotate(28deg)',
      transformOrigin: '4px 170px',
      filter: 'drop-shadow(4px 6px 6px rgba(0,0,0,0.35))',
    }}
  >
    <path d="M 4 170 L 14 140 L 26 146 Z" fill="#2B2B2B" />
    <rect x={13} y={20} width={16} height={124} rx={4} fill={C.reason} transform="rotate(12 21 82)" />
    <rect x={13} y={20} width={16} height={22} rx={4} fill="#E6EDF3" transform="rotate(12 21 82)" />
  </svg>
);

const HandLine: React.FC<{text: string; p: number; fs: number; color: string; top: number; left: number}> = ({
  text,
  p,
  fs,
  color,
  top,
  left,
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      fontFamily: HAND,
      fontSize: fs,
      color,
      whiteSpace: 'nowrap',
      clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)`,
    }}
  >
    {text}
  </div>
);

// 估算文字宽度（全角字 = 1em，半角 ≈ 0.55em）
const textW = (s: string, fs: number) =>
  Array.from(s).reduce((w, ch) => w + (/[\x00-\x7F]/.test(ch) ? 0.55 : 1) * fs, 0);

const Paper: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame: frame - T.paperIn, fps, config: {damping: 16, stiffness: 110}});
  if (frame < T.paperIn) return null;

  // 当前笔尖位置
  let pen: {x: number; y: number} | null = null;
  LINES.forEach((l, i) => {
    const lt = lineT(i);
    if (frame >= lt.q0 && frame < lt.q1) {
      const p = prog(frame, lt.q0, lt.q1, Easing.linear);
      pen = {x: 50 + textW(l.q, Q_FS) * p, y: lineTop(i) + Q_FS * 1.05};
    } else if (frame >= lt.a0 && frame < lt.a1) {
      const p = prog(frame, lt.a0, lt.a1, Easing.linear);
      pen = {x: 80 + textW(l.a, A_FS) * p, y: lineTop(i) + 64 + A_FS * 1.05};
    }
  });
  const penP = pen as {x: number; y: number} | null;

  return (
    <div
      style={{
        position: 'absolute',
        left: PAPER.x,
        top: PAPER.y,
        width: PAPER.w,
        height: PAPER.h,
        borderRadius: 8,
        background: `repeating-linear-gradient(180deg, #F6F1E7 0px, #F6F1E7 83px, #D9D2C3 84px)`,
        backgroundPosition: '0 46px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        transform: `translateX(${(1 - s) * 900}px) rotate(${-1.5 + (1 - s) * 8}deg)`,
      }}
    >
      {/* 左侧红色边线 */}
      <div style={{position: 'absolute', left: 36, top: 0, bottom: 0, width: 2, background: '#E5484D', opacity: 0.5}} />
      <div style={{position: 'absolute', left: 50, top: 34, fontFamily: HAND, fontSize: 52, color: '#C0392B'}}>
        把它写下来
      </div>

      {LINES.map((l, i) => {
        const lt = lineT(i);
        return (
          <React.Fragment key={i}>
            <HandLine text={l.q} p={prog(frame, lt.q0, lt.q1, Easing.linear)} fs={Q_FS} color="#2B2B2B" top={lineTop(i)} left={50} />
            <HandLine text={l.a} p={prog(frame, lt.a0, lt.a1, Easing.linear)} fs={A_FS} color="#1F5E99" top={lineTop(i) + 64} left={80} />
          </React.Fragment>
        );
      })}

      {penP && <Pen x={penP.x} y={penP.y} op={1} frame={frame} />}
    </div>
  );
};

// =====================================================================
// 清晰度进度条
// =====================================================================
const ClarityMeter: React.FC<{frame: number}> = ({frame}) => {
  const c = clarityAt(frame);
  const op = prog(frame, 20, 40);
  return (
    <div style={{position: 'absolute', right: 80, top: 52, display: 'flex', alignItems: 'center', gap: 18, opacity: op}}>
      <span style={{fontSize: 30, color: C.dim}}>清晰度</span>
      <div style={{width: 280, height: 16, borderRadius: 8, background: '#21262D', overflow: 'hidden'}}>
        <div
          style={{
            width: `${c * 100}%`,
            height: '100%',
            borderRadius: 8,
            background: `linear-gradient(90deg, ${C.reason}, ${GREEN})`,
            boxShadow: `0 0 12px ${C.reason}`,
          }}
        />
      </div>
      <span style={{fontSize: 34, fontWeight: 700, color: C.text, width: 90, textAlign: 'right'}}>
        {Math.round(c * 100)}%
      </span>
    </div>
  );
};

// =====================================================================
// 字幕 / 章节标签
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [15, 122, '人生是一场消除模糊的比赛。'],
  [126, 238, <>焦虑往往来自<span style={{color: C.instinct}}>"说不清"</span>：你只是不安，却说不出在怕什么。</>],
  [246, 525, <>把问题<span style={{color: C.reason}}>写下来</span>，模糊就变成了清晰。</>],
  [530, 600, <>当一切清晰，<span style={{color: GREEN}}>恐惧就变小了</span>。</>],
];

const Captions: React.FC<{frame: number}> = ({frame}) => (
  <>
    {CAPS.map(([a, b, text], i) => {
      const op = Math.min(prog(frame, a, a + 8), 1 - prog(frame, b - 8, b));
      if (op <= 0) return null;
      return (
        <div key={i} style={{position: 'absolute', bottom: 50, width: '100%', display: 'flex', justifyContent: 'center', opacity: op}}>
          <div style={{fontSize: 46, color: C.text, background: 'rgba(0,0,0,0.55)', padding: '10px 28px', borderRadius: 10}}>{text}</div>
        </div>
      );
    })}
  </>
);

const ChapterTag: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', left: 60, top: 44, fontSize: 30, color: C.dim, letterSpacing: 2, opacity: prog(frame, 0, 20)}}>
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>02</span>
    潜意识 · 消除模糊
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
      volume={(f) => interpolate(f, [0, 30, SCENE3_DURATION - 20, SCENE3_DURATION], [0, 0.12, 0.12, 0], clamp)}
    />
    {/* 不安的嗡鸣：随清晰度减弱 */}
    <Audio
      src={staticFile('sfx/fogbed.wav')}
      loop
      volume={(f) => 0.55 * prog(f, 0, 30) * (1 - clarityAt(f))}
    />
    {HEARTS.map((h, k) => (
      <Sfx key={`h${k}`} from={h} src="heartbeat.wav" vol={0.7} dur={24} />
    ))}
    {QMARKS.map((q, k) => (
      <Sfx key={`q${k}`} from={q.at} src="pop.wav" vol={0.35} rate={0.85 + k * 0.12} dur={10} />
    ))}
    <Sfx from={T.paperIn} src="paper.wav" vol={0.7} dur={24} />
    {LINES.map((_, i) => {
      const lt = lineT(i);
      return (
        <React.Fragment key={`l${i}`}>
          <Sfx from={lt.q0} src="pencil.wav" vol={0.55} rate={1} dur={T.qDur} />
          <Sfx from={lt.a0} src="pencil.wav" vol={0.5} rate={1.08} dur={T.aDur} />
          <Sfx from={lt.g0 - 2} src="gather.wav" vol={0.5} dur={30} />
          <Sfx from={lt.card} src="card.wav" vol={0.55} rate={1 + i * 0.12} dur={12} />
        </React.Fragment>
      );
    })}
    <Sfx from={T.done} src="resolve.wav" vol={0.45} dur={SCENE3_DURATION - T.done} />
    <Sfx from={T.sweep} src="ding.wav" vol={0.3} rate={1.2} dur={50} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = clarityAt(frame);
  const sceneOp = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));

  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.text, opacity: sceneOp}}>
      <SoundTrack />
      {/* 整体画面：灰 → 彩 */}
      <AbsoluteFill style={{filter: `saturate(${lerp(0.15, 1, c)}) brightness(${lerp(0.85, 1.04, c)})`}}>
        <AbsoluteFill style={{background: `radial-gradient(circle at 35% 45%, #1B2430 0%, ${C.bg} 65%)`}} />
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 35% 45%, rgba(79,195,247,${0.12 * c}) 0%, transparent 60%)`,
          }}
        />
        <Fog frame={frame} fps={fps} />
        <Cards frame={frame} fps={fps} />
        <Paper frame={frame} fps={fps} />
      </AbsoluteFill>
      <ChapterTag frame={frame} />
      <ClarityMeter frame={frame} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};