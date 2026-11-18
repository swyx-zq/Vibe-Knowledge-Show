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

export const SCENE2_DURATION = 720;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (frame: number, fps: number, damping = 12, stiffness = 150) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});
const RED = '#E5484D';
const GREEN = '#3FB950';

// ---------- 时间轴（帧） ----------
const T = {
  personIn: [0, 20] as const,
  bubbles: [20, 37, 54, 71, 88],
  swell: [100, 170] as const,
  split: 125,
  fly: [135, 165] as const,
  burst: [182, 186, 190, 194, 198],
  personOut: [185, 205] as const,
  axes: [205, 235] as const,
  linear: [238, 278] as const,
  expo: [282, 335] as const,
  valley: [338, 362] as const,
  roll1: [365, 420] as const,
  stall: [420, 452] as const,
  roll2: [452, 505] as const,
  ghosts: [422, 432, 442],
  chartDim: [520, 545] as const,
  f1: 540,
  f2: 560,
  f3: 585,
  strike: 612,
  cure: 625,
  dotsFade: [645, 670] as const,
  dotGrow: [665, 700] as const,
  end: [705, 720] as const,
};

// =====================================================================
// A. 小人 + 五个气泡
// =====================================================================
const PC = {x: 960, y: 580}; // 小人头部中心
const TASKS = [
  {label: '考证', color: '#A371F7'},
  {label: '健身', color: GREEN},
  {label: '副业', color: C.emotion},
  {label: '读书', color: C.reason},
  {label: '英语', color: '#F778BA'},
];
const BUB_R = 82;
const BUB_POS = [-160, -125, -90, -55, -20].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return {x: PC.x + 340 * Math.cos(a), y: PC.y + 300 * Math.sin(a)};
});
const BAR = {x: 960 - 250, y: 860, w: 500, h: 26};

const Person: React.FC<{frame: number}> = ({frame}) => {
  const inP = prog(frame, T.personIn[0], T.personIn[1]);
  const outP = prog(frame, T.personOut[0], T.personOut[1]);
  const stress = prog(frame, T.swell[0], T.swell[1]);
  const shake = Math.sin(frame * 1.9) * 4 * stress;
  const op = inP * (1 - outP);
  if (op <= 0) return null;

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', opacity: op}}>
      <g transform={`translate(${shake} ${(1 - inP) * 40})`}>
        {/* 身体 */}
        <path
          d={`M ${PC.x - 70} ${PC.y + 200} Q ${PC.x - 72} ${PC.y + 70} ${PC.x} ${PC.y + 62} Q ${PC.x + 72} ${PC.y + 70} ${PC.x + 70} ${PC.y + 200} Z`}
          fill="#30363D"
          stroke={C.dim}
          strokeWidth={3}
        />
        {/* 头 */}
        <circle cx={PC.x} cy={PC.y} r={50} fill="#30363D" stroke={C.dim} strokeWidth={3} />
        {/* 眉毛：随压力皱起 */}
        <line x1={PC.x - 26} y1={PC.y - 16 + 6 * stress} x2={PC.x - 8} y2={PC.y - 16} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
        <line x1={PC.x + 26} y1={PC.y - 16 + 6 * stress} x2={PC.x + 8} y2={PC.y - 16} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
        <circle cx={PC.x - 17} cy={PC.y} r={5} fill={C.text} />
        <circle cx={PC.x + 17} cy={PC.y} r={5} fill={C.text} />
        {/* 嘴：微笑 → 紧张 */}
        <path
          d={`M ${PC.x - 16} ${PC.y + 24} Q ${PC.x} ${PC.y + 24 + lerp(10, -8, stress)} ${PC.x + 16} ${PC.y + 24}`}
          fill="none"
          stroke={C.text}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* 汗滴 */}
        {[0, 1].map((k) => {
          const st = 110 + k * 25;
          const t = (frame - st) % 40;
          if (frame < st) return null;
          return (
            <path
              key={k}
              d="M 0 0 Q 7 10 0 16 Q -7 10 0 0 Z"
              fill={C.reason}
              opacity={(1 - t / 40) * stress}
              transform={`translate(${PC.x + (k ? -62 : 60)} ${PC.y - 30 + t * 1.2})`}
            />
          );
        })}
      </g>
    </svg>
  );
};

