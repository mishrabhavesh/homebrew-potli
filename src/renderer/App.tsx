import React, { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { useSettingsStore } from "./stores/settingsStore";
import { useHistoryStore } from "./stores/historyStore";
import { useUiStore } from "./stores/uiStore";
import { useTheme } from "./hooks/useTheme";
import { Onboarding } from "./pages/Onboarding";
import { QuickCapture } from "./pages/QuickCapture";
import { History } from "./pages/History";
import { SettingsKeyboard } from "./pages/SettingsKeyboard";
import { SettingsClipboard } from "./pages/SettingsClipboard";
import { SettingsOcr } from "./pages/SettingsOcr";
import { SettingsAppearance } from "./pages/SettingsAppearance";
import { Permissions } from "./pages/Permissions";
import { About } from "./pages/About";

export default function App() {
  const { settings, loaded, load } = useSettingsStore();
  const loadHistory = useHistoryStore((s) => s.load);
  const route = useUiStore((s) => s.route);
  const setRoute = useUiStore((s) => s.setRoute);
  const setAppInfo = useUiStore((s) => s.setAppInfo);

  useTheme(settings.theme);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount
  useEffect(() => {
    load();
    loadHistory();
    window.copyclip.app.getInfo().then(setAppInfo);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when `loaded` flips
  useEffect(() => {
    if (loaded && !settings.onboardingComplete) {
      setRoute("onboarding");
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-light dark:bg-canvas-dark">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  if (route === "onboarding") {
    return <Onboarding onFinish={() => setRoute("quick-capture")} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas-light text-[13px] dark:bg-canvas-dark">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {route === "quick-capture" && <QuickCapture />}
        {route === "history" && <History />}
        {route === "settings-keyboard" && <SettingsKeyboard />}
        {route === "settings-clipboard" && <SettingsClipboard />}
        {route === "settings-ocr" && <SettingsOcr />}
        {route === "settings-appearance" && <SettingsAppearance />}
        {route === "permissions" && <Permissions />}
        {route === "about" && <About />}
      </main>
    </div>
  );
}
