import { screen } from "electron";
import { MAIN_WINDOW_DEFAULT_SIZE } from "../../shared/constants";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ensures remembered bounds still land on a currently-connected display
 * (handles the case where a monitor was unplugged since last launch). */
export function sanitizeBounds(bounds: WindowBounds | undefined): WindowBounds | undefined {
  if (!bounds) return undefined;
  const displays = screen.getAllDisplays();
  const fitsAnyDisplay = displays.some((d) => {
    const b = d.workArea;
    return bounds.x >= b.x - 50 && bounds.y >= b.y - 50 && bounds.x < b.x + b.width && bounds.y < b.y + b.height;
  });
  return fitsAnyDisplay ? bounds : undefined;
}

export function defaultBounds(): WindowBounds {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = MAIN_WINDOW_DEFAULT_SIZE;
  return {
    x: Math.round(primary.workArea.x + (primary.workArea.width - width) / 2),
    y: Math.round(primary.workArea.y + (primary.workArea.height - height) / 2),
    width,
    height
  };
}
