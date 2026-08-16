import { desktopCapturer } from "electron";
import { CaptureRegion } from "../../shared/types/ocr";
import { getDisplayById } from "./displayUtils";
import { logger } from "../logger";

/**
 * Captures a pixel-accurate crop of a screen region.
 *
 * The tricky part (spec §20 multi-monitor/DPI): desktopCapturer returns a
 * downscaled thumbnail whose *requested* size we control, but whose *actual*
 * returned size can differ slightly (Electron preserves aspect ratio within
 * the requested box). We therefore always measure the real returned bitmap
 * and compute the crop rectangle from the ratio between that bitmap and the
 * display's DIP (device-independent pixel) bounds, rather than assuming
 * thumbnail pixels map 1:1 to either DIP or physical pixels.
 *
 * Cropping uses Electron's built-in `nativeImage.crop()` rather than a
 * native image-processing dependency (e.g. sharp): this is a deliberate
 * choice to avoid shipping a per-platform/per-arch native binary just for a
 * simple rectangular crop — one less thing that can fail to load across
 * macOS/Windows/Linux and arm64/x64 packaging targets.
 */
export async function captureRegion(region: CaptureRegion): Promise<Buffer> {
  const display = getDisplayById(region.displayId);
  if (!display) {
    throw new Error("The display used for this capture is no longer available.");
  }

  // Request the thumbnail at full physical resolution so text stays crisp on
  // Retina/high-DPI displays, then crop precisely based on the actual size returned.
  const targetWidth = Math.round(display.width * display.scaleFactor);
  const targetHeight = Math.round(display.height * display.scaleFactor);

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: targetWidth, height: targetHeight }
  });

  if (sources.length === 0) {
    throw new Error("No screen sources are available to capture.");
  }

  const source = matchSourceToDisplay(sources, region.displayId, display.isPrimary);
  const thumbnail = source.thumbnail;
  const actualSize = thumbnail.getSize();

  if (actualSize.width === 0 || actualSize.height === 0) {
    throw new Error(
      "Screen capture returned an empty image. On macOS this usually means Screen Recording permission is missing."
    );
  }

  const scaleX = actualSize.width / display.width;
  const scaleY = actualSize.height / display.height;

  const crop = {
    x: Math.max(0, Math.round(region.x * scaleX)),
    y: Math.max(0, Math.round(region.y * scaleY)),
    width: Math.max(1, Math.round(region.width * scaleX)),
    height: Math.max(1, Math.round(region.height * scaleY))
  };

  // Clamp so the crop never exceeds the actual bitmap bounds (rounding can push it over by a px or two).
  crop.width = Math.min(crop.width, actualSize.width - crop.x);
  crop.height = Math.min(crop.height, actualSize.height - crop.y);

  try {
    const cropped = thumbnail.crop(crop);
    return cropped.toPNG();
  } catch (error) {
    logger.error("Failed to crop captured screenshot", error);
    throw new Error("Could not process the captured screenshot.");
  }
}

function matchSourceToDisplay(
  sources: Electron.DesktopCapturerSource[],
  displayId: number,
  isPrimary: boolean
) {
  // Preferred: Electron exposes display_id on most platforms/versions.
  const byId = sources.find((s) => s.display_id && String(s.display_id) === String(displayId));
  if (byId) return byId;

  // Single-display machines: there's only one candidate.
  if (sources.length === 1) return sources[0];

  // Fallback heuristic: the primary display is very often the first source.
  if (isPrimary) return sources[0];

  logger.warn("Could not reliably match a desktopCapturer source to the target display; using first match.");
  return sources[0];
}

/** Deletes any temporary artifacts. We never write screenshots to disk, so this is a no-op
 * placeholder kept for clarity/spec §18 ("delete temporary screenshots after OCR") — everything
 * here stays in memory as Buffers and is garbage collected once OCR completes. */
export function purgeTemporaryCaptureArtifacts(): void {
  // Intentionally empty: no on-disk temp files are ever created by captureRegion().
}
