import "leaflet";

declare global {
  interface Window {
    L?: typeof L;
  }
  namespace L {
    interface TrackMarkerOptions extends MarkerOptions {
      speed?: number; // km/s
      autoPlay?: boolean;
      rotation?: boolean;
      rotationOffset?: number;

      onFinish?: () => void;
      onProgress?: () => void;
      onPause?: () => void;
      onBeforePlay?: () => void;
      onPlay?: () => void;
      onReset?: () => void;
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
}
