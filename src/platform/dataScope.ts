import type { AcceptedScopes, BoundingBox, PlatformToolProps, SearchSpec } from "../contract";

export const INVALID_BOUNDING_BOX =
  "Bounding box must be { west, south, east, north }, [west, south, east, north], or a map bounds object with getWest/getSouth/getEast/getNorth.";

export const INVALID_SEARCH_SPEC =
  "Search criteria must be an object of API fields such as name.contains or id.in.";
export const INVALID_IDS = "Ids must be a list of strings or numbers.";

export type ScopeName = "ids" | "searchSpec" | "boundingBox";

export interface ResolvedDataScope {
  kind: "ids" | "search" | "boundingBox" | "empty";
  ids?: readonly string[];
  searchSpec?: SearchSpec;
  boundingBox?: BoundingBox;
  /** Valid inputs that were sent and not selected. Ids win, then the search criteria, then the bounding box. */
  unused: readonly ScopeName[];
  idsError?: string;
  searchSpecError?: string;
  boundingBoxError?: string;
}

export type DataScopeInput = Pick<PlatformToolProps, "searchSpec" | "ids" | "boundingBox">;

const ALL_SCOPES: AcceptedScopes = {
  searchSpec: true,
  ids: true,
  boundingBox: true,
};

/**
 * Chooses the data the tool should open.
 *
 * Send one of: a list of ids, EarthBank query criteria, or a bounding box.
 * If more than one arrives, ids are used, otherwise the criteria,
 * otherwise the bounding box. The others are reported on `unused` and are
 * not applied as extra filters. Read the raw props if a tool truly needs to
 * combine them.
 *
 * Inputs the manifest does not accept are ignored and listed on `unused`.
 */
export function resolveDataScope(
  input: DataScopeInput,
  accepts: AcceptedScopes = ALL_SCOPES,
): ResolvedDataScope {
  const unused: ScopeName[] = [];
  const rawIds: unknown = input.ids;
  const rawSearch: unknown = input.searchSpec;
  const rawBox: unknown = input.boundingBox;

  let idsError: string | undefined;
  let ids: string[] = [];
  if (rawIds != null) {
    if (!accepts.ids) {
      if (hasIdPayload(rawIds)) unused.push("ids");
    } else if (!Array.isArray(rawIds)) {
      idsError = INVALID_IDS;
    } else {
      ids = normalizeIds(rawIds);
      const hadUnusableValue = rawIds.some((item) => typeof item !== "string" && typeof item !== "number");
      if (rawIds.length > 0 && ids.length === 0 && hadUnusableValue) idsError = INVALID_IDS;
    }
  }

  let searchSpecError: string | undefined;
  let searchSpec: SearchSpec | undefined;
  if (rawSearch != null) {
    if (!accepts.searchSpec) {
      unused.push("searchSpec");
    } else if (!isSearchSpec(rawSearch)) {
      searchSpecError = INVALID_SEARCH_SPEC;
    } else {
      searchSpec = rawSearch;
    }
  }

  let boundingBoxError: string | undefined;
  let boundingBox: BoundingBox | undefined;
  if (rawBox != null) {
    if (!accepts.boundingBox) {
      unused.push("boundingBox");
    } else {
      const normalized = normalizeBoundingBox(rawBox);
      if (!normalized) boundingBoxError = INVALID_BOUNDING_BOX;
      else boundingBox = normalized;
    }
  }

  if (ids.length > 0) {
    if (searchSpec) unused.push("searchSpec");
    if (boundingBox) unused.push("boundingBox");
    return finish({ kind: "ids", ids, unused, idsError, searchSpecError, boundingBoxError });
  }
  if (searchSpec) {
    if (boundingBox) unused.push("boundingBox");
    return finish({ kind: "search", searchSpec, unused, idsError, searchSpecError, boundingBoxError });
  }
  if (boundingBox) {
    return finish({ kind: "boundingBox", boundingBox, unused, idsError, searchSpecError });
  }
  return finish({ kind: "empty", unused, idsError, searchSpecError, boundingBoxError });
}

function finish(scope: ResolvedDataScope): ResolvedDataScope {
  if (!scope.idsError) delete scope.idsError;
  if (!scope.searchSpecError) delete scope.searchSpecError;
  if (!scope.boundingBoxError) delete scope.boundingBoxError;
  return scope;
}

/** Accepts a plain box, a GeoJSON bbox, or a Mapbox bounds object. */
export function normalizeBoundingBox(value: unknown): BoundingBox | null {
  if (value == null) return null;
  const raw = readRawBox(value);
  if (!raw) return null;
  return validateBox(raw);
}

export function normalizeIds(ids: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of ids) {
    if (typeof item !== "string" && typeof item !== "number") continue;
    const id = String(item).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function hasIdPayload(ids: unknown): boolean {
  if (ids == null) return false;
  if (!Array.isArray(ids)) return true;
  return ids.length > 0;
}

function isSearchSpec(value: unknown): value is SearchSpec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRawBox(value: unknown): BoundingBox | null {
  if (Array.isArray(value)) {
    if (value.length !== 4 || !value.every((item) => typeof item === "number")) return null;
    return { west: value[0], south: value[1], east: value[2], north: value[3] };
  }
  if (typeof value !== "object" || value === null) return null;
  if (isMapBounds(value)) {
    const west = value.getWest();
    const south = value.getSouth();
    const east = value.getEast();
    const north = value.getNorth();
    if (![west, south, east, north].every((item) => typeof item === "number")) return null;
    return { west, south, east, north };
  }
  const box = value as Record<string, unknown>;
  if (
    typeof box.west === "number" &&
    typeof box.south === "number" &&
    typeof box.east === "number" &&
    typeof box.north === "number"
  ) {
    return { west: box.west, south: box.south, east: box.east, north: box.north };
  }
  return null;
}

function isMapBounds(value: object): value is {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
} {
  const bounds = value as {
    getWest?: unknown;
    getSouth?: unknown;
    getEast?: unknown;
    getNorth?: unknown;
  };
  return (
    typeof bounds.getWest === "function" &&
    typeof bounds.getSouth === "function" &&
    typeof bounds.getEast === "function" &&
    typeof bounds.getNorth === "function"
  );
}

function validateBox(box: BoundingBox): BoundingBox | null {
  const { west, south, east, north } = box;
  if (![west, south, east, north].every((item) => Number.isFinite(item))) return null;
  if (south < -90 || south > 90 || north < -90 || north > 90) return null;
  if (west < -180 || west > 180 || east < -180 || east > 180) return null;
  if (south > north) return null;
  return { west, south, east, north };
}
