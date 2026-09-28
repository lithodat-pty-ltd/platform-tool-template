import { describe, expect, it } from "vitest";
import { cssVariablesFrom, PLATFORM_TOOL_CSS_VARIABLES, tokensForBrand } from "./granite";

describe("tokensForBrand", () => {
  it("returns every layout variable", () => {
    const tokens = tokensForBrand("copper", "dark");
    for (const name of PLATFORM_TOOL_CSS_VARIABLES) {
      expect(tokens[name]).toEqual(expect.any(String));
    }
    expect(tokens["--pt-accent"]).toBe("#e39a62");
  });

  it("treats an unknown brand as granite and any non-dark surface as light", () => {
    expect(tokensForBrand("Copper", "light")["--pt-accent"]).toBe("#b15a2a");
    expect(tokensForBrand("not-a-brand", "light")["--pt-accent"]).toBe(tokensForBrand("granite", "light")["--pt-accent"]);
    expect(tokensForBrand("basalt")["--pt-panel"]).toBe("#fffdfb");
    expect(tokensForBrand("basalt", "dark-high-contrast")["--pt-panel"]).toBe("#241f1c");
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