const Bubbles: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const swell = prog(frame, T.swell[0], T.swell[1], io);
  return (
    <>
      {TASKS.map((t, i) => {
        const s = sp(frame - T.bubbles[i], fps, 9, 170);
        const burstK = prog(frame, T.burst[i], T.burst[i] + 8);
        if (frame < T.bubbles[i] || burstK >= 1) return null;
        const jit = swell * 10;
        const x = BUB_POS[i].x + Math.sin(frame * 0.7 + i * 2) * jit;
        const y = BUB_POS[i].y + Math.cos(frame * 0.9 + i) * jit;
        const scale = s * (1 + 0.32 * swell) * (1 + 0.4 * burstK);
        const fill = prog(frame, T.fly[1] - 4, T.fly[1] + 6) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - BUB_R,
              top: y - BUB_R,
              width: BUB_R * 2,
              height: BUB_R * 2,
              borderRadius: '50%',
              background: `${t.color}22`,
              border: `3px solid ${t.color}`,
              boxShadow: `0 0 ${20 + 20 * swell}px ${t.color}55`,
              transform: `scale(${scale})`,
              opacity: 1 - burstK,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div style={{fontSize: 40, fontWeight: 700, color: t.color}}>{t.label}</div>
            <div style={{width: 100, height: 10, borderRadius: 5, background: '#21262D', overflow: 'hidden'}}>
              <div style={{width: `${fill * 100}%`, height: '100%', background: t.color}} />
            </div>
          </div>
        );
      })}
    </>
  );
};

