import * as L from "leaflet";
import "./leaflet.trackmarker";
import { along, bearing, length } from "@turf/turf";
import type { Feature, LineString } from "geojson";

// 插件实现
export class TrackMarker extends L.Marker {
  declare options: L.TrackMarkerOptions;

  private _polyline: L.Polyline;
  private _line: Feature<LineString>;
  private _totalDistance: number;
  private _isPlaying: boolean = false;
  private _elapsedTime: number = 0;
  private _animationId: number | null = null;

  constructor(line: L.Polyline, options?: L.TrackMarkerOptions) {
    // 默认选项
    const defaultOptions: L.TrackMarkerOptions = {
      speed: 0.1,
      autoPlay: true,
      rotation: true,
    };
    const latlngs = line.getLatLngs() as L.LatLng[];
    if (latlngs.length < 2) {
      throw new Error("【leaflet.TrackMarker】Polyline must have two points");
    }
    super(latlngs[0]!, { ...defaultOptions, ...options });

    this._polyline = line;
    this._line = this._polyline.toGeoJSON() as Feature<LineString>;

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
    super.onRemove(map);
    return this;
  }

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

  reset(): this {
    this.pause();
    this._elapsedTime = 0;
    const point = this._line.geometry.coordinates[0]!;
    this.setLatLng(L.latLng(point[1]!, point[0]!));
    if (this.options.rotation) {
      this._setRotation(this._estimateInitialBearing());
    }
    this.fire("reset");
    return this;
  }

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

  setSpeed(speed: number): this {
    this.options.speed = speed;
    return this;
  }

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

  private _getBearingAtDistance(distance: number): number {
    const slice = along(this._line, distance, { units: "kilometers" });
    const next = along(this._line, distance + 0.001, { units: "kilometers" });
    return bearing(slice, next);
  }

  private _estimateInitialBearing(): number {
    const p1 = this._line.geometry.coordinates[0]!;
    const p2 = this._line.geometry.coordinates[1]!;
    return bearing(
      { type: "Point", coordinates: p1 },
      { type: "Point", coordinates: p2 }
    );
  }

  private _setRotation(angle: number): void {
    const icon = this.getElement();
    if (!icon) return;

    try {
      let currentTransform =
        window.getComputedStyle(icon).transform || icon.style.transform || "";

      const withoutRotate = currentTransform
        .replace(/rotate\([^)]*\)/g, "")
        .trim();

      const newTransform = withoutRotate
        ? `${withoutRotate} rotate(${angle}deg)`
        : `rotate(${angle}deg)`;

      if (newTransform !== icon.style.transform) {
        icon.style.transform = newTransform;
      }
    } catch (error) {
      console.warn("Failed to set rotation:", error);
    }
  }
}

// 工厂函数：小写，返回实例
export function trackMarker(
  line: L.Polyline,
  options?: L.TrackMarkerOptions
): L.TrackMarker {
  return new TrackMarker(line, options);
}

// 使用 Leaflet 的插件机制
L.Map.addInitHook(function (this: L.Map) {
  // @ts-ignore
  this.trackMarker = (
    line: L.Polyline,
    options?: L.TrackMarkerOptions
  ): L.TrackMarker => {
    return new TrackMarker(line, options);
  };
});

if (typeof window !== "undefined" && window.L) {
  window.L.trackMarker = trackMarker;
  window.L.TrackMarker = TrackMarker;
}
