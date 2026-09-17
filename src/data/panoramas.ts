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
   * P3/P4 are only ~5 m apart — use 2 m here to avoid simultaneous overlap.
   * All other adjacent gaps are ≥35 m — 5 m is fine there.
   */
  proximityThreshold: number;
}

export const PANORAMAS: PanoramaPoint[] = [
  {
    id: 1,
    file: "IMG20260916170730.jpg",
    url: "/photos/IMG20260916170730.jpg",
    caption: "Walk Point 1",
    lat: 22.247078,
    lng: 70.797216,
    proximityThreshold: 5   // wide gap to P2 (~35 m) — 5 m is safe
  },
  {
    id: 2,
    file: "IMG20260916171121.jpg",
    url: "/photos/IMG20260916171121.jpg",
    caption: "Walk Point 2",
    lat: 22.247392,
    lng: 70.797286,
    proximityThreshold: 5   // wide gap on both sides — 5 m is safe
  },
  {
    id: 3,
    file: "IMG20260916171333.jpg",
    url: "/photos/IMG20260916171333.jpg",
    caption: "Walk Point 3",
    lat: 22.247572,
    lng: 70.797320,
    proximityThreshold: 2   // only ~5 m from P4 — must be <2.5 m to avoid overlap
  },
  {
    id: 4,
    file: "IMG20260916171446.jpg",
    url: "/photos/IMG20260916171446.jpg",
    caption: "Walk Point 4",
    lat: 22.247599,
    lng: 70.797281,
    proximityThreshold: 2   // only ~5 m from P3 — must be <2.5 m to avoid overlap
  },
  {
    id: 5,
    file: "IMG20260916171600.jpg",
    url: "/photos/IMG20260916171600.jpg",
    caption: "Walk Point 5 (Final)",
    lat: 22.247510,
    lng: 70.797414,
    proximityThreshold: 5   // end point, wide gap from P4 — 5 m is fine
  }
];