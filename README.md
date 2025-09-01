
# 🛣️ Leaflet.TrackMarker

[![npm version](https://img.shields.io/npm/v/leaflet.trackmarker.svg)](https://www.npmjs.com/package/leaflet.trackmarker)
[![License](https://img.shields.io/npm/l/leaflet.trackmarker.svg)](LICENSE)

> **A lightweight Leaflet plugin for animated markers that move along a path with automatic rotation.**  
> 让你的 Marker 沿路线自动移动，并智能旋转方向！

![dexample gif](./example/example.gif)

---

## ✨ 特性

- ✅ **沿路径自动移动**（支持 GeoJSON LineString、坐标数组）
- ✅ **自动旋转**：方向始终与路径方向一致（如车辆转向）
- ✅ **流畅动画**：基于时间与速度的平滑移动
- ✅ **精确控制**：支持 `play()`, `pause()`, `seek(0.5)`, `reset()`
- ✅ **轻量依赖**：仅依赖 Leaflet 和 Turf.js（可选打包）
- ✅ **TypeScript 支持**：完整类型定义
- ✅ **多格式输出**：支持 ESM、CJS、UMD

---

## 📦 安装

### npm / yarn / pnpm（推荐）

```bash
npm install leaflet.trackmarker @turf/turf
```

> ⚠️ 注意：`@turf/turf` 是运行时依赖，用于路径计算。

### CDN（直接在浏览器使用）

```html
<!-- 必须先加载 Leaflet -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/@turf/turf@7.0.0/turf.min.js"></script>

<!-- 加载 TrackMarker 插件 -->
<script src="https://unpkg.com/leaflet.trackmarker@latest/dist/index.umd.js"></script>
```

---

## 🚀 快速使用

### 1. 模块化项目（ESM / TypeScript）

```ts
import L from 'leaflet';  
import 'leaflet/dist/leaflet.css';
import 'leaflet.trackmarker';

// 定义路径（经纬度数组）
const route = [
  [116.4, 39.9],  // 北京
  [116.5, 39.95],
  [116.6, 39.92],
  [116.7, 39.98]
];

let line = L.polyline(route, {
  color: "red",
  weight: 5,
  opacity: 0.5,
});
line.addTo(map);
// 创建可移动的 Marker
const marker = L.trackMarker(line, {
  speed: 0.005,           // 速度：5 米/秒
  rotation: true,         // 启用自动旋转
  autoPlay: true,         // 自动开始
  rotationOffset: -90,      // 图标方向修正（例如：图标默认朝右）
}).addTo(map);

// 控制播放
marker.play();
marker.pause();
marker.seek(0.75); // 跳转到 75% 处
marker.reset();    // 重置到起点
```

### 2. 浏览器直接引入（UMD）

```html
<script>
  const route = [
    [116.4, 39.9],
    [116.5, 39.95],
    [116.6, 39.92]
  ];
  let line = L.polyline(route, {
    color: "red",
    weight: 5,
    opacity: 0.5,
  });
  line.addTo(map);
  const marker = L.trackMarker(line, {
    speed: 0.005,
    rotation: true
  }).addTo(map);

  marker.play();
</script>
```

---

## 🛠️ API

### `trackMarker(line: L.Polyline, options?: TrackMarkerOptions)`

创建一个可移动的 TrackMarker。

#### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `line` |  `L.Polyline` | 路径图层 |
| `options` | `TrackMarkerOptions` | 配置选项（见下表） |

---

### `TrackMarkerOptions`

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `speed` | `number` | `0.1` | 移动速度（km/s） |
| `autoPlay` | `boolean` | `true` | 是否自动开始播放 |
| `rotation` | `boolean` | `true` | 是否启用自动旋转 |
| `rotationOffset` | `number` | `0` | 旋转偏移角度 |
| `onPause`| `() => void` | - |暂停时的回调 |
| `onReset` | `() => void` | - |重置到起点时的回调 |
| `onFinish` | `() => void`|  - |到达终点时的回调 |
| `onProgress` |`() => void` | - |播放过程中持续触发的回调|
| `onBeforePlay` |`() => void` | - |播放前触发的回调|
| `onPlay` |`() => void` | - |播放时触发的回调|

---

### 方法

| 方法 | 说明 |
|------|------|
| `.play()` | 开始或继续播放 |
| `.pause()` | 暂停播放 |
| `.reset()` | 重置到路径起点 |
| `.seek(percent)` | 跳转到路径的百分比位置（0-1） |
| `.setSpeed(speed)` | 动态设置新速度 |
| `.getTraveled()`| 获取已 traveled 的距离 |
| `.getTotalDistance()` | 获取路径的总距离 |

---

## 🧪 示例

我们提供了一个完整的示例页面，请查看：

👉 [example/index.html](example/index.html)

或在线预览（发布后可部署到 GitHub Pages）。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
git clone https://github.com/ngd-b/leaflet.trackmarker.git
cd leaflet.trackmarker
pnpm install
pnpm dev
```

- `src/`：源码
- `example/`：示例页面
- `dist/`：构建输出

---

## 📄 许可证

MIT License

---

## 🚀 致谢

- [Leaflet](https://leafletjs.com) - 优秀的地图库
- [Turf.js](https://turfjs.org) - 强大的地理计算工具

---

📌 **让地图上的标记“活”起来！**  
Built with ❤️ for GIS developers.
