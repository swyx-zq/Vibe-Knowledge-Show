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
import {BRAIN_PARTS, CEREB_FILL_PATH, CX, CY, PartKind, Pt} from './brain';

export const SCENE1_DURATION = 840;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (frame: number, fps: number, damping = 12, stiffness = 140) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});

// ---------- 时间轴（帧） ----------
const T = {
  axis: [0, 40] as const,
  dots: [30, 70, 110],
  zoomIn: [140, 190] as const,
  pct: 195,
  zoomOut: [235, 265] as const,
  tlFade: [262, 282] as const,
  fly: [268, 305] as const,
  layer: {instinct: 295, emotion: 355, reason: 415},
  brainOut: [540, 568] as const,
  tugIn: 560,
  rope: [585, 600] as const,
  pull: [600, 725] as const,
  release: 730,
  hop: [735, 765] as const,
  reins: [765, 785] as const,
  walk: [790, 830] as const,
  end: [826, 840] as const,
};

// =====================================================================
// A. 进化时间轴
// =====================================================================
const AX0 = 160;
const AX1 = 1760;
const AY = 600;
const yearX = (myr: number) => AX1 - (myr / 360) * (AX1 - AX0); // 百万年 → x
const FOC = yearX(1.25); // 放大焦点：理智脑那一小段的中点
const ZOOM = 60;

const DOTS = [
  {x: yearX(360), color: C.instinct, when: '3.6 亿年前', name: '本能脑', sub: '爬行动物', r: 13},
  {x: yearX(200), color: C.emotion, when: '2 亿年前', name: '情绪脑', sub: '哺乳动物', r: 13},
  {x: yearX(2.5), color: C.reason, when: '250 万年前', name: '理智脑', sub: '人类', r: 7},
];
const TICKS = [300, 250, 200, 150, 100, 50];

