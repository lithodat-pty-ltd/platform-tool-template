import {
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { ControlPanelPosition, PlatformTheme } from "../contract";
import { cssVariablesFrom, tokensForBrand } from "./granite";
import { positionToStyle } from "./position";
import { useStylesheet } from "./useStylesheet";
import "./theme.css";

export function ControlPanel({
  title,
  toolId,
  position,
  onPositionChange,
  onPositionCommit,
  onClose,
  theme,
  children,
}: {
  title: string;
  toolId?: string;
  position: ControlPanelPosition;
  onPositionChange?: (position: ControlPanelPosition) => void;
  onPositionCommit?: (position: ControlPanelPosition) => void;
  onClose?: () => void;
  theme?: PlatformTheme;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number; latest: ControlPanelPosition } | null>(null);
  useStylesheet(theme?.stylesheetHref);

  const hostOwnsColor = Boolean(theme?.stylesheetHref?.trim() || theme?.className?.trim());
  const variables = {
    ...(hostOwnsColor ? {} : tokensForBrand(theme?.graniteBrand, theme?.surfaceMode)),
    ...cssVariablesFrom(theme?.graniteTokens),
    ...cssVariablesFrom(theme?.cssVariables),
  };

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !onPositionChange) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const latest = { left: rect.left, top: rect.top };
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, latest };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!drag.current || !onPositionChange) return;
    const left = clamp(event.clientX - drag.current.dx, 8, window.innerWidth - 48);
    const top = clamp(event.clientY - drag.current.dy, 8, window.innerHeight - 48);
    const latest = { left, top };
    drag.current.latest = latest;
    onPositionChange(latest);
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const latest = drag.current.latest;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onPositionCommit?.(latest);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && onClose) {
      event.stopPropagation();
      onClose();
    }
  }

  const className = ["platform-tool", theme?.className?.trim()].filter(Boolean).join(" ");

  return (
    <section
      ref={panelRef}
      className={className}
      style={{ ...positionToStyle(position), ...variables } as CSSProperties}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="false"
      data-tool-id={toolId}
      data-granite-brand={theme?.graniteBrand?.trim() || "granite"}
      data-surface-mode={theme?.surfaceMode?.trim() || "light"}
      onKeyDown={onKeyDown}
    >
      <header
        className="platform-tool__header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="platform-tool__grip" aria-hidden="true" />
        <h2 id={titleId} className="platform-tool__title">
          {title}
        </h2>
        {onClose ? (
          <button type="button" className="platform-tool__close" onClick={onClose}>
            Close
          </button>
        ) : null}
      </header>
      <div className="platform-tool__body">{children}</div>
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
