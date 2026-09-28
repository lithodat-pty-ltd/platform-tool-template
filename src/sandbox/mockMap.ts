import type { PlatformMap } from "../contract";

export interface MockMap extends PlatformMap {
  getViewBounds: () => { west: number; south: number; east: number; north: number };
}

/**
 * Stand-in for the host MapLibre map. It implements the methods the template
 * calls. The real host passes `mglMap`.
 */
export function createMockMap(): MockMap {
  let center = { lng: 121.5, lat: -30.7 };
  let zoom = 4;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  function emit(event: string) {
    listeners.get(event)?.forEach((listener) => listener());
  }

  function viewBounds() {
    const span = 80 / 2 ** zoom;
    return {
      west: center.lng - span / 2,
      east: center.lng + span / 2,
      south: center.lat - span / 2,
      north: center.lat + span / 2,
    };
  }

  return {
    getCenter: () => ({ ...center }),
    getZoom: () => zoom,
    getViewBounds: viewBounds,
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    fitBounds(bounds) {
      const [[west, south], [east, north]] = bounds;
      const next = { lng: (west + east) / 2, lat: (south + north) / 2 };
      const size = Math.max(Math.abs(east - west), Math.abs(north - south), 0.5);
      // Leave a margin so the extent is visible inside the sandbox map, not flush to the edges.
      const nextZoom = Math.max(2, Math.min(10, Math.log2(80 / (size * 1.45))));
      const changed = next.lng !== center.lng || next.lat !== center.lat || nextZoom !== zoom;
      center = next;
      zoom = nextZoom;
      if (changed) emit("moveend");
    },
  };
}
