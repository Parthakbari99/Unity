import React, { useRef, useEffect, useState, useCallback } from "react";
import type { PanoramaPoint } from "../data/panoramas";

interface PanoramaViewerProps {
  panoramas: PanoramaPoint[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

interface LayerState {
  index: number;
  url: string;
  loaded: boolean;
  naturalWidth: number;
  naturalHeight: number;
  isPano: boolean;
}

const EMPTY_LAYER: LayerState = {
  index: -1,
  url: "",
  loaded: false,
  naturalWidth: 0,
  naturalHeight: 0,
  isPano: false
};

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  panoramas,
  currentIndex,
  onNavigate: _onNavigate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Two layers for crossfading
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [layerA, setLayerA] = useState<LayerState>({ ...EMPTY_LAYER });
  const [layerB, setLayerB] = useState<LayerState>({ ...EMPTY_LAYER });

  // Pan & Zoom state
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [simpleFitMode, setSimpleFitMode] = useState<"fit" | "fill">("fit");

  const startPointerX = useRef<number>(0);
  const startPointerY = useRef<number>(0);
  const startPanX = useRef<number>(0);
  const startPanY = useRef<number>(0);
  const touchDistanceRef = useRef<number | null>(null);

  // Track which panorama index is currently loaded/loading to prevent re-triggering
  const loadedIndexRef = useRef<number>(-1);
  const loadingImgRef = useRef<HTMLImageElement | null>(null);

  // Ref storing active state for callbacks to avoid stale closures
  const stateRef = useRef<{
    activeLayer: "A" | "B";
    layerA: LayerState;
    layerB: LayerState;
    simpleFitMode: "fit" | "fill";
  }>({
    activeLayer: "A",
    layerA: EMPTY_LAYER,
    layerB: EMPTY_LAYER,
    simpleFitMode: "fit"
  });

  useEffect(() => {
    stateRef.current = { activeLayer, layerA, layerB, simpleFitMode };
  }, [activeLayer, layerA, layerB, simpleFitMode]);

  // Preload an image URL
  const preloadImage = useCallback((url: string) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  }, []);

  // Compute pan clamping bounds based on actual rendered dimensions
  const clampPan = useCallback(
    (targetX: number, targetY: number, targetZoom: number) => {
      if (!containerRef.current) return { clampedX: targetX, clampedY: targetY };
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      const { activeLayer: active, layerA: lA, layerB: lB, simpleFitMode: mode } = stateRef.current;
      const activeState = active === "A" ? lA : lB;

      if (!activeState.loaded || activeState.naturalWidth <= 0 || activeState.naturalHeight <= 0) {
        return { clampedX: 0, clampedY: 0 };
      }

      const aspect = activeState.naturalWidth / activeState.naturalHeight;
      const isPano = aspect >= 1.8;

      let renderedW = 0;
      let renderedH = 0;

      if (isPano) {
        // Panoramic photo: fills container height, extends horizontally
        renderedH = containerH * targetZoom;
        renderedW = containerH * aspect * targetZoom;
      } else {
        // Simple standard photo
        if (mode === "fill") {
          const scale = Math.max(containerW / activeState.naturalWidth, containerH / activeState.naturalHeight);
          renderedW = activeState.naturalWidth * scale * targetZoom;
          renderedH = activeState.naturalHeight * scale * targetZoom;
        } else {
          // Fit mode: cleanly contained inside the frame
          const scale = Math.min(containerW / activeState.naturalWidth, containerH / activeState.naturalHeight);
          renderedW = activeState.naturalWidth * scale * targetZoom;
          renderedH = activeState.naturalHeight * scale * targetZoom;
        }
      }

      // Flex-centered: panX = 0 centers the image.
      // Boundaries are symmetric around 0
      const maxPanX = renderedW > containerW ? (renderedW - containerW) / 2 : 0;
      const minPanX = -maxPanX;

      const maxPanY = renderedH > containerH ? (renderedH - containerH) / 2 : 0;
      const minPanY = -maxPanY;

      return {
        clampedX: Math.max(minPanX, Math.min(maxPanX, targetX)),
        clampedY: Math.max(minPanY, Math.min(maxPanY, targetY))
      };
    },
    []
  );

