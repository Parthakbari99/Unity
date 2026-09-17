import { useState, useEffect } from "react";
import type { Coordinates } from "../utils/geo";

interface GeolocationState {
  coords: Coordinates | null;
  accuracy: number | null;
  error: string | null;
}

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    accuracy: null,
    error: null
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!navigator.geolocation) {
      setState({
        coords: null,
        accuracy: null,
        error: "Geolocation is not supported by your browser"
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          accuracy: position.coords.accuracy,
          error: null
        });
      },
      (err) => {
        let msg = "Failed to obtain GPS position";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS permission denied. Enable location in browser settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS signal unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS request timed out.";
        }
        setState((prev) => ({
          ...prev,
          error: msg
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return state;
}
