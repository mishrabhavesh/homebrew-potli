# Potli

Press a shortcut. Select text on screen. It's copied.

Potli is a cross-platform (macOS / Windows / Linux) background utility built with
Electron, TypeScript, React, and Vite. The entire OCR pipeline runs locally — nothing
is ever uploaded, and no screenshot is written permanently to disk.

```
Press shortcut → drag-select an area → local OCR → text copied to clipboard → toast
```

---

## Project status

This is a complete, working implementation of every layer described in the product
spec: global shortcut, multi-monitor/DPI-aware selection overlay, screenshot capture,
a pluggable OCR engine abstraction (Apple Vision / Windows OCR / Tesseract fallback),
non-AI text cleanup, clipboard + auto-paste, local history, settings, onboarding,
tray/menu-bar integration, permissions handling, and packaging for all three
platforms.

**What's been verified in this build environment** (a headless Linux container with
no display, no macOS/Windows host, and no code-signing identity — screenshots below
are captured programmatically via `webContents.capturePage()` under Xvfb, not a real
monitor):

- `npm run typecheck` — passes for both the main process and renderer.
- `npm test` — 56 unit tests pass (text cleanup, shortcut validation/recording, IPC
  schema validation, settings persistence, history store, clipboard service).
- `npm run build` — production build of both the renderer (Vite) and main process
  (tsc + esbuild for the preload bundle) succeeds.
- `electron-builder --linux dir` — produces a working unpacked Linux build, launched
  headlessly under Xvfb with **no startup exceptions and a correctly rendered
  onboarding screen** (confirmed by capturing an actual screenshot of the running
  window, not just the absence of errors in the log).
- Both `npm run dev` (Vite dev server + `electron .`) and the packaged production
  build were exercised end-to-end this way after a real-world bug report surfaced two
  issues neither of us could have caught without actually running it: `tsc` doesn't
  support the `--onSuccess` flag the dev script originally used (fixed by switching to
  `tsc-watch`), and Electron's sandboxed preload script can't `require()` local files
  by relative path, which silently left the window blank (fixed by bundling
  `preload.ts` into one file with esbuild — see "IPC security" below).

**What could not be verified here** and needs a real machine before shipping:

- Actual drag-to-select interaction, multi-monitor coordinate mapping, and Retina/
  HighDPI capture — these need a real display and were built against the documented
  Electron `screen`/`desktopCapturer` APIs but not eyeballed on hardware.
- The macOS Vision OCR adapter (`resources/mac/VisionOCR.swift`) requires Xcode
  Command Line Tools on the end-user's Mac; it compiles against real Vision APIs but
  hasn't been run on macOS.
- The Windows OCR adapter (`resources/windows/OcrHelper.ps1`) requires a Windows
  language pack and the `Windows.Media.Ocr` WinRT API; it hasn't been run on Windows.
- Code signing / notarization for macOS and Windows (see "Packaging" below).
- `.deb`/AppImage installation and tray behavior across different Linux desktop
  environments.

The Tesseract.js fallback engine has no OS dependency and is the one path that's
fully exercised by the automated tests (its text-cleanup output, specifically).

---

## Architecture

```
src/
  main/                    Electron main process (Node context)
    windows/                 main window + per-display selection overlay + bounds memory
    shortcuts/                global shortcut registration/validation
    capture/                  display enumeration + desktopCapturer-based screenshot + crop
    ocr/                       OCR engine abstraction + macOS/Windows/Tesseract adapters
    clipboard/                 clipboard write + platform-aware auto-paste
    tray/                      tray/menu-bar icon + menu
    permissions/               macOS Screen Recording / Accessibility status
    settings/, history/        electron-store-backed persistence
    ipc/                       every IPC handler, each payload validated with zod
    notifications/             the small "Text copied" toast window
    preload.ts                contextBridge surface — the only thing renderers can call

  renderer/                 React UI (browser context, no Node access)
    pages/                    Quick Capture, History, Settings (Keyboard/OCR/Appearance),
                               Permissions, About, Onboarding
    overlay/                   the fullscreen selection UI + the toast UI (two small
                               React trees loaded into the overlay/toast windows)
    stores/                    zustand stores, kept in sync with main via IPC push
    components/, hooks/

  shared/                   Pure, dependency-light code importable from both main and
                             renderer (and from tests without Electron):
    types/                     AppSettings, HistoryItem, OcrResult, ...
    ipc/                       channel name constants + zod schemas
    ocr/textCleanup.ts         the non-AI cleanup pipeline
    shortcut/                  accelerator validation + Cmd/Ctrl symbol formatting

resources/
  mac/VisionOCR.swift        Swift CLI helper invoked via `swift` (Apple Vision OCR)
  windows/OcrHelper.ps1      PowerShell helper invoked via `powershell.exe` (WinRT OCR)
```

