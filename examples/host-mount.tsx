import type { ComponentType } from "react";
import type { PlatformToolProps, ToolManifest } from "../src/contract";

/**
 * Reference mount for the platform. This file is not published as the tool UI.
 *
 * Copy the shape, not the tool. A new module is a dependency plus one
 * registration. The panel, the license rules, and the data calls stay in the
 * package.
 *
 * Swath Profile is mounted explicitly today:
 *
 *   {this.props.mapDatapointState.showSwath && (
 *     <SwathProfileTool
 *       key={`${graniteBrand}:${surfaceMode}`}
 *       map={this.mglMap}
 *       getToken={this.getSwathProfileAccessToken}
 *       onClose={this.closeSwathProfileTool}
 *       controlPanelPosition={{ left: 50, top: 80 }}
 *     />
 *   )}
 *
 * The slot below is the same mount, generalised. `showSwath` becomes `open`.
 * The component comes from the registry instead of a named import in the host.
 */
export interface PlatformToolRegistration {
  Component: ComponentType<PlatformToolProps>;
  manifest: ToolManifest;
}

export function PlatformToolSlot({
  tool,
  open,
  graniteBrand,
  surfaceMode,
  theme,
  controlPanelPosition,
  ...rest
}: {
  tool: PlatformToolRegistration;
  open: boolean;
  graniteBrand?: string;
  surfaceMode?: string;
} & PlatformToolProps) {
  if (!open) return null;
  const Tool = tool.Component;
  const brand = graniteBrand ?? theme?.graniteBrand ?? "";
  const surface = surfaceMode ?? theme?.surfaceMode ?? "";
  return (
    <Tool
      {...rest}
      key={`${brand}:${surface}`}
      theme={
        theme ?? {
          graniteBrand,
          surfaceMode,
        }
      }
      controlPanelPosition={controlPanelPosition ?? tool.manifest.defaultControlPanelPosition}
    />
  );
}
