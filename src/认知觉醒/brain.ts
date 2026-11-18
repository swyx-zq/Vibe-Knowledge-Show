// 人脑左侧视图（额叶朝左、枕叶朝右），纯数学生成，不依赖外部素材
export type Pt = {x: number; y: number};
export type PartKind = 'outline' | 'major' | 'minor' | 'cereb' | 'folia' | 'stem';
export type Part = {kind: PartKind; d: string; pts: Pt[]; closed?: boolean};

export const CX = 960;
export const CY = 360;

// ---------- 确定性随机数（保证每帧一致） ----------
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};

type R = [number, number];
const P = ([x, y]: R): Pt => ({x: CX + x, y: CY + y});

const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, n: number): Pt[] =>
  Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
  });

// 由多段三次贝塞尔拼成一条折线（相对坐标）
const chain = (start: R, segs: [R, R, R][], nPer = 24): Pt[] => {
  const out: Pt[] = [];
  let cur = P(start);
  segs.forEach(([c1, c2, e], i) => {
    const pts = cubic(cur, P(c1), P(c2), P(e), nPer);
    out.push(...(i === 0 ? pts : pts.slice(1)));
    cur = P(e);
  });
  return out;
};

// 沿法线方向加入有机抖动，模拟沟回的弯曲（两端固定）
const wiggle = (pts: Pt[], amp: number, waves: number, seed: string, pin = true): Pt[] => {
  const n = pts.length;
  const ph1 = hash(seed) * Math.PI * 2;
  const ph2 = hash(seed + '#') * Math.PI * 2;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / L;
    const ny = (b.x - a.x) / L;
    const t = i / (n - 1);
    const taper = pin ? Math.sqrt(Math.sin(Math.PI * t)) : 1;
    const o =
      amp * taper * (Math.sin(t * waves * 2 * Math.PI + ph1) + 0.45 * Math.sin(t * waves * 4.7 * Math.PI + ph2));
    return {x: p.x + nx * o, y: p.y + ny * o};
  });
};

const lerpPts = (A: Pt[], B: Pt[], f: number): Pt[] =>
  A.map((a, i) => ({x: a.x + (B[i].x - a.x) * f, y: a.y + (B[i].y - a.y) * f}));

const toPath = (pts: Pt[], close = false) =>
  'M ' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') + (close ? ' Z' : '');

// ---------- 1. 大脑外轮廓（端脑） ----------
const outlineRaw = chain(
  [-318, 12], // 额极
  [
    [[-336, -105], [-258, -198], [-135, -214]], // 额叶上缘
    [[-20, -232], [118, -222], [212, -170]],    // 顶叶上缘
    [[292, -124], [334, -40], [320, 38]],       // 枕极
    [[312, 86], [282, 110], [242, 116]],        // 枕叶下缘
    [[190, 121], [142, 127], [100, 141]],       // 颞叶后下缘
    [[40, 166], [-62, 172], [-122, 152]],       // 颞叶下缘
    [[-172, 136], [-206, 108], [-204, 76]],     // 颞极
    [[-202, 58], [-190, 48], [-180, 46]],       // 外侧裂起点（颞极与额叶之间的凹口）
    [[-232, 56], [-292, 50], [-318, 12]],       // 额叶眶面
  ],
  30,
);
const OUTLINE = wiggle(outlineRaw, 2.2, 34, 'outline', false);

// ---------- 2. 主要沟裂 ----------
type SulcusDef = {start: R; segs: [R, R, R][]; amp: number; waves: number; n?: number};
const MAJOR: Record<string, SulcusDef> = {
  // 外侧裂（Sylvian fissure）+ 后升支
  lateral: {start: [-180, 46], segs: [[[-110, 16], [10, -20], [120, -50]], [[136, -60], [146, -74], [150, -92]]], amp: 3.5, waves: 3},
  // 中央沟（Rolandic）：分开额叶与顶叶
  central: {start: [-4, -227], segs: [[[6, -168], [-46, -118], [-40, -24]]], amp: 7, waves: 3.5},
  precentral: {start: [-76, -219], segs: [[[-70, -160], [-112, -108], [-106, -2]]], amp: 6, waves: 3},
  postcentral: {start: [66, -222], segs: [[[72, -168], [34, -110], [44, -56]]], amp: 6, waves: 3},
  supFrontal: {start: [-96, -150], segs: [[[-150, -162], [-212, -142], [-266, -124]]], amp: 5, waves: 2.6},
  infFrontal: {start: [-108, -76], segs: [[[-162, -82], [-222, -60], [-282, -42]]], amp: 5, waves: 2.4},
  // 颞上沟（末端上翘进入角回）
  supTemporal: {start: [-176, 84], segs: [[[-90, 64], [40, 26], [176, -18]], [[196, -30], [206, -46], [204, -66]]], amp: 4, waves: 3},
  infTemporal: {start: [-128, 122], segs: [[[-60, 120], [60, 98], [182, 70]]], amp: 4, waves: 3},
  intraparietal: {start: [52, -132], segs: [[[100, -142], [172, -122], [242, -86]]], amp: 5, waves: 2.5},
  transOccipital: {start: [286, -36], segs: [[[270, -8], [282, 30], [268, 62]]], amp: 4, waves: 2},
};

