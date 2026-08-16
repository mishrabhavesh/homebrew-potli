import { create } from "zustand";

export type Route =
  | "onboarding"
  | "quick-capture"
  | "history"
  | "settings-keyboard"
  | "settings-clipboard"
  | "settings-ocr"
  | "settings-appearance"
  | "permissions"
  | "about";

interface UiState {
  route: Route;
  setRoute: (route: Route) => void;
  platform: string;
  appVersion: string;
  setAppInfo: (info: { platform: string; version: string }) => void;
}

export const useUiStore = create<UiState>((set) => ({
  route: "quick-capture",
  setRoute: (route) => set({ route }),
  platform: "darwin",
  appVersion: "0.1.0",
  setAppInfo: ({ platform, version }) => set({ platform, appVersion: version })
}));

if (typeof window !== "undefined" && window.copyclip) {
  window.copyclip.window.onNavigate((route) => {
    useUiStore.getState().setRoute(route as Route);
  });
}
