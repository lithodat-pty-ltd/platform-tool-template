import { describe, expect, it, vi } from "vitest";
import { PlatformApiError, createPlatformApi, platformFetch } from "./api";

describe("platformFetch", () => {
  it("calls without a bearer token when the host did not provide one", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      return new Response("ok");
    });
    await platformFetch("/api/core/samples", { method: "GET" }, undefined, fetchImpl);
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("sends the host JWT when one is available", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      return new Response("ok");
    });
    await platformFetch("/api/core/samples", { method: "GET" }, "jwt-1", fetchImpl);
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer jwt-1");
  });
});

describe("createPlatformApi", () => {
  it("gets JSON from the EarthBank origin and repeats list query params", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
    });
    const api = createPlatformApi(undefined, "https://app.ausgeochem.org/", fetchImpl);
    const body = await api.getJson<unknown[]>("/api/core/data-points", {
      "sampleId.in": ["1216651", "1216652"],
      size: 200,
    });
    expect(body).toEqual([{ id: 1 }]);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url.startsWith("https://app.ausgeochem.org/api/core/data-points?")).toBe(true);
    const parsed = new URL(url);
    expect(parsed.searchParams.getAll("sampleId.in")).toEqual(["1216651", "1216652"]);
    expect(parsed.searchParams.get("size")).toBe("200");
  });

  it("uses the problem detail as the error and does not include a token", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ detail: "Unable to find Sample with id 1", token: "secret" }), {
        status: 500,
      });
    });
    const api = createPlatformApi("jwt-secret", undefined, fetchImpl);
    await expect(api.getJson("/api/core/hydrate-samples-by-id")).rejects.toBeInstanceOf(PlatformApiError);
    await expect(api.getJson("/api/core/hydrate-samples-by-id")).rejects.toMatchObject({ status: 500 });
    await expect(api.getJson("/api/core/hydrate-samples-by-id")).rejects.toThrow(/Unable to find Sample/);
    await expect(api.getJson("/api/core/hydrate-samples-by-id")).rejects.not.toThrow(/secret/);
  });

  it("posts a JSON body", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const api = createPlatformApi(undefined, undefined, fetchImpl);
    const body = await api.postJson<{ ok: boolean }>("/api/core/samples", { name: "Du1-1" }, { page: 0 });
    expect(body).toEqual({ ok: true });
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify({ name: "Du1-1" }));
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("page=0");
  });

  it("follows pages until the total count is collected", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const page = new URL(String(input)).searchParams.get("page");
      const rows = page === "0" ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }];
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "X-Total-Count": "3" },
      });
    });
    const api = createPlatformApi(undefined, undefined, fetchImpl);
    const rows = await api.listAll<{ id: number }>("/api/core/samples", undefined, { size: 2 });
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const first = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    const second = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(first.searchParams.get("page")).toBe("0");
    expect(first.searchParams.get("size")).toBe("2");
    expect(second.searchParams.get("page")).toBe("1");
  });

  it("stops on a short page when no total is sent", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
    });
    const api = createPlatformApi(undefined, undefined, fetchImpl);
    const rows = await api.listAll<{ id: number }>("/api/core/samples");
    expect(rows).toEqual([{ id: 1 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