  // Load a photo/panorama into the appropriate layer
  const loadPanorama = useCallback((index: number) => {
    const targetPoint = panoramas[index];
    if (!targetPoint) return;

    // Abort any in-flight load
    if (loadingImgRef.current) {
      loadingImgRef.current.onload = null;
      loadingImgRef.current.onerror = null;
      loadingImgRef.current = null;
    }

    loadedIndexRef.current = index;

    // Determine target layer for crossfading
    const currentActive = stateRef.current.activeLayer;
    const isFirstLoad = index === 0 && currentActive === "A" && stateRef.current.layerA.index === -1;
    const nextLayerKey: "A" | "B" = isFirstLoad
      ? "A"
      : currentActive === "A" ? "B" : "A";

    const nextState: LayerState = {
      index,
      url: targetPoint.url,
      loaded: false,
      naturalWidth: 0,
      naturalHeight: 0,
      isPano: false
    };

    if (nextLayerKey === "A") {
      setLayerA(nextState);
    } else {
      setLayerB(nextState);
    }

    const img = new Image();
    loadingImgRef.current = img;
    img.src = targetPoint.url;

    img.onload = () => {
      loadingImgRef.current = null;
      if (loadedIndexRef.current !== index) return;

      const isPano = img.naturalHeight > 0 && (img.naturalWidth / img.naturalHeight >= 1.8);

      const loadedState: Partial<LayerState> = {
        loaded: true,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        isPano
      };

      if (nextLayerKey === "A") {
        setLayerA((prev) => ({ ...prev, ...loadedState }));
      } else {
        setLayerB((prev) => ({ ...prev, ...loadedState }));
      }
      setActiveLayer(nextLayerKey);

      // Reset position to center for newly loaded photo
      setPanX(0);
      setPanY(0);
      setZoom(1);

      // Preload next image
      const nextPano = panoramas[index + 1];
      if (nextPano) {
        preloadImage(nextPano.url);
      }
    };

    img.onerror = () => {
      loadingImgRef.current = null;
      if (loadedIndexRef.current !== index) return;

      if (nextLayerKey === "A") {
        setLayerA((prev) => ({ ...prev, loaded: true }));
      } else {
        setLayerB((prev) => ({ ...prev, loaded: true }));
      }
      setActiveLayer(nextLayerKey);
    };
  }, [panoramas, preloadImage]);

  // React to currentIndex changes
  useEffect(() => {
    if (loadedIndexRef.current === currentIndex) return;
    loadPanorama(currentIndex);
  }, [currentIndex, loadPanorama]);

