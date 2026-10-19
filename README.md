# Platform tool template

This is a starter for one EarthBank tool. Clone it, then tell a coding agent what the tool should do. The agent reads this file, then [docs/DEVELOPMENT_PATTERN.md](docs/DEVELOPMENT_PATTERN.md), then edits the sample tool.

You do not need to know the EarthBank client to start. EarthBank already has the map, the sign-in token, and the sample ids. Your package draws one panel and asks the EarthBank API for data.

The panel on `npm run dev` is a demo. The watermark says `demo - replace with your content`. Replace that demo with your tool.

## Paste this to the agent before the task

```text
Read README.md, then docs/DEVELOPMENT_PATTERN.md, then src/contract.ts and src/platform/earthbank.ts.
Change the tool under src/tool/. Leave src/platform/ and src/contract.ts alone unless a prop is genuinely missing.
The host passes sample ids, EarthBank query criteria, or a bounding box. Ids win.
Call the API through createEarthBank. A search is criteria such as "name.contains" and "id.in", not a text/filters object.
Do not log the access token. Do not copy the panel into the EarthBank repository.
When the code is in place, run npm test, npm run typecheck, and npm run dev.
```

## Example task

Ask the agent:

> Replace the sample download with an elevation histogram for the sample ids. Use the ids the host passes. Load the samples with `hydrateSamplesById`. Plot `sampleDTO.referenceElevation`. Samples with no elevation go in a separate count. If no ids were passed, show an empty state and do not call the API.

The agent should end up with a tool shaped like this.

`src/tool/manifest.ts` names the tool and says it accepts ids:

```ts
export const toolManifest: ToolManifest = {
  id: "elevation-histogram",
  displayName: "Elevation histogram",
  summary: "Counts sample elevation for the ids the host passes.",
  requiresMap: false,
  defaultControlPanelPosition: { left: 50, top: 80 },
  licenses: [],
  accepts: { searchSpec: false, ids: true, boundingBox: false },
};
```

`src/tool/MyTool.tsx` loads those ids and draws the chart inside `ControlPanel`:

```tsx
const scope = resolveDataScope(props, toolManifest.accepts);

if (scope.kind !== "ids" || !scope.ids?.length) {
  // Show scope.idsError, or "Pass sample ids to plot elevation."
  // Do not call the API.
}

const api = createPlatformApi(tokenSourceOf(props), props.apiBaseUrl);
const earthbank = createEarthBank(api);
const rows = await earthbank.hydrateSamplesById(scope.ids);

const elevations = rows
  .map((row) => row.sampleDTO?.referenceElevation)
  .filter((value): value is number => typeof value === "number");
```

Group `elevations` into bins and render one bar per bin in the panel. `referenceElevation` is metres on the sample. A missing value is left out of the bars and counted on its own, because hydrate still returns the sample.

Check it in the sandbox. The id list is already filled in. Turn the token on if the samples are private. The chart should change when the id list changes. `npm test` and `npm run typecheck` should pass.

That task does not use a search. The next section is for a tool that does.

## What you may change

| Change this | Leave this |
| --- | --- |
| `package.json` name, and `"private": true` when you publish | `src/contract.ts` |
| `src/tool/MyTool.tsx` and `src/tool/MyTool.css` | `src/platform/**` |
| `src/tool/manifest.ts` | `src/sandbox/**`, except to try a new host input |
| New files next to the tool, such as `src/tool/histogram.ts` | The EarthBank client repository |

`src/sandbox` is a stand-in for EarthBank. It is not part of the published package. The floating panel is your module. The side column is the host, passing the same props EarthBank will pass.

Set `id`, `displayName`, `summary`, `requiresMap`, `licenses`, `accepts`, and `defaultControlPanelPosition` in `src/tool/manifest.ts`. `accepts` tells the sandbox which inputs this tool uses. The sample table accepts ids only, so the search box is marked as ignored.

## What the host passes

Every prop is optional. A missing prop is an empty state, not a crash.

| Prop | What it is |
| --- | --- |
| `ids` | Sample ids to open. This wins when more than one input is sent. |
| `searchSpec` | Query criteria the EarthBank API already understands. See below. |
| `boundingBox` | `{ west, south, east, north }`, `[west, south, east, north]`, or a map bounds object. |
| `getToken` | Returns the user's JWT. Prefer this. The host can refresh it. |
| `token` | A JWT string, used only when `getToken` was not passed. |
| `apiBaseUrl` | API origin. Leave it empty in EarthBank. The module then uses `axios.defaults.baseURL`, which the client has already set. Leave it empty here too: `npm run dev` calls the Vite server, and Vite forwards `/api` to `https://testapp.ausgeochem.org`. |
| `map` | The EarthBank Mapbox map (`mglMap`). `null` means there is no map. The module never receives a Mapbox token. |
| `onClose` | Tells EarthBank to hide the tool. The module does not remove itself. |
| `controlPanelPosition` | Where the panel sits. The default is `{ left: 50, top: 80 }` pixels. |
| `onControlPanelPositionChange` | The position after the user drops the panel. |
| `licenses` | What this user is allowed to see. Hide features they do not have. An empty list means they have none of them. |
| `theme` | `graniteBrand`: `lithodat`, `earthbank`, `amira`, or `dmgeode`. `surfaceMode`: `light`, `dark`, or `midnight` (`midnight` is for Amira). |

