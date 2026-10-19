# Module manager plan for client001

This is the plan for turning approved platform-tool packages on and off in EarthBank. It is implemented in `io.lithosurfer.client001`, not as another platform-tool module.

A platform tool receives `PlatformToolProps` and draws its own panel. It cannot add a row to the EarthBank Tools menu, and it cannot import a package the EarthBank bundle has never seen. The menu and the mount already live in the client. That is the code to extend.

## Decision

| Piece | Where it lives |
| --- | --- |
| Tool UI, data calls, license rules inside the tool | The tool's own npm package, built from this template |
| Approved-module catalog | A TypeScript file in client001. One static import per package |
| On/off state | A deployment-level (or institution-level) record. Not a per-user preference |
| Tools → 3rd party menu | `ToolBoxEarthbank.tsx` |
| Mount of an open tool | `MGLMapEarthbank.tsx`, next to the existing Swath mount |
| Module manager dialog | EarthBank header, admin only |

Do not load a package from a GitHub URL, an npm name typed into a form, or `import()` of a string the user supplied. `npm install` happens when client001 is built. A text box that fetched a repository would run that code inside the EarthBank origin, with the signed-in user's token and map.

`examples/registry.json` in this template is the same idea at sample size: a list of packages the host already depends on. Adding a module is still a dependency plus one registration.

## What client001 does today

First-party tools are hardcoded. They stay that way.

The on-screen menu opens a Tools popper from `src/main/webapp/app/litho-ui/Earthbank/layer/OnScreenMenuEarthbank.tsx`. The popper renders `ToolBox` from `src/main/webapp/app/litho-ui/Earthbank/layer/ToolBoxEarthbank.tsx`. That list is:

- Go to location
- Find
- Contour Data, bound to `mapState.showContourLayer`
- Swath Profile, bound to `mapState.showSwath`

Swath visibility is Redux state in `src/main/webapp/app/litho-ui/Earthbank/MGLMap/map.storeEarthbank.ts` (`showSwath`, `setShowSwath`). The map class mounts the in-repo profile when that flag is set:

```tsx
{this.props.mapDatapointState.showSwath && (
  <Profile
    data={this.props.mapDatapointState.swathData}
    points={this.props.mapDatapointState.swathSamples}
    layer={this.props.dataViewerState.selectedLayers[0]}
    visibility={this.props.setShowSwath}
  />
)}
```

That block is in `MGLMapEarthbank.tsx`. Swath is not an npm platform-tool yet. Third-party tools use the template contract beside this block. They do not replace Swath, and they do not go through `showSwath`.

The header already knows who is an admin. `src/main/webapp/app/litho-ui/Earthbank/layout/header/headerEarthbank.tsx` renders `AdminMenu` only when `isAuthenticated && isAdmin`. The module manager opens from there.

Axios is already configured for a published module. `src/main/webapp/app/config/axios-interceptor.ts` sets `axios.defaults.baseURL = SERVER_API_URL` and attaches `Bearer` from `jhi-authenticationToken` in local or session storage. A published platform tool reads that base URL and does not need `apiBaseUrl`. It still needs `getToken`, because the module's own `fetch` does not pass through the axios interceptor.

## Two stores

Approval and activation are different.

**Approved** means the package is in the client build. The catalog file is the approval record. A module cannot appear in the manager, or in the menu, until a reviewed change adds the dependency and a static import. Webpack will not ship a package that file does not import.

**Activated** means an approved id is turned on for this EarthBank deployment. The Tools menu shows a third-party row only for activated ids. Shipping a catalog entry with activation off is the normal case: the code is deployed, the menu stays empty until an admin turns it on.

```ts
export interface ThirdPartyModule {
  id: string;
  displayName: string;
  summary: string;
  packageName: string;
  Component: ComponentType<PlatformToolProps>;
  manifest: ToolManifest;
}

export const thirdPartyCatalog: readonly ThirdPartyModule[] = [
  {
    id: toolManifest.id,
    displayName: toolManifest.displayName,
    summary: toolManifest.summary,
    packageName: "platform-tool-template",
    Component: FormattedFileDownload,
    manifest: toolManifest,
  },
];
```

