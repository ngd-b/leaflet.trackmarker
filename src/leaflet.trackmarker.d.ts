import * as L from "leaflet";
import type { GeoJsonObject } from "geojson";

declare module "leaflet" {
  type TrackLine =
    | FeatureCollection<LineString>
    | Feature<LineString>
    | LineString
    | [number, number][];

  interface TrackMarkerOptions extends L.MarkerOptions {
    /** 移动速度，单位 km/s */
    speed?: number;
    /** 是否自动开始播放 */
    autoPlay?: boolean;
    /** 是否启用旋转（方向匹配路径） */
    rotation?: boolean;
    /** 路径样式（可选，用于调试显示路径） */
    pathStyle?: L.PolylineOptions;
  }

  class TrackMarker extends L.Marker {
    constructor(line: TrackLine, options?: TrackMarkerOptions);
    play(): this;
    pause(): this;
    reset(): this;
    seek(percent: number): this;
    setSpeed(speed: number): this;
  }

  interface Map {
    trackMarker(line: TrackLine, options?: TrackMarkerOptions): TrackMarker;
  }
}
