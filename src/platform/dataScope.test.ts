import { describe, expect, it } from "vitest";
import {
  INVALID_BOUNDING_BOX,
  INVALID_IDS,
  INVALID_SEARCH_SPEC,
  normalizeBoundingBox,
  resolveDataScope,
} from "./dataScope";

const box = { west: 115, south: -32, east: 122, north: -26 };
const search = { "name.contains": "komatiite", "dataPackageId.equals": 12 };

describe("resolveDataScope", () => {
  it("is empty when the host sends nothing", () => {
    expect(resolveDataScope({})).toEqual({ kind: "empty", unused: [] });
  });

  it("uses ids ahead of a search spec and a bounding box", () => {
    const scope = resolveDataScope({ ids: ["SMP-1", " SMP-2 ", "", "SMP-1"], searchSpec: search, boundingBox: box });
    expect(scope.kind).toBe("ids");
    expect(scope.ids).toEqual(["SMP-1", "SMP-2"]);
    expect(scope.searchSpec).toBeUndefined();
    expect(scope.boundingBox).toBeUndefined();
    expect(scope.unused).toEqual(["searchSpec", "boundingBox"]);
  });

  it("uses the search spec when ids are empty", () => {
    const scope = resolveDataScope({ ids: [" ", ""], searchSpec: search, boundingBox: box });
    expect(scope.kind).toBe("search");
    expect(scope.searchSpec).toBe(search);
    expect(scope.unused).toEqual(["boundingBox"]);
    expect(scope.idsError).toBeUndefined();
  });

  it("uses the bounding box when it is the only scope", () => {
    const scope = resolveDataScope({ boundingBox: [115, -32, 122, -26] });
    expect(scope.kind).toBe("boundingBox");
    expect(scope.boundingBox).toEqual(box);
  });

  it("coerces numeric ids and drops values that are not ids", () => {
    const scope = resolveDataScope({ ids: [1042, "1042", "1048"] });
    expect(scope.ids).toEqual(["1042", "1048"]);
  });

  it("reports a malformed id list and does not treat it as a scope", () => {
    const scope = resolveDataScope({ ids: "SMP-1" as unknown as string[] });
    expect(scope.kind).toBe("empty");
    expect(scope.idsError).toBe(INVALID_IDS);
  });

  it("reports an invalid bounding box without dropping a valid id list", () => {
    const scope = resolveDataScope({
      ids: ["SMP-1"],
      boundingBox: { west: 0, south: 10, east: 1, north: 0 },
    });
    expect(scope.kind).toBe("ids");
    expect(scope.boundingBoxError).toBe(INVALID_BOUNDING_BOX);
    expect(scope.unused).not.toContain("boundingBox");
  });

  it("reports a search spec that is not an object", () => {
    const scope = resolveDataScope({ searchSpec: ["komatiite"] as unknown as typeof search });
    expect(scope.kind).toBe("empty");
    expect(scope.searchSpecError).toBe(INVALID_SEARCH_SPEC);
  });

  it("skips scopes the manifest does not accept", () => {
    const scope = resolveDataScope(
      { ids: ["SMP-1"], boundingBox: box },
      { searchSpec: false, ids: false, boundingBox: true },
    );
    expect(scope.kind).toBe("boundingBox");
    expect(scope.unused).toEqual(["ids"]);
  });
});

describe("normalizeBoundingBox", () => {
  it("accepts a GeoJSON bbox and a map bounds object", () => {
    expect(normalizeBoundingBox([115, -32, 122, -26])).toEqual(box);
    expect(
      normalizeBoundingBox({
        getWest: () => 115,
        getSouth: () => -32,
        getEast: () => 122,
        getNorth: () => -26,
      }),
    ).toEqual(box);
  });

  it("keeps a box that crosses the antimeridian", () => {
    expect(normalizeBoundingBox({ west: 170, south: -10, east: -170, north: 10 })).toEqual({
      west: 170,
      south: -10,
      east: -170,
      north: 10,
    });
  });

  it("rejects a box with south above north, or values outside range", () => {
    expect(normalizeBoundingBox({ west: 0, south: 2, east: 1, north: 1 })).toBeNull();
    expect(normalizeBoundingBox({ west: 0, south: -100, east: 1, north: 0 })).toBeNull();
    expect(normalizeBoundingBox([1, 2, 3])).toBeNull();
    expect(normalizeBoundingBox({ minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 })).toBeNull();
  });
});
