import * as L from "leaflet";
import "./leaflet.trackmarker";
import { along, bearing, length, lineString } from "@turf/turf";
import type { Feature, LineString } from "geojson";

// 插件实现
export class TrackMarker extends L.Marker {
  declare options: L.TrackMarkerOptions;

  private _totalDistance: number;
  private _isPlaying: boolean = false;
  // private _elapsedTime: number = 0;
  private _traveled: number = 0;
  private _animationId: number | null = null;
  private _currentRotation: number = 0;

  // 原始路线数据
  private _line: Feature<LineString>;
  private _latlngs: L.LatLng[];
  private _segmentDistances: number[];

  constructor(line: L.Polyline<LineString>, options?: L.TrackMarkerOptions) {
    // 默认选项
    const defaultOptions: L.TrackMarkerOptions = {
      speed: 0.1,
      autoPlay: true,
      rotation: true,
      rotationOffset: 0,
    };
    const latlngs = line.getLatLngs() as L.LatLng[];
    if (latlngs.length < 2) {
      throw new Error("【leaflet.TrackMarker】Polyline must have two points");
    }
    super(latlngs[0]!, { ...defaultOptions, ...options });

    this._line = lineString(latlngs.map((latlng) => [latlng.lng, latlng.lat]));
    this._latlngs = latlngs;
    this._segmentDistances = [];
    this._totalDistance = 0;

    for (let i = 1; i < latlngs.length; i++) {
      const from = latlngs[i - 1]!;
      const to = latlngs[i]!;

      const segment = lineString([
        [from.lng, from.lat],
        [to.lng, to.lat],
      ]);
      const distance = length(segment, { units: "kilometers" });

      this._segmentDistances.push(distance);
      this._totalDistance += distance;
    }

    if (this.options.rotation) {
      this._currentRotation = this._estimateInitialBearing();
    }
  }

  onAdd(map: L.Map): this {
    super.onAdd(map);

    if (this.options.autoPlay) this.play();
    return this;
  }

  onRemove(map: L.Map): this {
    this.pause();
    super.onRemove(map);
    return this;
  }
  _setPos(pos: L.Point): void {
    // @ts-ignore
    super._setPos(pos);

    const icon = this.getElement();
    if (!icon) return;

    icon.style.transformOrigin = "center center";
    // 获取 Leaflet 设置的 transform（包含 translate）
    const currentTransform =
      icon.style.transform || window.getComputedStyle(icon).transform;

    // 注入 rotate
    const rotate = `rotate(${
      this._currentRotation + this.options.rotationOffset!
    }deg)`;
    let newTransform = currentTransform;

    if (currentTransform === "none") {
      newTransform = rotate;
    } else {
      // 如果已有 transform（如 translate），我们追加 rotate
      // 注意：顺序很重要，rotate 应该在最后
      if (!currentTransform.includes("rotate")) {
        newTransform = `${currentTransform} ${rotate}`;
      } else {
        // 替换已有的 rotate
        newTransform = currentTransform.replace(/rotate\([^)]*\)/g, rotate);
      }
    }

    if (newTransform !== icon.style.transform) {
      icon.style.transform = newTransform;
    }
  }

  play(): this {
    if (this._isPlaying) return this;
    this._isPlaying = true;

    // 记录上一帧的时间
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      let deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
      lastTime = currentTime;

      // 限制最大
      let maxDeltaTime = Math.min(deltaTime, 0.05);

      this._traveled += maxDeltaTime * this.options.speed!;

      if (this._traveled >= this._totalDistance) {
        this._isPlaying = false;
        this._traveled = this._totalDistance;

        this.options.onFinish?.call(this);

        this._animationId = null;
      }
      this._updatePositionAndRotation();

      this.options.onProgress?.call(this);

      if (this._isPlaying) {
        this._animationId = requestAnimationFrame(animate);
      }
    };

    this.options.onBeforePlay?.call(this);
    this._animationId = requestAnimationFrame(animate);
    this.options.onPlay?.call(this);
    return this;
  }

  pause(): this {
    if (!this._isPlaying) return this;

    this._isPlaying = false;
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    this.options.onPause?.call(this);
    return this;
  }

  reset(): this {
    this.pause();

    this._traveled = 0;
    this.setLatLng(this._latlngs[0]!);

    if (this.options.rotation) {
      this._currentRotation = this._estimateInitialBearing();
    }

    this.options.onReset?.call(this);
    if (this.options.autoPlay) this.play();
    return this;
  }

  seek(percent: number): this {
    percent = Math.max(0, Math.min(1, percent));
    this._traveled = percent * this._totalDistance;

    const result = this._getPointAtDistance();
    this.setLatLng(result.latlng);

    if (this.options.rotation) {
      this._currentRotation = result.bearing;
    }

    return this;
  }

  setSpeed(speed: number): this {
    this.options.speed = speed;
    return this;
  }
  getTraveled(): number {
    return this._traveled;
  }
  getTotalDistance(): number {
    return this._totalDistance;
  }

  private _updatePositionAndRotation() {
    const result = this._getPointAtDistance();
    this.setLatLng(result.latlng);

    if (this.options.rotation) {
      this._currentRotation = result.bearing;
    }
  }

  private _getPointAtDistance(): { latlng: L.LatLng; bearing: number } {
    const traveled = this._traveled;

    const points = along(this._line, traveled, { units: "kilometers" });
    const coords = points.geometry.coordinates as [number, number];
    const latlng = L.latLng(coords[1], coords[0]);

    let accumulated = 0;

    let i = 0;
    for (; i < this._segmentDistances.length; i++) {
      const segLen = this._segmentDistances[i]!;
      if (accumulated + segLen >= traveled) {
        break;
      }
      accumulated += segLen;
    }
    const from = this._latlngs[i]!;
    const to = this._latlngs[i + 1]!;

    const bearingVal = bearing([from.lng, from.lat], [to.lng, to.lat]);

    return { latlng, bearing: bearingVal };
  }

  private _estimateInitialBearing(): number {
    const from = this._latlngs[0]!;
    const to = this._latlngs[1]!;

    return bearing(
      { type: "Point", coordinates: [from.lng, from.lat] },
      { type: "Point", coordinates: [to.lng, to.lat] }
    );
  }
}

// 工厂函数：小写，返回实例
export function trackMarker(
  line: L.Polyline<LineString>,
  options?: L.TrackMarkerOptions
): L.TrackMarker {
  return new TrackMarker(line, options);
}

// 使用 Leaflet 的插件机制
L.Map.addInitHook(function (this: L.Map) {
  // @ts-ignore
  this.trackMarker = (
    line: L.Polyline<LineString>,
    options?: L.TrackMarkerOptions
  ): L.TrackMarker => {
    return new TrackMarker(line, options);
  };
});

if (typeof window !== "undefined" && window.L) {
  window.L.trackMarker = trackMarker;
  window.L.TrackMarker = TrackMarker;
}
