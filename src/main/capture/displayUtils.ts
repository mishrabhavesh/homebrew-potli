import { screen, Display } from "electron";

export interface DisplayInfo {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  /** True for screen.getPrimaryDisplay() */
  isPrimary: boolean;
}

export function listDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d: Display) => ({
    id: d.id,
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === primary.id
  }));
}

export function getDisplayById(id: number): DisplayInfo | undefined {
  return listDisplays().find((d) => d.id === id);
}
