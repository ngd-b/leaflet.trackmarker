import "leaflet";

declare global {
  interface Window {
    L?: typeof L;
  }
  namespace L {
    interface TrackMarkerOptions extends MarkerOptions {
      /**
       * 播放速度，默认 0.1 km/s
       */
      speed?: number; // km/s
      /**
       * 是否自动播放，默认 true
       */
      autoPlay?: boolean;
      /**
       * 是否旋转，默认 true
       */
      rotation?: boolean;
      /**
       * 旋转偏移量，默认 0
       * 单位：度
       */
      rotationOffset?: number;

      /**
       * 播放完成回调
       */
      onFinish?: () => void;
      /**
       * 播放进度回调
       *
       */
      onProgress?: () => void;
      /**
       * 暂停回调
       *
       */
      onPause?: () => void;
      /**
       * 播放开始回调
       *
       */
      onBeforePlay?: () => void;
      /**
       * 播放回调
       *
       */
      onPlay?: () => void;
      /**
       * 重置回调
       *
       */
      onReset?: () => void;
    }

    class TrackMarker extends L.Marker {
      constructor(
        line: L.Polyline<GeoJSON.LineString>,
        options?: TrackMarkerOptions
      );
      /**
       * 播放
       */
      play(): this;
      /**
       * 暂停
       */
      pause(): this;
      /**
       * 重置
       *
       */
      reset(): this;
      /**
       * 定位到指定百分比
       *
       * @param percent 百分比
       */
      seek(percent: number): this;
      /**
       * 设置速度
       *
       * @param speed 速度
       */
      setSpeed(speed: number): this;
      /**
       * 获取当前已移动的长度
       *
       */
      getTraveled(): number;
      /**
       * 获取轨迹的总长度
       *
       */
      getTotalDistance(): number;
    }

    /**
     * 轨迹移动
     *
     * @param line 轨迹线
     * @param options 选项
     * @returns this
     */
    function trackMarker(
      line: L.Polyline<GeoJSON.LineString>,
      options?: TrackMarkerOptions
    ): TrackMarker;
  }
}
