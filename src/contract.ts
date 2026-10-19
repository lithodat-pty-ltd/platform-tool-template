import type { GraniteBrand, GraniteMode } from "./platform/granite";

/**
 * Host contract for a platform tool module.
 *
 * The platform mounts the module and passes these parameters. The module
 * renders its own interface. It does not import platform internals.
 *
 * - Every field is optional. The host omits whatever this tool does not need.
 * - Do not throw when a field is missing. Show an empty state instead.
 * - `licenses` decides which parts of the interface to show. An absent list
 *   means the user has none of those licenses, not all of them.
 * - The data to open is sample ids, EarthBank query criteria, or a bounding box.
 * - Appearance comes from Granite (`theme.graniteTokens` / brand / surface)
 *   or from a CSS reference (`theme.stylesheetHref` / `theme.className`).
 *
 * See docs/DEVELOPMENT_PATTERN.md.
 */

export interface ControlPanelPosition {
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  zIndex?: number;
}

/**
 * Minimum map surface used by the template.
 * The host passes its Mapbox instance (`mglMap`). Extend this
 * interface in your module for any further methods you call.
 */
export interface PlatformMap {
  getCenter?: () => { lng: number; lat: number };
  getZoom?: () => number;
  fitBounds?: (
    bounds: [[number, number], [number, number]],
    options?: unknown,
  ) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
}

/** Returns a JWT the module can send as `Authorization: Bearer`. */
export type TokenGetter = () => string | Promise<string>;

/**
 * A license id string, or a record the host already has.
 * `hasLicense` matches `id`, then `name`, then a bare string.
 */
export type LicenseEntry =
  | string
  | {
      readonly id?: string;
      readonly name?: string;
    };

/** A value EarthBank accepts on one criteria key. Lists become repeated query parameters (`id.in=1&id.in=2`). */
export type SearchCriteriaValue = string | number | boolean | null | readonly (string | number)[];

/**
 * EarthBank query criteria. This is the search the API already runs.
 *
 * Keys are the criteria names on the GET, not a wrapper object.
 * `name.contains`, `id.in`, `dataPackageId.equals`, and
 * `locationCriteria.lat.greaterOrEqualThan` are examples.
 * `listAll` adds `page` and `size`. Sort is the `sort` key, such as `"name,asc"`.
 *
 * Pass the object to `listSamples`, `getJson`, or `listAll`.
 * Do not wrap these keys under `text`, `filters`, or `extra`.
 */
export type SearchSpec = Readonly<Record<string, SearchCriteriaValue>>;

/** Geographic extent. West may be greater than east when the box crosses the antimeridian. */
export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MapBoundsLike {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
}

/** Plain box, GeoJSON bbox array `[west, south, east, north]`, or a map bounds object. */
export type BoundingBoxInput =
  | BoundingBox
  | readonly [number, number, number, number]
  | MapBoundsLike;

/**
 * Visual system for the tool.
 *
 * Pass Granite (brand, surface, and the token map from the Granite module),
 * or pass a CSS reference. Do not do both unless the inline tokens are meant
 * to win: `graniteTokens` and `cssVariables` are written on the panel and
 * override stylesheet rules.
 *
 * A CSS reference owns colour. Built-in brand presets are skipped when
 * `stylesheetHref` or `className` is set, so the host skin is visible.
 * Layout still comes from the module.
 *
 * The host may also remount the tool when the theme changes, using
 * `` `${graniteBrand}:${surfaceMode}` `` as the React key, which is what
 * Swath Profile does today. Theme props are applied either way. A key remount
 * also clears state held inside the module.
 */
