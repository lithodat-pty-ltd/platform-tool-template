import type { PlatformMap } from "../contract";

/**
 * The map a module draws on, in module mode.
 * The caller's map context wins. The `map` prop is used when the caller did not
 * provide one. A Mapbox access token is not an input: the demo client may use a
 * key to build a map, and that key never reaches the module.
 */
export function selectCallerMap(
  mapFromContext: PlatformMap | null | undefined,
  mapFromProps: PlatformMap | null | undefined,
): PlatformMap | null {
  return mapFromContext ?? mapFromProps ?? null;
}
