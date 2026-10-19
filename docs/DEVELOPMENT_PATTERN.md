# Development pattern

Read [README.md](../README.md) first. This file is the detail behind that guide.

Platform tools are npm modules. The module draws its own interface. The host passes a fixed set of parameters and does not take on the tool's behaviour.

That split is already how the platform mounts Swath Profile:

```jsx
{this.props.mapDatapointState.showSwath && (
  <SwathProfileTool
    key={`${this.state.runtimeThemeTokens.graniteBrand}:${this.state.runtimeThemeTokens.surfaceMode}`}
    map={this.mglMap}
    getToken={this.getSwathProfileAccessToken}
    onClose={this.closeSwathProfileTool}
    controlPanelPosition={{ left: 50, top: 80 }}
  />
)}
```

Lithoplates, the gridding tool, Lithochem, Bookmarks, and AOI are the same kind of module. Each one owns its panel. Each one uses the parameters that match its job. A new capability belongs in a new module, not in a new branch of the platform UI.

This repository is the starting point for that module. Clone it, rename it, and replace `src/tool/MyTool.tsx`. The contract is `src/contract.ts`.

## What you edit

| Edit | Leave alone, unless the contract itself changes |
| --- | --- |
| `package.json` name | `src/contract.ts` |
| `src/tool/MyTool.tsx` | `src/platform/**` |
| `src/tool/MyTool.css` | |
| `src/tool/manifest.ts` | |

`src/sandbox/**` is the host harness. It mounts the module the way the EarthBank client will, and it can pass or withhold each parameter, including `apiBaseUrl`. Run it before you publish and before you add the registration to the client. Extend it if you need to simulate a parameter. Do not ship sandbox behaviour inside the tool. The library build excludes this folder.

## What the host passes

Every field is optional. A Bookmarks-style tool can ignore the map. An embedded panel can ignore close. Missing data is an empty state, not an exception. A throw in the module should be caught by a host error boundary so the map stays up (`examples/host-mount.tsx` notes this; the sandbox has a boundary).

| Parameter | Role |
| --- | --- |
| `getToken` | Returns a JWT for data access. Prefer this over a raw string so the host can refresh it. Same role as `getSwathProfileAccessToken`. |
| `token` | A JWT the host already holds. Ignored when `getToken` is set. |
| `apiBaseUrl` | EarthBank API origin. Omit it and a published module uses the host's `axios.defaults.baseURL`, then the page origin. `npm run dev` also uses the page origin. Vite proxies `/api` to `https://testapp.ausgeochem.org`, so the browser does not call testapp directly. |
| `map` | The caller's Mapbox instance (`mglMap`), also available as `MapContext`. Omit it, or pass `null`, when the tool does not draw on the map. A Mapbox access token is not a module parameter. |
| `onClose` | Tells the host to hide the tool. The module does not unmount itself. Omit it when the panel is docked and cannot be dismissed. |
| `controlPanelPosition` | Host override of the module's default position. Numbers are pixels. `right` replaces a default `left`. |
| `onControlPanelPositionChange` | Fired when the user finishes dragging the panel, so the host can store the new position. |
| `licenses` | What this user is allowed to see. Strings, or `{ id }` / `{ name }` records. |
| `theme` | Granite brand, surface, and tokens — or a CSS reference. |
| `searchSpec` | EarthBank query criteria the API already understands (`name.contains`, `id.in`, and the rest). |
| `ids` | A list of record ids to open. |
| `boundingBox` | A geographic extent to open. |

Do not add a one-off prop for a single tool. Add a criteria key the API already accepts, such as `materialName.equals` or `dataPackageId.equals`, on the query you pass to `listSamples`. If the host already built that query, pass `searchSpec` through unchanged. If the contract is genuinely missing a parameter, add it once in `src/contract.ts` and describe it here. Do not read platform globals, `localStorage` tokens, or the map DOM to get around a missing prop.

The React `key` in the Swath mount is host behaviour:

```jsx
key={`${graniteBrand}:${surfaceMode}`}
```

The module also applies `theme` when the props change. The key still matters: a remount clears state held inside the module. Do not rely on that remount to refresh data. Read the new props.

## Access token

Call `getAccessToken()` from `usePlatformToken` at the moment you make a request. `authorizedFetch` sets `Authorization: Bearer <jwt>` and does not replace a header you already set.

The token is a credential. Do not write it to the console, the DOM, or an error message. With the sandbox sign-in and JWT field empty, the page sends an unsigned local token. Sign in with an EarthBank username and password (`POST /api/authenticate`) or paste a JWT to call the API as that user. The password and token stay in the page and are not part of the published module. A real module sends the platform JWT only to the platform API.

