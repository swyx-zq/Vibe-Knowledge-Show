import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C, FONT} from './theme';

export const SCENE4_DURATION = 660;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (frame: number, fps: number, damping = 12, stiffness = 150) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});
const GREEN = '#3FB950';
const SKIN = '#30363D';

// ---------- 时间轴（帧） ----------
const T = {
  notifs: [40, 75, 110],
  clockEnd: 150,
  pull: [120, 200] as const,
  box: [205, 230] as const,
  ghost: [205, 250] as const,
  cone: [250, 270] as const,
  ask: 255,
  alert: 300,
  look: [300, 312] as const,
  putDown: [320, 350] as const,
  book: [345, 365] as const,
  lamp: [352, 368] as const,
  answer: 365,
  roomOut: [395, 425] as const,
  bar: [425, 450] as const,
  chaos: 440,
  plan: 455,
  suck: [478, 505] as const,
  order: 500,
  orderStep: 10,
  review: 545,
  formula: 565,
  end: [645, 660] as const,
};

const typed = (frame: number, start: number, text: string, step = 4) =>
  Array.from(text).slice(0, Math.max(0, Math.floor((frame - start) / step) + 1)).join('');

// =====================================================================
// A + B. 房间（世界坐标 1920×1080，由镜头变换）
// =====================================================================
const HEAD = {x: 960, y: 500, r: 44};
const DESK_Y = 700;
const CLOCK = {x: 770, y: 350, r: 48};
const GHOST_TO = {x: 1560, y: 300};
const ASK = '你现在在做什么？';
const ANSWER = '该写作业了。';

const Clock: React.FC<{frame: number}> = ({frame}) => {
  const fast = Math.min(frame, T.clockEnd);
  const minuteDeg = fast * 17.28 + Math.max(0, frame - T.clockEnd) * 0.5; // 150 帧 ≈ 转 7.2 圈 ≈ 2 小时
  const hourDeg = 600 + minuteDeg / 12;
  const mins = Math.round(120 * prog(frame, 0, T.clockEnd, Easing.linear));
  const hh = 20 + Math.floor(mins / 60);
  const mm = String(mins % 60).padStart(2, '0');
  const hand = (deg: number, len: number, w: number, color: string) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return (
      <line
        x1={CLOCK.x}
        y1={CLOCK.y}
        x2={CLOCK.x + Math.cos(a) * len}
        y2={CLOCK.y + Math.sin(a) * len}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
    );
  };
  return (
    <g>
      <circle cx={CLOCK.x} cy={CLOCK.y} r={CLOCK.r} fill="#161B22" stroke={C.dim} strokeWidth={4} />
      {Array.from({length: 12}, (_, k) => {
        const a = (k * 30 * Math.PI) / 180;
        return (
          <line
            key={k}
            x1={CLOCK.x + Math.cos(a) * 38}
            y1={CLOCK.y + Math.sin(a) * 38}
            x2={CLOCK.x + Math.cos(a) * 44}
            y2={CLOCK.y + Math.sin(a) * 44}
            stroke={C.dim}
            strokeWidth={2}
          />
        );
      })}
      {hand(hourDeg, 24, 5, C.text)}
      {hand(minuteDeg, 36, 3, C.instinct)}
      <circle cx={CLOCK.x} cy={CLOCK.y} r={4} fill={C.text} />
      <text x={CLOCK.x} y={CLOCK.y + 90} textAnchor="middle" fontSize={30} fill={C.instinct} fontWeight={700}>
        {hh}:{mm}
      </text>
    </g>
  );
};