### Why a Swift/PowerShell helper instead of a native Node addon?

Both native OCR APIs (Vision, Windows.Media.Ocr) are easiest to reach through their
platform's own scripting story — Swift's `swift` interpreter ships with Xcode Command
Line Tools, and PowerShell's WinRT projection is built into every modern Windows
install. This avoids maintaining prebuilt native Node addons for four architecture/OS
combinations. If either helper is unavailable (toolchain missing, language pack
missing), `OcrService` transparently falls back to the bundled Tesseract.js engine —
the user never sees a hard failure over it.

### Why no native image-processing dependency?

Cropping the captured screenshot uses Electron's built-in `nativeImage.crop()`
instead of a library like `sharp`. Early in development this project did use `sharp`
for cropping, and packaging it turned up exactly the kind of cross-platform fragility
it's meant to avoid — its native binary failed to load in one Linux target here.
Since Electron already gives us a perfectly good crop primitive, there was no reason
to carry that risk across three OSes and two CPU architectures for one `.extract()`
call.

### IPC security

`contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` are set on
every `BrowserWindow` (main window, per-display selection overlays, and the toast
window). The preload script (`src/main/preload.ts`) exposes a narrow, fully-typed
`window.potli` API — nothing else from Node/Electron is reachable from web
content. Every IPC payload is re-validated on the main-process side with zod
(`src/shared/ipc/schemas.ts`) before it touches any handler logic, so a compromised
or buggy renderer can't smuggle malformed data across the boundary.

**Important if you ever edit `preload.ts`:** with `sandbox: true`, Electron's
sandboxed preload environment cannot `require()` your own local files by relative
path (only a small allowlist of Node built-ins plus `electron` itself) — a preload
script split across multiple compiled files will fail silently at runtime with
"module not found", leaving the window showing nothing but its background color. To
avoid this, `preload.ts` is bundled into one self-contained `dist/main/preload.js` via
esbuild (`npm run build:preload`, wired into both `build:main` and the dev flow) —
don't remove that step or point `webPreferences.preload` at the raw tsc output.

**Why `scripts/dev-launch.js` exists:** `tsc-watch`'s `--onSuccess` runs one command
after each successful recompile, and in practice it doesn't reliably hand compound
shell commands (`a && b`) to a real shell — `npm run build:preload && electron .`
gets parsed as `npm run build:preload` with `&&`, `electron`, `.` tacked on as extra
CLI arguments, which esbuild then choked on as bogus extra input files. The fix is to
give `--onSuccess` a single unambiguous command (`node scripts/dev-launch.js`) that
does the bundle-then-launch sequence itself in plain Node.

---

## Getting started

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and Electron together (via `concurrently`),
rebuilding the main process on save. The app registers its tray icon and, on first
run, opens the onboarding window.

### Other development commands

```bash
npm run typecheck     # tsc --noEmit for both main and renderer
npm test              # run the vitest unit test suite once
npm run test:watch    # watch mode
npm run lint          # eslint
```

---

## Building & packaging

```bash
npm run build           # compiles renderer (Vite) + main process (tsc) into dist/
npm run package         # build + electron-builder for the current OS
npm run package:mac     # dmg + zip, arm64 + x64
npm run package:win     # nsis installer, x64 + arm64
npm run package:linux   # AppImage + deb, x64 + arm64
```

Packaging configuration lives in `electron-builder.yml`. `resources/` (the OCR helper
scripts and tray icons) is copied into the packaged app via `extraResources`, so it's
available at `process.resourcesPath` at runtime regardless of platform.

### Code signing / notarization