## Calling the API

`authorizedFetch` always sends `Authorization: Bearer`. Use it when the call cannot succeed without a JWT.

`createPlatformApi` is the transport. It uses `apiBaseUrl` when the host passed one. Otherwise it uses `axios.defaults.baseURL`, which client001 sets from `SERVER_API_URL`. An empty axios base URL means the page origin, the same as axios. While running this repository's dev server, that page origin is the Vite server, and Vite forwards `/api` to `https://testapp.ausgeochem.org`. `platformFetch` attaches the bearer token when the host provided one, and calls without a header when it did not. Public EarthBank reads answer without a JWT. Private samples still need the host token. A failed response throws `PlatformApiError` with the HTTP status and the problem `detail`. The message stays short and never includes the JWT.

`getJson` and `postJson` send one request. `listAll` repeats `page` and `size` until a short page comes back, and stops early when `X-Total-Count` says every row is already in hand. Long `*.in` lists are split into batches of 50 inside the named calls below.

`createEarthBank` is the set of calls every tool should start from. Pass the caller's JHipster query through; do not invent a second filter language.

```ts
const api = createPlatformApi(tokenSourceOf(props), props.apiBaseUrl);
const earthbank = createEarthBank(api);

const hydrated = await earthbank.hydrateSamplesById(scope.ids);
const matches = await earthbank.listSamples({ "dataPackageId.equals": packageId, "name.contains": text });
const inView = await earthbank.findSamplesInBounds(scope.boundingBox);
const points = await earthbank.listDataPointsBySampleIds(sampleIds);
const pkg = await earthbank.getDataPackage(packageId);
```

| Call | Request |
| --- | --- |
| `hydrateSamplesById` | `GET /api/core/hydrate-samples-by-id?sampleIds=` as one comma-separated value. One missing id fails the whole batch. This method throws that error. A tool that should keep the rest splits the list and retries. |
| `listSamples` | `GET /api/core/sample-with-locations` with the caller's query (`field.equals`, `field.in`, `field.contains`), followed across pages. |
| `findSamplesInBounds` | The same sample list, filtered with `locationCriteria.lat` and `locationCriteria.lon` greater-or-equal and less-or-equal bounds. West may be greater than east; those values are sent as given and are not split at the antimeridian. `POST /api/core/sample-with-locations/findGeoSquare/post` returns a `GeoSquare` extent, so it is not used to list samples. |
| `listDataPointsBySampleIds` | `GET /api/core/data-points?sampleId.in=`, paged. `dataStructure` says which technique the row is. The matching `*DataPointId` (`ftdataPointId`, `upbDataPointId`, `gcdataPointId`, and the rest) points at that technique's record. |
| `getDataPackage` | `GET /api/management/data-packages/{id}`. Name, distribution, and workflow state live on `dataPackageDTO`. |

Technique groups stay in the tool that needs them. Fission track, U-Pb, geochemistry, and the rest are not part of this client. Call them with `api.getJson` or `api.listAll` on that technique's path, for example `GET /api/fissiontrack/FTDataPoint?id.in=`.

Do not invent a second HTTP helper inside a tool. If a core call is missing, add it on `createEarthBank`. If a verb or a body is missing, add it on `createPlatformApi`.

The hook refreshes about a minute before `exp` when `getToken` is provided. It does not poll. If the host passed a static `token` string, it cannot be refreshed.

## Licenses

`hasLicense` is an exact match. `example` does not grant `example.analysis`. A missing list means the user holds none of these licenses, not all of them.

Hide the controls the user cannot use. Do not render them disabled, and do not add a "you are not licensed" line for every hidden feature. `LicenseGate` does the hiding.

Declare the ids you check on `toolManifest.licenses` so the host can see them without reading the component.

## Ids, search criteria, or a bounding box

These are three ways for the host to say which records the tool should open. Send one.

| Input | Shape |
| --- | --- |
| `ids` | Sample ids, as strings or numbers. Blank entries are dropped. Duplicates are dropped. |
| `searchSpec` | EarthBank query criteria. See below. |
| `boundingBox` | `{ west, south, east, north }`, a GeoJSON bbox `[west, south, east, north]`, or a map bounds object with `getWest` / `getSouth` / `getEast` / `getNorth`. |

A search on this API is a flat object of criteria keys. The same keys are the query string on `GET /api/core/sample-with-locations` and the other list endpoints. `listSamples` and `listAll` turn the object into that query string.

```ts
await earthbank.listSamples({
  "name.contains": "Du",
  "dataPackageId.equals": 4532801,
});

await earthbank.listSamples({ "id.in": [1216651, 1216652] });
```