`id` must be `manifest.id`. The menu and the activation record both key on it. `displayName` is the menu label. Keep the component import in this file only, so the rest of the client never imports a tool package directly.

Suggested path: `src/main/webapp/app/litho-ui/Earthbank/modules/thirdPartyCatalog.ts`.

A helper next to it returns the activated subset:

```ts
export function activatedModules(
  catalog: readonly ThirdPartyModule[],
  activatedIds: readonly string[],
): ThirdPartyModule[] {
  const on = new Set(activatedIds);
  return catalog.filter(entry => on.has(entry.id));
}
```

Unknown ids in the activation record are ignored. A catalog id with no activation record stays hidden.

## Where activation is stored

Do not store the on/off list in `api/management/user-properties`.

`src/main/webapp/app/config/userPreferences.ts` documents why. `SetUserPreferences` writes one row per litho user, and `propValue` is 256 characters. That API is how colour ramps and selected packages are saved for one person. A module that is on for EarthBank must not depend on each user saving a preference, and a growing id list will not fit the column.

Store one record for the deployment, or one record per institution if institutions can differ:

```json
{ "activatedIds": ["formatted-file-download"] }
```

The client reads it at map startup and again after the manager saves. The manager writes the full set of ids, not a patch of one flag, so two admins cannot leave a stale half-updated list as easily. The server replaces the previous set.

Until that endpoint exists, each catalog entry may carry `enabled: false` and the helper treats `enabled` as the activation set. Flipping it is a deploy. The menu, the mount, and the dialog must read the helper, so replacing the flag with the API response does not change those three call sites.

Do not use `localStorage` for activation. That would turn a module on for one browser only.

## Tools menu

Leave Go to location, Find, Contour Data, and Swath Profile as hardcoded rows in `ToolBoxEarthbank.tsx`.

Under that list, add one group:

```
Tools
  Go to location
  Find
  Contour Data
  Swath Profile
  3rd party
    Sample table
```

Rules:

- Render **3rd party** only when `activatedModules(...)` is non-empty. While every approved module is off, the group is absent. There is no empty submenu and no "hidden" placeholder row.
- Each child row is one activated catalog entry. The label is `displayName`. The control is the same kind of row as Swath (label plus a switch, or a button that opens the tool). Pick one and use it for every third-party row.
- Choosing a row sets that `id` as the open third-party tool. Opening a different row closes the previous one. EarthBank shows one third-party panel at a time.
- Closing the panel, from the tool's `onClose`, clears the open id. The menu row stays, because activation and "panel is open" are separate. Swath already works this way: the switch is the menu, `showSwath` is the open panel.
- The group is not a place to turn modules on. A user who can see the row can open the tool. Only the admin dialog changes activation.

The first-party rows do not move into the catalog. Contour and Swath keep their Redux flags.

## Mount

In `MGLMapEarthbank.tsx`, next to the `showSwath` block, mount the open catalog entry. Resolve the component from the catalog by id. If the open id is missing from the catalog, render nothing.

```tsx
{openModule && (
  <MapProvider map={this.mglMap}>
    <openModule.Component
      key={`${openModule.id}:${graniteBrand}:${surfaceMode}`}
      map={this.mglMap}
      getToken={readEarthbankToken}
      onClose={this.closeThirdPartyModule}
      controlPanelPosition={openModule.manifest.defaultControlPanelPosition}
      theme={{ graniteBrand: "earthbank", surfaceMode: "light" }}
      licenses={userLicenses}
      ids={selectedIds}
    />
  </MapProvider>
)}
```

`readEarthbankToken` returns the same value the axios interceptor already reads:

```ts
Storage.local.get("jhi-authenticationToken") || Storage.session.get("jhi-authenticationToken")
```

Omit `apiBaseUrl`. The module then uses `axios.defaults.baseURL`, which this app has already set from `SERVER_API_URL`.

