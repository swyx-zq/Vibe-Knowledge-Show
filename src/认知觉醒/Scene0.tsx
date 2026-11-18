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
import {BRAIN_PARTS, BRAIN_TARGETS, CEREB_FILL_PATH, CX, CY, PartKind} from './brain';

export const SCENE0_DURATION = 300;

// ---------- 时间轴（帧） ----------
const T = {
  l1Start: 6,
  l1Step: 6,
  l2Start: 84,
  l2Step: 7,
  shake: [136, 150, 170] as const,
  dissolve: 175,
  fly: 40,
  drawStart: 222,
  drawStagger: 0.9, // 每个部件依次延后的帧数
  breathStart: 272,
  caption: 182,
  title: 248,
  fadeOut: [288, 300] as const,
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------- 文字 ----------
const LINE1 = Array.from('你明明知道该做什么，');
const LINE2 = Array.from('却总是做不到？');
const HL = [3, 4, 5]; // "做不到"
const FS = 84;
const LINE1_Y = 320;
const LINE2_Y = 460;

const typedCount = (frame: number, start: number, step: number, len: number) =>
  frame < start ? 0 : Math.min(len, Math.floor((frame - start) / step) + 1);

// 每个字出现的帧（用于键盘音）
const KEY_FRAMES = [
  ...LINE1.map((_, k) => T.l1Start + k * T.l1Step),
  ...LINE2.map((_, k) => T.l2Start + k * T.l2Step),
];

// ---------- 大脑各部件的线条样式 ----------
const STYLE: Record<PartKind, {w: number; op: number; dur: number}> = {
  outline: {w: 3.6, op: 1, dur: 30},
  major: {w: 2.6, op: 0.9, dur: 18},
  cereb: {w: 3.0, op: 0.95, dur: 18},
  folia: {w: 1.6, op: 0.6, dur: 14},
  stem: {w: 3.0, op: 0.9, dur: 16},
  minor: {w: 1.8, op: 0.55, dur: 12},
};

// ---------- 粒子 ----------
const PARTICLES = BRAIN_TARGETS.map((t, i) => {
  const onL1 = random(`l${i}`) < 0.58;
  const w = (onL1 ? LINE1.length : LINE2.length) * FS;
  const left = 960 - w / 2;
  const x0 = left + random(`x${i}`) * w;
  const y0 = (onL1 ? LINE1_Y : LINE2_Y) + (random(`y${i}`) - 0.5) * FS * 0.8;
  const hot = !onL1 && x0 >= left + 3 * FS && x0 <= left + 6 * FS;
  return {
    x0,
    y0,
    x1: t.x,
    y1: t.y,
    hot,
    delay: random(`d${i}`) * 22,
    swirl: (random(`s${i}`) - 0.5) * 260,
    r: 1.5 + random(`r${i}`) * 1.6,
  };
});

// ---------- 光标 ----------
const Cursor: React.FC<{visible: boolean}> = ({visible}) => (
  <span style={{display: 'inline-block', width: 0, overflow: 'visible'}}>
    <span style={{color: C.reason, opacity: visible ? 1 : 0, marginLeft: 4, fontWeight: 300}}>|</span>
  </span>
);

// ---------- 单行打字 ----------
const TypeLine: React.FC<{
  chars: string[];
  typed: number;
  y: number;
  cursorOn: boolean;
  frame: number;
  highlight?: number[];
}> = ({chars, typed, y, cursorOn, frame, highlight = []}) => {
  const amp = interpolate(frame, [...T.shake], [0, 10, 0], clamp);
  const hotColor = interpolateColors(frame, [T.shake[0], T.shake[0] + 8], [C.text, C.instinct]);

  return (
    <div
      style={{
        position: 'absolute',
        top: y - FS * 0.65,
        width: '100%',
        textAlign: 'center',
        fontSize: FS,
        fontWeight: 700,
        lineHeight: 1.3,
        whiteSpace: 'pre',
      }}
    >
      {chars.map((ch, k) => {
        const isHot = highlight.includes(k);
        const dx = isHot ? Math.sin(frame * 2.1 + k * 1.7) * amp : 0;
        const dy = isHot ? Math.cos(frame * 2.7 + k) * amp * 0.4 : 0;
        return (
          <React.Fragment key={k}>
            <span
              style={{
                display: 'inline-block',
                opacity: k < typed ? 1 : 0,
                color: isHot ? hotColor : C.text,
                transform: `translate(${dx}px, ${dy}px) scale(${isHot ? 1 + amp / 80 : 1})`,
              }}
            >
              {ch}
            </span>
            {k === typed - 1 && <Cursor visible={cursorOn} />}
          </React.Fragment>
        );
      })}
      {typed === 0 && cursorOn && <Cursor visible />}
    </div>
  );
};

// ---------- 音效层 ----------
const SoundTrack: React.FC = () => (
  <>
    {/* 环境铺底：淡入淡出 */}
    <Audio
      src={staticFile('sfx/drone.wav')}
      volume={(f) => interpolate(f, [0, 30, 270, 300], [0, 0.22, 0.22, 0], clamp)}
    />

    {/* 打字：每个字一声，3 个变体轮换 + 轻微随机音高/音量 */}
    {KEY_FRAMES.map((f, i) => (
      <Sequence key={i} from={f} durationInFrames={6} layout="none">
        <Audio
          src={staticFile(`sfx/key${(i % 3) + 1}.wav`)}
          volume={0.45 + random(`kv${i}`) * 0.2}
          playbackRate={0.92 + random(`kp${i}`) * 0.16}
        />
      </Sequence>
    ))}

    <Sequence from={T.shake[0]} durationInFrames={24} layout="none">
      <Audio src={staticFile('sfx/glitch.wav')} volume={0.55} />
    </Sequence>

    <Sequence from={T.dissolve - 3} durationInFrames={60} layout="none">
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.7} />
    </Sequence>

    <Sequence from={T.caption} durationInFrames={10} layout="none">
      <Audio src={staticFile('sfx/pop.wav')} volume={0.35} />
    </Sequence>

    <Sequence from={T.drawStart} durationInFrames={70} layout="none">
      <Audio src={staticFile('sfx/shimmer.wav')} volume={0.45} />
    </Sequence>

    <Sequence from={T.title} durationInFrames={52} layout="none">
      <Audio src={staticFile('sfx/impact.wav')} volume={0.8} />
    </Sequence>
  </>
);

