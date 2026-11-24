import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {Trail} from '@remotion/motion-blur';
import {Circle, Triangle} from '@remotion/shapes';
import {makeStar} from '@remotion/shapes';
import {linearTiming, pushCut, springTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {fitText, measureText} from '@remotion/layout-utils';
import {createRoundedTextBox} from '@remotion/rounded-text-box';
import {makeTransform, rotate, scale, translate} from '@remotion/animation-utils';
import {noise2D} from '@remotion/noise';
import {LightLeak} from '@remotion/light-leaks';
import {Starburst} from '@remotion/starburst';
import {C, FONT} from '../认知觉醒/theme';

///

export const SCENEKIT_DURATION = 300; // 10s

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const eo = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number, easing = eo) =>
  interpolate(f, [a, b], [0, 1], {...clamp, easing});

/** 面板外壳：统一样式，顶部是包名 */
const Panel: React.FC<{title: string; note?: string; children: React.ReactNode; op?: number}> = ({
  title,
  note,
  children,
  op = 1,
}) => (
  <div
    style={{
      position: 'relative',
      width: 560,
      height: 260,
      borderRadius: 20,
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(125,211,252,0.20)',
      overflow: 'hidden',
      opacity: op,
    }}
  >
    <div style={{position: 'absolute', left: 22, top: 16, fontSize: 34, fontWeight: 700, color: C.text, opacity: 0.92}}>
      {title}
    </div>
    {note ? (
      <div style={{position: 'absolute', right: 22, top: 20, fontSize: 34, color: C.dim, opacity: 0.75}}>{note}</div>
    ) : null}
    <div style={{position: 'absolute', left: 0, top: 62, width: 560, height: 198}}>{children}</div>
  </div>
);

/* ---------- 1. paths：曲线生长 + 沿线取点 ---------- */
const PATHS_PANEL: React.FC<{f: number}> = ({f}) => {
  const P = 'M 16 150 C 120 24, 268 176, 504 26';
  const p = prog(f, 40, 130);
  const dash = evolvePath(p, P);
  const total = getLength(P);
  const pt = getPointAtLength(P, total * p);
  return (
    <svg viewBox="0 0 520 190" style={{position: 'absolute', left: 20, top: 0, width: 520, height: 190}}>
      <path d={P} stroke={C.reason} strokeWidth={3} fill="none" opacity={0.28} />
      <path d={P} stroke={C.reason} strokeWidth={4} fill="none" {...dash} />
      {pt ? <circle cx={pt.x} cy={pt.y} r={9} fill={C.highlight} /> : null}
    </svg>
  );
};

/* ---------- 2. motion-blur：Trail 拖尾 ---------- */
// ⚠️ Trail 靠 <Freeze> 回放历史帧实现拖尾，所以运动必须由 useCurrentFrame() 驱动；
//    如果位置来自父组件传下来的 frame 参数，所有图层会叠在同一帧上，拖尾不会出现。
const BlurDot: React.FC = () => {
  const f = useCurrentFrame();
  const x = 250 + Math.cos(f / 8) * 205;
  const y = 92 + Math.sin(f / 8) * 62;
  return (
    <div
      style={{
        position: 'absolute',
        left: 22 + x,
        top: y - 11,
        width: 22,
        height: 22,
        borderRadius: 11,
        background: `radial-gradient(circle, ${C.highlight} 0%, rgba(251,191,36,0.45) 45%, rgba(251,191,36,0) 72%)`,
      }}
    />
  );
};

const BLUR_PANEL: React.FC = () => (
  <Trail layers={10} lagInFrames={2} trailOpacity={0.5}>
    <BlurDot />
  </Trail>
);

/* ---------- 3. shapes：官方形状组件 ---------- */
const SHAPES_PANEL: React.FC<{f: number}> = ({f}) => {
  const star = makeStar({points: 5, innerRadius: 24, outerRadius: 52, cornerRadius: 4});
  const p = prog(f, 30, 100);
  return (
    <>
      <svg viewBox={`0 0 ${star.width} ${star.height}`} style={{position: 'absolute', left: 36, top: 12, width: star.width, height: star.height}}>
        <path d={star.path} fill="none" stroke={C.accent} strokeWidth={3} {...evolvePath(p, star.path)} />
      </svg>
      <div style={{position: 'absolute', left: 176, top: 12}}>
        <Circle radius={48} fill={C.reason} />
      </div>
      <div style={{position: 'absolute', left: 300, top: 12}}>
        <Triangle length={90} fill={C.instinct} direction="up" />
      </div>
      <div style={{position: 'absolute', left: 36, top: 132, fontSize: 34, color: C.dim}}>makeStar / Circle / Triangle</div>
    </>
  );
};