const Room: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const look = prog(frame, T.look[0], T.look[1]);
  const put = prog(frame, T.putDown[0], T.putDown[1], io);
  const book = prog(frame, T.book[0], T.book[1]);
  const lamp = prog(frame, T.lamp[0], T.lamp[1]);
  const phoneOn = 1 - put;

  // 手机：手中 → 平放在桌面
  const vib = T.notifs.some((n) => frame >= n && frame < n + 8) ? Math.sin(frame * 3) * 3 : 0;
  const ph = {x: lerp(960, 1110, put) + vib, y: lerp(618, DESK_Y - 8, put), sy: lerp(1, 0.22, put)};

  // 双手：手机两侧 → 书两侧
  const handL = {x: lerp(938, 905, put), y: lerp(632, 690, put)};
  const handR = {x: lerp(982, 1015, put), y: lerp(632, 690, put)};
  const shL = {x: 912, y: 568};
  const shR = {x: 1008, y: 568};

  const pupilDy = lerp(5, 0, look);

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
      <defs>
        <radialGradient id="s4Lamp" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor={C.emotion} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.emotion} stopOpacity={0} />
        </radialGradient>
        <clipPath id="s4Screen">
          <rect x={-24} y={-42} width={48} height={84} rx={4} />
        </clipPath>
      </defs>

      <Clock frame={frame} />

      {/* 台灯光 */}
      <polygon points={`1140,600 980,${DESK_Y} 1240,${DESK_Y}`} fill="url(#s4Lamp)" opacity={lamp} />

      {/* 身体 */}
      <path d={`M 892 ${DESK_Y + 10} Q 892 566 960 556 Q 1028 566 1028 ${DESK_Y + 10} Z`} fill={SKIN} stroke={C.dim} strokeWidth={3} />
      {/* 手机屏幕照亮脸 */}
      <ellipse cx={HEAD.x} cy={HEAD.y + 20} rx={64} ry={54} fill="#BFE9FF" opacity={0.14 * phoneOn} />
      {/* 头 */}
      <circle cx={HEAD.x} cy={HEAD.y} r={HEAD.r} fill={SKIN} stroke={C.dim} strokeWidth={3} />
      <circle cx={HEAD.x - 16} cy={HEAD.y + pupilDy} r={5} fill={C.text} />
      <circle cx={HEAD.x + 16} cy={HEAD.y + pupilDy} r={5} fill={C.text} />
      <path
        d={`M ${HEAD.x - 12} ${HEAD.y + 24} Q ${HEAD.x} ${HEAD.y + 24 + lerp(0, 6, put)} ${HEAD.x + 12} ${HEAD.y + 24}`}
        fill="none"
        stroke={C.text}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* 书桌 */}
      <rect x={690} y={DESK_Y} width={540} height={18} rx={4} fill="#3A3F47" />
      <rect x={710} y={DESK_Y + 18} width={500} height={150} fill="#22272E" />
      <rect x={720} y={DESK_Y + 168} width={14} height={40} fill="#22272E" />
      <rect x={1186} y={DESK_Y + 168} width={14} height={40} fill="#22272E" />

      {/* 台灯 */}
      <rect x={1150} y={DESK_Y - 10} width={50} height={10} rx={3} fill={C.dim} />
      <line x1={1175} y1={DESK_Y - 10} x2={1160} y2={610} stroke={C.dim} strokeWidth={6} strokeLinecap="round" />
      <path d="M 1120 618 L 1180 590 L 1170 618 Z" fill={lamp > 0.5 ? C.emotion : C.dim} />

      {/* 书 */}
      <g opacity={book} transform={`translate(960 ${DESK_Y - 4}) scale(${0.6 + 0.4 * book})`}>
        <path d="M 0 0 L -80 -6 L -84 -30 L 0 -22 Z" fill="#E6EDF3" />
        <path d="M 0 0 L 80 -6 L 84 -30 L 0 -22 Z" fill="#C9D1D9" />
        <line x1={0} y1={0} x2={0} y2={-22} stroke={C.dim} strokeWidth={2} />
      </g>

      {/* 手机 */}
      <g transform={`translate(${ph.x} ${ph.y}) scale(1 ${ph.sy})`}>
        <rect x={-28} y={-48} width={56} height={96} rx={10} fill="#0D1117" stroke={C.dim} strokeWidth={3} />
        <g clipPath="url(#s4Screen)" opacity={phoneOn}>
          <rect x={-24} y={-42} width={48} height={84} fill="#123047" />
          {Array.from({length: 6}, (_, k) => {
            const y = (((k * 26 - frame * 2.4) % 156) + 156) % 156 - 60;
            return <rect key={k} x={-19} y={y} width={38} height={18} rx={3} fill={k % 2 ? C.reason : '#F778BA'} opacity={0.75} />;
          })}
        </g>
      </g>

      {/* 手臂 */}
      {[
        [shL, handL, -1],
        [shR, handR, 1],
      ].map(([s, h, side], k) => {
        const sp0 = s as {x: number; y: number};
        const hp = h as {x: number; y: number};
        const sd = side as number;
        return (
          <path
            key={k}
            d={`M ${sp0.x} ${sp0.y} Q ${sp0.x + sd * 26} ${(sp0.y + hp.y) / 2 + 40} ${hp.x} ${hp.y}`}
            fill="none"
            stroke={SKIN}
            strokeWidth={20}
            strokeLinecap="round"
          />
        );
      })}

      {/* +1 通知 */}
      {T.notifs.map((n, k) => {
        const t = frame - n;
        if (t < 0 || t > 32) return null;
        return (
          <g key={k} transform={`translate(${990 + k * 14} ${580 - t * 2.2})`} opacity={1 - t / 32}>
            <rect x={-26} y={-18} width={52} height={36} rx={18} fill="#E5484D" />
            <text x={0} y={9} textAnchor="middle" fontSize={24} fontWeight={700} fill="#fff">+1</text>
          </g>
        );
      })}
    </svg>
  );
};

