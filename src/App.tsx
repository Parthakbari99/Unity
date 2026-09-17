import { useState, useEffect, useCallback } from "react";
import { PANORAMAS } from "./data/panoramas";
import type { NavigationMode } from "./components/Header";
import { Header } from "./components/Header";
import { PanoramaViewer } from "./components/PanoramaViewer";
import { Controls } from "./components/Controls";
import { PathTrack } from "./components/PathTrack";
import { IntroModal } from "./components/IntroModal";
import { GpsBadge } from "./components/GpsBadge";
import { useGeolocation } from "./hooks/useGeolocation";
import { useWalkSimulation } from "./hooks/useWalkSimulation";
import type { Coordinates } from "./utils/geo";
import {
  findNearestPanorama,
  haversineDistance,
  GPS_ACCURACY_THRESHOLD_METERS,
  SWITCH_MARGIN_METERS,
} from "./utils/geo";

export default function App() {
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [mode, setMode] = useState<NavigationMode>("real-gps");

  // Telemetry state
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [nearestIdx, setNearestIdx] = useState<number>(0);
  const [distanceToStart, setDistanceToStart] = useState<number | null>(null);
  const [isWithinProximity, setIsWithinProximity] = useState<boolean>(false);
  const [isAccuracyPoor, setIsAccuracyPoor] = useState<boolean>(false);
  const [proximityThreshold, setProximityThreshold] = useState<number>(2);
  /**
   * True when the user is in the tight P3/P4 segment (~5 m gap) AND the GPS
   * accuracy is too coarse to reliably tell the two points apart. Auto-advance
   * is blocked in this state; the UI shows a "hold still, refining GPS" notice.
   */
  const [isRefiningSeg, setIsRefiningSeg] = useState<boolean>(false);

  // Hook 1: Real Geolocation
  const geo = useGeolocation(mode === "real-gps");

  // Hook 2: Simulated Walk
  const sim = useWalkSimulation({
    enabled: mode === "simulate-walk",
    panoramas: PANORAMAS,
    currentIndex
  });

  // Navigation action with safety boundaries
  const goTo = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(index, PANORAMAS.length - 1));
    setCurrentIndex(safeIndex);
  }, []);

  // Handle Manual Override (Back, Forward, Dot click, Arrow keys, Swipes)
  const handleManualNavigate = useCallback(
    (index: number) => {
      goTo(index);
      if (mode === "simulate-walk") {
        sim.syncToPoint(index);
      }
    },
    [goTo, mode, sim]
  );

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      handleManualNavigate(currentIndex - 1);
    }
  }, [currentIndex, handleManualNavigate]);

  const handleForward = useCallback(() => {
    if (currentIndex < PANORAMAS.length - 1) {
      handleManualNavigate(currentIndex + 1);
    }
  }, [currentIndex, handleManualNavigate]);

  // Mode change handler
  const handleModeChange = useCallback(
    (newMode: NavigationMode) => {
      setMode(newMode);
      if (newMode === "simulate-walk") {
        sim.syncToPoint(currentIndex);
      }
    },
    [currentIndex, sim]
  );

  // Real GPS processing: accuracy filtering & proximity-based matching
  useEffect(() => {
    if (mode !== "real-gps" || !geo.coords) return;

    // Calculate distance to start of the walk (Point 1)
    const distToStart = haversineDistance(
      geo.coords.lat,
      geo.coords.lng,
      PANORAMAS[0].lat,
      PANORAMAS[0].lng
    );
    setDistanceToStart(distToStart);

    // 1. Accuracy Filtering: ignore readings worse than the global threshold
    const poorAccuracy =
      geo.accuracy !== null && geo.accuracy > GPS_ACCURACY_THRESHOLD_METERS;
    setIsAccuracyPoor(poorAccuracy);

    if (poorAccuracy) {
      // Do not match or switch panoramas on an unreliable fix
      setIsRefiningSeg(false);
      return;
    }

    // 2. Proximity-Based Matching using SWITCH_MARGIN_METERS hysteresis
    const result = findNearestPanorama(
      geo.coords,
      PANORAMAS,
      currentIndex,
      SWITCH_MARGIN_METERS
    );
    setNearestIdx(result.nearestIndex);
    setNearestDistance(result.distance);

    // 3. Proximity check: per-point threshold from panoramas.ts, falling back
    //    to the user's selected slider value if a point doesn't define one.
    const pointThreshold = PANORAMAS[result.nearestIndex]?.proximityThreshold ?? proximityThreshold;
    const withinRange = result.distance <= pointThreshold;
    setIsWithinProximity(withinRange);

    // 4. Tight-segment guard: P3 (idx 2) and P4 (idx 3) are ~5 m apart.
    //    If GPS accuracy is not tight enough to distinguish them, block the
    //    auto-advance and show a "hold still, refining GPS" notice instead.
    const inTightSegment =
      (currentIndex === 2 || currentIndex === 3) &&
      (result.nearestIndex === 2 || result.nearestIndex === 3);
    const tightSegAccuracyPoor =
      inTightSegment &&
      geo.accuracy !== null &&
      geo.accuracy > 5; // 5 m is the max useful accuracy for a 5 m gap
    setIsRefiningSeg(tightSegAccuracyPoor);

    if (withinRange && result.nearestIndex !== currentIndex && !tightSegAccuracyPoor) {
      goTo(result.nearestIndex);
    }
  }, [mode, geo.coords, geo.accuracy, currentIndex, goTo, proximityThreshold]);

  // Simulated GPS processing: feeds into exact same nearest-point logic
  useEffect(() => {
    if (mode !== "simulate-walk" || !sim.simCoords) return;

    setIsAccuracyPoor(false);
    setIsWithinProximity(true);
    setDistanceToStart(0);

    const result = findNearestPanorama(sim.simCoords, PANORAMAS, currentIndex, 1.0);
    setNearestIdx(result.nearestIndex);
    setNearestDistance(result.distance);

    if (result.nearestIndex !== currentIndex) {
      goTo(result.nearestIndex);
    }
  }, [mode, sim.simCoords, currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleForward();
      } else if (e.key === "ArrowLeft") {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleForward, handleBack]);

  // Current active coordinates for telemetry display
  const activeCoords: Coordinates | null =
    mode === "real-gps" ? geo.coords : sim.simCoords;

  return (
    <>
      <IntroModal isOpen={showIntro} onBegin={() => setShowIntro(false)} />

      <Header
        currentIndex={currentIndex}
        totalPoints={PANORAMAS.length}
        caption={PANORAMAS[currentIndex]?.caption || ""}
        mode={mode}
        onModeChange={handleModeChange}
      />

      <div className="viewer-wrap">
        <PanoramaViewer
          panoramas={PANORAMAS}
          currentIndex={currentIndex}
          onNavigate={handleManualNavigate}
        />
      </div>

      <GpsBadge
        mode={mode}
        coords={activeCoords}
        accuracy={mode === "real-gps" ? geo.accuracy : null}
        error={mode === "real-gps" ? geo.error : null}
        nearestIndex={nearestIdx}
        nearestDistance={nearestDistance}
        distanceToStart={distanceToStart}
        isWithinProximity={mode === "simulate-walk" ? true : isWithinProximity}
        isAccuracyPoor={mode === "real-gps" ? isAccuracyPoor : false}
        isRefiningSeg={mode === "real-gps" ? isRefiningSeg : false}
        proximityThreshold={proximityThreshold}
        onProximityChange={setProximityThreshold}
        isSimulating={sim.isSimulating}
        isAtEnd={sim.isAtEnd}
        simSpeed={sim.simSpeed}
        onToggleSim={sim.toggleSimulating}
        onSpeedChange={sim.setSimSpeed}
        onResetSim={() => {
          sim.resetSim();
          goTo(0);
        }}
        onResetGps={() => goTo(0)}
        onSwitchToSimulate={() => handleModeChange("simulate-walk")}
      />

      <Controls
        currentIndex={currentIndex}
        totalPoints={PANORAMAS.length}
        onBack={handleBack}
        onForward={handleForward}
      />

      <PathTrack
        panoramas={PANORAMAS}
        currentIndex={currentIndex}
        onSelect={handleManualNavigate}
      />
    </>
  );
}