/* ---------- 4. transitions：三种转场连播 ---------- */
const Card: React.FC<{n: string; hue: string}> = ({n, hue}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <div style={{width: 460, height: 150, borderRadius: 16, background: hue, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <span style={{fontSize: 56, fontWeight: 800, color: '#07131f'}}>{n}</span>
    </div>
  </AbsoluteFill>
);

const TRANSITIONS_PANEL: React.FC = () => (
  <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <Card n="fade" hue={C.reason} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Card n="wipe" hue={C.accent} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={springTiming({config: {damping: 200}, durationInFrames: 15})} />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Card n="pushCut" hue={C.highlight} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pushCut({})} timing={linearTiming({durationInFrames: 15})} />
        <TransitionSeries.Sequence durationInFrames={70}>
          <Card n="done" hue="#9ae6b4" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
  </AbsoluteFill>
);

/* ---------- 5. layout-utils：按容器宽度自动定字号 ---------- */
const LAYOUT_PANEL: React.FC<{f: number}> = ({f}) => {
  const text = '读书，重塑认知。';
  const {fontSize} = fitText({text, withinWidth: 470, fontFamily: FONT, fontWeight: 700});
  return (
    <div style={{position: 'absolute', left: 26, top: 20, width: 470, opacity: prog(f, 40, 90)}}>
      <div style={{fontSize, lineHeight: 1.35, color: C.text}}>{text}</div>
      <div style={{marginTop: 12, fontSize: 34, color: C.reason}}>fitText → {Math.round(fontSize)}px</div>
    </div>
  );
};

/* ---------- 6. noise：柏林噪声做有机抖动 ---------- */
const NOISE_PANEL: React.FC<{f: number}> = ({f}) => {
  const letters = '思考的形状'.split('');
  return (
    <div style={{position: 'absolute', left: 26, top: 26}}>
      <div style={{display: 'flex', gap: 6}}>
        {letters.map((ch, i) => {
          const dx = noise2D('kit', i * 1.7, f / 14) * 14;
          const dy = noise2D('kit2', i * 2.3, f / 11) * 12;
          return (
            <span
              key={i}
              style={{
                fontSize: 76,
                fontWeight: 800,
                color: C.text,
                display: 'inline-block',
                transform: `translate(${dx}px, ${dy}px)`,
                textShadow: `0 0 18px rgba(125,211,252,0.45)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{marginTop: 20, fontSize: 34, color: C.dim}}>noise2D 驱动位移，无常但连续</div>
    </div>
  );
};

/* ---------- 7. rounded-text-box：生成圆角字幕框 ---------- */
const BOX_PANEL: React.FC<{f: number}> = ({f}) => {
  const text = '到底是为了什么';
  const dims = measureText({text, fontFamily: FONT, fontSize: 44, fontWeight: 600});
  const box = createRoundedTextBox({textMeasurements: [dims], textAlign: 'center', horizontalPadding: 30, borderRadius: 22});
  const w = box.boundingBox.width;
  const h = box.boundingBox.height;
  const p = prog(f, 30, 90);
  return (
    <div style={{position: 'absolute', left: (560 - w) / 2, top: 28}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, opacity: p}}>
        <path d={box.d} fill="rgba(7,19,31,0.85)" stroke={C.reason} strokeWidth={2} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 44,
          fontWeight: 600,
          color: C.text,
          opacity: p,
        }}
      >
        {text}
      </div>
      <div style={{position: 'absolute', left: 0, top: h + 16, width: w, textAlign: 'center', fontSize: 34, color: C.dim}}>
        生成的 SVG 路径
      </div>
    </div>
  );
};

/* ---------- 8. animation-utils：复合 transform ---------- */
const TRANSFORM_PANEL: React.FC<{f: number}> = ({f}) => {
  const t = makeTransform([
    translate(Math.sin(f / 22) * 26, 0),
    rotate(Math.sin(f / 18) * 8),
    scale(1 + Math.sin(f / 15) * 0.06),
  ]);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 560, height: 198, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 300,
          height: 118,
          borderRadius: 18,
          background: 'linear-gradient(120deg, rgba(125,211,252,0.22), rgba(167,139,250,0.22))',
          border: '1px solid rgba(125,211,252,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: t,
        }}
      >
        <span style={{fontSize: 40, fontWeight: 700, color: C.text}}>makeTransform()</span>
      </div>
    </div>
  );
};

/* ---------- 9. light-leaks + starburst：光效 ---------- */
const FX_PANEL: React.FC<{f: number}> = ({f}) => (
  <>
    <div style={{position: 'absolute', inset: 0, opacity: 0.5}}>
      <LightLeak seed={7} hueShift={(f * 0.8) % 360} width={560} height={198} />
    </div>
    <div style={{position: 'absolute', inset: 0, opacity: 0.62}}>
    <Starburst
      rays={18}
      colors={[C.reason, C.accent, 'transparent']}
      rotation={f * 1.2}
      smoothness={0.8}
      vignette={0.6}
      originOffsetX={0}
      originOffsetY={0}
      width={560}
      height={198}
    />
    </div>
    <div style={{position: 'absolute', left: 0, bottom: 12, width: 560, textAlign: 'center', fontSize: 34, color: C.text, opacity: 0.9}}>
      漏光 + 星芒，可压在主画面上
    </div>
  </>
);

const SceneKit: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = [80, 680, 1280];
  const rows = [212, 498, 784];
  const appear = (i: number) => prog(frame, 20 + i * 8, 48 + i * 8);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(1200px 700px at 50% 8%, rgba(125,211,252,0.10), transparent 70%)'}} />

      <div style={{position: 'absolute', left: 80, top: 66, fontSize: 54, fontWeight: 800, color: C.text, letterSpacing: 1}}>
        Remotion 官方动画组件 · 实机验证
      </div>
      <div style={{position: 'absolute', left: 82, top: 140, fontSize: 34, color: C.dim}}>
        9 个包全部跑在 1920×1080 / 30fps 时间轴里，全部为 4.0.544 版本
      </div>

      <div style={{position: 'absolute', left: cols[0], top: rows[0]}}>
        <Panel title="paths" note="曲线生长" op={appear(0)}>
          <PATHS_PANEL f={frame} />
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[1], top: rows[0]}}>
        <Panel title="motion-blur" note="Trail" op={appear(1)}>
          <BLUR_PANEL />
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[2], top: rows[0]}}>
        <Panel title="shapes" note="描边生长" op={appear(2)}>
          <SHAPES_PANEL f={frame} />
        </Panel>
      </div>

      <div style={{position: 'absolute', left: cols[0], top: rows[1]}}>
        <Panel title="transitions" note="四种衔接" op={appear(3)}>
          <Sequence from={55} durationInFrames={235} layout="none">
            <TRANSITIONS_PANEL />
          </Sequence>
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[1], top: rows[1]}}>
        <Panel title="layout-utils" note="fitText" op={appear(4)}>
          <LAYOUT_PANEL f={frame} />
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[2], top: rows[1]}}>
        <Panel title="noise" note="有机抖动" op={appear(5)}>
          <NOISE_PANEL f={frame} />
        </Panel>
      </div>

      <div style={{position: 'absolute', left: cols[0], top: rows[2]}}>
        <Panel title="rounded-text-box" note="字幕框" op={appear(6)}>
          <BOX_PANEL f={frame} />
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[1], top: rows[2]}}>
        <Panel title="animation-utils" note="复合变换" op={appear(7)}>
          <TRANSFORM_PANEL f={frame} />
        </Panel>
      </div>
      <div style={{position: 'absolute', left: cols[2], top: rows[2]}}>
        <Panel title="light-leaks" note="+ starburst" op={appear(8)}>
          <FX_PANEL f={frame} />
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

export const SceneKitExport = SceneKit;
export default SceneKit;
