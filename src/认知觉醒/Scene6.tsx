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

export const SCENE6_DURATION = 690;

// ---------- 工具 ----------
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) => interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (frame: number, fps: number, damping = 12, stiffness = 150) =>
  spring({frame: Math.max(0, frame), fps, config: {damping, stiffness}});
const PASSIVE = '#6E7681';

// ---------- 时间轴（帧） ----------
const T = {
  layer0: 15,
  layerStep: 14,
  passive: 125,
  active: 150,
  pyrOut: [215, 235] as const,
  nodes0: 240,
  nodeStep: 2.6,
  forget: [300, 400] as const,
  newFly: [330, 360] as const,
  edge0: 360,
  waveStep: 14,
  edgeDur: 12,
  lost: [400, 470] as const,
  pulse: 480,
  netBack: [520, 550] as const,
  pen: 548,
  mic: 560,
  title: 578,
  flow: [600, 660] as const,
  end: [675, 690] as const,
};

// =====================================================================
// A. 学习金字塔
// =====================================================================
const LAYERS = [
  {label: '听讲', pct: 5, active: false},
  {label: '阅读', pct: 10, active: false},
  {label: '视听', pct: 20, active: false},
  {label: '演示', pct: 30, active: false},
  {label: '讨论', pct: 50, active: true},
  {label: '实践', pct: 75, active: true},
  {label: '教授他人', pct: 90, active: true},
];
const PYR = {cx: 960, top: 150, bot: 880, topW: 230, botW: 1240, gap: 8};
const LH = (PYR.bot - PYR.top) / LAYERS.length;
const wAt = (y: number) => PYR.topW + ((PYR.botW - PYR.topW) * (y - PYR.top)) / (PYR.bot - PYR.top);
const leftAt = (y: number) => PYR.cx - wAt(y) / 2;
const rightAt = (y: number) => PYR.cx + wAt(y) / 2;

