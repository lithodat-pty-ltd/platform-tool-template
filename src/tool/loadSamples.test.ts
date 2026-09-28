import { describe, expect, it, vi } from "vitest";
import type { PlatformApi } from "../platform/api";
import { loadSampleTable } from "./loadSamples";

describe("loadSampleTable", () => {
  it("keeps the samples that exist when one id is missing", async () => {
    const getJson = vi.fn(async (path: string, query?: Readonly<Record<string, unknown>>) => {
      if (path === "/api/core/hydrate-samples-by-id") {
        const ids = String(query?.sampleIds ?? "");
        if (ids.includes(",")) throw new Error("Unable to find Sample with id 999");
        if (ids === "1216651") return [hydrated("1216651", "Du1-1")];
        throw new Error("Unable to find Sample with id 999");
      }
      if (path.startsWith("/api/management/data-packages/")) {
        return { dataPackageDTO: { id: 4532801, distribution: "PUBLIC", workflowState: "FINISHED" } };
      }
      throw new Error(`Unexpected ${path}`);
    });
    const listAll = vi.fn(async (path: string) => {
      if (path === "/api/core/data-points") {
        return [{ sampleId: 1216651, dataStructure: "FT", ftdataPointId: 4534175 }];
      }
      if (path === "/api/fissiontrack/FTDataPoint") {
        return [{ id: 4534175, ftdataPointDTO: { id: 4534175, mineralName: "Apatite" } }];
      }
      throw new Error(`Unexpected list ${path}`);
    });
    const api: PlatformApi = {
      origin: "https://app.ausgeochem.org",
      getJson: getJson as PlatformApi["getJson"],
      postJson: vi.fn() as PlatformApi["postJson"],
      listAll: listAll as PlatformApi["listAll"],
    };
    const file = await loadSampleTable(["1216651", "999", "nope"], api, new Date("2026-09-24T00:00:00Z"));
    expect(file.rows.map((row) => row.sample)).toEqual(["Du1-1"]);
    expect(file.missingIds).toEqual(["nope", "999"]);
    expect(file.filename).toBe("4532801_Samples.xlsx");
    expect(file.footnotes.join("\n")).toContain("Mineral analysed: Apatite");
    expect(file.bytes[0]).toBe(0x50);
    expect(file.bytes[1]).toBe(0x4b);
  });
});

function hydrated(id: string, name: string) {
  return {
    id: Number(id),
    sampleDTO: {
      id: Number(id),
      name,
      igsn: "10273/AGUA14E9356",
      referenceElevation: 30.7,
      relativeElevationMin: -374.904,
      relativeElevationMax: -283.464,
      materialName: "Sandstone",
      sampleKindName: "Rock",
      sampleMethodName: "Core",
      locationKindName: "Borehole/well",
      referenceElevationKindName: "Ground level",
      elevationGeodicDatumName: null,
      archiveName: "Adelaide University",
      dataPackageId: 4532801,
      dataPackageName: "Cooper-Eromanga Basin detrital apatite",
    },
    locationDTO: {
      name: "Dunoon 1",
      lat: -28.659435,
      lon: 140.10884,
      latLonPrecision: 10,
      countryName: "Australia",
    },
    personDTOs: [{ calcName: "Dr Angus Nixon (0000-0003-3638-1864)" }],
    literatureDTOs: [],
    archiveDTO: { name: "Adelaide University" },
  };
}