  // Initial load on mount
  useEffect(() => {
    if (panoramas[0]) {
      loadPanorama(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle window resizing to keep image within bounds
  useEffect(() => {
    const handleResize = () => {
      const { clampedX, clampedY } = clampPan(panX, panY, zoom);
      setPanX(clampedX);
      setPanY(clampedY);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPan, panX, panY, zoom]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasInteracted(true);
    startPointerX.current = e.clientX;
    startPointerY.current = e.clientY;
    startPanX.current = panX;
    startPanY.current = panY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPointerX.current;
    const dy = e.clientY - startPointerY.current;
    const { clampedX, clampedY } = clampPan(startPanX.current + dx, startPanY.current + dy, zoom);
    setPanX(clampedX);
    setPanY(clampedY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setHasInteracted(true);
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(1, Math.min(3, prevZoom + zoomDelta));
      const { clampedX, clampedY } = clampPan(panX, panY, nextZoom);
      setPanX(clampedX);
      setPanY(clampedY);
      return nextZoom;
    });
  };

  // Touch handlers (pan + pinch zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    setHasInteracted(true);
    if (e.touches.length === 1) {
      setIsDragging(true);
      startPointerX.current = e.touches[0].clientX;
      startPointerY.current = e.touches[0].clientY;
      startPanX.current = panX;
      startPanY.current = panY;
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - startPointerX.current;
      const dy = e.touches[0].clientY - startPointerY.current;
      const { clampedX, clampedY } = clampPan(startPanX.current + dx, startPanY.current + dy, zoom);
      setPanX(clampedX);
      setPanY(clampedY);
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / touchDistanceRef.current;

      setZoom((prevZoom) => {
        const nextZoom = Math.max(1, Math.min(3, prevZoom * factor));
        const { clampedX, clampedY } = clampPan(panX, panY, nextZoom);
        setPanX(clampedX);
        setPanY(clampedY);
        return nextZoom;
      });
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    // Swipe only pans the image — navigation is via Back/Next buttons or path dots
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  const activeData = activeLayer === "A" ? layerA : layerB;
  const isCurrentPano = activeData.isPano;

  const renderLayer = (layer: LayerState, isActive: boolean) => {
    const point = panoramas[layer.index];
    if (!point) return null;
    const hasPhoto = layer.naturalWidth > 10;
    const isPano = layer.isPano;

    return (
      <div
        className={`pano-layer ${isActive ? "active" : ""} ${isPano ? "layer-pano" : "layer-simple"}`}
      >
        {hasPhoto ? (
          <>
            {/* Ambient blurred backdrop for simple photos to eliminate black void */}
            {!isPano && (
              <div
                className="pano-ambient-backdrop"
                style={{ backgroundImage: `url(${layer.url})` }}
                aria-hidden="true"
              />
            )}

            <img
              src={layer.url}
              alt={point.caption || `Point ${layer.index + 1}`}
              className={`pano-img ${isPano ? "img-pano" : `img-simple mode-${simpleFitMode}`}`}
              style={{
                transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out"
              }}
              draggable={false}
            />
          </>
        ) : (
          <div className="pano-placeholder">
            <div className="point-badge">Point {layer.index + 1} of {panoramas.length}</div>
            <div className="filename">{point.file || "photo.jpg"}</div>
            <div className="coords">
              GPS: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </div>
            <p style={{ maxWidth: "340px", fontSize: "0.85rem", opacity: 0.8, marginTop: "14px", lineHeight: 1.5 }}>
              Ready for your photo! Drop <strong>{point.file}</strong> into the <code>public/photos/</code> folder.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`frame-box ${isDragging ? "dragging" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {renderLayer(layerA, activeLayer === "A")}
      {renderLayer(layerB, activeLayer === "B")}

      {/* Media Type Badge */}
      {activeData.loaded && (
        <div className="pano-type-pill">
          {isCurrentPano ? "📷 360° Panorama" : "🖼️ Photo"}
        </div>
      )}

      {/* Horizontal Pan / Zoom Hint */}
      <div className={`pano-hint ${hasInteracted ? "hidden" : ""}`}>
        {isCurrentPano
          ? "↔ Drag horizontally to look around · Scroll to zoom"
          : "Scroll or pinch to zoom · Drag to pan"}
      </div>

      {/* Zoom & Fit Controls Pill */}
      <div className="zoom-controls" aria-label="Zoom Controls">
        {!isCurrentPano && activeData.loaded && (
          <button
            type="button"
            className="zoom-btn fit-toggle-btn"
            onClick={() => {
              setSimpleFitMode((m) => {
                const next = m === "fit" ? "fill" : "fit";
                setTimeout(() => {
                  setPanX(0);
                  setPanY(0);
                }, 0);
                return next;
              });
            }}
            title={simpleFitMode === "fit" ? "Switch to Fill Screen" : "Switch to Fit Photo"}
            style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0 6px", width: "auto" }}
          >
            {simpleFitMode === "fit" ? "FIT" : "FILL"}
          </button>
        )}
        <button
          type="button"
          className="zoom-btn"
          onClick={() => {
            setZoom((z) => {
              const next = Math.min(3, z + 0.25);
              const { clampedX, clampedY } = clampPan(panX, panY, next);
              setPanX(clampedX);
              setPanY(clampedY);
              return next;
            });
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          className="zoom-btn"
          onClick={() => {
            setZoom(1);
            setPanX(0);
            setPanY(0);
          }}
          title="Reset Zoom & Pan"
          style={{ fontSize: "0.7rem" }}
        >
          1x
        </button>
        <button
          type="button"
          className="zoom-btn"
          onClick={() => {
            setZoom((z) => {
              const next = Math.max(1, z - 0.25);
              const { clampedX, clampedY } = clampPan(panX, panY, next);
              setPanX(clampedX);
              setPanY(clampedY);
              return next;
            });
          }}
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
};