// ---------- 主场景 ----------
export const Scene0: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 打字
  const n1 = typedCount(frame, T.l1Start, T.l1Step, LINE1.length);
  const n2 = typedCount(frame, T.l2Start, T.l2Step, LINE2.length);
  const typing = (frame < T.l2Start && n1 < LINE1.length) || (frame >= T.l2Start && n2 < LINE2.length);
  const blink = typing || Math.floor(frame / 15) % 2 === 0;
  const onLine2 = frame >= T.l2Start;
  const cursorAlive = frame < T.dissolve;

  // 文字消散
  const textOp = interpolate(frame, [T.dissolve, T.dissolve + 15], [1, 0], clamp);
  const textBlur = interpolate(frame, [T.dissolve, T.dissolve + 15], [0, 10], clamp);

  // 大脑：每个部件依次描绘
  const partProgress = (i: number, dur: number) =>
    interpolate(frame, [T.drawStart + i * T.drawStagger, T.drawStart + i * T.drawStagger + dur], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    });
  const outlineP = partProgress(0, STYLE.outline.dur);
  const breath = frame > T.breathStart ? Math.sin((frame - T.breathStart) / 10) : 0;
  const glow = (7 + 6 * ((breath + 1) / 2)) * outlineP;

  // 标题
  const titleS = spring({frame: frame - T.title, fps, config: {damping: 13}});
  const authorS = spring({frame: frame - T.title - 14, fps, config: {damping: 16}});

  // 字幕
  const capOp = interpolate(frame, [T.caption, T.caption + 12], [0, 1], clamp);

  // 整体淡出
  const sceneOp = interpolate(frame, [...T.fadeOut], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 36%, #16202C 0%, ${C.bg} 62%)`,
        fontFamily: FONT,
        opacity: sceneOp,
      }}
    >
      <SoundTrack />

      {/* 1. 打字文字 */}
      <AbsoluteFill style={{opacity: textOp, filter: `blur(${textBlur}px)`}}>
        <TypeLine chars={LINE1} typed={n1} y={LINE1_Y} frame={frame} cursorOn={cursorAlive && !onLine2 && blink} />
        <TypeLine
          chars={LINE2}
          typed={n2}
          y={LINE2_Y}
          frame={frame}
          highlight={HL}
          cursorOn={cursorAlive && onLine2 && blink}
        />
      </AbsoluteFill>

      {/* 2. 大脑线框 */}
      {frame >= T.drawStart && (
        <svg
          width={1920}
          height={1080}
          style={{
            position: 'absolute',
            filter: `drop-shadow(0 0 ${glow}px ${C.reason})`,
            transform: `scale(${1 + 0.012 * breath})`,
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <defs>
            <radialGradient id="brainFill" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor={C.reason} stopOpacity={0.16} />
              <stop offset="100%" stopColor={C.reason} stopOpacity={0.03} />
            </radialGradient>
            <linearGradient id="stemFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={1} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <mask id="stemMask" maskUnits="userSpaceOnUse">
              <rect x={CX} y={CY + 150} width={200} height={160} fill="url(#stemFade)" />
            </mask>
          </defs>

          {/* 填充：大脑 + 小脑 */}
          <path d={BRAIN_PARTS[0].d} fill="url(#brainFill)" opacity={outlineP} />
          <path d={CEREB_FILL_PATH} fill={C.reason} opacity={0.07 * outlineP} />

          {/* 线条 */}
          {BRAIN_PARTS.map((p, i) => {
            const s = STYLE[p.kind];
            const prog = partProgress(i, s.dur);
            if (prog <= 0) return null;
            return (
              <path
                key={i}
                d={p.d}
                fill="none"
                stroke={C.reason}
                strokeWidth={s.w}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={s.op}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - prog}
                mask={p.kind === 'stem' ? 'url(#stemMask)' : undefined}
              />
            );
          })}
        </svg>
      )}

      {/* 3. 粒子：文字 → 大脑 */}
      {frame >= T.dissolve && (
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          {PARTICLES.map((p, i) => {
            const s = T.dissolve + p.delay;
            const k = interpolate(frame, [s, s + T.fly], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
            const bend = Math.sin(k * Math.PI);
            const jitter = (1 - k) * Math.sin(frame * 0.3 + i) * 1.5;
            const x = p.x0 + (p.x1 - p.x0) * k + bend * p.swirl + jitter;
            const y = p.y0 + (p.y1 - p.y0) * k - bend * p.swirl * 0.35;
            const start = p.hot ? C.instinct : C.text;
            const fill = interpolateColors(k, [0, 0.6, 1], [start, start, C.reason]);
            const op =
              interpolate(frame, [T.dissolve, T.dissolve + 10], [0, 1], clamp) *
              interpolate(frame, [T.drawStart + 20, T.drawStart + 45], [1, 0.25], clamp);
            return <circle key={i} cx={x} cy={y} r={p.r} fill={fill} opacity={op} />;
          })}
        </svg>
      )}

      {/* 4. 标题 */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          width: '100%',
          textAlign: 'center',
          fontSize: 100,
          fontWeight: 700,
          letterSpacing: 12,
          color: C.text,
          opacity: titleS,
          transform: `translateY(${(1 - titleS) * 40}px)`,
          textShadow: `0 0 24px rgba(79,195,247,${0.35 * titleS})`,
        }}
      >
        《认知觉醒》
      </div>
      <div
        style={{
          position: 'absolute',
          top: 836,
          width: '100%',
          textAlign: 'center',
          fontSize: 38,
          letterSpacing: 6,
          color: C.dim,
          opacity: authorS,
          transform: `translateY(${(1 - authorS) * 20}px)`,
        }}
      >
        周岭 著
      </div>

      {/* 5. 字幕 */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: capOp,
        }}
      >
        <div
          style={{
            fontSize: 46,
            color: C.text,
            background: 'rgba(0,0,0,0.5)',
            padding: '10px 28px',
            borderRadius: 10,
          }}
        >
          这不是你懒，是你的大脑天生就这么设计。
        </div>
      </div>
    </AbsoluteFill>
  );
};