const Pyramid: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const out = prog(frame, T.pyrOut[0], T.pyrOut[1], io);
  if (out >= 1) return null;
  const activeK = prog(frame, T.active, T.active + 20);
  const passK = prog(frame, T.passive, T.passive + 20);
  const breath = 0.5 + 0.5 * Math.sin((frame - T.active) / 9);

  // 括号
  const pY0 = PYR.top;
  const pY1 = PYR.top + LH * 4 - PYR.gap;
  const aY0 = PYR.top + LH * 4;
  const aY1 = PYR.bot - PYR.gap;
  const bracketL = `M ${leftAt(pY0) - 26} ${pY0} L ${leftAt(pY0) - 46} ${pY0} L ${leftAt(pY1) - 46} ${pY1} L ${leftAt(pY1) - 26} ${pY1}`;
  const bracketR = `M ${rightAt(aY0) + 26} ${aY0} L ${rightAt(aY0) + 46} ${aY0} L ${rightAt(aY1) + 46} ${aY1} L ${rightAt(aY1) + 26} ${aY1}`;

  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - 0.15 * out})`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {LAYERS.map((l, i) => {
          const at = T.layer0 + i * T.layerStep;
          const s = sp(frame - at, fps, 14, 160);
          if (s <= 0.001) return null;
          const y0 = PYR.top + i * LH;
          const y1 = y0 + LH - PYR.gap;
          const pts = `${leftAt(y0)},${y0} ${rightAt(y0)},${y0} ${rightAt(y1)},${y1} ${leftAt(y1)},${y1}`;
          const color = l.active ? C.reason : PASSIVE;
          const dimPassive = !l.active ? 1 - 0.45 * activeK : 1;
          const fillOp = l.active ? 0.25 + 0.35 * activeK * (0.7 + 0.3 * breath) : 0.35;
          return (
            <g key={i} opacity={s * dimPassive} transform={`translate(${PYR.cx} ${(y0 + y1) / 2}) scale(${0.6 + 0.4 * s} 1) translate(${-PYR.cx} ${-(y0 + y1) / 2})`}>
              <polygon
                points={pts}
                fill={color}
                fillOpacity={fillOp}
                stroke={color}
                strokeWidth={2.5}
                style={l.active && activeK > 0 ? {filter: `drop-shadow(0 0 ${14 * activeK}px ${C.reason})`} : undefined}
              />
            </g>
          );
        })}
        <path d={bracketL} fill="none" stroke={PASSIVE} strokeWidth={4} opacity={passK} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - passK} />
        <path d={bracketR} fill="none" stroke={C.reason} strokeWidth={4} opacity={activeK} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - activeK} />
      </svg>

      {/* 层内文字 */}
      {LAYERS.map((l, i) => {
        const at = T.layer0 + i * T.layerStep;
        const s = sp(frame - at, fps, 14, 160);
        const pct = Math.round(l.pct * prog(frame, at, at + 20));
        const y = PYR.top + i * LH + (LH - PYR.gap) / 2;
        const dimPassive = !l.active ? 1 - 0.45 * activeK : 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: PYR.cx - 300,
              width: 600,
              top: y - 26,
              textAlign: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: l.active ? '#E6F7FF' : C.text,
              opacity: s * dimPassive,
              whiteSpace: 'nowrap',
            }}
          >
            {l.label}
            <span style={{marginLeft: 18, color: l.active ? C.reason : C.dim, fontVariantNumeric: 'tabular-nums'}}>{pct}%</span>
          </div>
        );
      })}

      {/* 括号标签 */}
      <div
        style={{
          position: 'absolute',
          left: leftAt((pY0 + pY1) / 2) - 46 - 300 - 20,
          width: 300,
          top: (pY0 + pY1) / 2 - 26,
          textAlign: 'right',
          fontSize: 42,
          fontWeight: 700,
          color: PASSIVE,
          opacity: passK,
        }}
      >
        被动学习
      </div>
      <div
        style={{
          position: 'absolute',
          left: rightAt((aY0 + aY1) / 2) + 46 + 20,
          width: 300,
          top: (aY0 + aY1) / 2 - 26,
          fontSize: 42,
          fontWeight: 700,
          color: C.reason,
          opacity: activeK,
          textShadow: `0 0 18px ${C.reason}88`,
        }}
      >
        主动学习
      </div>
      <div style={{position: 'absolute', right: 60, bottom: 130, fontSize: 22, color: C.dim, opacity: passK * 0.8}}>
        * 学习金字塔为流行说法，数据仅供参考
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================
// B. 知识网络（模块级预计算：位置 + 连接顺序）
// =====================================================================
const CONCEPTS = [
  '三重大脑', '本能', '情绪', '理智', '焦虑', '耐心', '复利', '模糊', '清晰', '元认知', '计划',
  '复盘', '舒适区', '拉伸区', '刻意练习', '反馈', '专注', '心流', '阅读', '写作', '费曼', '记忆',
];
const NET_C = {x: 960, y: 520};

type Node = {x: number; y: number; label: string; appear: number; ph: number};
const NODES: Node[] = (() => {
  const out: Node[] = [];
  let tries = 0;
  while (out.length < CONCEPTS.length && tries < 5000) {
    const x = 220 + random(`nx${tries}`) * 1480;
    const y = 170 + random(`ny${tries}`) * 680;
    tries++;
    if (Math.hypot(x - NET_C.x, y - NET_C.y) < 150) continue;
    if (out.some((n) => Math.hypot(n.x - x, n.y - y) < 165)) continue;
    const i = out.length;
    out.push({x, y, label: CONCEPTS[i], appear: T.nodes0 + i * T.nodeStep, ph: random(`nph${i}`) * 6.28});
  }
  return out;
})();
const ROOT = -1; // 新知识节点
const posOf = (i: number) => (i === ROOT ? NET_C : NODES[i]);
const dist = (a: number, b: number) => Math.hypot(posOf(a).x - posOf(b).x, posOf(a).y - posOf(b).y);

// 离中心最远的 3 个节点：始终不被连接，最后被遗忘
const LOST = new Set(
  NODES.map((n, i) => ({i, d: Math.hypot(n.x - NET_C.x, n.y - NET_C.y)}))
    .sort((a, b) => b.d - a.d)
    .slice(0, 3)
    .map((o) => o.i),
);

type Edge = {a: number; b: number; start: number};
const {EDGES, LIT_AT} = (() => {
  const edges: Edge[] = [];
  const lit = new Map<number, number>();
  const visited = new Set<number>([ROOT]);
  let frontier = [ROOT];
  let wave = 0;
  const candidates = () => NODES.map((_, i) => i).filter((i) => !visited.has(i) && !LOST.has(i));

  while (frontier.length && candidates().length) {
    const next: number[] = [];
    frontier.forEach((src, j) => {
      const k = src === ROOT ? 3 : 2;
      const near = candidates()
        .sort((p, q) => dist(src, p) - dist(src, q))
        .filter((i) => dist(src, i) < 460)
        .slice(0, k);
      near.forEach((dst, m) => {
        const start = T.edge0 + wave * T.waveStep + (j + m) * 2;
        edges.push({a: src, b: dst, start});
        visited.add(dst);
        lit.set(dst, start + T.edgeDur);
        next.push(dst);
      });
    });
    frontier = next;
    wave++;
  }
  // 兜底：还没连上的节点，连到最近的已连接节点
  candidates().forEach((i, m) => {
    const nearest = [...visited].sort((p, q) => dist(i, p) - dist(i, q))[0];
    const start = T.edge0 + wave * T.waveStep + m * 3;
    edges.push({a: nearest, b: i, start});
    visited.add(i);
    lit.set(i, start + T.edgeDur);
  });
  // 交叉连线：让它看起来更像"网"
  const lastStart = Math.max(...edges.map((e) => e.start));
  const has = (a: number, b: number) => edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  let extra = 0;
  NODES.forEach((_, i) => {
    if (LOST.has(i)) return;
    NODES.forEach((__, j) => {
      if (j <= i || LOST.has(j) || has(i, j) || dist(i, j) > 270 || extra >= 10) return;
      edges.push({a: i, b: j, start: lastStart + 8 + extra * 3});
      extra++;
    });
  });
  lit.set(ROOT, T.newFly[1]);
  return {EDGES: edges, LIT_AT: lit};
})();

const Network: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.nodes0 - 2) return null;
  const back = prog(frame, T.netBack[0], T.netBack[1], io);
  const pulseK = frame >= T.pulse ? 0.5 + 0.5 * Math.sin((frame - T.pulse) / 8) : 0;
  const pulseOn = prog(frame, T.pulse, T.pulse + 15);
  const flowK = prog(frame, T.flow[0], T.flow[1]);

  // 新知识节点飞入
  const flyK = prog(frame, T.newFly[0], T.newFly[1], io);
  const rootX = lerp(-80, NET_C.x, flyK);
  const rootY = lerp(NET_C.y + 120, NET_C.y, flyK) - Math.sin(Math.PI * flyK) * 120;

  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${NET_C.x}px ${NET_C.y}px`,
        transform: `scale(${lerp(1, 0.75, back)}) translateY(${-40 * back}px)`,
        opacity: lerp(1, 0.4 + 0.4 * flowK, back),
        filter: back > 0 ? `blur(${2 * back * (1 - flowK)}px)` : undefined,
      }}
    >
      <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
        {/* 连线 */}
        {EDGES.map((e, k) => {
          const p = prog(frame, e.start, e.start + T.edgeDur);
          if (p <= 0) return null;
          const A = e.a === ROOT ? {x: rootX, y: rootY} : posOf(e.a);
          const B = posOf(e.b);
          return (
            <path
              key={k}
              d={`M ${A.x} ${A.y} L ${B.x} ${B.y}`}
              stroke={C.reason}
              strokeWidth={2.5 + 1.5 * pulseK * pulseOn}
              opacity={0.55 + 0.35 * pulseK * pulseOn}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - p}
              style={{filter: `drop-shadow(0 0 ${4 + 8 * pulseK * pulseOn}px ${C.reason})`}}
            />
          );
        })}

        {/* 旧知识点 */}
        {NODES.map((n, i) => {
          const s = sp(frame - n.appear, fps, 10, 170);
          if (s <= 0.001) return null;
          const litAt = LIT_AT.get(i);
          const litK = litAt !== undefined ? prog(frame, litAt, litAt + 8) : 0;
          const lost = LOST.has(i);
          const forgetK = prog(frame, T.forget[0], T.forget[1], Easing.linear);
          const flicker = 0.85 + 0.15 * Math.sin(frame * 0.9 + n.ph * 3);
          const fadedOp = lerp(0.8, 0.22, forgetK) * flicker;
          const lostOp = lost ? 1 - prog(frame, T.lost[0], T.lost[1]) : 1;
          const op = s * lostOp * lerp(fadedOp, 1, litK);
          const r = lerp(14, 18, litK) * (1 + 0.12 * pulseK * pulseOn * litK);
          const fill = litK > 0 ? C.reason : PASSIVE;
          const dx = Math.sin(frame / 30 + n.ph) * 4;
          const dy = Math.cos(frame / 36 + n.ph) * 4;
          return (
            <g key={i} opacity={op} transform={`translate(${n.x + dx} ${n.y + dy})`}>
              <circle r={r * 2} fill={fill} opacity={0.15 + 0.15 * litK} />
              <circle r={r} fill={fill} style={litK > 0 ? {filter: `drop-shadow(0 0 10px ${C.reason})`} : undefined} />
              <text y={r + 34} textAnchor="middle" fontSize={28} fontWeight={700} fill={litK > 0 ? C.text : C.dim}>
                {n.label}
              </text>
            </g>
          );
        })}

        {/* 新知识 */}
        {flyK > 0 && (
          <g transform={`translate(${rootX} ${rootY})`}>
            <circle r={60} fill={C.reason} opacity={0.18 + 0.1 * pulseK} />
            <circle r={30} fill={C.reason} style={{filter: `drop-shadow(0 0 18px ${C.reason})`}} />
            <text y={-48} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.text}>
              新知识
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// =====================================================================
// C. 输出
// =====================================================================
const PEN = {x: 780, y: 600};
const MIC = {x: 1140, y: 600};

const PenIcon: React.FC = () => (
  <g transform="rotate(35)">
    <rect x={-16} y={-90} width={32} height={140} rx={8} fill={C.reason} />
    <rect x={-16} y={-90} width={32} height={30} rx={8} fill="#E6EDF3" />
    <path d="M -16 50 L 0 90 L 16 50 Z" fill="#E6EDF3" />
    <path d="M -5 78 L 0 90 L 5 78 Z" fill="#0E1117" />
  </g>
);

const MicIcon: React.FC = () => (
  <g>
    <rect x={-32} y={-90} width={64} height={110} rx={32} fill={C.emotion} />
    {[-55, -35, -15].map((y) => (
      <line key={y} x1={-20} y1={y} x2={20} y2={y} stroke="#0E1117" strokeWidth={4} opacity={0.4} strokeLinecap="round" />
    ))}
    <path d="M -54 -10 Q -54 56 0 56 Q 54 56 54 -10" fill="none" stroke="#E6EDF3" strokeWidth={8} strokeLinecap="round" />
    <line x1={0} y1={56} x2={0} y2={86} stroke="#E6EDF3" strokeWidth={8} />
    <line x1={-34} y1={88} x2={34} y2={88} stroke="#E6EDF3" strokeWidth={8} strokeLinecap="round" />
  </g>
);

// 光点：从图标流回网络里的节点（目标坐标已换算到缩小后的网络）
const FLOW = Array.from({length: 36}, (_, i) => {
  const fromPen = i % 2 === 0;
  const candidates = NODES.map((_, k) => k).filter((k) => !LOST.has(k));
  const target = candidates[Math.floor(random(`ft${i}`) * candidates.length)];
  const n = NODES[target];
  return {
    from: fromPen ? PEN : MIC,
    to: {x: NET_C.x + (n.x - NET_C.x) * 0.75, y: NET_C.y + (n.y - NET_C.y) * 0.75 - 40 * 0.75},
    delay: random(`fd${i}`) * 40,
    color: fromPen ? C.reason : C.emotion,
  };
});

const Output: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < T.pen - 2) return null;
  const sPen = sp(frame - T.pen, fps, 9, 170);
  const sMic = sp(frame - T.mic, fps, 9, 170);
  const sTitle = sp(frame - T.title, fps, 12, 150);
  const bob = (k: number) => Math.sin(frame / 12 + k) * 5;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', overflow: 'visible'}}>
        {FLOW.map((p, i) => {
          const s = T.flow[0] + p.delay;
          const k = prog(frame, s, s + 22, io);
          if (k <= 0 || k >= 1) return null;
          const x = lerp(p.from.x, p.to.x, k);
          const y = lerp(p.from.y, p.to.y, k) - Math.sin(Math.PI * k) * 90;
          return <circle key={i} cx={x} cy={y} r={6} fill={p.color} style={{filter: `drop-shadow(0 0 8px ${p.color})`}} />;
        })}
        <g transform={`translate(${PEN.x} ${PEN.y + bob(0)}) scale(${sPen})`} style={{filter: `drop-shadow(0 0 20px ${C.reason}88)`}}>
          <PenIcon />
        </g>
        <g transform={`translate(${MIC.x} ${MIC.y + bob(1.5)}) scale(${sMic})`} style={{filter: `drop-shadow(0 0 20px ${C.emotion}88)`}}>
          <MicIcon />
        </g>
      </svg>
      <div style={{position: 'absolute', left: PEN.x - 150, width: 300, top: PEN.y + 120, textAlign: 'center', fontSize: 40, fontWeight: 700, color: C.reason, opacity: sPen}}>
        写出来
      </div>
      <div style={{position: 'absolute', left: MIC.x - 150, width: 300, top: MIC.y + 120, textAlign: 'center', fontSize: 40, fontWeight: 700, color: C.emotion, opacity: sMic}}>
        讲出来
      </div>
      <div
        style={{
          position: 'absolute',
          top: 250,
          width: '100%',
          textAlign: 'center',
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: 8,
          color: C.text,
          opacity: sTitle,
          transform: `scale(${0.7 + 0.3 * sTitle})`,
          textShadow: `0 0 30px ${C.reason}66`,
        }}
      >
        用<span style={{color: C.emotion}}>输出</span>倒逼<span style={{color: C.reason}}>输入</span>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================
