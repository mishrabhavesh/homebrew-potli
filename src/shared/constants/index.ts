export const APP_NAME = "Potli";

export const MAIN_WINDOW_DEFAULT_SIZE = { width: 960, height: 640 };
export const MAIN_WINDOW_MIN_SIZE = { width: 780, height: 520 };

/** How long the success/error toast stays visible in the overlay before auto-dismissing (ms). */
export const TOAST_AUTO_DISMISS_MS = 2200;

/** Max number of history items kept locally (the full in-app History page). Oldest entries are pruned beyond this. */
export const HISTORY_LIMIT = 500;

/** How many recent items show directly in the tray/menu-bar "History" submenu for one-click re-copy.
 * The full list (up to HISTORY_LIMIT) is always available from the in-app History page. */
export const TRAY_HISTORY_LIMIT = 30;

/** Truncation length for a history item's tray-menu label. */
export const TRAY_HISTORY_LABEL_MAX_LENGTH = 42;

/** Modifier-only accelerators (e.g. just "Shift") are rejected — a shortcut needs a non-modifier key. */
export const MODIFIER_KEYS = new Set(["Control", "Ctrl", "Cmd", "Command", "CommandOrControl", "Alt", "Option", "Shift", "Super", "Meta"]);
