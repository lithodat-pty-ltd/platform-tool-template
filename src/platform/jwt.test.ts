import { describe, expect, it } from "vitest";
import { readJwtExpiry } from "./jwt";

function jwt(payload: unknown): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.demo`;
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("readJwtExpiry", () => {
  it("reads exp as milliseconds", () => {
    expect(readJwtExpiry(jwt({ exp: 1_700_000_000 }))).toBe(1_700_000_000_000);
  });

  it("returns null when the token has no exp or is not a JWT", () => {
    expect(readJwtExpiry(jwt({ sub: "user" }))).toBeNull();
    expect(readJwtExpiry("not-a-token")).toBeNull();
    expect(readJwtExpiry("a.!!!.c")).toBeNull();
  });
});
