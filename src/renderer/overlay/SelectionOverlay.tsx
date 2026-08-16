import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CaptureMode } from "@shared/types/ocr";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SELECTION = 4;

/**
 * The fullscreen drag-to-select surface (spec §4). One instance of this
 * renders per connected display — the window it lives in is already
 * positioned/sized to exactly match that display's bounds, so all local
 * coordinates here are already "display-relative" without any extra math.
 * `mode` distinguishes the two independent capture shortcuts: "text" runs OCR
 * on the selection, "image" just copies the raw screenshot.
 */
export function SelectionOverlay({ displayId, isActive, mode }: { displayId: number; isActive: boolean; mode: CaptureMode }) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cancel = useCallback(() => {
    window.potli.capture.cancel();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel]);

  const rect: Rect | null =
    origin && cursor
      ? {
          x: Math.min(origin.x, cursor.x),
          y: Math.min(origin.y, cursor.y),
          width: Math.abs(cursor.x - origin.x),
          height: Math.abs(cursor.y - origin.y)
        }
      : null;

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setOrigin({ x: e.clientX, y: e.clientY });
    setCursor({ x: e.clientX, y: e.clientY });
    setDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setCursor({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = async () => {
    if (!dragging || !rect) {
      setDragging(false);
      return;
    }
    setDragging(false);

    if (rect.width < MIN_SELECTION || rect.height < MIN_SELECTION) {
      // Too small to be intentional — let the user try again instead of
      // silently capturing a sliver.
      setOrigin(null);
      setCursor(null);
      return;
    }

    await window.potli.capture.regionSelected({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      displayId,
      mode
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen select-none overflow-hidden"
      style={{ cursor: "crosshair" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Dim layer with a "hole" cut out for the current selection */}
      <div className="pointer-events-none absolute inset-0 bg-black/28 animate-fade-in" style={maskStyle(rect)} />

      {rect && (
        <>
          <div
            className="pointer-events-none absolute border-[1.5px] border-accent shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          />
          <DimensionLabel rect={rect} />
        </>
      )}

      {!rect && isActive && <HintBadge mode={mode} />}
    </div>
  );
}

function maskStyle(rect: Rect | null): React.CSSProperties {
  if (!rect || rect.width < 1 || rect.height < 1) return {};
  // Cut a transparent hole over the active selection using a CSS mask so the
  // selected region reads as fully bright / un-dimmed while dragging.
  const { x, y, width, height } = rect;
  return {
    WebkitMaskImage: `linear-gradient(#000,#000)`,
    maskImage: `linear-gradient(#000,#000)`,
    clipPath: `polygon(
      0 0, 100% 0, 100% 100%, 0 100%, 0 0,
      ${x}px ${y}px, ${x}px ${y + height}px, ${x + width}px ${y + height}px, ${x + width}px ${y}px, ${x}px ${y}px
    )`
  };
}

function DimensionLabel({ rect }: { rect: Rect }) {
  const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  const top = rect.y + rect.height + 8;
  return (
    <div
      className="pointer-events-none absolute rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm animate-fade-in"
      style={{ left: rect.x, top }}
    >
      {label}
    </div>
  );
}

function HintBadge({ mode }: { mode: CaptureMode }) {
  const action = mode === "image" ? "copy as an image" : "extract text";
  return (
    <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 animate-fade-in rounded-full bg-black/60 px-3.5 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm">
      Drag to select an area to {action} · Esc to cancel
    </div>
  );
}