| Key | Meaning |
| --- | --- |
| `field.equals` | Exact match. `dataPackageId.equals`, `id.equals`. |
| `field.in` | One of these values. Pass an array. The request repeats the key: `id.in=1&id.in=2`. |
| `field.contains` | Substring. `name.contains`. |
| `field.greaterOrEqualThan` / `field.lessOrEqualThan` | Bounds. Location uses `locationCriteria.lat.greaterOrEqualThan` and `locationCriteria.lon.lessOrEqualThan`. |
| `sort` | JHipster sort, such as `"name,asc"`. |
| `page`, `size` | Added by `listAll`. Do not invent `limit` or `offset`. |

`hydrateSamplesById` is the other shape. It sends one comma-separated `sampleIds` parameter. Call that method with the id list. Do not build `sampleIds` yourself, and do not put `text`, `datasetId`, `filters`, or `extra` around the criteria.

`west` may be greater than `east` when the box crosses the antimeridian. `south` must not be greater than `north`. Latitudes are within -90..90 and longitudes within -180..180. `findSamplesInBounds` writes the box as `locationCriteria.lat` and `locationCriteria.lon` criteria. It does not split the box at the antimeridian.

If the host sends more than one input, `resolveDataScope` keeps a single scope:

1. A non-empty id list.
2. Otherwise the search criteria.
3. Otherwise the bounding box.

The inputs that were valid and not selected are listed on `unused`. They are not applied as extra filters. Pass `toolManifest.accepts` into `resolveDataScope` so a tool that cannot use a bounding box ignores one instead of opening it.

A malformed value sets `idsError`, `searchSpecError`, or `boundingBoxError` and does not become the scope. Show that message. Do not throw.

When the scope is `search`, pass `scope.searchSpec` straight to `listSamples`. The keys are already the API fields. Do not ask the host for a new prop per filter.

## Map

The type on the contract is the small set of methods this template calls. The object the host passes is the real map. Extend the interface in your module for `addSource`, `addLayer`, and the rest, and keep that extension local.

Read it with `useMapContext(props.map)`. In module mode the caller's `MapProvider` wins, and the `map` prop is the fallback when the caller did not set a provider. A Mapbox access token is ignored. The demo client (`src/sandbox`) is the only place that reads one: `VITE_MAPBOX_ACCESS_TOKEN`, the `mapboxAccessToken` prop on `SandboxHost`, or the field in the host column. That key builds a Mapbox map for local development. Leave it blank and the sandbox keeps the stand-in map. Do not pass the key into the published module.

The sample tool calls `fitBounds` when the scope is a bounding box that does not cross the antimeridian. Delete that effect if your tool should not move the camera.

Set `requiresMap` on the manifest when a missing map should be explained in the panel. Still render the panel.

## Position

1. `toolManifest.defaultControlPanelPosition` (the template uses `{ left: 50, top: 80 }`, the Swath default).
2. `controlPanelPosition` from the host.
3. A drag in the current session, until the host position changes.

Dragging calls `onControlPanelPositionChange` when the pointer is released. Wire that if the platform stores layouts. If you build your own panel instead of `ControlPanel`, keep this order.

## Theme

The platform look comes from Granite, or from a stylesheet the host already has. The module does not depend on the Granite package, so it builds without that registry.

Use one of these:

1. **Granite tokens.** The host passes `theme.graniteBrand`, `theme.surfaceMode`, and `theme.graniteTokens` from the Granite module. Map Granite's names onto the variables below. Built-in presets follow brand and surface until those tokens arrive. `graniteBrand` is `lithodat`, `earthbank`, `amira`, or `dmgeode`. `surfaceMode` is `light`, `dark`, or `midnight`. `midnight` is kept for `amira` and rendered as `dark` for the other brands. A missing or unknown name becomes `earthbank` and `light`. `data-granite-brand` and `data-surface-mode` are those resolved values.
2. **CSS reference.** Pass `theme.stylesheetHref` (a URL the page can load) or `theme.className` (a class whose CSS is already on the page). Built-in colour presets are skipped so your sheet is visible. Layout still comes from the module.

`theme.graniteTokens` and `theme.cssVariables` are written on the panel element, so they win over stylesheet rules. Do not pass them together with a CSS reference unless that is what you want.

Target `.platform-tool` plus your class so your variables beat the module defaults:

```css
.platform-tool.sample-host-theme {
  --pt-accent: #0f6e56;
}
```

Variables the layout reads:

