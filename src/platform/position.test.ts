import { describe, expect, it } from "vitest";
import { positionToStyle, resolvePosition } from "./position";

describe("resolvePosition", () => {
  const defaults = { left: 50, top: 80 };

  it("returns the module default when the host does not override it", () => {
    expect(resolvePosition(defaults)).toEqual(defaults);
    expect(resolvePosition(defaults, {})).toEqual(defaults);
  });

  it("lets the host override one edge without clearing the other axis", () => {
    expect(resolvePosition(defaults, { left: 120 })).toEqual({ left: 120, top: 80 });
  });

  it("switches the panel from left to right", () => {
    expect(resolvePosition(defaults, { right: 16 })).toEqual({ top: 80, right: 16 });
  });

  it("switches the panel from top to bottom", () => {
    expect(resolvePosition(defaults, { bottom: "2rem" })).toEqual({ left: 50, bottom: "2rem" });
  });

  it("ignores nullish override fields", () => {
    expect(resolvePosition(defaults, { left: undefined, top: 10 })).toEqual({ left: 50, top: 10 });
  });
});

describe("positionToStyle", () => {
  it("treats numbers as pixels and keeps authored strings", () => {
    expect(positionToStyle({ left: 50, top: "2rem", zIndex: 4 })).toEqual({
      left: "50px",
      top: "2rem",
      zIndex: 4,
    });
  });
});
