import { describe, expect, it } from "vitest";
import { hasLicense, licenseIds } from "./licenses";

describe("hasLicense", () => {
  it("treats a missing list as no licenses", () => {
    expect(hasLicense(undefined, "example.analysis")).toBe(false);
    expect(hasLicense([], "example.analysis")).toBe(false);
  });

  it("matches strings and license records exactly", () => {
    expect(hasLicense(["example.analysis", "example.export"], "example.analysis")).toBe(true);
    expect(hasLicense([{ id: "example.export" }, { name: "example.analysis" }], "example.analysis")).toBe(true);
    expect(hasLicense(["example"], "example.analysis")).toBe(false);
    expect(hasLicense(["Example.analysis"], "example.analysis")).toBe(false);
  });

  it("does not match an empty license id", () => {
    expect(hasLicense(["example.analysis"], "")).toBe(false);
  });
});

describe("licenseIds", () => {
  it("reads id, then name, and skips blanks", () => {
    expect(licenseIds(["example.analysis", "", { id: "example.export" }, { name: "platform.bookmarks" }, {}])).toEqual([
      "example.analysis",
      "example.export",
      "platform.bookmarks",
    ]);
  });
});
