import { describe, expect, it, vi } from "vitest";
import { authorizedFetch, resolveToken, tokenSourceOf } from "./usePlatformToken";

describe("tokenSourceOf", () => {
  it("prefers getToken so the host can refresh the JWT", () => {
    const getToken = () => "from-host";
    expect(tokenSourceOf({ getToken, token: "static" })).toBe(getToken);
    expect(tokenSourceOf({ token: "static" })).toBe("static");
    expect(tokenSourceOf({})).toBeUndefined();
  });
});

describe("resolveToken", () => {
  it("accepts a string or a function", async () => {
    await expect(resolveToken("  jwt  ")).resolves.toBe("jwt");
    await expect(resolveToken(() => "sync")).resolves.toBe("sync");
    await expect(resolveToken(async () => "async")).resolves.toBe("async");
  });

  it("rejects a missing or blank token", async () => {
    await expect(resolveToken(undefined)).rejects.toThrow(/no access token/i);
    await expect(resolveToken("  ")).rejects.toThrow(/empty/i);
    await expect(resolveToken(() => "  ")).rejects.toThrow(/did not return/i);
  });
});

describe("authorizedFetch", () => {
  it("sets a bearer token without replacing one the caller set", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      return new Response("ok");
    });
    await authorizedFetch("/api/samples", { method: "GET" }, "jwt-1", fetchImpl);
    const firstHeaders = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(firstHeaders.get("Authorization")).toBe("Bearer jwt-1");

    await authorizedFetch(
      "/api/samples",
      { headers: { Authorization: "Bearer already" } },
      "jwt-2",
      fetchImpl,
    );
    const secondHeaders = new Headers(fetchImpl.mock.calls[1]?.[1]?.headers);
    expect(secondHeaders.get("Authorization")).toBe("Bearer already");
  });
});
