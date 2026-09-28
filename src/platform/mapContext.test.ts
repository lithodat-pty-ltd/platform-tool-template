import { describe, expect, it } from "vitest";
import type { PlatformMap } from "../contract";
import { selectCallerMap } from "./mapContext";

const callerMap: PlatformMap = { getZoom: () => 4 };
const propMap: PlatformMap = { getZoom: () => 2 };

describe("selectCallerMap", () => {
  it("uses the caller map context and ignores any development Mapbox key", () => {
    expect(selectCallerMap(callerMap, propMap)).toBe(callerMap);
  });

  it("uses the map prop when the caller did not provide a context", () => {
    expect(selectCallerMap(null, propMap)).toBe(propMap);
    expect(selectCallerMap(undefined, propMap)).toBe(propMap);
  });

  it("is empty when the caller passed neither", () => {
    expect(selectCallerMap(null, undefined)).toBeNull();
    expect(selectCallerMap(undefined, null)).toBeNull();
  });
});
