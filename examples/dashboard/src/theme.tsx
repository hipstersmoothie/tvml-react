import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme, type ColorScheme } from "tvml-react";

export interface Palette {
  scheme: ColorScheme;
  text: string;
  secondary: string;
  tertiary: string;
  accent: string;
  /** Translucent panel behind forecast tiles. */
  panel: string;
  /** Slightly stronger panel for the current hour / today. */
  panelStrong: string;
  warning: string;
}

// TVML text in a divTemplate doesn't follow the theme reliably, so every
// <text> gets an explicit color from here.
export const PALETTES: Record<ColorScheme, Palette> = {
  dark: {
    scheme: "dark",
    text: "rgb(255, 255, 255)",
    secondary: "rgba(255, 255, 255, 0.78)",
    tertiary: "rgba(255, 255, 255, 0.6)",
    accent: "rgb(255, 214, 120)",
    panel: "rgba(0, 0, 0, 0.42)",
    panelStrong: "rgba(0, 0, 0, 0.62)",
    warning: "rgba(200, 40, 40, 0.85)",
  },
  light: {
    scheme: "light",
    text: "rgb(18, 18, 22)",
    secondary: "rgba(18, 18, 22, 0.78)",
    tertiary: "rgba(18, 18, 22, 0.6)",
    accent: "rgb(160, 80, 0)",
    panel: "rgba(255, 255, 255, 0.6)",
    panelStrong: "rgba(255, 255, 255, 0.82)",
    warning: "rgba(220, 50, 50, 0.9)",
  },
};

const PaletteContext = createContext<Palette>(PALETTES.dark);

/** Follows the system appearance (Settings → General → Appearance). */
export function ThemeProvider({ children }: { children?: ReactNode }) {
  const scheme = useColorScheme();
  return <PaletteContext.Provider value={PALETTES[scheme]}>{children}</PaletteContext.Provider>;
}

export function usePalette(): Palette {
  return useContext(PaletteContext);
}