`resolveDataScope(props, toolManifest.accepts)` picks one input:

1. A non-empty id list.
2. Otherwise the search criteria.
3. Otherwise the bounding box.

Read `scope.kind`. Show `scope.idsError`, `scope.searchSpecError`, or `scope.boundingBoxError` when one is set.

## How a search is written

EarthBank does not take `{ text, datasetId, filters, sort, limit }`. A search is the same criteria the API puts on the query string. The keys are the fields. The suffix is the comparison.

```ts
const api = createPlatformApi(tokenSourceOf(props), props.apiBaseUrl);
const earthbank = createEarthBank(api);

const matches = await earthbank.listSamples({
  "name.contains": "Du",
  "dataPackageId.equals": 4532801,
});

const byId = await earthbank.listSamples({ "id.in": [1216651, 1216652] });
```

| Criteria | Example |
| --- | --- |
| Exact match | `"dataPackageId.equals": 4532801` |
| One of a list | `"id.in": [1216651, 1216652]` becomes `id.in=1216651&id.in=1216652` |
| Substring | `"name.contains": "Du"` |
| A range | `"locationCriteria.lat.greaterOrEqualThan"` and `"locationCriteria.lat.lessOrEqualThan"` |
| Sort | `"sort": "name,asc"` |

Paging is `page` and `size`. `listAll` adds those and follows every page. Do not send `limit` or `offset`.

When the host has already built this object, pass `scope.searchSpec` through to `listSamples`. Add another criteria key when you need a tighter query. Do not add a new React prop for one filter.

These are the calls most tools start from. The full notes are in [docs/DEVELOPMENT_PATTERN.md](docs/DEVELOPMENT_PATTERN.md).

| You have | Call |
| --- | --- |
| Sample ids | `earthbank.hydrateSamplesById(scope.ids)` → `GET /api/core/hydrate-samples-by-id?sampleIds=` |
| Criteria | `earthbank.listSamples(scope.searchSpec)` → `GET /api/core/sample-with-locations` |
| A map box | `earthbank.findSamplesInBounds(scope.boundingBox)` |
| Datapoints on those samples | `earthbank.listDataPointsBySampleIds(sampleIds)` → `GET /api/core/data-points?sampleId.in=` |
| The package name | `earthbank.getDataPackage(packageId)` |

`hydrateSamplesById` wants the id list. It sends one comma-separated `sampleIds` value. One unknown id fails that batch. A technique-specific call, such as fission track, stays in the tool: `api.getJson("/api/fissiontrack/FTDataPoint", { "id.in": ids })`.

Public reads work with no JWT. Private samples need the token from `getToken`. Do not write the token to the console, the page, or an error message.

## Run it

Node 18 or newer.

```bash
npm install
npm run dev
```

Open the page. The side column can send ids, criteria, or a bounding box, turn the map and the close button on and off, and switch the Granite brand. To show a real Mapbox map in that column only, set `VITE_MAPBOX_ACCESS_TOKEN` in `.env.local` (see `.env.example`) or paste a key into the token field. The published module never reads that key.

```bash
npm test
npm run typecheck
npm run build
```

## Put the tool in EarthBank

Change `name` in `package.json` and remove `"private": true`. EarthBank installs the package and mounts it. It does not copy your panel into the client.

```bash
npm install github:lithodat-pty-ltd/your-tool
```

```tsx
import { ElevationHistogram, toolManifest } from "your-tool";

{open && (
  <ElevationHistogram
    getToken={getAccessToken}
    onClose={closeTool}
    controlPanelPosition={{ left: 50, top: 80 }}
    theme={{ graniteBrand: "earthbank", surfaceMode: "light" }}
    licenses={userLicenses}
    ids={selectedIds}
    map={mglMap}
  />
)}
```

Pass the ids the user has selected. Leave `apiBaseUrl` unset so the module uses the API origin EarthBank already gave axios. The longer mount notes are in `examples/host-mount.tsx` and [docs/DEVELOPMENT_PATTERN.md](docs/DEVELOPMENT_PATTERN.md). How approved tools appear under Tools → 3rd party is in [docs/MODULE_MANAGER.md](docs/MODULE_MANAGER.md).

## Rules

- The module draws its own panel. EarthBank supplies the props in `PlatformToolProps`.
- Do not throw when a prop is missing. Show an empty state.
- Do not treat a missing license list as permission to show everything.
- Do not log the JWT or a Mapbox token.
- Do not import EarthBank source. The props and `createEarthBank` are the API.