// 精力条：完整 → 裂成五段 → 飞进气泡
const EnergyBar: React.FC<{frame: number}> = ({frame}) => {
  const inP = prog(frame, 6, 24);
  const outP = prog(frame, T.personOut[0], T.personOut[1]);
  if (inP <= 0 || outP >= 1) return null;
  const gap = prog(frame, T.split, T.split + 10) * 14;
  const segW = (BAR.w - gap * 4) / 5;
  const labelOp = 1 - prog(frame, T.split, T.split + 10);
  return (
    <AbsoluteFill style={{opacity: inP * (1 - outP)}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <rect x={BAR.x - 6} y={BAR.y - 6} width={BAR.w + 12} height={BAR.h + 12} rx={10} fill="none" stroke="#30363D" strokeWidth={2} />
        {TASKS.map((t, i) => {
          const k = prog(frame, T.fly[0] + i * 3, T.fly[1] - 6 + i * 3, io);
          const x0 = BAR.x + i * (segW + gap);
          const tx = BUB_POS[i].x - 50;
          const ty = BUB_POS[i].y + 28;
          const w = lerp(segW, 20, k);
          const x = lerp(x0, tx, k);
          const y = lerp(BAR.y, ty, k) - Math.sin(Math.PI * k) * 80;
          const color = frame < T.split ? C.reason : t.color;
          return <rect key={i} x={x} y={y} width={w} height={lerp(BAR.h, 10, k)} rx={6} fill={color} opacity={1 - prog(frame, T.fly[1], T.fly[1] + 4)} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: BAR.x, width: BAR.w, top: BAR.y + 40, textAlign: 'center', fontSize: 32, color: C.dim}}>
        <span style={{opacity: labelOp}}>精力 100%</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: BAR.x - 100,
          width: BAR.w + 200,
          top: BAR.y + 40,
          textAlign: 'center',
          fontSize: 32,
          color: C.instinct,
          opacity: prog(frame, T.split + 6, T.split + 16),
        }}
      >
        每件事只分到 20%
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================
// B. 复利曲线
// =====================================================================
const G = {x0: 300, x1: 1600, y0: 860, top: 240, yMax: 1.3};
const PX = (x: number) => G.x0 + x * (G.x1 - G.x0);
const PY = (y: number) => G.y0 - (y / G.yMax) * (G.y0 - G.top);
const LIN_K = 0.55;
const EXP_B = 4;
const EXP_A = 0.02357;
const yLin = (x: number) => LIN_K * x;
const yExp = (x: number) => EXP_A * (Math.exp(EXP_B * x) - 1);

// 交点（二分法求解）
const XI = (() => {
  let lo = 0.2;
  let hi = 1;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (yExp(m) < yLin(m)) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
})();

const sample = (fn: (x: number) => number, a: number, b: number, n = 120) =>
  Array.from({length: n + 1}, (_, i) => {
    const x = a + ((b - a) * i) / n;
    return `${PX(x).toFixed(1)} ${PY(fn(x)).toFixed(1)}`;
  });

const LIN_D = 'M ' + sample(yLin, 0, 1).join(' L ');
const EXP_D = 'M ' + sample(yExp, 0, 1).join(' L ');
const VALLEY_D =
  'M ' + sample(yLin, 0, XI, 60).join(' L ') + ' L ' + sample(yExp, XI, 0, 60).join(' L ') + ' Z';

// 小球位置（参数 u = 横轴 0~1）
const U_STALL = 0.42;
const ballU = (f: number) => {
  if (f < T.roll1[0]) return 0;
  if (f < T.stall[0]) return U_STALL * prog(f, T.roll1[0], T.roll1[1], io);
  if (f < T.roll2[0]) return U_STALL;
  return lerp(U_STALL, 1, prog(f, T.roll2[0], T.roll2[1], Easing.in(Easing.quad)));
};
const CROSS_F = (() => {
  for (let f = T.roll2[0]; f <= T.roll2[1]; f++) if (ballU(f) >= XI) return f;
  return T.roll2[1];
})();

const Chart: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.axes[0]) return null;
  const dim = prog(frame, T.chartDim[0], T.chartDim[1]);
  const axP = prog(frame, T.axes[0], T.axes[1], io);
  const linP = prog(frame, T.linear[0], T.linear[1], io);
  const expP = prog(frame, T.expo[0], T.expo[1], Easing.in(Easing.quad));
  const valP = prog(frame, T.valley[0], T.valley[1]);
  const u = ballU(frame);
  const stalling = frame >= T.stall[0] && frame < T.roll2[0];
  const wob = stalling ? Math.sin(frame * 1.6) * 3 : 0;
  const bx = PX(u) + wob;
  const by = PY(yExp(u)) - 16;
  const ballOp = prog(frame, T.roll1[0] - 10, T.roll1[0]);
  const crossK = prog(frame, CROSS_F, CROSS_F + 25);
  const crossed = frame >= CROSS_F;

  return (
    <AbsoluteFill style={{opacity: 1 - 0.85 * dim, filter: `blur(${dim * 6}px)`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {/* 坐标轴 */}
        <line x1={G.x0} y1={G.y0} x2={lerp(G.x0, G.x1 + 60, axP)} y2={G.y0} stroke={C.dim} strokeWidth={3} />
        <line x1={G.x0} y1={G.y0} x2={G.x0} y2={lerp(G.y0, G.top - 40, axP)} stroke={C.dim} strokeWidth={3} />
        {axP >= 1 && (
          <>
            <path d={`M ${G.x1 + 66} ${G.y0} l -18 -10 l 0 20 z`} fill={C.dim} />
            <path d={`M ${G.x0} ${G.top - 46} l -10 18 l 20 0 z`} fill={C.dim} />
          </>
        )}

        {/* 失望之谷 */}
        <path d={VALLEY_D} fill={RED} opacity={0.28 * valP} />

        {/* 你以为的成长 */}
        <path
          d={LIN_D}
          fill="none"
          stroke={C.emotion}
          strokeWidth={4}
          strokeDasharray="14 10"
          strokeLinecap="round"
          style={{clipPath: `inset(0 ${(1 - linP) * 100}% 0 0)`}}
        />

        {/* 真实的成长 */}
        <path
          d={EXP_D}
          fill="none"
          stroke={C.reason}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.5}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - expP}
        />
        {/* 小球走过的路段：点亮 */}
        {u > 0.001 && (
          <path
            d={'M ' + sample(yExp, 0, u, 100).join(' L ')}
            fill="none"
            stroke={C.reason}
            strokeWidth={7}
            strokeLinecap="round"
            style={{filter: `drop-shadow(0 0 8px ${C.reason})`}}
          />
        )}

        {/* 拐点 */}
        {valP > 0 && (
          <line
            x1={PX(XI)}
            y1={PY(yLin(XI))}
            x2={PX(XI)}
            y2={G.y0}
            stroke={C.text}
            strokeWidth={2}
            strokeDasharray="6 8"
            opacity={0.5 * valP}
          />
        )}
        {crossed && (
          <circle
            cx={PX(XI)}
            cy={PY(yLin(XI))}
            r={20 + 90 * crossK}
            fill="none"
            stroke={C.reason}
            strokeWidth={4}
            opacity={1 - crossK}
          />
        )}

        {/* 放弃的人：从谷底掉落的幽灵球 */}
        {T.ghosts.map((g, i) => {
          const t = frame - g;
          if (t < 0 || t > 36) return null;
          const gx = PX(U_STALL) - 30 - i * 18 - t * 1.5;
          const gy = PY(yExp(U_STALL)) - 16 + 0.35 * t * t;
          return <circle key={i} cx={gx} cy={gy} r={14} fill={C.dim} opacity={1 - t / 36} />;
        })}

        {/* 小球 */}
        <circle cx={bx} cy={by} r={16} fill={C.reason} opacity={ballOp} style={{filter: `drop-shadow(0 0 10px ${C.reason})`}} />
      </svg>

      {/* 文字标签 */}
      <Tag x={G.x1 + 60} y={G.y0 + 20} op={axP} align="right" size={30} color={C.dim}>时间 / 努力</Tag>
      <Tag x={G.x0 - 20} y={G.top - 60} op={axP} align="right" size={30} color={C.dim}>成果</Tag>
      <Tag x={PX(1) + 16} y={PY(yLin(1)) - 22} op={linP} align="left" size={36} color={C.emotion}>你以为的成长</Tag>
      <Tag x={PX(1) - 40} y={PY(yExp(1)) - 24} op={expP} align="right" size={36} color={C.reason}>真实的成长</Tag>
      <Tag x={PX(0.45)} y={PY((yLin(0.45) + yExp(0.45)) / 2) - 26} op={valP} align="center" size={44} color={RED} bold>
        失望之谷
      </Tag>
      <Tag x={PX(XI)} y={G.y0 + 20} op={valP} align="center" size={30} color={C.text}>拐点</Tag>
      {T.ghosts.map((g, i) => {
        const t = frame - g;
        if (t < 0 || t > 36) return null;
        return (
          <Tag key={i} x={PX(U_STALL) - 30 - i * 18 - t * 1.5} y={PY(yExp(U_STALL)) - 70 + 0.35 * t * t} op={1 - t / 36} align="center" size={26} color={C.dim}>
            放弃
          </Tag>
        );
      })}
      <Tag x={PX(0.9)} y={PY(yExp(0.9)) - 20} op={prog(frame, CROSS_F + 8, CROSS_F + 22)} align="right" size={34} color={GREEN} bold>
        复利回报 ↑
      </Tag>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{
  x: number;
  y: number;
  op: number;
  align: 'left' | 'right' | 'center';
  size: number;
  color: string;
  bold?: boolean;
  children: React.ReactNode;
}> = ({x, y, op, align, size, color, bold, children}) => {
  const W = 600;
  const left = align === 'left' ? x : align === 'right' ? x - W : x - W / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: y,
        width: W,
        textAlign: align,
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
};

// =====================================================================
// C. 公式 + 解药
// =====================================================================
const Chip: React.FC<{color: string; size?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  color,
  size = 56,
  children,
  style,
}) => (
  <div
    style={{
      padding: '14px 30px',
      borderRadius: 16,
      border: `3px solid ${color}`,
      background: `${color}1A`,
      color,
      fontSize: size,
      fontWeight: 700,
      position: 'relative',
      ...style,
    }}
  >
    {children}
  </div>
);

const Formula: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.f1 - 2) return null;
  const s1 = sp(frame - T.f1, fps);
  const s2 = sp(frame - T.f2, fps);
  const s3 = sp(frame - T.f3, fps, 8, 200);
  const shake = frame >= T.f3 && frame < T.strike ? Math.sin(frame * 2.3) * 5 : 0;
  const strike = prog(frame, T.strike, T.strike + 10);
  const op = (k: number) => ({opacity: k, transform: `scale(${0.6 + 0.4 * k})`});

  return (
    <div style={{position: 'absolute', top: 300, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30}}>
      <div style={op(s1)}>
        <Chip color={C.instinct}>欲望 ＞ 能力</Chip>
      </div>
      <div style={{fontSize: 64, color: C.dim, ...op(s2)}}>＋</div>
      <div style={op(s2)}>
        <Chip color={C.emotion}>缺乏耐心</Chip>
      </div>
      <div style={{fontSize: 64, color: C.dim, ...op(s3)}}>＝</div>
      <div style={{...op(s3), transform: `scale(${0.6 + 0.4 * s3}) translateX(${shake}px)`}}>
        <Chip color={RED} size={72}>
          焦虑
          <div
            style={{
              position: 'absolute',
              left: '8%',
              top: '50%',
              height: 6,
              width: `${84 * strike}%`,
              background: C.text,
              borderRadius: 3,
              transform: 'rotate(-8deg)',
            }}
          />
        </Chip>
      </div>
    </div>
  );
};

