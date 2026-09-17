import { useState, useEffect, useRef, useCallback } from "react";
import type { PanoramaPoint } from "../data/panoramas";
import type { Coordinates } from "../utils/geo";
import { interpolateCoords } from "../utils/geo";

interface UseWalkSimulationOptions {
  enabled: boolean;
  panoramas: PanoramaPoint[];
  currentIndex: number;
}

export function useWalkSimulation({
  enabled,
  panoramas,
  currentIndex
}: UseWalkSimulationOptions) {
  const [simCoords, setSimCoords] = useState<Coordinates | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(0.5);

  const segmentIndexRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Sync segment if user clicks a dot or navigates
  const syncToPoint = useCallback(
    (index: number) => {
      const targetIdx = Math.max(0, Math.min(index, panoramas.length - 1));
      segmentIndexRef.current = targetIdx;
      progressRef.current = 0;
      if (panoramas[targetIdx]) {
        setSimCoords({
          lat: panoramas[targetIdx].lat,
          lng: panoramas[targetIdx].lng
        });
      }
    },
    [panoramas]
  );

  const resetSim = useCallback(() => {
    segmentIndexRef.current = 0;
    progressRef.current = 0;
    if (panoramas[0]) {
      setSimCoords({
        lat: panoramas[0].lat,
        lng: panoramas[0].lng
      });
    }
    setIsSimulating(true);
  }, [panoramas]);

  const toggleSimulating = useCallback(() => {
    setIsSimulating((prev) => {
      const next = !prev;
      // If resuming while at the very end, restart from beginning
      if (next && segmentIndexRef.current >= panoramas.length - 1) {
        segmentIndexRef.current = 0;
        progressRef.current = 0;
        if (panoramas[0]) {
          setSimCoords({
            lat: panoramas[0].lat,
            lng: panoramas[0].lng
          });
        }
      }
      return next;
    });
  }, [panoramas]);

  // When mode is enabled, initialize coordinates
  useEffect(() => {
    if (enabled) {
      syncToPoint(currentIndex);
    }
  }, [enabled, currentIndex, syncToPoint]);

  useEffect(() => {
    if (!enabled || !isSimulating || panoramas.length < 2) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const BASE_SEGMENT_DURATION_MS = 4000; // 4s per segment at 1x speed (8s per segment at 0.5x)
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // If already arrived at the final panorama (Point 14)
      if (segmentIndexRef.current >= panoramas.length - 1) {
        const last = panoramas[panoramas.length - 1];
        setSimCoords({ lat: last.lat, lng: last.lng });
        setIsSimulating(false);
        return;
      }

      const effectiveDuration = BASE_SEGMENT_DURATION_MS / simSpeed;
      progressRef.current += delta / effectiveDuration;

      // Advance through segments
      while (progressRef.current >= 1.0) {
        progressRef.current -= 1.0;
        segmentIndexRef.current += 1;

        // If arrived at the final panorama
        if (segmentIndexRef.current >= panoramas.length - 1) {
          segmentIndexRef.current = panoramas.length - 1;
          progressRef.current = 0;
          const lastPoint = panoramas[panoramas.length - 1];
          setSimCoords({ lat: lastPoint.lat, lng: lastPoint.lng });
          setIsSimulating(false);
          return;
        }
      }

      const p1 = panoramas[segmentIndexRef.current];
      const p2 = panoramas[segmentIndexRef.current + 1] || p1;

      if (p1 && p2) {
        const interpolated = interpolateCoords(
          { lat: p1.lat, lng: p1.lng },
          { lat: p2.lat, lng: p2.lng },
          progressRef.current
        );
        setSimCoords(interpolated);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, isSimulating, simSpeed, panoramas]);

  const isAtEnd = segmentIndexRef.current >= panoramas.length - 1;

  return {
    simCoords,
    isSimulating,
    isAtEnd,
    simSpeed,
    setSimSpeed,
    toggleSimulating,
    resetSim,
    syncToPoint
  };
}