// 另一个自己（元认知）
const Ghost: React.FC<{frame: number}> = ({frame}) => {
  const k = prog(frame, T.ghost[0], T.ghost[1], io);
  if (k <= 0) return null;
  const bob = frame > T.ghost[1] ? Math.sin((frame - T.ghost[1]) / 14) * 6 : 0;
  const x = lerp(HEAD.x, GHOST_TO.x, k);
  const y = lerp(HEAD.y, GHOST_TO.y, k) + bob;
  const s = lerp(0.8, 1.1, k);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
      <g transform={`translate(${x} ${y}) scale(${s})`} opacity={k} style={{filter: `drop-shadow(0 0 16px ${C.reason})`}}>
        <path d="M -62 170 Q -62 64 0 56 Q 62 64 62 170 Z" fill={`${C.reason}26`} stroke={C.reason} strokeWidth={3} />
        <circle cx={0} cy={0} r={44} fill={`${C.reason}26`} stroke={C.reason} strokeWidth={3} />
        <circle cx={-18} cy={4} r={5} fill={C.reason} />
        <circle cx={14} cy={4} r={5} fill={C.reason} />
      </g>
    </svg>
  );
};

const SightCone: React.FC<{frame: number}> = ({frame}) => {
  const k = prog(frame, T.cone[0], T.cone[1]);
  if (k <= 0) return null;
  const pulse = 0.85 + 0.15 * Math.sin(frame / 8);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <defs>
        <linearGradient id="s4Cone" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.reason} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.reason} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={`${GHOST_TO.x - 20},${GHOST_TO.y + 6} 760,430 1180,780`} fill="url(#s4Cone)" opacity={k * pulse} />
    </svg>
  );
};

const LayerBox: React.FC<{frame: number}> = ({frame}) => {
  const k = prog(frame, T.box[0], T.box[1]);
  if (k <= 0) return null;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <rect
          x={640}
          y={270}
          width={680}
          height={640}
          rx={24}
          fill="none"
          stroke={C.dim}
          strokeWidth={3}
          strokeDasharray="14 12"
          opacity={k}
          pathLength={1}
          style={{strokeDasharray: '0.02 0.015', strokeDashoffset: 1 - k}}
        />
      </svg>
      <div style={{position: 'absolute', left: 664, top: 286, fontSize: 30, color: C.dim, opacity: k}}>
        第一层 · 做事的我
      </div>
      <div
        style={{
          position: 'absolute',
          left: GHOST_TO.x - 200,
          width: 400,
          top: GHOST_TO.y + 200,
          textAlign: 'center',
          fontSize: 30,
          fontWeight: 700,
          color: C.reason,
          opacity: prog(frame, T.ghost[1] - 5, T.ghost[1] + 10),
        }}
      >
        第二层 · 看着自己的我
      </div>
    </>
  );
};

const Bubble: React.FC<{
  x: number;
  y: number;
  w: number;
  text: string;
  color: string;
  tail: {x: number; y: number};
  op: number;
  scale: number;
}> = ({x, y, w, text, color, tail, op, scale}) => {
  const h = 84;
  const baseX = tail.x < x + w / 2 ? x + 40 : x + w - 40;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', opacity: op}}>
        <path d={`M ${baseX - 18} ${y + h - 2} L ${tail.x} ${tail.y} L ${baseX + 18} ${y + h - 2} Z`} fill="#161B22" stroke={color} strokeWidth={3} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          boxSizing: 'border-box',
          borderRadius: 20,
          background: '#161B22',
          border: `3px solid ${color}`,
          color: C.text,
          fontSize: 42,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 28,
          opacity: op,
          transform: `scale(${scale})`,
          transformOrigin: `${tail.x - x}px ${h}px`,
        }}
      >
        {text}
      </div>
    </>
  );
};

