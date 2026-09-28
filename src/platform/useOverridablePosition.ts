import { useCallback, useState } from "react";
import type { ControlPanelPosition } from "../contract";
import { resolvePosition } from "./position";

/**
 * Position order:
 * 1. Module default from the manifest.
 * 2. Host `controlPanelPosition` override.
 * 3. A drag in this session, until the host override changes.
 */
export function useOverridablePosition(
  defaults: ControlPanelPosition,
  override: ControlPanelPosition | undefined,
  onCommit: ((position: ControlPanelPosition) => void) | undefined,
) {
  const host = resolvePosition(defaults, override);
  const hostKey = JSON.stringify(host);
  const [dragged, setDragged] = useState<ControlPanelPosition | null>(null);
  const [appliedKey, setAppliedKey] = useState(hostKey);

  if (appliedKey !== hostKey) {
    setAppliedKey(hostKey);
    setDragged(null);
  }

  const setDraggedPosition = useCallback((position: ControlPanelPosition) => {
    setDragged(position);
  }, []);

  const commit = useCallback(
    (position: ControlPanelPosition) => {
      onCommit?.(position);
    },
    [onCommit],
  );

  return { value: dragged ?? host, setDraggedPosition, commit };
}
