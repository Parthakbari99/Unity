import React from "react";

interface IntroModalProps {
  isOpen: boolean;
  onBegin: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onBegin }) => {
  if (!isOpen) return null;

  const handleBegin = () => {
    // Attempt fullscreen on user gesture
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    }
    onBegin();
  };

  return (
    <div className="intro">
      <div className="eyebrow">GPS-Tagged Panorama Walkthrough</div>
      <h1>GPS Panorama Walk</h1>
      <p>Experience the walk point by point with real GPS-tagged panorama photos.</p>
      <button className="begin-btn" onClick={handleBegin}>
        Begin the Walk
      </button>
    </div>
  );
};
