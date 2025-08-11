import * as L from "leaflet";

declare module "leaflet" {
  interface TrackMarkerOptions extends MarkerOptions {
    speed?: number; // km/s
    autoPlay?: boolean;
    rotation?: boolean;
  }

  class TrackMarker extends L.Marker {
    constructor(line: L.Polyline, options?: TrackMarkerOptions);
    play(): this;
    pause(): this;
    reset(): this;
    seek(percent: number): this;
    setSpeed(speed: number): this;
  }

  // 工厂函数类型
  function trackMarker(
    line: L.Polyline,
    options?: TrackMarkerOptions
  ): TrackMarker;
}
