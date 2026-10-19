import { describe, expect, it, vi } from "vitest";
import { authenticateWithPassword } from "./signIn";

describe("authenticateWithPassword", () => {
  it("returns id_token from a successful EarthBank sign-in", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ id_token: "jwt-from-body" }), { status: 200 });
    });
    const jwt = await authenticateWithPassword("ada", "secret-value", "", fetchImpl);
    expect(jwt).toBe("jwt-from-body");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/authenticate");
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "ada", password: "secret-value", rememberMe: false }));
  });

  it("uses an explicit origin and the Authorization header when the body has no token", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("{}", {
        status: 200,
        headers: { Authorization: "Bearer jwt-from-header" },
      });
    });
    const jwt = await authenticateWithPassword("ada", "secret-value", "https://testapp.ausgeochem.org/", fetchImpl);
    expect(jwt).toBe("jwt-from-header");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe("https://testapp.ausgeochem.org/api/authenticate");
  });

  it("rejects a bad password without repeating it", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ detail: "Bad credentials secret-value" }), { status: 401 });
    });
    await expect(authenticateWithPassword("ada", "secret-value", "", fetchImpl)).rejects.toThrow(
      "Username or password was not accepted.",
    );
  });
});