// ---------- 3. 次级沟回（让表面看起来"皱"） ----------
const MINOR: SulcusDef[] = [
  {start: [-150, 30], segs: [[[-168, 22], [-186, 14], [-206, 8]]], amp: 2, waves: 1.5},     // 外侧裂前水平支
  {start: [-138, 26], segs: [[[-136, 10], [-130, -4], [-128, -20]]], amp: 2, waves: 1.2},    // 外侧裂前升支
  {start: [-182, -196], segs: [[[-170, -186], [-160, -180], [-146, -184]]], amp: 2, waves: 1.5},
  {start: [-292, -96], segs: [[[-286, -84], [-280, -70], [-268, -60]]], amp: 2, waves: 1.5},
  {start: [-200, -100], segs: [[[-186, -108], [-170, -104], [-156, -110]]], amp: 2.5, waves: 1.8},
  {start: [-236, -12], segs: [[[-222, -20], [-206, -18], [-190, -26]]], amp: 2, waves: 1.6},
  {start: [112, -192], segs: [[[126, -186], [140, -176], [152, -168]]], amp: 2, waves: 1.5},
  {start: [150, -58], segs: [[[162, -50], [176, -44], [192, -38]]], amp: 2, waves: 1.5},
  {start: [222, 18], segs: [[[236, 12], [248, 4], [262, -2]]], amp: 2, waves: 1.5},
  {start: [250, -150], segs: [[[248, -130], [262, -112], [258, -96]]], amp: 2.5, waves: 1.5},
  {start: [-60, 104], segs: [[[-46, 106], [-32, 104], [-18, 110]]], amp: 2, waves: 1.4},
  {start: [62, 66], segs: [[[72, 72], [82, 80], [94, 84]]], amp: 2, waves: 1.4},
  {start: [-30, -190], segs: [[[-28, -176], [-36, -166], [-34, -152]]], amp: 2, waves: 1.3},
];

const build = (s: SulcusDef, seed: string) => wiggle(chain(s.start, s.segs, s.n ?? 26), s.amp, s.waves, seed);

// ---------- 4. 小脑 ----------
const cerebTop = chain([116, 145], [[[160, 130], [220, 119], [266, 117]]], 40);
const cerebBottom = chain([116, 145], [[[122, 214], [232, 234], [290, 160]]], 40);
const cerebBack = chain([290, 160], [[[300, 136], [286, 119], [266, 117]]], 14);
const CEREB = wiggle([...cerebBottom, ...cerebBack.slice(1)], 1.6, 26, 'cereb', false);
const FOLIA = [0.22, 0.38, 0.54, 0.7, 0.85].map((f, k) =>
  wiggle(lerpPts(cerebTop, cerebBottom, f).slice(3, -3), 1.4, 7, `folia${k}`),
);

// ---------- 5. 脑干 ----------
const STEM = [
  wiggle(chain([56, 160], [[[30, 196], [52, 244], [62, 306]]], 30), 1.2, 2, 'stemA'), // 脑桥前缘
  wiggle(chain([112, 150], [[[110, 192], [106, 244], [104, 306]]], 30), 1.2, 2, 'stemB'),
];

// ---------- 导出（数组顺序 = 描绘顺序） ----------
export const BRAIN_PARTS: Part[] = [
  {kind: 'outline', pts: OUTLINE, d: toPath(OUTLINE, true), closed: true},
  ...Object.entries(MAJOR).map(([k, s]) => {
    const pts = build(s, k);
    return {kind: 'major' as const, pts, d: toPath(pts)};
  }),
  {kind: 'cereb', pts: CEREB, d: toPath(CEREB)},
  ...FOLIA.map((pts) => ({kind: 'folia' as const, pts, d: toPath(pts)})),
  ...STEM.map((pts) => ({kind: 'stem' as const, pts, d: toPath(pts)})),
  ...MINOR.map((s, i) => {
    const pts = build(s, `minor${i}`);
    return {kind: 'minor' as const, pts, d: toPath(pts)};
  }),
];

// 小脑区域（填充用）
export const CEREB_FILL_PATH = toPath([...cerebTop, ...[...CEREB].reverse()], true);

// 粒子目标点：沿所有线条采样（约 400 个）
const STEP: Record<PartKind, number> = {outline: 2, major: 3, cereb: 3, folia: 4, stem: 4, minor: 4};
export const BRAIN_TARGETS: Pt[] = BRAIN_PARTS.flatMap((p) => p.pts.filter((_, i) => i % STEP[p.kind] === 0));