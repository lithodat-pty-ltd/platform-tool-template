import type { ToolManifest } from "../contract";

/**
 * Identity of this module. The host can read it without rendering the tool.
 * Change `id`, `displayName`, `requiresMap`, `licenses`, and `accepts`
 * to match the tool you are building. The default position matches the
 * Swath Profile mount: `{ left: 50, top: 80 }`.
 */
export const toolManifest: ToolManifest = {
  id: "example-tool",
  displayName: "Example tool",
  summary:
    "Starter interface for a platform module. Replace the body of MyTool and keep the host parameters.",
  requiresMap: false,
  defaultControlPanelPosition: { left: 50, top: 80 },
  licenses: [
    {
      id: "example.analysis",
      description: "Shows the analysis action.",
    },
    {
      id: "example.export",
      description: "Shows the export action.",
    },
  ],
  accepts: {
    searchSpec: true,
    ids: true,
    boundingBox: true,
  },
};