export interface PlatformTheme {
  /** Same value as `runtimeThemeTokens.graniteBrand`. One of `lithodat`, `earthbank`, `amira`, `dmgeode`. */
  graniteBrand?: GraniteBrand;
  /** Same value as `runtimeThemeTokens.surfaceMode`. `midnight` is valid for `amira` only. */
  surfaceMode?: GraniteMode;
  /**
   * Tokens from the Granite module. Keys may already be CSS variables
   * (`--pt-accent`) or bare names (`pt-accent`). Map Granite's own names
   * onto the `--pt-*` variables this module reads.
   */
  graniteTokens?: Readonly<Record<string, string>>;
  /**
   * Stylesheet URL the browser can load. Use this when the host (or the
   * module) has a CSS file that should skin the panel.
   */
  stylesheetHref?: string;
  /**
   * Class put on the tool root. Use this when Granite, or another skin, is
   * already loaded on the page.
   */
  className?: string;
  /** CSS variable overrides. Applied after `graniteTokens`. */
  cssVariables?: Readonly<Record<string, string>>;
}

export interface PlatformToolProps {
  /**
   * JWT for data access. Prefer this over `token`: the host can refresh an
   * expired token. Same role as `getSwathProfileAccessToken`.
   */
  getToken?: TokenGetter;
  /** A JWT the host already holds. Ignored when `getToken` is set. */
  token?: string;

  /**
   * EarthBank API origin, with no path. Omit it and the module uses the host's
   * `axios.defaults.baseURL` (client001 sets that from `SERVER_API_URL`), then
   * the page origin. This repo's dev server also uses the page origin, and Vite
   * forwards `/api` to `https://testapp.ausgeochem.org`.
   */
  apiBaseUrl?: string;

  /**
   * Map instance from the caller (`MapProvider` / `mglMap`). Omit it for a tool
   * that does not draw on the map. `null` is treated as omitted. A Mapbox
   * access token is not part of this contract. The demo client uses one only
   * while developing, and the module ignores it.
   */
  map?: PlatformMap | null;

  /**
   * Asks the host to hide the tool. Omit it when the tool is docked and
   * cannot be closed on its own. The module does not unmount itself.
   */
  onClose?: () => void;

  /**
   * Where the panel sits. Partial values override the module default
   * (`toolManifest.defaultControlPanelPosition`). Numbers are pixels.
   * Setting `right` clears a default `left`, and the same for the vertical axis.
   */
  controlPanelPosition?: ControlPanelPosition;
  /** Called when the user finishes dragging the panel, so the host can store the position. */
  onControlPanelPositionChange?: (position: ControlPanelPosition) => void;

  /**
   * Licenses the signed-in user holds. The module decides what to show.
   * Hide unlicensed features. Do not treat a missing list as "everything".
   */
  licenses?: readonly LicenseEntry[];

  /** Granite tokens, or a CSS reference. See `PlatformTheme`. */
  theme?: PlatformTheme;

  /**
   * EarthBank query criteria (`name.contains`, `id.in`, and the rest).
   * Ignored when a non-empty `ids` list is also sent.
   * Pass the object through to `listSamples`. Do not rebuild it as free text.
   */
  searchSpec?: SearchSpec | null;

  /**
   * Record ids (samples, plates, features — the module knows which).
   * This is the scope that wins when more than one is sent.
   */
  ids?: readonly (string | number)[] | null;

  /**
   * Geographic extent. Used only when neither ids nor search criteria were sent.
   * `west` may be greater than `east` when the box crosses the antimeridian.
   */
  boundingBox?: BoundingBoxInput | null;
}

export interface AcceptedScopes {
  searchSpec: boolean;
  ids: boolean;
  boundingBox: boolean;
}

export interface ToolLicense {
  id: string;
  description: string;
}

/** Describes the module to a host registry. The host should not re-implement this. */
export interface ToolManifest {
  id: string;
  displayName: string;
  summary: string;
  /**
   * When true, the sample panel says so if `map` was not passed.
   * The module still must not throw.
   */
  requiresMap: boolean;
  defaultControlPanelPosition: ControlPanelPosition;
  /** License ids this module knows how to read. Informational for the host. */
  licenses: readonly ToolLicense[];
  /** Which scope inputs this module will act on. Informational, and read by `resolveDataScope` when passed in. */
  accepts: AcceptedScopes;
}