const Cure: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.cure - 2) return null;
  const s = sp(frame - T.cure, fps, 14, 140);
  const fade = prog(frame, T.dotsFade[0], T.dotsFade[1]);
  const grow = prog(frame, T.dotGrow[0], T.dotGrow[1], io);
  const fill = prog(frame, T.dotGrow[0] + 10, T.dotGrow[1] + 10, io);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 500,
          width: '100%',
          textAlign: 'center',
          fontSize: 60,
          fontWeight: 700,
          color: C.text,
          opacity: s,
          transform: `translateY(${(1 - s) * 30}px)`,
        }}
      >
        解药：<span style={{color: C.reason}}>耐心</span>
        <span style={{color: C.dim}}> · </span>
        <span style={{color: GREEN}}>少即是多</span>
      </div>

      {/* 五个圆点 → 只留一个 */}
      <div style={{position: 'absolute', top: 640, width: '100%', height: 260, opacity: s}}>
        {TASKS.map((t, i) => {
          const keep = i === 2;
          const x = 960 + (i - 2) * 130 * (1 - (keep ? 0 : 0) * fade);
          const r = keep ? lerp(30, 80, grow) : lerp(30, 12, fade);
          const op = keep ? 1 : 1 - 0.8 * fade;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - r,
                top: 90 - r,
                width: r * 2,
                height: r * 2,
                borderRadius: '50%',
                background: keep ? `${t.color}33` : C.dim,
                border: `3px solid ${keep ? t.color : C.dim}`,
                opacity: op,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: keep ? `0 0 ${30 * grow}px ${t.color}` : 'none',
              }}
            >
              {keep && grow > 0.5 && (
                <>
                  <div style={{fontSize: 34, fontWeight: 700, color: t.color, opacity: (grow - 0.5) * 2}}>{t.label}</div>
                  <div style={{width: 90, height: 10, borderRadius: 5, background: '#21262D', overflow: 'hidden'}}>
                    <div style={{width: `${fill * 100}%`, height: '100%', background: t.color}} />
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 960 + 110,
            top: 70,
            fontSize: 34,
            fontWeight: 700,
            color: GREEN,
            opacity: prog(frame, T.dotGrow[1], T.dotGrow[1] + 10),
          }}
        >
          100%
        </div>
      </div>
    </>
  );
};

