/**
 * Stand-in for the Granite module.
 *
 * The platform theme has two axes, `graniteBrand` and `surfaceMode`. The host
 * often remounts a tool with that pair as the React key. Until the real
 * Granite package is available, `tokensForBrand` follows those axes so a
 * module still tracks the platform theme.
 *
 * Replace the body with the real package when you have it:
 *
 *   import { tokensFor } from "@your-org/granite";
 *   export function tokensForBrand(brand?: string, surface?: string) {
 *     return tokensFor(brand, surface);
 *   }
 *
 * Prefer the host passing `theme.graniteTokens` (already mapped onto the
 * variables below). Then every module shares one Granite version, and a tool
 * can be built without that package on its dependency list.
 *
 * Any `surfaceMode` whose name contains "dark" selects the dark preset.
 * Anything else, including an omitted surface, selects the light preset.
 * Unknown brand names fall back to the granite palette. The original brand
 * string is still set on `data-granite-brand` so a host stylesheet can target it.
 */

export const PLATFORM_TOOL_CSS_VARIABLES = [
  "--pt-font",
  "--pt-bg",
  "--pt-fg",
  "--pt-muted",
  "--pt-panel",
  "--pt-border",
  "--pt-accent",
  "--pt-accent-fg",
  "--pt-danger",
  "--pt-shadow",
  "--pt-radius",
] as const;

export const GRANITE_BRANDS = ["granite", "copper", "basalt"] as const;

const FONT = '"Segoe UI", "Helvetica Neue", sans-serif';

const ACCENTS: Record<string, { light: string; dark: string }> = {
  granite: { light: "#6e4b3a", dark: "#d7b59a" },
  copper: { light: "#b15a2a", dark: "#e39a62" },
  basalt: { light: "#2f5573", dark: "#8fabc4" },
};

export function tokensForBrand(brand?: string, surface?: string): Record<string, string> {
  const dark = (surface ?? "").toLowerCase().includes("dark");
  const key = (brand ?? "granite").trim().toLowerCase();
  const accent = ACCENTS[key] ?? ACCENTS.granite;
  return dark ? darkTheme(accent.dark) : lightTheme(accent.light);
}

/** Prefix bare token names so they can be written onto the panel style. */
export function cssVariablesFrom(tokens?: Readonly<Record<string, string>>): Record<string, string> {
  if (!tokens) return {};
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (!key.trim() || typeof value !== "string") continue;
    style[key.startsWith("--") ? key : `--${key}`] = value;
  }
  return style;
}

function lightTheme(accent: string): Record<string, string> {
  return {
    "--pt-font": FONT,
    "--pt-bg": "#f7f4ef",
    "--pt-fg": "#1c1915",
    "--pt-muted": "#6b645c",
    "--pt-panel": "#fffdfb",
    "--pt-border": "#e4dcd2",
    "--pt-accent": accent,
    "--pt-accent-fg": "#fffdfb",
    "--pt-danger": "#8f2d2d",
    "--pt-shadow": "0 12px 32px rgba(28, 25, 21, 0.16)",
    "--pt-radius": "10px",
  };
}

function darkTheme(accent: string): Record<string, string> {
  return {
    "--pt-font": FONT,
    "--pt-bg": "#161412",
    "--pt-fg": "#f3efe9",
    "--pt-muted": "#b7afa6",
    "--pt-panel": "#241f1c",
    "--pt-border": "#3d362f",
    "--pt-accent": accent,
    "--pt-accent-fg": "#1c1915",
    "--pt-danger": "#f0a8a8",
    "--pt-shadow": "0 12px 32px rgba(0, 0, 0, 0.35)",
    "--pt-radius": "10px",
  };
}
