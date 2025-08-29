import * as L from "leaflet";
import "./leaflet.trackmarker";
import { along, bearing, length, lineString } from "@turf/turf";
import type { Feature, LineString } from "geojson";

// 插件实现
export class TrackMarker extends L.Marker {
  declare options: L.TrackMarkerOptions;

  private _polyline: L.Polyline<LineString> | null;
  private _line: Feature<LineString> | null;
  private _totalDistance: number;
  private _isPlaying: boolean = false;
  // private _elapsedTime: number = 0;
  private _traveled: number = 0;
  private _animationId: number | null = null;
  private _currentRotation: number = 0;

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

    this._polyline = line;
    this._line = lineString(this._polyline.toGeoJSON().geometry.coordinates);

    // 总距离（km）
    this._totalDistance = length(this._line, { units: "kilometers" });
  }

  onAdd(map: L.Map): this {
    super.onAdd(map);

    if (this.options.autoPlay) this.play();
    return this;
  }

  onRemove(map: L.Map): this {
    this.pause();
    this._line = null;
    this._polyline = null;
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
      // 防止瞬移
      const maxDeltaTime = 0.1; // 最大 100ms
      let elapsedTime = Math.min(deltaTime, maxDeltaTime);

      this._traveled += elapsedTime * this.options.speed!;
      if (this._traveled >= this._totalDistance) {
        this._isPlaying = false;

        this.options.onFinish?.call(this);
        return;
      }

      this._updatePositionAndRotation();
      this.options.onProgress?.call(this);

      this._animationId = requestAnimationFrame(animate);
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
    const point = this._line!.geometry.coordinates[0]!;

    if (this.options.rotation) {
      this._currentRotation = this._estimateInitialBearing();
    }
    this.setLatLng(L.latLng(point[1]!, point[0]!));
    this.options.onReset?.call(this);
    if (this.options.autoPlay) this.play();
    return this;
  }

  seek(percent: number): this {
    percent = Math.max(0, Math.min(1, percent));
    this._traveled = percent * this._totalDistance;
    const pos = along(this._line!, this._traveled, { units: "kilometers" })
      .geometry.coordinates;
    this.setLatLng(L.latLng(pos[1]!, pos[0]!));

    if (this.options.rotation) {
      this._currentRotation = this._getBearingAtDistance();
    }

    return this;
  }

  setSpeed(speed: number): this {
    this.options.speed = speed;
    return this;
  }

  private _updatePositionAndRotation(): L.LatLng {
    const pos = along(this._line!, this._traveled, { units: "kilometers" })
      .geometry.coordinates;

    let latlng = L.latLng(pos[1]!, pos[0]!);
    this.setLatLng(latlng);

    if (this.options.rotation) {
      this._currentRotation = this._getBearingAtDistance();
    }
    return latlng;
  }

  private _getBearingAtDistance(): number {
    const slice = along(this._line!, this._traveled, { units: "kilometers" });
    const next = along(this._line!, this._traveled + 0.001, {
      units: "kilometers",
    });
    return bearing(slice, next);
  }

  private _estimateInitialBearing(): number {
    const p1 = this._line!.geometry.coordinates[0]!;
    const p2 = this._line!.geometry.coordinates[1]!;
    return bearing(
      { type: "Point", coordinates: p1 },
      { type: "Point", coordinates: p2 }
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
