import type { PanoramaPoint } from "../data/panoramas";

// ============================================================================
// GPS ACCURACY & PROXIMITY TUNING CONSTANTS
// Adjust these values based on testing with a real phone on-site.
// ============================================================================

/**
 * Ignore GPS readings if the reported accuracy circle is wider than this.
 * 15 m is a practical cutoff for open-sky phone GPS (typical ±4–10 m).
 * The P3↔P4 tight-segment guard applies its own stricter 5 m check separately.
 */
export const GPS_ACCURACY_THRESHOLD_METERS = 15;

/**
 * Hysteresis margin (in meters) for findNearestPanorama.
 * A switch is committed only when the nearest point beats the current by MORE
 * than this value, rejecting GPS jitter without adding lag.
 * Must stay ≤ half the tightest gap (~5 m for P3↔P4): 1.5 m is safe.
 */
export const SWITCH_MARGIN_METERS = 1.5;

/** Only auto-switch to a panorama if visitor is within this distance (in meters).
 * Default: 2m — works well for most GPS hardware in the open.
 * Increase to 5m / 8m if GPS is poor. Configurable live in the GPS badge.
 * Per-point overrides are defined in panoramas.ts.
 */
export const PANORAMA_PROXIMITY_THRESHOLD_METERS = 2;

/** Distance threshold (in meters) beyond which we suggest switching to Simulate Walk */
export const OFFSITE_DISTANCE_THRESHOLD_METERS = 5000; // 5 km

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates great-circle distance between two points in meters using Haversine formula
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest panorama index to a given coordinate.
 *
 * Uses hysteresis (SWITCH_MARGIN_METERS by default) so tightly-spaced photos
 * don't flicker back and forth under GPS jitter: the nearest point must beat
 * the current point by MORE than hysteresisMeters before a switch is committed.
 */
export function findNearestPanorama(
  current: Coordinates,
  panoramas: PanoramaPoint[],
  currentIdx: number,
  hysteresisMeters: number = SWITCH_MARGIN_METERS
): { nearestIndex: number; distance: number; distances: number[] } {
  let minIndex = 0;
  let minDistance = Infinity;
  const distances: number[] = [];

  for (let i = 0; i < panoramas.length; i++) {
    const d = haversineDistance(current.lat, current.lng, panoramas[i].lat, panoramas[i].lng);
    distances.push(d);
    if (d < minDistance) {
      minDistance = d;
      minIndex = i;
    }
  }

  // Hysteresis: only switch away from the current panorama if the nearest point
  // beats it by MORE than hysteresisMeters. This rejects GPS jitter while still
  // firing promptly when the user genuinely walks to the next spot.
  if (
    currentIdx >= 0 &&
    currentIdx < distances.length &&
    distances[currentIdx] - minDistance <= hysteresisMeters
  ) {
    return {
      nearestIndex: currentIdx,
      distance: distances[currentIdx],
      distances
    };
  }

  return {
    nearestIndex: minIndex,
    distance: minDistance,
    distances
  };
}

/**
 * Linear interpolation between two coordinates
 */
export function interpolateCoords(p1: Coordinates, p2: Coordinates, t: number): Coordinates {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    lat: p1.lat + (p2.lat - p1.lat) * clampedT,
    lng: p1.lng + (p2.lng - p1.lng) * clampedT
  };
}

/**
 * Format distance in meters to clean string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
