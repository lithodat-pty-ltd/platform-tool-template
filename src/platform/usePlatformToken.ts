import { useCallback, useEffect, useState } from "react";
import type { PlatformToolProps, TokenGetter } from "../contract";
import { readJwtExpiry } from "./jwt";

export type TokenSource = string | TokenGetter | undefined;
export type TokenStatus = "missing" | "loading" | "ready" | "error";

/** `getToken` wins when both are set, so the host can refresh the JWT. */
export function tokenSourceOf(props: Pick<PlatformToolProps, "getToken" | "token">): TokenSource {
  if (props.getToken) return props.getToken;
  return props.token;
}

export async function resolveToken(source: TokenSource): Promise<string> {
  if (typeof source === "function") {
    const value = await source();
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("getToken did not return a token.");
    }
    return value.trim();
  }
  if (typeof source === "string") {
    if (source.trim() === "") throw new Error("Access token is empty.");
    return source.trim();
  }
  throw new Error("No access token was provided.");
}

/**
 * Fetch with `Authorization: Bearer <jwt>`.
 * Does not replace an Authorization header the caller already set.
 * The token is not written to the console.
 */
export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  source: TokenSource,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const jwt = await resolveToken(source);
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${jwt}`);
  }
  return fetchImpl(input, { ...init, headers });
}

/**
 * Status of the host JWT. The token string itself stays out of React state.
 * Call `getAccessToken` at the moment you make a request.
 */
export function usePlatformToken(props: Pick<PlatformToolProps, "getToken" | "token">) {
  const { getToken, token } = props;
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState<TokenStatus>(getToken || token ? "loading" : "missing");
  const [error, setError] = useState<Error | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const source = tokenSourceOf({ getToken, token });
    if (!source) {
      setStatus("missing");
      setError(null);
      setExpiresAt(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    resolveToken(source).then(
      (jwt) => {
        if (cancelled) return;
        setStatus("ready");
        setExpiresAt(readJwtExpiry(jwt));
        setError(null);
      },
      (reason: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setExpiresAt(null);
        setError(reason instanceof Error ? reason : new Error("Could not read the access token."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [getToken, token, refreshKey]);

  useEffect(() => {
    if (!getToken || status !== "ready" || expiresAt == null) return;
    const delay = expiresAt - Date.now() - 60_000;
    if (delay <= 0) return;
    const id = window.setTimeout(() => setRefreshKey((value) => value + 1), delay);
    return () => window.clearTimeout(id);
  }, [getToken, status, expiresAt]);

  const getAccessToken = useCallback(
    () => resolveToken(tokenSourceOf({ getToken, token })),
    [getToken, token],
  );
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  return { status, error, expiresAt, getAccessToken, refresh };
}