const Dialogue: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const askS = sp(frame - T.ask + 4, fps, 14, 160);
  const ansS = sp(frame - T.answer + 4, fps, 14, 160);
  const alertS = sp(frame - T.alert, fps, 7, 220);
  const alertOp = frame >= T.alert ? 1 - prog(frame, T.answer - 10, T.answer) : 0;
  return (
    <>
      {frame >= T.ask - 4 && (
        <Bubble x={1070} y={120} w={420} text={typed(frame, T.ask, ASK)} color={C.reason} tail={{x: 1500, y: 250}} op={askS} scale={askS} />
      )}
      {frame >= T.answer - 4 && (
        <Bubble x={560} y={390} w={330} text={typed(frame, T.answer, ANSWER)} color={C.text} tail={{x: 912, y: 492}} op={ansS} scale={ansS} />
      )}
      {alertOp > 0 && (
        <div
          style={{
            position: 'absolute',
            left: HEAD.x - 60,
            width: 120,
            top: HEAD.y - 170,
            textAlign: 'center',
            fontSize: 96,
            fontWeight: 900,
            color: C.emotion,
            opacity: alertOp,
            transform: `scale(${alertS})`,
            transformOrigin: '50% 100%',
            textShadow: `0 0 20px ${C.emotion}`,
          }}
        >
          !
        </div>
      )}
    </>
  );
};

