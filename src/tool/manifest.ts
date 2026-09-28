import type { ToolManifest } from "../contract";

/**
 * Identity of this module. The host can read it without rendering the tool.
 * Change `id`, `displayName`, `requiresMap`, `licenses`, and `accepts`
 * to match the tool you are building. The default position matches the
 * Swath Profile mount: `{ left: 50, top: 80 }`.
 */
export const toolManifest: ToolManifest = {
  id: "formatted-file-download",
  displayName: "Sample table",
  summary: "Downloads a formatted sample-information workbook for the sample ids the host passes.",
  requiresMap: false,
  defaultControlPanelPosition: { left: 50, top: 80 },
  licenses: [],
  accepts: {
    searchSpec: false,
    ids: true,
    boundingBox: false,
  },
};
