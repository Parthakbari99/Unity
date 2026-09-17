export interface PanoramaPoint {
  id: number;
  file: string;
  url: string;
  caption: string;
  lat: number;
  lng: number;
  /**
   * Per-point trigger radius (meters). Used instead of the global slider value
   * when the point needs tighter or looser matching than the global default.
   * Recalibrated from real phone GPS readings — consecutive points are now
   * 11–18 m apart, so a shared 6 m radius is safe everywhere (no overlap risk).
   */
  proximityThreshold: number;
}

export const PANORAMAS: PanoramaPoint[] = [
  {
    id: 1,
    file: "IMG20260916170730.jpg",
    url: "/photos/IMG20260916170730.jpg",
    caption: "Walk Point 1",
    lat: 22.247149,
    lng: 70.797180,
    proximityThreshold: 6
  },
  {
    id: 2,
    file: "IMG20260916171121.jpg",
    url: "/photos/IMG20260916171121.jpg",
    caption: "Walk Point 2",
    lat: 22.247289,
    lng: 70.797190,
    proximityThreshold: 6
  },
  {
    id: 3,
    file: "IMG20260916171333.jpg",
    url: "/photos/IMG20260916171333.jpg",
    caption: "Walk Point 3",
    lat: 22.247381,
    lng: 70.797142,
    proximityThreshold: 6
  },
  {
    id: 4,
    file: "IMG20260916171446.jpg",
    url: "/photos/IMG20260916171446.jpg",
    caption: "Walk Point 4",
    lat: 22.247514,
    lng: 70.797200,
    proximityThreshold: 6
  },
  {
    id: 5,
    file: "IMG20260916171600.jpg",
    url: "/photos/IMG20260916171600.jpg",
    caption: "Walk Point 5 (Final)",
    lat: 22.247541,
    lng: 70.797371,
    proximityThreshold: 6
  }
];