This repo does not include signing credentials (there aren't any to include). Before
distributing real builds:

- **macOS**: set `CSC_LINK`/`CSC_KEY_PASSWORD` (or `CSC_NAME`) and notarization
  credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) as
  environment variables before running `npm run package:mac`. Screen Recording and
  Accessibility permission prompts only work correctly on a signed, notarized build.
- **Windows**: set `CSC_LINK`/`CSC_KEY_PASSWORD` for an EV/OV code-signing
  certificate before running `npm run package:win`, or Windows SmartScreen will warn
  users on install.
- **Linux**: AppImage/deb builds are unsigned by default, which is normal.

### Replacing the app icon

`build/icon.png` (1024×1024) and the tray icons in `resources/` are generated
placeholders (see `scripts/generate_icons.py`) — a simple crop-bracket mark, not
final brand art. Swap `build/icon.png` for your real icon at 1024×1024 and
electron-builder will derive the platform-specific `.icns`/`.ico`/Linux icon set
automatically. Replace `resources/trayIconTemplate.png` (+`@2x`) for macOS (must stay
black-on-transparent — macOS auto-tints template images) and `resources/trayIcon.png`
(+`@2x`) for Windows/Linux.

---

## Platform notes

### macOS

- Runs as a menu-bar-only app (no Dock icon, `LSUIElement: true`).
- **Screen Recording** permission is required for screenshot capture; **Accessibility**
  is only needed if "Copy and paste automatically" is turned on. Both are explained,
  with a direct link to the relevant System Settings pane, in Settings → Permissions —
  Potli never asks for a permission it doesn't need yet.
- OCR uses Apple's Vision framework via a bundled Swift helper. If the Xcode Command
  Line Tools aren't installed, Potli automatically falls back to Tesseract.

### Windows

- Runs from the system tray; no extra OS permissions are needed for screen capture.
- OCR uses the built-in `Windows.Media.Ocr` API (the same engine behind the Snipping
  Tool's text actions) via a bundled PowerShell helper, and needs the relevant
  language pack installed. Falls back to Tesseract automatically if unavailable.
- "Copy and paste automatically" simulates Ctrl+V into the foreground window via
  `SendKeys` — no additional permission needed.

### Linux

- Tray icon support depends on the desktop environment (AppIndicator/StatusNotifier
  support varies — GNOME needs an extension, KDE/most others work out of the box).
  If the tray icon doesn't appear, the app is still fully usable through its main
  window and global shortcut.
- OCR runs on the Tesseract.js fallback (no first-party Linux native adapter exists
  yet — the `OcrEngine` interface is ready for one, see below).
- "Copy and paste automatically" uses `xdotool`, which works on X11. Wayland
  compositors generally block synthetic input for security reasons; if the paste
  keystroke can't be sent, Potli still leaves the text on the clipboard and shows
  a "Text copied" toast rather than failing silently.

---

## Adding a new OCR engine later

Implement the `OcrEngine` interface (`src/shared/types/ocr.ts`):

```ts
interface OcrEngine {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult>;
  dispose?(): Promise<void>;
}
```

Register it in `src/main/ocr/ocrService.ts`. Nothing else in the app needs to change
— capture, cleanup, clipboard, and history all talk to `OcrService`, never to a
concrete engine.

---

## Privacy

Screenshots exist only in memory as `Buffer`s for the duration of one capture and are
never written to disk, except for a transient temp file created solely so the native
macOS/Windows OCR helper processes can read it — that file is deleted immediately
after recognition completes (see `src/main/ocr/tempImageFile.ts`). OCR history is
stored locally via `electron-store` and never transmitted anywhere. No analytics, no
telemetry, no network calls other than the OS's own permission-settings deep links.

---

## Testing

```bash
npm test
```

Automated coverage: text cleanup pipeline (whitespace normalization, URL/email/number
preservation, line-break handling), shortcut accelerator validation and recording,
IPC payload schemas, settings persistence (merge/validate/notify), history store
(add/delete/clear/notify), and clipboard read/write/error-handling.

Recommended manual test pass before release (needs real hardware per platform):
single vs. multi-monitor, Retina/HiDPI vs. standard DPI, light vs. dark mode,
permission-denied states, no-text-detected regions, very small/very large text, long
multi-paragraph text, numbers, URLs, and email addresses.
