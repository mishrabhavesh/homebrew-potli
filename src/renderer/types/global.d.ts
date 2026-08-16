import type { AppSettings } from "@shared/types/settings";
import type { HistoryItem } from "@shared/types/history";
import type { CaptureRegion, CaptureMode } from "@shared/types/ocr";

interface DisplayInfo {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

interface PermissionsSnapshot {
  screenRecording: string;
  accessibility: string;
  platform: string;
}

interface PotliApi {
  settings: {
    get(): Promise<AppSettings>;
    set(partial: Partial<AppSettings>): Promise<AppSettings>;
    onChanged(cb: (settings: AppSettings) => void): () => void;
  };
  history: {
    getAll(): Promise<HistoryItem[]>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    copyAgain(id: string): Promise<void>;
    getImage(id: string): Promise<string>;
    onChanged(cb: (items: HistoryItem[]) => void): () => void;
  };
  capture: {
    start(mode: CaptureMode): Promise<void>;
    getDisplays(): Promise<DisplayInfo[]>;
    regionSelected(region: CaptureRegion): Promise<void>;
    cancel(): Promise<void>;
    onResult(cb: (result: { ok: boolean; error?: string }) => void): () => void;
  };
  shortcut: {
    set(id: "extractText" | "copyImage", accelerator: string): Promise<{ success: boolean; error?: string }>;
    validate(accelerator: string): Promise<{ valid: boolean; error?: string }>;
    togglePause(): Promise<boolean>;
  };
  permissions: {
    get(): Promise<PermissionsSnapshot>;
    openSettings(kind: "screen-recording" | "accessibility"): Promise<void>;
    request(kind: "screen-recording" | "accessibility"): Promise<PermissionsSnapshot>;
  };
  window: {
    showMain(route?: string): Promise<void>;
    minimize(): Promise<void>;
    close(): Promise<void>;
    onNavigate(cb: (route: string) => void): () => void;
  };
  panel: {
    hide(): Promise<void>;
  };
  security: {
    getStatus(): Promise<{ encryptionAvailable: boolean }>;
  };
  toast: {
    show(message: string, status?: "success" | "error" | "info"): Promise<void>;
  };
  app: {
    getInfo(): Promise<{ version: string; platform: string }>;
    quit(): Promise<void>;
  };
}

declare global {
  interface Window {
    potli: PotliApi;
  }
}

export {};