const Camera: React.FC<{frame: number; children: React.ReactNode}> = ({frame, children}) => {
  const k = prog(frame, T.pull[0], T.pull[1], io);
  const out = prog(frame, T.roomOut[0], T.roomOut[1], io);
  const s = lerp(1.7, 1, k) * lerp(1, 0.8, out);
  const fx = lerp(930, 960, k);
  const fy = lerp(600, 540, k);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: '0 0',
        transform: `translate(${960 - fx * s}px, ${540 - fy * s}px) scale(${s})`,
        opacity: 1 - out,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// =====================================================================
// C. 元时间
// =====================================================================
const BAR = {x: 210, y: 500, w: 1500, h: 72};
const SEG = 0.07; // 计划 / 复盘各占的比例
const bx = (u: number) => BAR.x + BAR.w * u;

const CHAOS = ['刷手机', '学习', '发呆', '回消息', '刷视频', '学习', '零食', '刷手机', '学习', '焦虑', '发呆', '刷手机'];
const CHAOS_POS = CHAOS.map((_, i) => ({
  x: bx(SEG + 0.04 + random(`cx${i}`) * (1 - 2 * SEG - 0.12)),
  y: BAR.y + BAR.h / 2 + (random(`cy${i}`) - 0.5) * 250,
  rot: (random(`cr${i}`) - 0.5) * 50,
  ph: random(`cp${i}`) * 6.28,
}));

const ORDER = [
  {label: '数学 · 90min', w: 0.3, color: C.reason},
  {label: '休息', w: 0.06, color: '#6E7681'},
  {label: '英语 · 60min', w: 0.22, color: C.emotion},
  {label: '休息', w: 0.06, color: '#6E7681'},
  {label: '阅读 · 45min', w: 0.2, color: GREEN},
];
const ORDER_GAP = (1 - 2 * SEG - ORDER.reduce((s, o) => s + o.w, 0)) / (ORDER.length + 1);
const ORDER_X = (() => {
  let u = SEG + ORDER_GAP;
  return ORDER.map((o) => {
    const start = u;
    u += o.w + ORDER_GAP;
    return start;
  });
})();

const MetaTime: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.bar[0]) return null;
  const barP = prog(frame, T.bar[0], T.bar[1], io);
  const planP = prog(frame, T.plan, T.plan + 15);
  const revP = prog(frame, T.review, T.review + 15);
  const fP = prog(frame, T.formula, T.formula + 25, io);
  const fS = sp(frame - T.formula - 10, fps, 14, 140);
  const xp = bx(SEG / 2);
  const xr = bx(1 - SEG / 2);

  const endCap = (u0: number, p: number, color: string) => (
    <rect
      x={bx(u0)}
      y={BAR.y}
      width={BAR.w * SEG}
      height={BAR.h}
      rx={u0 === 0 ? 14 : 0}
      fill={color}
      opacity={p}
      style={{filter: `drop-shadow(0 0 ${18 * p}px ${color})`}}
    />
  );

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <clipPath id="s4Bar">
            <rect x={BAR.x} y={BAR.y} width={BAR.w * barP} height={BAR.h} rx={14} />
          </clipPath>
        </defs>
        <g clipPath="url(#s4Bar)">
          <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} fill="#21262D" />
          {endCap(0, planP, C.reason)}
          {endCap(1 - SEG, revP, C.reason)}
        </g>
        <rect x={BAR.x} y={BAR.y} width={BAR.w * barP} height={BAR.h} rx={14} fill="none" stroke="#30363D" strokeWidth={2} />

        {/* 连线：两端 → 公式 */}
        {fP > 0 && (
          <>
            <path
              d={`M ${xp} ${BAR.y - 70} L ${xp} 300 L 640 300`}
              fill="none"
              stroke={C.reason}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - fP}
            />
            <path
              d={`M ${xr} ${BAR.y - 70} L ${xr} 300 L 1280 300`}
              fill="none"
              stroke={C.reason}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - fP}
            />
          </>
        )}
      </svg>

      {/* 混乱的碎片 */}
      {CHAOS.map((label, i) => {
        const s = sp(frame - T.chaos - i * 2, fps, 10, 170);
        const suck = prog(frame, T.suck[0] + i * 1.2, T.suck[1], Easing.in(Easing.cubic));
        if (frame < T.chaos + i * 2 || suck >= 1) return null;
        const p = CHAOS_POS[i];
        const x = lerp(p.x + Math.sin(frame / 6 + p.ph) * 6, bx(0.5), suck);
        const y = lerp(p.y + Math.cos(frame / 7 + p.ph) * 6, BAR.y + BAR.h / 2, suck);
        const isStudy = label === '学习';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 70,
              top: y - 24,
              width: 140,
              height: 48,
              borderRadius: 10,
              background: isStudy ? `${C.reason}55` : '#484F58',
              color: C.text,
              fontSize: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: s * (1 - suck),
              transform: `rotate(${p.rot * (1 - suck)}deg) scale(${s * (1 - 0.7 * suck)})`,
            }}
          >
            {label}
          </div>
        );
      })}

      {/* 有序的执行块 */}
      {ORDER.map((o, i) => {
        const at = T.order + i * T.orderStep;
        const s = sp(frame - at, fps, 13, 190);
        if (frame < at) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: bx(ORDER_X[i]),
              top: BAR.y + 8 - (1 - s) * 90,
              width: BAR.w * o.w,
              height: BAR.h - 16,
              borderRadius: 10,
              background: `${o.color}CC`,
              color: '#0E1117',
              fontSize: o.w > 0.1 ? 30 : 24,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: s,
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </div>
        );
      })}

      {/* 标签 */}
      <Lbl x={xp} y={BAR.y - 62} op={planP} color={C.reason} size={40} bold>计划</Lbl>
      <Lbl x={xp + 60} y={BAR.y + BAR.h + 18} op={planP} color={C.dim} size={28}>做事前：想清楚</Lbl>
      <Lbl x={xr} y={BAR.y - 62} op={revP} color={C.reason} size={40} bold>复盘</Lbl>
      <Lbl x={xr - 60} y={BAR.y + BAR.h + 18} op={revP} color={C.dim} size={28}>做完后：回头看</Lbl>
      <Lbl x={bx(0.5)} y={BAR.y + BAR.h + 18} op={prog(frame, T.chaos, T.chaos + 15)} color={C.dim} size={28}>执行时间</Lbl>

      {/* 公式 */}
      <div
        style={{
          position: 'absolute',
          top: 258,
          width: '100%',
          textAlign: 'center',
          fontSize: 66,
          fontWeight: 700,
          opacity: fS,
          transform: `scale(${0.7 + 0.3 * fS})`,
        }}
      >
        <span style={{color: C.reason, textShadow: `0 0 24px ${C.reason}88`}}>元时间</span>
        <span style={{color: C.dim}}> ＝ </span>
        <span style={{color: C.text}}>计划</span>
        <span style={{color: C.dim}}> ＋ </span>
        <span style={{color: C.text}}>复盘</span>
      </div>
    </AbsoluteFill>
  );
};

