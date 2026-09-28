import { describe, expect, it } from "vitest";
import { cssVariablesFrom, PLATFORM_TOOL_CSS_VARIABLES, resolveGraniteTheme, tokensForBrand } from "./granite";

describe("tokensForBrand", () => {
  it("returns every layout variable for a known brand and mode", () => {
    const tokens = tokensForBrand("earthbank", "dark");
    for (const name of PLATFORM_TOOL_CSS_VARIABLES) {
      expect(tokens[name]).toEqual(expect.any(String));
    }
    expect(tokens["--pt-accent"]).toBe("#6e73da");
    expect(tokens["--pt-panel"]).toBe("#241f1c");
  });

  it("keeps only Granite brands and modes", () => {
    expect(resolveGraniteTheme("lithodat", "light")).toEqual({ brand: "lithodat", mode: "light" });
    expect(resolveGraniteTheme("amira", "midnight")).toEqual({ brand: "amira", mode: "midnight" });
    expect(resolveGraniteTheme("EarthBank", "DARK")).toEqual({ brand: "earthbank", mode: "dark" });
    expect(resolveGraniteTheme(undefined, undefined)).toEqual({ brand: "earthbank", mode: "light" });
    expect(resolveGraniteTheme("copper", "basalt")).toEqual({ brand: "earthbank", mode: "light" });
    expect(resolveGraniteTheme("not-a-brand", "dark-high-contrast")).toEqual({ brand: "earthbank", mode: "light" });
    expect(tokensForBrand("not-a-brand", "light")["--pt-accent"]).toBe(tokensForBrand("earthbank", "light")["--pt-accent"]);
  });

  it("renders midnight only for amira", () => {
    expect(resolveGraniteTheme("lithodat", "midnight")).toEqual({ brand: "lithodat", mode: "dark" });
    expect(tokensForBrand("lithodat", "midnight")["--pt-panel"]).toBe(tokensForBrand("lithodat", "dark")["--pt-panel"]);
    expect(tokensForBrand("amira", "midnight")["--pt-panel"]).toBe("#052460");
    expect(tokensForBrand("amira", "midnight")["--pt-accent"]).toBe("#00a7e2");
  });
});

describe("cssVariablesFrom", () => {
  it("prefixes bare token names and keeps variables that already have dashes", () => {
    expect(cssVariablesFrom({ "pt-accent": "#112233", "--pt-font": "Georgia, serif" })).toEqual({
      "--pt-accent": "#112233",
      "--pt-font": "Georgia, serif",
    });
    expect(cssVariablesFrom(undefined)).toEqual({});
  });
});
