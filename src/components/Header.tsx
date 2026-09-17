import React from "react";

export type NavigationMode = "real-gps" | "simulate-walk";

interface HeaderProps {
  currentIndex: number;
  totalPoints: number;
  caption: string;
  mode: NavigationMode;
  onModeChange: (mode: NavigationMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentIndex,
  totalPoints,
  caption,
  mode,
  onModeChange
}) => {
  return (
    <header>
      <div className="header-left">
        <h1>GPS Panorama Walk</h1>
        <p className="instructions">
          Drag horizontally to pan across panorama · Scroll to zoom.
        </p>
        <div className="caption">{caption}</div>
      </div>

      <div className="header-right">
        <div className="step-count">
          Point {currentIndex + 1} of {totalPoints}
        </div>

        <nav className="mode-switcher" aria-label="Navigation Mode">
          <button
            type="button"
            className={`mode-btn ${mode === "simulate-walk" ? "active" : ""}`}
            onClick={() => onModeChange("simulate-walk")}
            aria-pressed={mode === "simulate-walk"}
          >
            <span>🚶 Simulate Walk</span>
          </button>

          <button
            type="button"
            className={`mode-btn ${mode === "real-gps" ? "active" : ""}`}
            onClick={() => onModeChange("real-gps")}
            aria-pressed={mode === "real-gps"}
          >
            <span>📍 Real GPS</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
