import { useEffect } from "react";
import type { ThemePreference } from "@shared/types/settings";

/** Applies the resolved theme (system/light/dark) to the document root as a `dark` class,
 * which every Tailwind `dark:`/`.dark` style in this app keys off of. */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const isDark = preference === "dark" || (preference === "system" && media.matches);
      root.classList.toggle("dark", isDark);
    };

    apply();

    if (preference === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    return undefined;
  }, [preference]);
}
