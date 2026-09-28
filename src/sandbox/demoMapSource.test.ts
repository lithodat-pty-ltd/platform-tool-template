import { describe, expect, it } from "vitest";
import { demoMapSource, scrubMapboxMessage } from "./demoMapSource";

describe("demo map source", () => {
  it("uses a Mapbox key only when the demo client was given one", () => {
    expect(demoMapSource("")).toBe("mock");
    expect(demoMapSource("   ")).toBe("mock");
    expect(demoMapSource(undefined)).toBe("mock");
    expect(demoMapSource("pk.demo")).toBe("mapbox");
  });

  it("strips an access token out of a Mapbox error", () => {
    expect(scrubMapboxMessage("GET https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=pk.secret failed")).toBe(
      "GET https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=… failed",
    );
    expect(scrubMapboxMessage("pk.demo-not-a-real-key: you may have provided an invalid Mapbox access token.")).toBe(
      "…: you may have provided an invalid Mapbox access token.",
    );
  });
});
