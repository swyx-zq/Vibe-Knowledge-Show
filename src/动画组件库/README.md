# 官方动画组件（Remotion 官方生态）

这里放的是**官方 `@remotion/*` 动画类包**的接入与实机验证，全部锁在 **4.0.544**，与 `remotion` 主包同版本。版本不一致会直接报错，升级时整组一起升。

## 已接入的包

| 包 | 用法要点 | 验证面板 |
|---|---|---|
| `@remotion/paths` | `evolvePath(progress, path)` 直接给 SVG 路径做生长；`getLength` / `getPointAtLength` 取线上任意点（做"行进头部"用这个） | paths |
| `@remotion/motion-blur` | `Trail`（残影拖尾）、`CameraMotionBlur`（快门动态模糊） | motion-blur |
| `@remotion/shapes` | `Star` / `Circle` / `Triangle` / `Rect` / `Pie` / `Heart` / `Spark` / `Polygon` / `Callout` / `Arrow`，也能用 `makeXxx()` 只取 path 自己画 | shapes |
| `@remotion/transitions` | `TransitionSeries` + `fade` / `wipe` / `pushCut` / `slide` / `flip` / `cube` / `clockWipe` / `dissolve` / `iris` / `ripple` 等 20 种 | transitions |
| `@remotion/layout-utils` | `fitText` 按容器宽度自动定字号；`measureText` 量字宽（做底框必备） | layout-utils |
| `@remotion/noise` | `noise2D/3D/4D` 柏林噪声，做有机抖动、呼吸感 | noise |
| `@remotion/rounded-text-box` | `createRoundedTextBox` 生成圆角字幕框的 SVG 路径 | rounded-text-box |
| `@remotion/animation-utils` | `makeTransform([translate(), rotate(), scale()])` 拼复合 transform | animation-utils |
| `@remotion/light-leaks` | `LightLeak` 漏光 | light-leaks |
| `@remotion/starburst` | `Starburst` 星芒射线 | light-leaks (+starburst) |

## 三个已经踩到的坑

1. **4.0.544 的 `fade` / `wipe` / `slide` / `flip` 不在根出口**，要从子路径导入：
   ```ts
   import {fade} from '@remotion/transitions/fade';
   import {wipe} from '@remotion/transitions/wipe';
   ```
   从 `@remotion/transitions` 根导入会得到 `undefined`，报 `(0, ...fade) is not a function`。根出口只导出 `TransitionSeries` / `linearTiming` / `springTiming` 和 blurSlide~pushCut 这一批。

2. **`Trail` 的运动必须由 `useCurrentFrame()` 驱动**。它的实现是给每层套 `<Freeze frame={f - lag * n}>`，只改写 `useCurrentFrame` 的读数，**不会改写父组件传下来的 props**。如果位置来自 `props.frame`，所有图层会落在同一帧上，拖尾完全不出现（只会把阴影叠成一团黑块）。

3. **别在 `Trail` 的子元素上用 `boxShadow` 做发光**。9 层半透明叠加会把阴影压成一块深色矩形，改用 `radial-gradient` 做光晕。

## 怎么跑

```bash
npm install
npm run still:kit   # 出一张 1920×1080 的九宫格验证图 → out/kit/kit.png
npm run render:kit  # 出 10 秒验证片 → out/kit/kit.mp4
```

`AnimationKit` 是独立 Composition，**不参与正片 `Main` 的 Series**，不影响原有 10 个场景的时长。
