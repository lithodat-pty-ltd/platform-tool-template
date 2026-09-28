import { describe, expect, it, vi } from "vitest";
import { createPlatformApi } from "./api";
import { EARTHBANK_ID_CHUNK, createEarthBank } from "./earthbank";

describe("createEarthBank", () => {
  it("loads samples by id in chunks and throws when a batch is missing", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const ids = new URL(String(input)).searchParams.get("sampleIds") ?? "";
      if (ids.split(",").length > EARTHBANK_ID_CHUNK) {
        return new Response(JSON.stringify({ detail: "chunk too large" }), { status: 400 });
      }
      if (ids.includes("999")) {
        return new Response(JSON.stringify({ detail: "Unable to find Sample with id 999" }), { status: 500 });
      }
      const rows = ids.split(",").filter(Boolean).map((id) => ({ id: Number(id), sampleDTO: { id: Number(id) } }));
      return new Response(JSON.stringify(rows), { status: 200 });
    });
    const client = createEarthBank(createPlatformApi(undefined, undefined, fetchImpl));
    const ids = Array.from({ length: EARTHBANK_ID_CHUNK + 1 }, (_, index) => String(index + 1));
    const found = await client.hydrateSamplesById(ids);
    expect(found).toHaveLength(EARTHBANK_ID_CHUNK + 1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const first = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(first.pathname).toBe("/api/core/hydrate-samples-by-id");
    expect(first.searchParams.get("sampleIds")?.split(",")).toHaveLength(EARTHBANK_ID_CHUNK);

    await expect(client.hydrateSamplesById(["1", "999"])).rejects.toThrow(/Unable to find Sample/);
  });

  it("lists samples with the caller's query", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify([{ id: 7 }]), { status: 200, headers: { "X-Total-Count": "1" } });
    });
    const client = createEarthBank(createPlatformApi(undefined, undefined, fetchImpl));
    const rows = await client.listSamples({ "dataPackageId.equals": 4532801, "name.contains": "Du" });
    expect(rows).toEqual([{ id: 7 }]);
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/core/sample-with-locations");
    expect(url.searchParams.get("dataPackageId.equals")).toBe("4532801");
    expect(url.searchParams.get("name.contains")).toBe("Du");
  });

  it("selects a box with location latitude and longitude criteria", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("[]", { status: 200, headers: { "X-Total-Count": "0" } });
    });
    const client = createEarthBank(createPlatformApi(undefined, undefined, fetchImpl));
    await client.findSamplesInBounds({ west: 170, south: -28.67, east: -170, north: -28.65 });
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/core/sample-with-locations");
    expect(fetchImpl.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(url.searchParams.get("locationCriteria.lat.greaterOrEqualThan")).toBe("-28.67");
    expect(url.searchParams.get("locationCriteria.lat.lessOrEqualThan")).toBe("-28.65");
    expect(url.searchParams.get("locationCriteria.lon.greaterOrEqualThan")).toBe("170");
    expect(url.searchParams.get("locationCriteria.lon.lessOrEqualThan")).toBe("-170");
  });

  it("lists datapoints by sample id in chunks", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("[]", { status: 200, headers: { "X-Total-Count": "0" } });
    });
    const client = createEarthBank(createPlatformApi(undefined, undefined, fetchImpl));
    const ids = Array.from({ length: EARTHBANK_ID_CHUNK + 1 }, (_, index) => index + 1);
    await client.listDataPointsBySampleIds(ids);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const first = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(first.pathname).toBe("/api/core/data-points");
    expect(first.searchParams.getAll("sampleId.in")).toHaveLength(EARTHBANK_ID_CHUNK);
  });

  it("reads a data package by id", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ dataPackageDTO: { id: 4532801, name: "Cooper", distribution: "PUBLIC" } }), {
        status: 200,
      });
    });
    const client = createEarthBank(createPlatformApi(undefined, undefined, fetchImpl));
    const body = await client.getDataPackage(4532801);
    expect(body.dataPackageDTO?.distribution).toBe("PUBLIC");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/api/management/data-packages/4532801");
  });
});