const Timeline: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const z = prog(frame, T.zoomIn[0], T.zoomIn[1], io) * (1 - prog(frame, T.zoomOut[0], T.zoomOut[1], io));
  const s = Math.pow(ZOOM, z);
  const F = lerp(FOC, 960, z);
  const X = (x: number) => F + (x - FOC) * s;

  const axisP = prog(frame, T.axis[0], T.axis[1], io);
  const axEnd = lerp(AX0, AX1, axisP);
  const op = 1 - prog(frame, T.tlFade[0], T.tlFade[1]);
  const pctOp = prog(frame, T.pct, T.pct + 15) * (1 - prog(frame, T.zoomOut[0], T.zoomOut[0] + 12));
  const dotsVisible = frame < T.fly[0];
  if (op <= 0) return null;

  const a = X(DOTS[2].x);
  const b = X(AX1);

  return (
    <AbsoluteFill style={{opacity: op}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <line x1={X(AX0)} y1={AY} x2={X(axEnd)} y2={AY} stroke={C.dim} strokeWidth={4} strokeLinecap="round" />
        {axisP > 0.98 && <path d={`M ${X(AX1) + 6} ${AY} l -20 -11 l 0 22 z`} fill={C.dim} />}
        {TICKS.map((m) => {
          const x = yearX(m);
          if (x > axEnd) return null;
          return <line key={m} x1={X(x)} y1={AY - 10} x2={X(x)} y2={AY + 10} stroke={C.dim} strokeWidth={2} opacity={0.6} />;
        })}

        {/* 0.7% 高亮括号 */}
        {pctOp > 0 && (
          <g opacity={pctOp}>
            <rect x={a} y={AY - 7} width={b - a} height={14} fill={C.reason} opacity={0.35} />
            <path
              d={`M ${a} ${AY - 110} L ${a} ${AY - 130} L ${b} ${AY - 130} L ${b} ${AY - 110}`}
              stroke={C.reason}
              strokeWidth={4}
              fill="none"
            />
          </g>
        )}

        {/* 三个时间点 */}
        {dotsVisible &&
          DOTS.map((d, i) => {
            const k = sp(frame - T.dots[i], fps, 9, 170);
            const r = d.r * (i === 2 ? lerp(1, 2, z) : 1) * k;
            return (
              <g key={i}>
                <circle cx={X(d.x)} cy={AY} r={r * 2.3} fill={d.color} opacity={0.18 * k} />
                <circle cx={X(d.x)} cy={AY} r={r} fill={d.color} />
              </g>
            );
          })}

        {/* 理智脑的引线（标签在点的上方） */}
        {dotsVisible && (
          <line
            x1={X(DOTS[2].x)}
            y1={AY - 16}
            x2={Math.min(X(DOTS[2].x), 1640)}
            y2={AY - 62}
            stroke={C.reason}
            strokeWidth={2}
            opacity={sp(frame - T.dots[2], fps) * (1 - pctOp)}
          />
        )}
      </svg>

      {/* 本能脑 / 情绪脑的标签：上方写年代，下方写名称 */}
      {DOTS.slice(0, 2).map((d, i) => {
        const k = sp(frame - T.dots[i], fps);
        return (
          <React.Fragment key={i}>
            <Label x={X(d.x)} top={AY - 92} op={k}>
              <span style={{fontSize: 34, color: C.dim}}>{d.when}</span>
            </Label>
            <Label x={X(d.x)} top={AY + 34} op={k}>
              <span style={{fontSize: 46, fontWeight: 700, color: d.color}}>{d.name}</span>
              <span style={{fontSize: 30, color: C.dim, marginLeft: 12}}>{d.sub}</span>
            </Label>
          </React.Fragment>
        );
      })}

      {/* 理智脑的标签：都放在上方，避免和"今天"重叠 */}
      {(() => {
        const k = sp(frame - T.dots[2], fps);
        const x = Math.min(X(DOTS[2].x), 1640);
        return (
          <Label x={x} top={AY - 170} op={k * (1 - pctOp)}>
            <div style={{fontSize: 34, color: C.dim}}>{DOTS[2].when}</div>
            <div>
              <span style={{fontSize: 46, fontWeight: 700, color: C.reason}}>{DOTS[2].name}</span>
              <span style={{fontSize: 30, color: C.dim, marginLeft: 12}}>{DOTS[2].sub}</span>
            </div>
          </Label>
        );
      })()}

      <Label x={Math.min(X(AX1), 1830)} top={AY + 34} op={prog(frame, 36, 50)}>
        <span style={{fontSize: 34, color: C.text}}>今天</span>
      </Label>

      {/* 放大后的比例说明 */}
      <Label x={(a + b) / 2} top={AY - 250} op={pctOp}>
        <span style={{fontSize: 52, color: C.text}}>250 万年 ≈ 进化史的 </span>
        <span style={{fontSize: 84, fontWeight: 700, color: C.reason}}>0.7%</span>
      </Label>
    </AbsoluteFill>
  );
};

