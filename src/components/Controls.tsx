import React from "react";

interface ControlsProps {
  currentIndex: number;
  totalPoints: number;
  onBack: () => void;
  onForward: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentIndex,
  totalPoints,
  onBack,
  onForward
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= totalPoints - 1;

  return (
    <div className="controls">
      <button
        type="button"
        className="ctrl-btn"
        onClick={onBack}
        disabled={isFirst}
        aria-label="Previous Panorama"
      >
        ← Back
      </button>

      <button
        type="button"
        className="ctrl-btn forward-btn"
        onClick={onForward}
        disabled={isLast}
        aria-label="Next Panorama"
      >
        {isLast ? "Arrived at Final Point" : "Next Point →"}
      </button>
    </div>
  );
};
