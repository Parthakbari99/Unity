import React from "react";
import type { PanoramaPoint } from "../data/panoramas";

interface PathTrackProps {
  panoramas: PanoramaPoint[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const PathTrack: React.FC<PathTrackProps> = ({
  panoramas,
  currentIndex,
  onSelect
}) => {
  const total = panoramas.length;
  const progressPercent = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;

  return (
    <div className="path-track" role="region" aria-label="Walking path progress">
      <div className="path-line">
        <div className="path-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="path-dots">
        {panoramas.map((p, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          let dotClass = "dot";
          if (isActive) dotClass += " active";
          else if (isDone) dotClass += " done";

          return (
            <button
              key={p.id}
              type="button"
              className={dotClass}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(i);
                }
              }}
              title={`Point ${i + 1}: ${p.caption}`}
              aria-label={`Go to point ${i + 1}: ${p.caption}`}
            />
          );
        })}
      </div>
    </div>
  );
};