// =====================================================================
// 字幕 / 章节标签
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [10, 118, '焦虑的根源之一：想同时做很多事。'],
  [120, 205, <>精力被分成五份，每件事都只前进了<span style={{color: C.instinct}}>一点点</span>。</>],
  [210, 332, '又想立即看到效果，可真实的成长是一条复利曲线。'],
  [336, 418, <>前期投入很多、回报很少，这就是<span style={{color: RED}}>"失望之谷"</span>。</>],
  [420, 520, <>大多数人在这里放弃了；熬过<span style={{color: C.reason}}>拐点</span>，曲线才开始陡升。</>],
  [525, 612, <>焦虑的本质：<span style={{color: C.instinct}}>欲望大于能力</span>，又<span style={{color: C.emotion}}>极度缺乏耐心</span>。</>],
  [618, 720, <>解药是：<span style={{color: C.reason}}>耐心</span>，<span style={{color: GREEN}}>少即是多</span>。</>],
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
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>01</span>
    大脑 · 焦虑的根源
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
      volume={(f) => interpolate(f, [0, 30, SCENE2_DURATION - 20, SCENE2_DURATION], [0, 0.16, 0.16, 0], clamp)}
    />
    {/* A */}
    {T.bubbles.map((f, i) => (
      <Sfx key={`b${i}`} from={f} src="pop.wav" vol={0.5} rate={0.8 + i * 0.12} dur={10} />
    ))}
    <Sfx from={T.swell[0]} src="tension.wav" vol={0.45} dur={T.split + 8 - T.swell[0]} />
    <Sfx from={T.split} src="split.wav" vol={0.6} dur={30} />
    {T.burst.map((f, i) => (
      <Sfx key={`x${i}`} from={f} src="pop.wav" vol={0.4} rate={1.4 - i * 0.08} dur={10} />
    ))}
    {/* B */}
    <Sfx from={T.axes[0]} src="whoosh.wav" vol={0.3} rate={1.5} dur={40} />
    <Sfx from={T.linear[0]} src="line-flat.wav" vol={0.45} dur={T.linear[1] - T.linear[0] + 6} />
    <Sfx from={T.expo[0]} src="line-expo.wav" vol={0.45} dur={T.expo[1] - T.expo[0] + 6} />
    <Sfx from={T.valley[0]} src="valley.wav" vol={0.6} dur={70} />
    <Sequence from={T.roll1[0]} durationInFrames={T.roll2[1] - T.roll1[0] + 4} layout="none">
      <Audio
        src={staticFile('sfx/roll.wav')}
        loop
        volume={(f) => {
          const g = f + T.roll1[0];
          const speed = Math.abs(ballU(g + 1) - ballU(g)) * 60;
          return Math.min(0.6, speed * 0.9);
        }}
      />
    </Sequence>
    {T.ghosts.map((f, i) => (
      <Sfx key={`g${i}`} from={f} src="drop.wav" vol={0.45} rate={1 - i * 0.08} dur={25} />
    ))}
    <Sfx from={CROSS_F} src="ding.wav" vol={0.55} dur={60} />
    <Sfx from={CROSS_F + 2} src="shimmer.wav" vol={0.3} dur={60} />
    {/* C */}
    <Sfx from={T.f1} src="thud.wav" vol={0.6} dur={18} />
    <Sfx from={T.f2} src="thud.wav" vol={0.6} rate={1.15} dur={18} />
    <Sfx from={T.f3} src="glitch.wav" vol={0.5} dur={22} />
    <Sfx from={T.strike} src="paper.wav" vol={0.5} rate={1.6} dur={14} />
    <Sfx from={T.cure} src="resolve.wav" vol={0.45} dur={SCENE2_DURATION - T.cure} />
    <Sfx from={T.dotGrow[0]} src="hop.wav" vol={0.45} rate={0.8} dur={12} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene2: React.FC = () => {
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
      <ChapterTag frame={frame} />
      <Person frame={frame} />
      <EnergyBar frame={frame} />
      <Bubbles frame={frame} fps={fps} />
      <Chart frame={frame} fps={fps} />
      <Formula frame={frame} fps={fps} />
      <Cure frame={frame} fps={fps} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};