// 字幕 / 章节标签
// =====================================================================
const CAPS: [number, number, React.ReactNode][] = [
  [10, 120, '同样学一小时，方式不同，记住的天差地别。'],
  [122, 230, <>被动地听和看，留下很少；<span style={{color: C.reason}}>讨论、实践、教别人</span>，才能真正记住。</>],
  [238, 330, '孤立的知识点，很快就会被遗忘。'],
  [332, 440, <>学习不是重复，而是<span style={{color: C.reason}}>关联</span>：把新知识连到旧知识上。</>],
  [442, 520, '连成网的知识，才会真正留下来。'],
  [525, 690, <>最好的学习方式，是<span style={{color: C.emotion}}>讲给别人听</span>：用输出倒逼输入。</>],
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
    学习力 · 深度学习
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
  <Sequence from={Math.round(from)} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`sfx/${src}`)} volume={vol} playbackRate={rate} />
  </Sequence>
);

const SoundTrack: React.FC = () => (
  <>
    <Audio
      src={staticFile('sfx/drone.wav')}
      loop
      volume={(f) => interpolate(f, [0, 30, SCENE6_DURATION - 20, SCENE6_DURATION], [0, 0.14, 0.14, 0], clamp)}
    />
    {/* A 金字塔：逐层木琴音，音高上升 */}
    {LAYERS.map((_, i) => (
      <Sfx key={`ly${i}`} from={T.layer0 + i * T.layerStep} src="block.wav" vol={0.45} rate={0.8 + i * 0.09} dur={20} />
    ))}
    <Sfx from={T.passive} src="whoosh.wav" vol={0.25} rate={1.6} dur={30} />
    <Sfx from={T.active} src="shimmer.wav" vol={0.35} dur={60} />
    {/* B 网络 */}
    {NODES.map((n, i) => (
      <Sfx key={`nd${i}`} from={n.appear} src="blip.wav" vol={0.18} rate={0.9 + (i % 5) * 0.08} dur={6} />
    ))}
    <Sfx from={T.forget[0]} src="forget.wav" vol={0.4} dur={90} />
    <Sfx from={T.newFly[0]} src="whoosh.wav" vol={0.4} dur={32} />
    <Sfx from={T.newFly[1]} src="ding.wav" vol={0.45} dur={45} />
    {EDGES.slice(0, 24).map((e, k) => (
      <Sfx key={`e${k}`} from={e.start} src="zap.wav" vol={0.2} rate={0.85 + (k % 6) * 0.07} dur={10} />
    ))}
    {[...LOST].map((_, k) => (
      <Sfx key={`lo${k}`} from={T.lost[0] + 20 + k * 12} src="drop.wav" vol={0.3} rate={0.9 + k * 0.1} dur={20} />
    ))}
    <Sfx from={T.pulse} src="pulse.wav" vol={0.5} dur={60} />
    {/* C 输出 */}
    <Sfx from={T.pen} src="pop.wav" vol={0.45} rate={0.9} dur={10} />
    <Sfx from={T.mic} src="pop.wav" vol={0.45} rate={1.1} dur={10} />
    <Sfx from={T.title} src="thud.wav" vol={0.55} dur={18} />
    <Sfx from={T.flow[0]} src="shimmer.wav" vol={0.35} dur={60} />
    <Sfx from={T.flow[1] - 10} src="resolve.wav" vol={0.4} dur={SCENE6_DURATION - T.flow[1] + 10} />
  </>
);

// =====================================================================
// 主场景
// =====================================================================
export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneOp = Math.min(prog(frame, 0, 12), 1 - prog(frame, T.end[0], T.end[1]));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 48%, #16202C 0%, ${C.bg} 65%)`,
        fontFamily: FONT,
        color: C.text,
        opacity: sceneOp,
      }}
    >
      <SoundTrack />
      <Pyramid frame={frame} fps={fps} />
      <Network frame={frame} fps={fps} />
      <Output frame={frame} fps={fps} />
      <ChapterTag frame={frame} />
      <Captions frame={frame} />
    </AbsoluteFill>
  );
};