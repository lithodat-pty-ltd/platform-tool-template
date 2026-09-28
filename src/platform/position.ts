import type { CSSProperties } from "react";
import type { ControlPanelPosition } from "../contract";

/**
 * Module default, then host override.
 * A horizontal key in the override (`left` or `right`) replaces both default
 * horizontal keys. The vertical axis works the same way, so a host can switch
 * a left-docked panel to `right` without the default `left` remaining.
 */
export function resolvePosition(
  defaults: ControlPanelPosition,
  override?: ControlPanelPosition,
): ControlPanelPosition {
  const base = pick(defaults);
  if (!override) return base;
  const definedOverride = pick(override);
  const next: ControlPanelPosition = { ...base, ...definedOverride };
  if (definedOverride.left != null || definedOverride.right != null) {
    if (definedOverride.left == null) delete next.left;
    if (definedOverride.right == null) delete next.right;
  }
  if (definedOverride.top != null || definedOverride.bottom != null) {
    if (definedOverride.top == null) delete next.top;
    if (definedOverride.bottom == null) delete next.bottom;
  }
  return pick(next);
}

export function positionToStyle(position: ControlPanelPosition): CSSProperties {
  const style: CSSProperties = { zIndex: position.zIndex ?? 25 };
  if (position.left != null) style.left = toCssUnit(position.left);
  if (position.top != null) style.top = toCssUnit(position.top);
  if (position.right != null) style.right = toCssUnit(position.right);
  if (position.bottom != null) style.bottom = toCssUnit(position.bottom);
  return style;
}

function pick(position: ControlPanelPosition): ControlPanelPosition {
  const next: ControlPanelPosition = {};
  if (position.left != null) next.left = position.left;
  if (position.top != null) next.top = position.top;
  if (position.right != null) next.right = position.right;
  if (position.bottom != null) next.bottom = position.bottom;
  if (position.zIndex != null) next.zIndex = position.zIndex;
  return next;
}

function toCssUnit(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}
