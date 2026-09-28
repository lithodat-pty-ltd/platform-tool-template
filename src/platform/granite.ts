/**
 * Stand-in for the Granite module.
 *
 * Brands and modes match `@lithodat-pty-ltd/granite-core`:
 * `lithodat | earthbank | amira | dmgeode` and `light | dark | midnight`.
 * `midnight` is an Amira mode. Any other brand that asks for it is rendered as `dark`.
 *
 * The host often remounts a tool with `graniteBrand` and `surfaceMode` as the
 * React key. Until the real Granite package is available, `tokensForBrand`
 * follows those axes so a module still tracks the platform theme.
 *
 * Replace the body with the real package when you have it:
 *
 *   import { tokensFor } from "@lithodat-pty-ltd/granite-core";
 *   export function tokensForBrand(brand?: string, surface?: string) {
 *     return tokensFor(brand, surface);
 *   }
 *
 * Prefer the host passing `theme.graniteTokens` (already mapped onto the
 * variables below). Then every module shares one Granite version, and a tool
 * can be built without that package on its dependency list.
 *
 * A missing or unknown brand becomes `earthbank`. A missing or unknown mode
 * becomes `light`. The panel's `data-granite-brand` and `data-surface-mode`
 * are those resolved values.
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

/** Same union as `GraniteBrand` in `@lithodat-pty-ltd/granite-core`. */
export const GRANITE_BRANDS = ["lithodat", "earthbank", "amira", "dmgeode"] as const;

/** Same union as `GraniteMode` in `@lithodat-pty-ltd/granite-core`. */
export const GRANITE_MODES = ["light", "dark", "midnight"] as const;

export type GraniteBrand = (typeof GRANITE_BRANDS)[number];

export type GraniteMode = (typeof GRANITE_MODES)[number];

export const DEFAULT_GRANITE_BRAND: GraniteBrand = "earthbank";

export const DEFAULT_GRANITE_MODE: GraniteMode = "light";

const FONT = '"Segoe UI", "Helvetica Neue", sans-serif';

/**
 * Accent hexes taken from Granite globals (`color.orange`, `color.earthbank`, `color.amira-cyan`).
 * DMGeode brand tokens are still a placeholder in Granite, so that accent is local until they land.
 */
const ACCENTS: Record<GraniteBrand, { light: string; dark: string }> = {
  lithodat: { light: "#ff8d28", dark: "#ffa855" },
  earthbank: { light: "#282982", dark: "#6e73da" },
  amira: { light: "#00a7e2", dark: "#00a7e2" },
  dmgeode: { light: "#5c6b73", dark: "#9aabb6" },
};

export interface ResolvedGraniteTheme {
  brand: GraniteBrand;
  mode: GraniteMode;
}

/** Keeps only a known Granite brand and mode. `midnight` survives only for `amira`. */
export function resolveGraniteTheme(brand?: string, surface?: string): ResolvedGraniteTheme {
  const resolvedBrand = graniteBrandOf(brand);
  return { brand: resolvedBrand, mode: graniteModeOf(resolvedBrand, surface) };
}

export function tokensForBrand(brand?: string, surface?: string): Record<string, string> {
  const { brand: resolvedBrand, mode } = resolveGraniteTheme(brand, surface);
  const accent = ACCENTS[resolvedBrand];
  if (mode === "midnight") return midnightTheme(accent.light);
  return mode === "dark" ? darkTheme(accent.dark) : lightTheme(accent.light);
}

function graniteBrandOf(value: string | undefined): GraniteBrand {
  const key = value?.trim().toLowerCase();
  return GRANITE_BRANDS.find((brand) => brand === key) ?? DEFAULT_GRANITE_BRAND;
}

function graniteModeOf(brand: GraniteBrand, value: string | undefined): GraniteMode {
  const key = value?.trim().toLowerCase();
  const mode = GRANITE_MODES.find((item) => item === key) ?? DEFAULT_GRANITE_MODE;
  if (mode === "midnight" && brand !== "amira") return "dark";
  return mode;
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

/** Amira midnight uses the navy surface from Granite (`color.amira-navy.900`). */
function midnightTheme(accent: string): Record<string, string> {
  return {
    ...darkTheme(accent),
    "--pt-bg": "#022038",
    "--pt-panel": "#052460",
    "--pt-border": "#1a4fa3",
    "--pt-accent-fg": "#052460",
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
