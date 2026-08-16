import React from "react";
import { useUiStore, Route } from "../stores/uiStore";

interface NavEntry {
  route: Route;
  label: string;
  icon: React.ReactNode;
}

const generalItems: NavEntry[] = [
  { route: "quick-capture", label: "Quick Capture", icon: <IconCapture /> },
  { route: "history", label: "History", icon: <IconHistory /> }
];

const settingsItems: NavEntry[] = [
  { route: "settings-keyboard", label: "Keyboard", icon: <IconKeyboard /> },
  { route: "settings-clipboard", label: "Clipboard", icon: <IconClipboard /> },
  { route: "settings-ocr", label: "OCR", icon: <IconOcr /> },
  { route: "settings-appearance", label: "Appearance", icon: <IconAppearance /> }
];

const systemItems: NavEntry[] = [
  { route: "permissions", label: "Permissions", icon: <IconShield /> },
  { route: "about", label: "About", icon: <IconInfo /> }
];

export function Sidebar() {
  const route = useUiStore((s) => s.route);
  const setRoute = useUiStore((s) => s.setRoute);

  return (
    <aside className="flex h-full w-[208px] shrink-0 flex-col gap-5 border-r border-border-light bg-canvas-light/60 px-3 py-4 dark:border-border-dark dark:bg-black/10">
      <div className="flex items-center gap-2 px-2 pt-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#1c1c1e] text-white dark:bg-white dark:text-[#141416]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 12h8M8 8h5M8 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-tight">Potli</span>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <NavGroup label="General" items={generalItems} current={route} onSelect={setRoute} />
        <NavGroup label="Settings" items={settingsItems} current={route} onSelect={setRoute} />
        <NavGroup label="System" items={systemItems} current={route} onSelect={setRoute} />
      </nav>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  current,
  onSelect
}: {
  label: string;
  items: NavEntry[];
  current: Route;
  onSelect: (r: Route) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="section-label mb-1">{label}</div>
      {items.map((item) => (
        <button
          key={item.route}
          className={`nav-item ${current === item.route ? "active" : ""}`}
          onClick={() => onSelect(item.route)}
        >
          <span className="opacity-80">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function IconCapture() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 4v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconKeyboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconOcr() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M4 7V4h4M20 7V4h-4M4 17v3h4M20 17v3h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9l3 6M13 9l3 6M8.5 13h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAppearance() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3.5A8.5 8.5 0 0 1 12 20.5Z" fill="currentColor" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5.2M12 8.3h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
