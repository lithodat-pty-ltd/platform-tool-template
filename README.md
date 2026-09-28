# Platform tool template

Template for developing tools for EarthBank. Clone this repository to build a platform tool as an npm module. The module draws its own interface. The platform passes a fixed set of parameters and does not contain the tool's UI.

The pattern is the Swath Profile mount: `map`, `getToken`, `onClose`, and `controlPanelPosition`. This template keeps that mount and adds the rest of the parameters every tool should be ready to receive: licenses, a Granite theme or a CSS reference, and the data to open — a search spec, a list of ids, or a bounding box.

Lithoplates, Swath Profile, the gridding tool, Lithochem, Bookmarks, and AOI are already modules of this kind. Read [docs/DEVELOPMENT_PATTERN.md](docs/DEVELOPMENT_PATTERN.md) before editing.

## Make it yours

1. Clone this repository. This package is a template, not a library to depend on.
2. Change `name` in `package.json`. Remove `"private": true` when you publish.
3. Rename `MyTool`, and set `id`, `displayName`, `requiresMap`, `licenses`, `accepts`, and `defaultControlPanelPosition` in `src/tool/manifest.ts`.
4. Replace the sample body in `src/tool/MyTool.tsx`. Keep the props. Use `ControlPanel`, `usePlatformToken`, `resolveDataScope`, `createPlatformApi`, and `hasLicense` rather than reimplementing them.
5. Run `npm run dev` and drive the sandbox through each parameter.
6. Run `npm test`, `npm run typecheck`, and `npm run build`.
7. On the platform, add the package and a registration entry (`examples/host-mount.tsx`). Do not copy the tool UI into the platform repository.

## Parameters

All of them are optional. Omit what the tool does not need. Do not throw when one is missing.

| Prop | What the host passes |
| --- | --- |
| `getToken` | Function that returns a JWT. The host can refresh it. Same role as `getSwathProfileAccessToken`. |
| `token` | A JWT string, used only when `getToken` is not passed. |
| `apiBaseUrl` | EarthBank API origin. The module client uses `https://app.ausgeochem.org` when this is omitted. |
| `map` | MapLibre / Mapbox map. Optional. `null` means no map. |
| `onClose` | Asks the host to hide the tool. Optional. The module does not unmount itself. |
| `controlPanelPosition` | Override of the module default `{ left: 50, top: 80 }`. Numbers are pixels. |
| `onControlPanelPositionChange` | Last position after the user drags the panel. |
| `licenses` | License strings, or `{ id }` / `{ name }` records. The module decides what to show. |
| `theme` | Granite (`graniteBrand`, `surfaceMode`, `graniteTokens`) or a CSS reference (`stylesheetHref`, `className`). |
| `searchSpec` | Host search: text, dataset, filters, sort, and paging. |
| `ids` | Record ids to open. |
| `boundingBox` | `{ west, south, east, north }`, `[west, south, east, north]`, or a map bounds object. |

Send one data scope. If more than one arrives, ids win, then the search spec, then the bounding box. The others are ignored, not combined.

```jsx
{open && (
  <FormattedFileDownload
    key={`${graniteBrand}:${surfaceMode}`}
    map={mglMap}
    getToken={getAccessToken}
    onClose={closeTool}
    controlPanelPosition={{ left: 50, top: 80 }}
    licenses={userLicenses}
    theme={{ graniteBrand, surfaceMode, graniteTokens }}
    searchSpec={currentSearch}
    ids={selectedIds}
    boundingBox={currentExtent}
  />
)}
```

Pass `graniteTokens` from the Granite module, or pass a CSS reference instead:

```jsx
theme={{ stylesheetHref: "/themes/platform.css", className: "granite-theme" }}
```

The layout CSS variables are `--pt-font`, `--pt-bg`, `--pt-fg`, `--pt-muted`, `--pt-panel`, `--pt-border`, `--pt-accent`, `--pt-accent-fg`, `--pt-danger`, `--pt-shadow`, and `--pt-radius`. Map Granite's names onto those, or set them in the host stylesheet. See the pattern note for which existing tools use the map, close, and which scope.

## Develop

Requires Node 18 or newer.

```bash
npm install
npm run dev
```

The page that opens is a stand-in for the platform. The floating panel is the module (`src/tool/MyTool.tsx`). The side column is the host, and it can pass or withhold each parameter.

```bash
npm test
npm run typecheck
npm run build
```

The sandbox JWT is unsigned and never leaves the browser. Do not log a real access token.

## Publish

The build emits an ES module and injects the panel CSS on import. `react` and `react-dom` are peer dependencies. Import the component:

```ts
import { FormattedFileDownload, toolManifest } from "platform-tool-template";
```

Registration on the host is `examples/host-mount.tsx` and `examples/registry.json`.