const Lbl: React.FC<{x: number; y: number; op: number; color: string; size: number; bold?: boolean; children: React.ReactNode}> = ({
  x,
  y,
  op,
  color,
  size,
  bold,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 200,
      width: 400,
      top: y,
      textAlign: 'center',
      fontSize: size,
      fontWeight: bold ? 700 : 400,
      color,
      opacity: op,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

// =====================================================================
// 字幕 / 章节标签
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [10, 150, <>明明该学习，却不知不觉刷了<span style={{color: C.instinct}}>两小时</span>手机？</>],
  [155, 295, <><span style={{color: C.reason}}>元认知</span>，就是对认知的认知：跳出来，看见自己。</>],
  [300, 410, '它是理智脑对抗本能的最强武器。'],
  [420, 560, <>每天留出<span style={{color: C.reason}}>"元时间"</span>：做事前想清楚，做完后复盘。</>],
  [565, 660, '元时间很短，却决定了其余时间的质量。'],
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
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>03</span>
    元认知 · 人类的终极能力
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

const keyClicks = (start: number, text: string, keyPrefix: string) =>
  Array.from(text).map((_, k) => (
    <Sfx key={`${keyPrefix}${k}`} from={start + k * 4} src={`key${(k % 3) + 1}.wav`} vol={0.35} rate={0.95 + (k % 3) * 0.05} dur={5} />
  ));

const SoundTrack: React.FC = () => (
  <>
    <Audio
      src={staticFile('sfx/drone.wav')}
      loop
      volume={(f) => interpolate(f, [0, 30, SCENE4_DURATION - 20, SCENE4_DURATION], [0, 0.14, 0.14, 0], clamp)}
    />
    {/* A */}
    <Sequence from={0} durationInFrames={T.clockEnd + 20} layout="none">
      <Audio src={staticFile('sfx/tick.wav')} loop volume={(f) => 0.35 * (1 - prog(f, T.clockEnd - 10, T.clockEnd + 15))} />
    </Sequence>
    {T.notifs.map((n, k) => (
      <Sfx key={`n${k}`} from={n} src="notify.wav" vol={0.45} rate={1 + k * 0.04} dur={25} />
    ))}
    <Sfx from={T.pull[0] - 2} src="pullback.wav" vol={0.5} dur={85} />
    {/* B */}
    <Sfx from={T.ghost[0]} src="ghost.wav" vol={0.5} dur={75} />
    {keyClicks(T.ask, ASK, 'a')}
    <Sfx from={T.alert} src="alert.wav" vol={0.55} dur={25} />
    <Sfx from={T.putDown[1] - 2} src="thud.wav" vol={0.4} rate={1.7} dur={12} />
    <Sfx from={T.book[0] + 2} src="paper.wav" vol={0.45} dur={22} />
    <Sfx from={T.lamp[0]} src="click.wav" vol={0.6} dur={10} />
    {keyClicks(T.answer, ANSWER, 'b')}
    <Sfx from={T.roomOut[0] + 4} src="whoosh.wav" vol={0.35} rate={1.3} dur={40} />
    {/* C */}
    <Sfx from={T.bar[0]} src="line-flat.wav" vol={0.35} rate={1.3} dur={30} />
    {CHAOS.map((_, i) => (
      <Sfx key={`c${i}`} from={T.chaos + i * 2} src="pop.wav" vol={0.18} rate={0.8 + (i % 4) * 0.15} dur={8} />
    ))}
    <Sfx from={T.plan} src="ding.wav" vol={0.45} dur={50} />
    <Sfx from={T.suck[0]} src="gather.wav" vol={0.45} dur={30} />
    {ORDER.map((_, i) => (
      <Sfx key={`o${i}`} from={T.order + i * T.orderStep} src="card.wav" vol={0.4} rate={0.9 + i * 0.08} dur={12} />
    ))}
    <Sfx from={T.review} src="ding.wav" vol={0.45} rate={0.85} dur={50} />
    <Sfx from={T.formula} src="resolve.wav" vol={0.45} dur={SCENE4_DURATION - T.formula} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneOp = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, #16202C 0%, ${C.bg} 65%)`,
        fontFamily: FONT,
        color: C.text,
        opacity: sceneOp,
      }}
    >
      <SoundTrack />
      {frame < T.roomOut[1] && (
        <Camera frame={frame}>
          <SightCone frame={frame} />
          <Room frame={frame} fps={fps} />
          <LayerBox frame={frame} />
          <Ghost frame={frame} />
          <Dialogue frame={frame} fps={fps} />
        </Camera>
      )}
      <MetaTime frame={frame} fps={fps} />
      <ChapterTag frame={frame} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};