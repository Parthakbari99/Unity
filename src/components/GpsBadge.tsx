import React from "react";
import type { NavigationMode } from "./Header";
import type { Coordinates } from "../utils/geo";
import {
  formatDistance,
  GPS_ACCURACY_THRESHOLD_METERS,
  OFFSITE_DISTANCE_THRESHOLD_METERS
} from "../utils/geo";

interface GpsBadgeProps {
  mode: NavigationMode;
  coords: Coordinates | null;
  accuracy: number | null;
  error: string | null;
  nearestIndex: number;
  nearestDistance: number | null;
  distanceToStart?: number | null;
  isWithinProximity?: boolean;
  isAccuracyPoor?: boolean;
  /** True when GPS is too coarse to distinguish P3 from P4; blocks auto-advance */
  isRefiningSeg?: boolean;
  proximityThreshold?: number;
  onProximityChange?: (dist: number) => void;
  isSimulating?: boolean;
  isAtEnd?: boolean;
  simSpeed?: number;
  onToggleSim?: () => void;
  onSpeedChange?: (speed: number) => void;
  onResetSim?: () => void;
  onResetGps?: () => void;
  onSwitchToSimulate?: () => void;
}

export const GpsBadge: React.FC<GpsBadgeProps> = ({
  mode,
  coords,
  accuracy,
  error,
  nearestIndex,
  nearestDistance,
  distanceToStart,
  isWithinProximity = false,
  isAccuracyPoor = false,
  isRefiningSeg = false,
  proximityThreshold = 2,
  onProximityChange,
  isSimulating = true,
  isAtEnd = false,
  simSpeed = 1,
  onToggleSim,
  onSpeedChange,
  onResetSim,
  onResetGps,
  onSwitchToSimulate
}) => {
  const isReal = mode === "real-gps";
  const isDotWarning = !coords || (isReal && (isAccuracyPoor || !isWithinProximity));

  return (
    <div className="gps-badge" role="status" aria-live="polite">
      <div className="gps-badge-header">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className={`gps-badge-status-dot ${
              error ? "error" : isDotWarning ? "warning" : ""
            }`}
          />
          <span>{isReal ? "Real GPS Tracking" : "Simulated GPS Walk"}</span>
        </div>
        {accuracy !== null && isReal && (
          <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
            ±{Math.round(accuracy)}m
          </span>
        )}
      </div>

      {error ? (
        <div style={{ color: "#f87171", fontSize: "0.72rem" }}>{error}</div>
      ) : coords ? (
        <>
          <div className="gps-badge-coords">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>

          {isReal && (
            <>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: isAccuracyPoor ? "#fbbf24" : "var(--cream)",
                  opacity: 0.9
                }}
              >
                GPS accuracy: ±{accuracy !== null ? Math.round(accuracy) : "?"}m
                {isAccuracyPoor && ` (low accuracy — need < ${GPS_ACCURACY_THRESHOLD_METERS}m)`}
              </div>

              {isAccuracyPoor ? (
                <div style={{ fontSize: "0.72rem", color: "#fbbf24", marginTop: "2px" }}>
                  ⚠️ GPS fix is too imprecise. Waiting for a more accurate signal...
                </div>
              ) : isRefiningSeg ? (
                <div style={{ fontSize: "0.72rem", color: "#fb923c", marginTop: "2px", fontWeight: 500 }}>
                  🛰️ Hold still — refining GPS between P3 &amp; P4 (only ~5 m apart).
                  Auto-advance paused until accuracy ≤ 5 m.
                </div>
              ) : !isWithinProximity ? (
                <div style={{ marginTop: "4px" }}>
                  {distanceToStart !== null && distanceToStart !== undefined && distanceToStart > 100 ? (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--bronze-light)",
                        fontWeight: 500
                      }}
                    >
                      📍 You're {formatDistance(distanceToStart)} from the start of the walk
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.73rem",
                        color: "#fbbf24",
                        fontWeight: 500
                      }}
                    >
                      🚶 Nearest: Point {nearestIndex + 1} ({nearestDistance !== null ? formatDistance(nearestDistance) : ""} away — needs &lt; {proximityThreshold}m)
                    </div>
                  )}
                  {distanceToStart !== null &&
                    distanceToStart !== undefined &&
                    distanceToStart > OFFSITE_DISTANCE_THRESHOLD_METERS && (
                      <div style={{ marginTop: "6px", fontSize: "0.72rem", opacity: 0.9 }}>
                        <div>You're far from the walk path. Try Simulate Walk mode:</div>
                        <button
                          type="button"
                          className="speed-btn"
                          style={{
                            marginTop: "5px",
                            padding: "4px 8px",
                            background: "var(--bronze)",
                            color: "var(--stone-dark)",
                            fontWeight: "bold"
                          }}
                          onClick={onSwitchToSimulate}
                        >
                          🚶 Switch to Simulate Walk
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                <div style={{ fontSize: "0.72rem", color: "var(--bronze-light)", marginTop: "2px" }}>
                  ✅ Matched: Point {nearestIndex + 1} ({nearestDistance !== null ? formatDistance(nearestDistance) : ""} away)
                </div>
              )}

              {/* Trigger radius selector for on-site calibration */}
              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.68rem"
                }}
              >
                <span style={{ opacity: 0.8 }}>Trigger radius:</span>
                {([0.5, 2, 5, 8, 12] as const).map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    className={`speed-btn ${proximityThreshold === dist ? "active" : ""}`}
                    style={{ padding: "2px 5px", fontSize: "0.66rem" }}
                    onClick={() => onProximityChange?.(dist)}
                    title={`Trigger image when within ${dist}m`}
                  >
                    {dist < 1 ? `${dist * 100}cm` : `${dist}m`}
                  </button>
                ))}
              </div>

              {/* Reset to Point 1 button for Real GPS mode */}
              <div style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className="speed-btn"
                  onClick={onResetGps}
                  title="Go back to Point 1 and restart the walk"
                  style={{
                    padding: "3px 10px",
                    fontSize: "0.7rem",
                    background: "rgba(201,154,94,0.18)",
                    border: "1px solid var(--bronze)",
                    color: "var(--bronze-light)",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  ↺ Reset to Point 1
                </button>
              </div>
            </>
          )}

          {!isReal && (
            <>
              {isAtEnd ? (
                <div style={{ fontSize: "0.72rem", color: "var(--bronze-light)", fontWeight: "bold" }}>
                  ✨ Arrived at final view! (Point {nearestIndex + 1})
                </div>
              ) : nearestDistance !== null ? (
                <div style={{ fontSize: "0.72rem", color: "var(--bronze-light)" }}>
                  Nearest: Point {nearestIndex + 1} ({formatDistance(nearestDistance)})
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <div style={{ opacity: 0.8, fontSize: "0.72rem" }}>Acquiring satellite lock...</div>
      )}

      {!isReal && (
        <div className="gps-sim-controls">
          <button
            type="button"
            className="speed-btn"
            onClick={onToggleSim}
            title={isAtEnd ? "Restart Walk from Point 1" : isSimulating ? "Pause Simulation" : "Resume Simulation"}
          >
            {isAtEnd ? "↺ Restart" : isSimulating ? "⏸ Pause" : "▶ Resume"}
          </button>

          <button
            type="button"
            className={`speed-btn ${simSpeed === 0.5 ? "active" : ""}`}
            onClick={() => onSpeedChange?.(0.5)}
          >
            0.5x
          </button>
          <button
            type="button"
            className={`speed-btn ${simSpeed === 1 ? "active" : ""}`}
            onClick={() => onSpeedChange?.(1)}
          >
            1x
          </button>
          <button
            type="button"
            className={`speed-btn ${simSpeed === 2 ? "active" : ""}`}
            onClick={() => onSpeedChange?.(2)}
          >
            2x
          </button>
          <button
            type="button"
            className={`speed-btn ${simSpeed === 4 ? "active" : ""}`}
            onClick={() => onSpeedChange?.(4)}
          >
            4x
          </button>

          <button
            type="button"
            className="speed-btn"
            onClick={onResetSim}
            title="Reset to Point 1"
          >
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  );
};