const Label: React.FC<{x: number; top: number; op: number; children: React.ReactNode}> = ({x, top, op, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 400,
      width: 800,
      top,
      textAlign: 'center',
      opacity: op,
      transform: `translateY(${(1 - Math.min(1, op)) * 16}px)`,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

// =====================================================================
// B. 三层大脑
// =====================================================================
const BX = -300; // 大脑整体左移，右侧留给说明卡
const BY = 80;
const abs = (dx: number, dy: number): Pt => ({x: CX + dx + BX, y: CY + dy + BY});
const ANCH = {
  instinct: abs(205, 180), // 小脑
  emotion: abs(160, 15),   // 边缘系统环的后端
  reason: abs(170, -165),  // 顶叶皮层
};

// 边缘系统：C 形环（扣带回 → 海马），末端是杏仁核
const LIMBIC: Pt[] = Array.from({length: 81}, (_, i) => {
  const th = ((160 + (300 * i) / 80) * Math.PI) / 180;
  return {x: CX + 20 + 140 * Math.cos(th), y: CY + 15 + 90 * Math.sin(th)};
});
const LIMBIC_D = 'M ' + LIMBIC.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
const AMY = LIMBIC[LIMBIC.length - 1];

type Layer = 'instinct' | 'reason';
const LAYER_OF: Record<PartKind, Layer> = {
  outline: 'reason',
  major: 'reason',
  minor: 'reason',
  cereb: 'instinct',
  folia: 'instinct',
  stem: 'instinct',
};
const SW: Record<PartKind, number> = {outline: 3.6, major: 2.4, minor: 1.6, cereb: 3, folia: 1.5, stem: 3};
const SO: Record<PartKind, number> = {outline: 1, major: 0.75, minor: 0.45, cereb: 0.95, folia: 0.6, stem: 0.9};

const Brain: React.FC<{frame: number}> = ({frame}) => {
  const op = 1 - prog(frame, T.brainOut[0], T.brainOut[1]);
  if (frame < T.layer.instinct - 2 || op <= 0) return null;

  const pI = prog(frame, T.layer.instinct, T.layer.instinct + 25);
  const pE = prog(frame, T.layer.emotion, T.layer.emotion + 30, io);
  const pR = prog(frame, T.layer.reason, T.layer.reason + 30);
  const breathT = T.layer.reason + 60;
  const breath = frame > breathT ? Math.sin((frame - breathT) / 10) : 0;
  const counters: Record<Layer, number> = {instinct: 0, reason: 0};

  return (
    <svg
      width={1920}
      height={1080}
      style={{position: 'absolute', opacity: op, filter: `drop-shadow(0 0 ${6 + 4 * breath}px rgba(79,195,247,0.45))`}}
    >
      <defs>
        <radialGradient id="s1Fill" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor={C.reason} stopOpacity={0.14} />
          <stop offset="100%" stopColor={C.reason} stopOpacity={0.03} />
        </radialGradient>
        <linearGradient id="s1StemFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="s1StemMask" maskUnits="userSpaceOnUse">
          <rect x={CX} y={CY + 150} width={200} height={160} fill="url(#s1StemFade)" />
        </mask>
      </defs>

      <g transform={`translate(${BX} ${BY})`}>
        <g transform={`translate(${CX} ${CY}) scale(${1 + 0.01 * breath}) translate(${-CX} ${-CY})`}>
          {/* 填充 */}
          <path d={BRAIN_PARTS[0].d} fill="url(#s1Fill)" opacity={pR} />
          <path d={CEREB_FILL_PATH} fill={C.instinct} opacity={0.18 * pI} />

          {/* 情绪脑：边缘系统 */}
          <path
            d={LIMBIC_D}
            fill="none"
            stroke={C.emotion}
            strokeWidth={22}
            strokeLinecap="round"
            opacity={0.28}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - pE}
          />
          <path
            d={LIMBIC_D}
            fill="none"
            stroke={C.emotion}
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.95}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - pE}
          />
          <ellipse
            cx={AMY.x - 6}
            cy={AMY.y}
            rx={18}
            ry={13}
            fill={C.emotion}
            opacity={0.85 * prog(frame, T.layer.emotion + 26, T.layer.emotion + 36)}
          />

          {/* 本能脑 + 理智脑线条 */}
          {BRAIN_PARTS.map((p, i) => {
            const layer = LAYER_OF[p.kind];
            const idx = counters[layer]++;
            const start = layer === 'instinct' ? T.layer.instinct + idx * 2 : T.layer.reason + idx * 0.8;
            const pr = prog(frame, start, start + (p.kind === 'outline' ? 30 : 18));
            if (pr <= 0) return null;
            return (
              <path
                key={i}
                d={p.d}
                fill="none"
                stroke={layer === 'instinct' ? C.instinct : C.reason}
                strokeWidth={SW[p.kind]}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={SO[p.kind]}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - pr}
                mask={p.kind === 'stem' ? 'url(#s1StemMask)' : undefined}
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
};

// ---------- 飞入的三个点（时间轴 → 大脑） ----------
const FLY_TO = [ANCH.instinct, ANCH.emotion, ANCH.reason];

const FlyingDots: React.FC<{frame: number}> = ({frame}) => {
  if (frame < T.fly[0]) return null;
  const op = 1 - prog(frame, T.brainOut[0], T.brainOut[1]);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', opacity: op}}>
      {DOTS.map((d, i) => {
        const k = prog(frame, T.fly[0] + i * 4, T.fly[1] + i * 4, io);
        const to = FLY_TO[i];
        const x = lerp(d.x, to.x, k);
        const y = lerp(AY, to.y, k) - Math.sin(Math.PI * k) * 160;
        const pulse = k >= 1 ? 1 + 0.25 * Math.sin(frame / 6 + i) : 1;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={22 * pulse} fill={d.color} opacity={0.2} />
            <circle cx={x} cy={y} r={10} fill={d.color} />
          </g>
        );
      })}
    </svg>
  );
};

// ---------- 说明卡 ----------
const CARD_X = 1180;
const CARD_W = 560;
const CARD_H = 150;
const CARDS = [
  {color: C.reason, title: '理智脑', tag: '新皮层 · 250 万年', desc: '思考 · 规划 · 自控', y: 190, at: T.layer.reason + 20, anchor: ANCH.reason},
  {color: C.emotion, title: '情绪脑', tag: '边缘系统 · 2 亿年', desc: '趋乐 · 避苦 · 好恶', y: 400, at: T.layer.emotion + 20, anchor: ANCH.emotion},
  {color: C.instinct, title: '本能脑', tag: '脑干 · 小脑 · 3.6 亿年', desc: '生存 · 避险 · 本能', y: 610, at: T.layer.instinct + 20, anchor: ANCH.instinct},
];

const Cards: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const op = 1 - prog(frame, T.brainOut[0], T.brainOut[1]);
  if (frame < T.layer.instinct || op <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: op}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {CARDS.map((c, i) => {
          const lp = prog(frame, c.at - 10, c.at + 8);
          const ty = c.y + CARD_H / 2;
          const d = `M ${c.anchor.x} ${c.anchor.y} L ${c.anchor.x + 70} ${ty} L ${CARD_X - 16} ${ty}`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={c.color}
              strokeWidth={2.5}
              opacity={0.8}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - lp}
            />
          );
        })}
      </svg>
      {CARDS.map((c, i) => {
        const k = sp(frame - c.at, fps, 14, 150);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: CARD_X,
              top: c.y,
              width: CARD_W,
              height: CARD_H,
              boxSizing: 'border-box',
              padding: '18px 28px',
              borderRadius: 18,
              background: 'rgba(22,27,34,0.85)',
              border: `2px solid ${c.color}`,
              boxShadow: `0 0 28px ${c.color}33`,
              opacity: k,
              transform: `translateX(${(1 - k) * 60}px)`,
            }}
          >
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
              <span style={{fontSize: 52, fontWeight: 700, color: c.color}}>{c.title}</span>
              <span style={{fontSize: 28, color: C.dim}}>{c.tag}</span>
            </div>
            <div style={{fontSize: 36, color: C.text, marginTop: 10, letterSpacing: 2}}>{c.desc}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// =====================================================================
// C. 拔河 → 驾驭
// =====================================================================
const GY = 800; // 地面
const BLK = {
  instinct: {x: 260, w: 250},
  emotion: {x: 530, w: 210},
  reason: {x: 1180, w: 110},
};

const Block: React.FC<{
  x: number;
  bottom: number;
  w: number;
  color: string;
  label: string;
  lean?: number;
  squash?: number;
  glow?: number;
  drop?: number;
}> = ({x, bottom, w, color, label, lean = 0, squash = 1, glow = 0, drop = 0}) => {
  const h = w * squash;
  const ww = w * (2 - squash);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - (ww - w) / 2,
        top: bottom - h - drop,
        width: ww,
        height: h,
        borderRadius: w * 0.14,
        background: `linear-gradient(160deg, ${color}, ${color}B3)`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 ${40 * glow}px ${color}`,
        transform: `rotate(${lean}deg)`,
        transformOrigin: '50% 100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 眼睛 */}
      <div style={{display: 'flex', gap: w * 0.18, marginBottom: w * 0.06}}>
        {[0, 1].map((k) => (
          <div key={k} style={{width: w * 0.09, height: w * 0.09, borderRadius: '50%', background: '#0E1117'}} />
        ))}
      </div>
      <div style={{fontSize: Math.max(26, w * 0.17), fontWeight: 700, color: '#0E1117'}}>{label}</div>
    </div>
  );
};

const TugOfWar: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.tugIn) return null;

  // 方块入场（从下往上弹出）
  const sI = sp(frame - T.tugIn, fps, 11, 130);
  const sE = sp(frame - T.tugIn - 10, fps, 11, 130);
  const sR = sp(frame - T.tugIn - 20, fps, 11, 130);

  // 拔河
  const pullP = prog(frame, T.pull[0], T.pull[1], Easing.inOut(Easing.quad));
  const pulling = frame >= T.pull[0] && frame < T.release;
  const wob = pulling ? Math.sin((frame - T.pull[0]) / 3.5) * 5 * (1 - pullP * 0.5) : 0;
  const u = -180 * pullP + wob;

  // 一起前进
  const walkP = prog(frame, T.walk[0], T.walk[1], io);
  const walking = frame >= T.walk[0] && frame <= T.walk[1];
  const bob = walking ? Math.abs(Math.sin((frame - T.walk[0]) / 4)) * 10 : 0;
  const groupX = u + 200 * walkP;

  const ropeOp = (1 - prog(frame, T.release, T.release + 12)) * prog(frame, T.rope[0], T.rope[1]);
  const ropeDraw = prog(frame, T.rope[0], T.rope[1]);
  const tension = prog(frame, T.pull[0], T.pull[0] + 12);
  const leanL = -6 * pullP * (1 - prog(frame, T.release, T.release + 10));
  const leanR = 10 * prog(frame, T.pull[0], T.pull[0] + 20) * (1 - prog(frame, T.release, T.release + 6));

  // 理智脑跳上去
  const hopP = prog(frame, T.hop[0], T.hop[1], Easing.inOut(Easing.quad));
  const rX = lerp(BLK.reason.x, BLK.instinct.x + 70, hopP);
  const rBottom = lerp(GY, GY - BLK.instinct.w, hopP) - Math.sin(Math.PI * hopP) * 220;
  const landT = frame - T.hop[1];
  const squash = landT >= 0 && landT < 10 ? 1 - 0.2 * Math.sin((Math.PI * landT) / 10) : 1;
  const reinsP = prog(frame, T.reins[0], T.reins[1]);
  const glow = prog(frame, T.reins[1], T.reins[1] + 20);
  const jiaS = sp(frame - T.reins[0], fps, 9, 160);

  // 绳子（局部坐标）
  const L = {x: BLK.emotion.x + BLK.emotion.w, y: GY - 90};
  const R = {x: BLK.reason.x, y: GY - 55};
  const sag = 40 * (1 - tension);
  const ctrl = {x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 + sag};
  const mid = {x: 0.25 * L.x + 0.5 * ctrl.x + 0.25 * R.x, y: 0.25 * L.y + 0.5 * ctrl.y + 0.25 * R.y};

  // 缰绳
  const reinFrom = {x: rX + 12, y: rBottom - 60};
  const reinTo = {x: BLK.instinct.x - 4, y: GY - 170};

  const tagOp = sR * (1 - prog(frame, T.release, T.release + 12));
  const leftCenter = (BLK.instinct.x + BLK.emotion.x + BLK.emotion.w) / 2;

  return (
    <AbsoluteFill>
      {/* 地面 + 中线（不随人物移动） */}
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <line x1={0} y1={GY} x2={1920} y2={GY} stroke="#30363D" strokeWidth={3} opacity={sI} />
        <line
          x1={960}
          y1={GY - 280}
          x2={960}
          y2={GY + 20}
          stroke={C.dim}
          strokeWidth={2}
          strokeDasharray="10 10"
          opacity={ropeOp * 0.7}
        />
      </svg>
      <div style={{position: 'absolute', left: 900, width: 120, top: GY + 24, textAlign: 'center', fontSize: 26, color: C.dim, opacity: ropeOp}}>
        中线
      </div>

      {/* 可移动的一组 */}
      <AbsoluteFill style={{transform: `translate(${groupX}px, ${-bob}px)`}}>
        {/* 绳子 + 红旗 */}
        <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
          <path
            d={`M ${L.x} ${L.y} Q ${ctrl.x} ${ctrl.y} ${R.x} ${R.y}`}
            fill="none"
            stroke="#C9A36B"
            strokeWidth={7}
            strokeLinecap="round"
            opacity={ropeOp}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ropeDraw}
          />
          <g opacity={ropeOp} transform={`translate(${mid.x} ${mid.y})`}>
            <line x1={0} y1={0} x2={0} y2={44} stroke="#fff" strokeWidth={3} />
            <path d="M 0 8 L 30 18 L 0 30 Z" fill="#E5484D" />
          </g>

          {/* 尘土 */}
          {pulling &&
            Array.from({length: 14}, (_, j) => {
              const age = frame - (T.pull[0] + j * 9);
              if (age < 0 || age > 22) return null;
              return (
                <circle
                  key={j}
                  cx={BLK.reason.x + BLK.reason.w + age * 2.6 + random(`dx${j}`) * 20}
                  cy={GY - 6 - age * 1.3 - random(`dy${j}`) * 10}
                  r={4 + random(`dr${j}`) * 5}
                  fill={C.dim}
                  opacity={(1 - age / 22) * 0.5}
                />
              );
            })}

          {/* 缰绳 */}
          {reinsP > 0 && (
            <path
              d={`M ${reinFrom.x} ${reinFrom.y} Q ${(reinFrom.x + reinTo.x) / 2 - 30} ${reinTo.y - 10} ${reinTo.x} ${reinTo.y}`}
              fill="none"
              stroke={C.reason}
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - reinsP}
            />
          )}
        </svg>

        {/* 方块角色 */}
        <Block x={BLK.instinct.x} bottom={GY} w={BLK.instinct.w} color={C.instinct} label="本能脑" lean={leanL} glow={glow} drop={(1 - sI) * -500} />
        <Block x={BLK.emotion.x} bottom={GY} w={BLK.emotion.w} color={C.emotion} label="情绪脑" lean={leanL} glow={glow} drop={(1 - sE) * -500} />
        <Block
          x={rX}
          bottom={rBottom}
          w={BLK.reason.w}
          color={C.reason}
          label="理智脑"
          lean={leanR}
          squash={squash}
          glow={glow * 1.4}
          drop={(1 - sR) * -500}
        />

        {/* 欲望标签 */}
        <div style={{position: 'absolute', left: leftCenter - 200, width: 400, top: GY - 340, textAlign: 'center', fontSize: 44, fontWeight: 700, color: C.instinct, opacity: tagOp}}>
          想刷手机
        </div>
        <div style={{position: 'absolute', left: BLK.reason.x + 55 - 200, width: 400, top: GY - 200, textAlign: 'center', fontSize: 44, fontWeight: 700, color: C.reason, opacity: tagOp}}>
          想学习
        </div>
        <div style={{position: 'absolute', left: leftCenter - 250, width: 500, top: GY + 30, textAlign: 'center', fontSize: 30, color: C.dim, opacity: tagOp}}>
          快 · 自动 · 省能量
        </div>
        <div style={{position: 'absolute', left: BLK.reason.x + 55 - 250, width: 500, top: GY + 30, textAlign: 'center', fontSize: 30, color: C.dim, opacity: tagOp}}>
          慢 · 耗能 · 易疲劳
        </div>

        {/* 驾驭 */}
        <div
          style={{
            position: 'absolute',
            left: BLK.instinct.x + 125 - 200,
            width: 400,
            top: GY - BLK.instinct.w - BLK.reason.w - 120,
            textAlign: 'center',
            fontSize: 76,
            fontWeight: 700,
            color: C.emotion,
            textShadow: `0 0 30px ${C.emotion}88`,
            opacity: jiaS,
            transform: `scale(${0.6 + 0.4 * jiaS})`,
          }}
        >
          驾驭
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================
// 字幕 / 章节标签 / 音效
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [20, 228, '人有三重大脑，它们的进化时间相差上亿年。'],
  [232, 292, <>理智脑最"年轻"，只占进化史的 <b style={{color: C.reason}}>0.7%</b>。</>],
  [300, 540, '本能脑管生存，情绪脑管好恶，理智脑管思考。'],
  [
    592,
    728,
    <>
      理智脑力量最弱，所以<span style={{color: C.reason}}>"想学习"</span>总是拉不过
      <span style={{color: C.instinct}}>"想刷手机"</span>。
    </>,
  ],
  [736, 840, <>成长的关键：让理智脑<span style={{color: C.emotion}}>驾驭</span>本能和情绪，而不是硬碰硬。</>],
];

const Captions: React.FC<{frame: number}> = ({frame}) => (
  <>
    {CAPS.map(([a, b, text], i) => {
      const op = Math.min(prog(frame, a, a + 8), 1 - prog(frame, b - 8, b));
      if (op <= 0) return null;
      return (
        <div key={i} style={{position: 'absolute', bottom: 50, width: '100%', display: 'flex', justifyContent: 'center', opacity: op}}>
          <div style={{fontSize: 46, color: C.text, background: 'rgba(0,0,0,0.5)', padding: '10px 28px', borderRadius: 10}}>{text}</div>
        </div>
      );
    })}
  </>
);

const ChapterTag: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', left: 60, top: 44, fontSize: 30, color: C.dim, letterSpacing: 2, opacity: prog(frame, 0, 20)}}>
    <span style={{color: C.reason, fontWeight: 700, marginRight: 14}}>01</span>
    大脑 · 一切问题的起源
  </div>
);

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
      volume={(f) => interpolate(f, [0, 30, SCENE1_DURATION - 30, SCENE1_DURATION], [0, 0.2, 0.2, 0], clamp)}
    />
    {/* A 时间轴 */}
    <Sfx from={0} src="whoosh.wav" vol={0.3} rate={1.4} dur={45} />
    <Sfx from={T.dots[0]} src="pop.wav" vol={0.5} rate={0.8} dur={10} />
    <Sfx from={T.dots[1]} src="pop.wav" vol={0.5} rate={1.0} dur={10} />
    <Sfx from={T.dots[2]} src="pop.wav" vol={0.5} rate={1.3} dur={10} />
    <Sfx from={T.zoomIn[0] - 2} src="riser.wav" vol={0.5} dur={55} />
    <Sfx from={T.pct} src="ding.wav" vol={0.5} dur={60} />
    <Sfx from={T.zoomOut[0]} src="fall.wav" vol={0.45} dur={32} />
    <Sfx from={T.fly[0] - 2} src="whoosh.wav" vol={0.55} dur={55} />
    {/* B 三层大脑 */}
    <Sfx from={T.layer.instinct} src="tone-low.wav" vol={0.7} dur={66} />
    <Sfx from={T.layer.emotion} src="tone-mid.wav" vol={0.6} dur={60} />
    <Sfx from={T.layer.reason} src="tone-high.wav" vol={0.55} dur={60} />
    <Sfx from={T.layer.reason + 3} src="shimmer.wav" vol={0.3} dur={66} />
    {CARDS.map((c, i) => (
      <Sfx key={i} from={c.at} src="pop.wav" vol={0.3} rate={1.2} dur={10} />
    ))}
    {/* C 拔河 → 驾驭 */}
    <Sfx from={T.tugIn + 8} src="thud.wav" vol={0.8} rate={0.8} dur={18} />
    <Sfx from={T.tugIn + 18} src="thud.wav" vol={0.7} rate={0.9} dur={18} />
    <Sfx from={T.tugIn + 28} src="thud.wav" vol={0.45} rate={1.3} dur={18} />
    <Sfx from={T.pull[0]} src="strain.wav" vol={0.5} dur={T.release - T.pull[0]} />
    <Sfx from={T.hop[0]} src="hop.wav" vol={0.6} dur={12} />
    <Sfx from={T.hop[1]} src="thud.wav" vol={0.6} rate={1.2} dur={18} />
    <Sfx from={T.reins[0] + 5} src="resolve.wav" vol={0.5} dur={SCENE1_DURATION - T.reins[0] - 5} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneOp = 1 - prog(frame, T.end[0], T.end[1]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #16202C 0%, ${C.bg} 65%)`,
        fontFamily: FONT,
        color: C.text,
        opacity: sceneOp,
      }}
    >
      <SoundTrack />
      <ChapterTag frame={frame} />
      <Timeline frame={frame} fps={fps} />
      <Brain frame={frame} />
      <FlyingDots frame={frame} />
      <Cards frame={frame} fps={fps} />
      <TugOfWar frame={frame} fps={fps} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};