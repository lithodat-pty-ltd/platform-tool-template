import { createContext, useContext, type ReactNode } from "react";
import type { PlatformMap } from "../contract";
import { selectCallerMap } from "./mapContext";

/** Map supplied by the caller. The demo client fills this while developing. */
export const MapContext = createContext<PlatformMap | null>(null);

export function MapProvider({ map, children }: { map?: PlatformMap | null; children: ReactNode }) {
  return <MapContext.Provider value={map ?? null}>{children}</MapContext.Provider>;
}

/**
 * The caller's map. In module mode this is `MapContext`, then the `map` prop.
 * A Mapbox access token is ignored here.
 */
export function useMapContext(mapFromProps?: PlatformMap | null): PlatformMap | null {
  return selectCallerMap(useContext(MapContext), mapFromProps);
}
