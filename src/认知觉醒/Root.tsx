import React from 'react';
import {Composition, Series} from 'remotion';
import {Scene0, SCENE0_DURATION} from './Scene0';
import {Scene1, SCENE1_DURATION} from './Scene1';
import {Scene2, SCENE2_DURATION} from './Scene2';
import {Scene3, SCENE3_DURATION} from './Scene3';
import {Scene4, SCENE4_DURATION} from './Scene4';
import {Scene5, SCENE5_DURATION} from './Scene5';
import {Scene6, SCENE6_DURATION} from './Scene6';
import {Scene7, SCENE7_DURATION} from './Scene7';
import {Scene8, SCENE8_DURATION} from './Scene8';
import {Scene9, SCENE9_DURATION} from './Scene9';

const SCENES = [
  {id: 'Scene0', C: Scene0, d: SCENE0_DURATION}, // 开场
  {id: 'Scene1', C: Scene1, d: SCENE1_DURATION}, // 三重大脑
  {id: 'Scene2', C: Scene2, d: SCENE2_DURATION}, // 焦虑的根源
  {id: 'Scene3', C: Scene3, d: SCENE3_DURATION}, // 模糊与清晰
  {id: 'Scene4', C: Scene4, d: SCENE4_DURATION}, // 元认知
  {id: 'Scene5', C: Scene5, d: SCENE5_DURATION}, // 舒适区边缘
  {id: 'Scene6', C: Scene6, d: SCENE6_DURATION}, // 深度学习
  {id: 'Scene7', C: Scene7, d: SCENE7_DURATION}, // 专注与行动
  {id: 'Scene8', C: Scene8, d: SCENE8_DURATION}, // 早冥读写跑
  {id: 'Scene9', C: Scene9, d: SCENE9_DURATION}, // 结尾
];

const TOTAL = SCENES.reduce((s, x) => s + x.d, 0); // 6060 帧 ≈ 3 分 22 秒

const Main: React.FC = () => (
  <Series>
    {SCENES.map(({C, d}, i) => (
      <Series.Sequence key={i} durationInFrames={d}>
        <C />
      </Series.Sequence>
    ))}
  </Series>
);

const common = {fps: 30, width: 1920, height: 1080} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TOTAL} {...common} />
    {SCENES.map(({id, C, d}) => (
      <Composition key={id} id={id} component={C} durationInFrames={d} {...common} />
    ))}
  </>
);