Pass the scope the user actually has open. For the sample-table module that is the selected sample ids. Do not also pass a bounding box unless the id list is meant to win and the box is meant to be ignored. The template contract gives ids priority over `searchSpec` over `boundingBox`.

`licenses` is the signed-in user's license list. An empty list means the user has none of the tool's licenses. The module hides its own unlicensed features. The menu does not re-implement that.

`MapProvider` is exported by the tool package. The caller's map is `this.mglMap`. Do not pass a Mapbox access token. The token is a property of the map the host already created.

Wrap the mount in the host's existing error boundary if one already wraps the map overlays. A throw inside the tool must not take down the map. The template sandbox uses `src/sandbox/ToolErrorBoundary.tsx` as the pattern.

Do not copy the tool's components, CSS, or workbook code into client001.

## Module manager

A host dialog, not a platform tool, and not an item under 3rd party. The 3rd party group is missing when nothing is activated, so it cannot be the way back to the manager.

Open it from the EarthBank header for `isAuthenticated && isAdmin`, beside `AdminMenu` in `headerEarthbank.tsx`. Other skins (Lithodat, CSIRO) do not get this dialog in the first slice. Their toolboxes are separate files.

The dialog lists every catalog entry, activated or not:

- Name (`displayName`) and one-line `summary`
- Package name, so an admin can see which npm package was approved
- A switch. On adds the id to `activatedIds` and saves. Off removes it, saves, and closes the panel if that id was open
- A disclaimer, fixed copy, above the list: these modules run inside EarthBank and can call the API with the signed-in user's token. Only packages this deployment has shipped are listed. Turning one on adds it under Tools → 3rd party.

There is no field for a GitHub URL, an npm name, or a file upload. "Add a module" in the sketch is the switch for a catalog entry that was shipped turned off. A new package still arrives as a pull request: `npm install` the package, add one object to `thirdPartyCatalog.ts`, deploy, then an admin turns it on.

If the save fails, leave the switch where it was and show the error on that row. Do not update the menu from an unsaved local guess.

## Order of work

1. Add `thirdPartyCatalog.ts` with the sample-table package imported and not activated. Add `activatedModules`. No menu change is visible yet.
2. Add the 3rd party group to `ToolBoxEarthbank.tsx`, rendered only from `activatedModules`. Confirm the group is absent while the set is empty, and that a temporarily activated id shows one row.
3. Add the open-id state and the mount in `MGLMapEarthbank.tsx`. Opening the row shows the tool. Closing the panel clears the id and leaves the row in the menu. The tool calls the API origin axios already has, and sends the EarthBank JWT.
4. Add the admin dialog on the EarthBank header. It lists the catalog and toggles activation. Persist with the deployment record if the endpoint is ready. If it is not, the dialog can display the catalog and the `enabled` flags as read-only, and the ticket for the endpoint stays open. Do not write the list into `user-properties` as a stand-in.
5. A later approved package is one dependency and one catalog object. The menu, the mount, and the dialog do not grow a new special case.

## Security

- The trust boundary for code is the client001 release. Review the package, pin the version, and import it from the catalog.
- The trust boundary for visibility is the activation record, writable by an EarthBank admin.
- The tool receives the user's JWT through `getToken`. Public GETs may run without a token. Anything that needs the user goes through that getter.
- Licenses stay inside the tool. Activation does not grant a license, and a license does not put a hidden module on the menu.
- Scrub tokens from any host error UI. The template's sandbox already strips Mapbox `pk.` / `sk.` tokens from map errors. The module manager never handles a Mapbox token.

## Out of scope

- Moving Go to location, Find, Contour, or Swath into the catalog.
- Loading CSIRO or Lithodat toolboxes. Copy the group later if those skins need the same list. Do not share the EarthBank toolbox component across skins in this change.
- Module federation or a runtime remote URL. Revisit only if the client release cycle cannot keep up with approved packages. A remote would still be a Lithodat-controlled URL listed in the catalog, not a URL an admin pastes in.
- Per-user opt-in. If a later requirement is "the site has it on, and this user hides it", that is a second list, stored as a user preference of ids, filtered after the deployment activation list. It is not the first store.