`--pt-font`, `--pt-bg`, `--pt-fg`, `--pt-muted`, `--pt-panel`, `--pt-border`, `--pt-accent`, `--pt-accent-fg`, `--pt-danger`, `--pt-shadow`, `--pt-radius`.

`tokensForBrand` in `src/platform/granite.ts` is the stand-in. Replace its body with the real Granite call when the package is available to you. Prefer the host passing tokens that are already mapped, so every tool shares one Granite version.

The published bundle injects the layout CSS when the module is imported. You do not add a second stylesheet tag for the panel chrome. A host skin is the `theme` CSS reference, not a copy of the panel layout.

## Tools already on the platform

These modules are already mounted this way. The table is which parameters a tool of that kind should expect. It is not a dump of their source.

| Module | Map | Close | Token | Typical scope | License use |
| --- | --- | --- | --- | --- | --- |
| Swath Profile | Required. The mount above is the reference. | Yes. Closing dismisses the profile. | Yes. `getToken` is the access token for the profile data. | The transect the user opened: a search, or a bounding box along the swath. | Hide profile products the user is not licensed for. |
| Lithoplates | Required. Plates are drawn on the map. | Yes. | Yes. | Plate ids, or the search that found them. | Hide plate datasets the user cannot open. |
| Gridding tool | Required. The grid is a layer. | Yes. | Yes. | The bounding box is the grid extent. | Hide resolution or export the license does not include. |
| Lithochem | Optional. A chart or table can run without the map. | Yes, unless it is docked in a side panel. | Yes. Chemistry calls are authorized with the JWT. | Sample ids, or the current search. | Hide elements, methods, or export. |
| Bookmarks | Optional. A bookmark may move the map, but the list itself does not need it. | Optional when the list is docked. | Only if loading bookmarks needs the API. | A bookmark can store a bounding box, or a list of ids. | Often none. If a bookmark opens licensed data, check before opening it. |
| AOI | Required. The area is drawn on the map. | Yes. Close ends the draw session. | Yes, when the area is saved or queried. | The bounding box is the area. | Hide save or export. |

Position is overridable for all of them. The host passes `controlPanelPosition` when the default would cover something else.

## How the host adds a module

Today the host still has a short explicit mount per tool, as in the Swath snippet. That block is wiring. The UI and the data calls are not in it.

The generalised form is `examples/host-mount.tsx`. The host holds a registration, not a copy of the tool:

```bash
npm install github:lithodat-pty-ltd/platform-tool-template
```

```tsx
import { FormattedFileDownload, toolManifest } from "platform-tool-template";

const registration = { Component: FormattedFileDownload, manifest: toolManifest };

<FormattedFileDownload
  getToken={getAccessToken}
  onClose={closeTool}
  controlPanelPosition={{ left: 50, top: 80 }}
  theme={{ graniteBrand: "earthbank", surfaceMode: "light" }}
  licenses={userLicenses}
  searchSpec={currentSearch}
  ids={selectedIds}
  boundingBox={currentExtent}
  map={mglMap}
/>
```

`currentSearch` is EarthBank query criteria, such as `{ "name.contains": "Du", "dataPackageId.equals": 4532801 }`. It is the same object `listSamples` accepts. `theme.graniteBrand` and `theme.surfaceMode` are the values client001 passes into Granite: `earthbank` and `light`. `controlPanelPosition` is the module default, `{ left: 50, top: 80 }`. The host can override it.

`examples/registry.json` is the list of packages. The platform bundle cannot import an unknown package name out of thin air, so adding a module is still a dependency and one registration. That is the whole integration. Do not copy the tool's components into the platform repository.

Pass the scope the user actually has open. Do not pass ids and a bounding box "just in case" unless you mean the id list to win and the box to be ignored.

## Local development

```bash
npm install
npm run dev
```

The sandbox is the EarthBank client. Tick the licenses declared on the manifest, turn the map and close on and off, send a search, an id list, a bounding box, or more than one, point the API origin at production or leave it blank, and switch between Granite brands and the sample stylesheet in `public/sample-theme.css`. When that behaves, register the module in the client. Do not copy the panel into the client repository.

```bash
npm test
npm run typecheck
npm run build
```

Before publishing, change `name` in `package.json` and remove `"private": true`. Peer dependencies are `react` and `react-dom`. Do not bundle them.

## Rules of the boundary

- The module renders its own interface.
- The host supplies the parameters in `PlatformToolProps` and nothing tool-specific.
- Do not throw on a missing parameter.
- Do not treat a missing license list as full access.
- Do not log the JWT.
- Do not import host source. The props are the API.
- Keep theme on `theme`, so a tool built away from the Granite repository still matches the platform when the host passes tokens or a stylesheet.
