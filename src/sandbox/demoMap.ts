import { useEffect, useRef, useState, type RefObject } from "react";
import type { FitBoundsOptions, Map as MapboxMap } from "mapbox-gl";
import type { PlatformMap } from "../contract";
import { createMockMap, type MockMap } from "./mockMap";
import { demoMapSource, scrubMapboxMessage } from "./demoMapSource";
import "mapbox-gl/dist/mapbox-gl.css";

export interface DemoMap extends PlatformMap {
  getViewBounds: () => { west: number; south: number; east: number; north: number } | null;
}

/**
 * Map for the demo client. A Mapbox access token builds a Mapbox map.
 * The published module does not call this. It reads `MapContext` from the caller.
 */
export function useDemoMap(accessToken: string): {
  map: DemoMap | null;
  containerRef: RefObject<HTMLDivElement>;
  source: "mapbox" | "mock";
  error: string | null;
} {
  const containerRef = useRef<HTMLDivElement>(null!);
  const mockRef = useRef<MockMap | null>(null);
  if (!mockRef.current) mockRef.current = createMockMap();
  const source = demoMapSource(accessToken);
  const [mapboxMap, setMapboxMap] = useState<DemoMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "mapbox") {
      setMapboxMap(null);
      setError(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const token = accessToken.trim();
    let cancelled = false;
    const holder: { map?: { remove: () => void } } = {};

    void import("mapbox-gl")
      .then((mod) => {
        if (cancelled) return;
        const mapboxgl = mod.default;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/light-v11",
          center: [121.5, -30.7],
          zoom: 4,
          projection: "mercator",
        });
        map.on("style.load", () => {
          map.setProjection("mercator");
        });
        if (cancelled) {
          map.remove();
          return;
        }
        holder.map = map;
        map.on("error", (event) => {
          const message = event.error instanceof Error ? event.error.message : "Mapbox could not open the map.";
          setError(scrubMapboxMessage(message));
        });
        setMapboxMap(adaptMapboxMap(map));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "Mapbox could not load.";
        setError(scrubMapboxMessage(message));
        setMapboxMap(null);
      });

    return () => {
      cancelled = true;
      holder.map?.remove();
      setMapboxMap(null);
    };
  }, [accessToken, source]);

  const mock = mockRef.current;
  return {
    map: source === "mapbox" ? mapboxMap : mock,
    containerRef,
    source,
    error,
  };
}

function adaptMapboxMap(map: MapboxMap): DemoMap {
  return {
    getCenter: () => {
      const center = map.getCenter();
      return { lng: center.lng, lat: center.lat };
    },
    getZoom: () => map.getZoom(),
    getViewBounds: () => {
      const bounds = map.getBounds();
      if (!bounds) return null;
      return {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      };
    },
    fitBounds: (bounds, options) => {
      map.fitBounds(bounds, options as FitBoundsOptions | undefined);
    },
    on: (event, listener) => {
      map.on(event, listener as never);
    },
    off: (event, listener) => {
      map.off(event, listener as never);
    },
  };
}
