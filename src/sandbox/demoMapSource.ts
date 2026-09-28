/** A development key opens a Mapbox map. A blank key keeps the stand-in map. */
export function demoMapSource(accessToken: string | null | undefined): "mapbox" | "mock" {
  return accessToken?.trim() ? "mapbox" : "mock";
}

/** Mapbox error text can echo the key. Keep the access token out of the page. */
export function scrubMapboxMessage(message: string): string {
  return message
    .replace(/\b(?:pk|sk)\.[A-Za-z0-9._-]+/g, "…")
    .replace(/([?&]access_token=)[^&\s]+/gi, "$1…");
}
