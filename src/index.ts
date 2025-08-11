import * as L from "leaflet";
import { lineString, along, bearing, length } from "@turf/turf";
import type { Feature, FeatureCollection, LineString } from "geojson";

export class TrackMarker extends L.Marker {
  options: L.TrackMarkerOptions;

  private _line: Feature<LineString>;
  private _totalDistance: number;
  private _isPlaying: boolean = false;
  private _elapsedTime: number = 0;
  private _animationId: number | null = null;

  constructor(line: L.TrackLine, options?: L.TrackMarkerOptions) {
    super([0, 0], options);

    // 默认选项
    this.options = {
      speed: 0.1,
      autoPlay: true,
      rotation: true,
      ...options,
    };

    // 归一化输入为 LineString Feature
    if (Array.isArray(line)) {
      this._line = lineString(line);
    } else if (line.type === "Feature" && line.geometry.type === "LineString") {
      this._line = line;
    } else if (line.type === "LineString") {
      this._line = lineString(line.coordinates);
    } else if (line.type === "FeatureCollection") {
      // 取第一条 LineString
      const first = line.features.find(
        (f: Feature) => f.geometry.type === "LineString"
      );
      if (!first) throw new Error("No LineString found in FeatureCollection");
      this._line = first as Feature<LineString>;
    } else {
      throw new Error("【leaflet.trackmarker】Invalid line input");
    }

    if (this._line.geometry.coordinates.length < 2) {
      throw new Error(
        "【leaflet.trackmarker】Invalid line input, line must have at least two points"
      );
    }
    // 计算总长度（km）
    this._totalDistance = length(this._line, { units: "kilometers" });

    // 初始化位置
    const firstCoord = this._line.geometry.coordinates[0]!;
    this.setLatLng(L.latLng(firstCoord[1]!, firstCoord[0]!));
  }

  onAdd(map: L.Map): this {
    super.onAdd(map);

    if (this.options.autoPlay) {
      this.play();
    }

    return this;
  }

  onRemove(map: L.Map): this {
    this.pause();
    super.onRemove(map);
    return this;
  }

  /**
   * 开始或继续播放
   */
  play(): this {
    if (this._isPlaying) return this;

    this._isPlaying = true;
    const startTime = performance.now() - this._elapsedTime * 1000;

    const animate = () => {
      const now = performance.now();
      this._elapsedTime = (now - startTime) / 1000;

      const traveled = this._elapsedTime * this.options.speed!;
      if (traveled >= this._totalDistance) {
        this._isPlaying = false;
        this._elapsedTime = this._totalDistance / this.options.speed!;
        this._updatePositionAndRotation();
        this.fire("arrived");
        return;
      }

      this._updatePositionAndRotation();
      this.fire("progress", { percent: traveled / this._totalDistance });

      this._animationId = requestAnimationFrame(animate);
    };

    animate();
    return this;
  }

  /**
   * 暂停播放
   */
  pause(): this {
    if (!this._isPlaying) return this;
    this._isPlaying = false;
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    this.fire("pause");
    return this;
  }

  /**
   * 重置到起点
   */
  reset(): this {
    this.pause();
    this._elapsedTime = 0;
    const first = this._line.geometry.coordinates[0]!;
    this.setLatLng(L.latLng(first[1]!, first[0]!));
    if (this.options.rotation) {
      this._setRotation(this._estimateInitialBearing());
    }
    this.fire("reset");
    return this;
  }

  /**
   * 跳转到路径的百分比位置 (0-1)
   */
  seek(percent: number): this {
    percent = Math.max(0, Math.min(1, percent));
    const distance = percent * this._totalDistance;
    const pos = along(this._line, distance, { units: "kilometers" }).geometry
      .coordinates;
    this.setLatLng(L.latLng(pos[1]!, pos[0]!));

    if (this.options.rotation) {
      const angle = this._getBearingAtDistance(distance);
      this._setRotation(angle);
    }

    this._elapsedTime = distance / this.options.speed!;
    this.fire("seek", { percent });
    return this;
  }

  /**
   * 设置新速度
   */
  setSpeed(speed: number): this {
    this.options.speed = speed;
    return this;
  }

  // 内部方法：更新位置和旋转
  private _updatePositionAndRotation(): void {
    const traveled = this._elapsedTime * this.options.speed!;
    const pos = along(this._line, traveled, { units: "kilometers" }).geometry
      .coordinates;
    this.setLatLng(L.latLng(pos[1]!, pos[0]!));

    if (this.options.rotation) {
      const angle = this._getBearingAtDistance(traveled);
      this._setRotation(angle);
    }
  }

  // 获取某段距离处的方向角
  private _getBearingAtDistance(distance: number): number {
    const slice = along(this._line, distance, { units: "kilometers" });
    const next = along(this._line, distance + 0.001, { units: "kilometers" });
    return bearing(slice, next);
  }

  // 初始方向角（防止起点无法计算）
  private _estimateInitialBearing(): number {
    const len = this._line.geometry.coordinates.length;
    if (len < 2) return 0;
    const p1 = this._line.geometry.coordinates[0]!;
    const p2 = this._line.geometry.coordinates[1]!;
    return bearing(p1, p2);
  }

  // 设置旋转（通过 CSS 变量）
  private _setRotation(angle: number): void {
    let icon = this.getElement();
    if (icon) {
      let transfrom = icon.style.transform;

      const withoutRotate = transfrom.replace(/rotate\([^)]*\)/g, "").trim();
      const newTransform = withoutRotate
        ? `${withoutRotate} rotate(${angle}deg)`
        : `rotate(${angle}deg)`;
      icon.style.transform = newTransform;
    }
  }
}

// 使用 Leaflet 的插件机制
L.Map.addInitHook(function (this: L.Map) {
  // @ts-ignore
  this.trackMarker = (
    line: L.TrackLine,
    options?: L.TrackMarkerOptions
  ): L.TrackMarker => {
    return new TrackMarker(line, options);
  };
});
