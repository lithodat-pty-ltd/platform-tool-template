import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoundingBox, ControlPanelPosition, PlatformTheme, SearchSpec } from "../contract";
import { normalizeBoundingBox, resolveDataScope } from "../platform/dataScope";
import { EARTHBANK_ORIGIN } from "../platform/api";
import { DEFAULT_GRANITE_BRAND, DEFAULT_GRANITE_MODE, GRANITE_BRANDS, GRANITE_MODES, type GraniteBrand, type GraniteMode } from "../platform/granite";
import { MapProvider } from "../platform/MapProvider";
import { FormattedFileDownload } from "../tool/MyTool";
import { toolManifest } from "../tool/manifest";
import { useDemoMap, type DemoMap } from "./demoMap";
import { makeDemoJwt } from "./demoToken";
import { MapPane } from "./MapPane";
import { ToolErrorBoundary } from "./ToolErrorBoundary";

const CALLER_CODE = `npm install github:lithodat-pty-ltd/platform-tool-template

import { FormattedFileDownload, toolManifest } from "platform-tool-template";

const registration = { Component: FormattedFileDownload, manifest: toolManifest };

<FormattedFileDownload
  getToken={getAccessToken}
  onClose={closeTool}
  theme={{ graniteBrand: "earthbank", surfaceMode: "light" }}
  licenses={userLicenses}
  searchSpec={currentSearch}
  ids={selectedIds}
  boundingBox={currentExtent}
  map={mglMap}
/>`;

const DEFAULT_SEARCH = `{
  "text": "komatiite",
  "datasetId": "lithochem.samples",
  "filters": { "element": "Ni", "minPpm": 1000 },
  "limit": 200
}`;

/**
 * Stands in for the EarthBank client. This file is not the module and is not published.
 * The floating panel is the tool. The side column is every host parameter, so the tool can be
 * tried here before it is registered in the client.
 */
export function SandboxHost({
  mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "",
}: {
  /** Development only. The published module ignores this and uses the caller's map context. */
  mapboxAccessToken?: string;
} = {}) {
  const [mapboxKey, setMapboxKey] = useState(mapboxAccessToken);
  const [appliedMapboxKey, setAppliedMapboxKey] = useState(mapboxAccessToken);
  const demoMap = useDemoMap(appliedMapboxKey);
  const map = demoMap.map;

  const [mapView, setMapView] = useState(() => readMap(map));
  const [open, setOpen] = useState(true);
  const [passMap, setPassMap] = useState(true);
  const [passClose, setPassClose] = useState(true);
  const [passToken, setPassToken] = useState(true);
  const [failToken, setFailToken] = useState(false);
  const [heldLicenses, setHeldLicenses] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(toolManifest.licenses.map((license) => [license.id, true])),
  );
  const [otherLicense, setOtherLicense] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [sendSearch, setSendSearch] = useState(false);
  const [sendIds, setSendIds] = useState(true);
  const [sendBox, setSendBox] = useState(false);
  const [searchText, setSearchText] = useState(DEFAULT_SEARCH);
  const [idsText, setIdsText] = useState(SAMPLE_IDS);
  const [west, setWest] = useState("115.5");
  const [south, setSouth] = useState("-32.2");
  const [east, setEast] = useState("121.8");
  const [north, setNorth] = useState("-26.4");
  const [left, setLeft] = useState("50");
  const [top, setTop] = useState("80");
  const [themeMode, setThemeMode] = useState<"granite" | "css">("granite");
  const [graniteBrand, setGraniteBrand] = useState<GraniteBrand>(DEFAULT_GRANITE_BRAND);
  const [surfaceMode, setSurfaceMode] = useState<GraniteMode>(DEFAULT_GRANITE_MODE);
  const [draggedTo, setDraggedTo] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setAppliedMapboxKey(mapboxKey), 400);
    return () => window.clearTimeout(handle);
  }, [mapboxKey]);

  useEffect(() => {
    if (!map) return;
    const update = () => setMapView(readMap(map));
    update();
    map.on?.("moveend", update);
    return () => map.off?.("moveend", update);
  }, [map]);

  const getToken = useCallback(() => {
    if (failToken) return Promise.reject(new Error("Host refused to issue a token."));
    return Promise.resolve(makeDemoJwt());
  }, [failToken]);

  const search = useMemo(() => parseSearch(sendSearch, searchText), [sendSearch, searchText]);
  const ids = useMemo(() => (sendIds ? parseIds(idsText) : undefined), [sendIds, idsText]);
  const boundingBox = useMemo(() => {
    if (!sendBox) return undefined;
    if ([west, south, east, north].some((value) => value.trim() === "")) return undefined;
    return { west: Number(west), south: Number(south), east: Number(east), north: Number(north) };
  }, [sendBox, west, south, east, north]);

  const licenses = useMemo(() => {
    const list = toolManifest.licenses.map((license) => license.id).filter((id) => heldLicenses[id]);
    if (otherLicense) list.push("platform.bookmarks");
    return list;
  }, [heldLicenses, otherLicense]);
  const apiOrigin = apiBaseUrl.trim();

  const controlPanelPosition = useMemo(() => readPosition(left, top), [left, top]);
  const theme = useMemo<PlatformTheme>(() => {
    if (themeMode === "css") {
      return {
        graniteBrand,
        surfaceMode,
        stylesheetHref: "/sample-theme.css",
        className: "sample-host-theme",
      };
    }
    return { graniteBrand, surfaceMode };
  }, [themeMode, graniteBrand, surfaceMode]);

  const resolved = resolveDataScope(
    {
      searchSpec: search.spec,
      ids,
      boundingBox,
    },
    toolManifest.accepts,
  );
  const drawnBox = normalizeBoundingBox(boundingBox);

  return (
    <div className="sandbox">
      <MapPane
        connected={passMap && map != null}
        center={mapView.center}
        zoom={mapView.zoom}
        view={mapView.bounds}
        box={drawnBox}
        boxActive={resolved.kind === "boundingBox"}
        source={demoMap.source}
        mapError={demoMap.error}
        mapContainerRef={demoMap.containerRef}
      />
      <aside className="sandbox-host">
        <header className="sandbox-host__intro">
          <p className="sandbox-host__kicker">Platform host</p>
          <h1>Tool sandbox</h1>
          <p>
            The floating panel is the npm module (<code>{toolManifest.displayName}</code>). This column is the EarthBank
            client. Exercise the tool here, then register it with <code>examples/host-mount.tsx</code>. The sandbox is
            not part of the published package.
          </p>
        </header>

        <fieldset>
          <legend>Data scope</legend>
          <p className="sandbox-host__hint">
            Send one. If you send more than one, the module uses ids, then the search spec, then the bounding box.
            Resolved scope: <strong>{resolved.kind}</strong>.
          </p>
          <label>
            <input type="checkbox" checked={sendSearch} onChange={(event) => setSendSearch(event.target.checked)} />
            Search spec{toolManifest.accepts.searchSpec ? "" : " (this module ignores it)"}
          </label>
          {sendSearch ? (
            <>
              <textarea value={searchText} onChange={(event) => setSearchText(event.target.value)} rows={8} spellCheck={false} />
              {search.error ? <p className="sandbox-host__error">{search.error}</p> : null}
            </>
          ) : null}
          <label>
            <input type="checkbox" checked={sendIds} onChange={(event) => setSendIds(event.target.checked)} />
            List of ids{toolManifest.accepts.ids ? "" : " (this module ignores it)"}
          </label>
          {sendIds ? (
            <textarea value={idsText} onChange={(event) => setIdsText(event.target.value)} rows={4} spellCheck={false} />
          ) : null}
          <label>
            <input type="checkbox" checked={sendBox} onChange={(event) => setSendBox(event.target.checked)} />
            Bounding box{toolManifest.accepts.boundingBox ? "" : " (this module ignores it)"}
          </label>
          {sendBox ? (
            <>
              <div className="sandbox-host__grid">
                <Field label="West" value={west} onChange={setWest} />
                <Field label="South" value={south} onChange={setSouth} />
                <Field label="East" value={east} onChange={setEast} />
                <Field label="North" value={north} onChange={setNorth} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setWest("115.5");
                  setSouth("-32.2");
                  setEast("121.8");
                  setNorth("-26.4");
                }}
              >
                Example extent
              </button>
            </>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>EarthBank API</legend>
          <label className="sandbox-host__stack">
            API origin
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder={EARTHBANK_ORIGIN}
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <p className="sandbox-host__hint">
            Leave this blank to use {EARTHBANK_ORIGIN}, which is what the module does when the client omits{" "}
            <code>apiBaseUrl</code>.
          </p>
        </fieldset>

        <fieldset>
          <legend>Access and licenses</legend>
          <label>
            <input type="checkbox" checked={passToken} onChange={(event) => setPassToken(event.target.checked)} />
            Pass a JWT via getToken
          </label>
          <label>
            <input type="checkbox" checked={failToken} onChange={(event) => setFailToken(event.target.checked)} />
            Next token request fails
          </label>
          {toolManifest.licenses.length === 0 ? (
            <p className="sandbox-host__hint">This module declares no license ids in its manifest.</p>
          ) : (
            toolManifest.licenses.map((license) => (
              <label key={license.id}>
                <input
                  type="checkbox"
                  checked={heldLicenses[license.id] === true}
                  onChange={(event) =>
                    setHeldLicenses((current) => ({ ...current, [license.id]: event.target.checked }))
                  }
                />
                {license.id}
              </label>
            ))
          )}
          <label>
            <input type="checkbox" checked={otherLicense} onChange={(event) => setOtherLicense(event.target.checked)} />
            platform.bookmarks (not declared by this module)
          </label>
        </fieldset>

        <fieldset>
          <legend>Map, close, position</legend>
          <label>
            <input type="checkbox" checked={passMap} onChange={(event) => setPassMap(event.target.checked)} />
            Pass the map
          </label>
          <label className="sandbox-host__stack">
            Mapbox access token
            <input
              type="text"
              value={mapboxKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="pk."
              onChange={(event) => setMapboxKey(event.target.value)}
            />
          </label>
          <p className="sandbox-host__hint">
            Development only. This demo client uses the key to open a Mapbox map. A published module ignores the key
            and uses the map context the host provides. Leave the key blank to keep the stand-in map.
          </p>
          <label>
            <input type="checkbox" checked={passClose} onChange={(event) => setPassClose(event.target.checked)} />
            Pass onClose
          </label>
          <div className="sandbox-host__grid">
            <Field label="Left" value={left} onChange={setLeft} />
            <Field label="Top" value={top} onChange={setTop} />
          </div>
          <p className="sandbox-host__hint">
            Host override. The module default is left 50, top 80. Dragging the panel overrides it until these values
            change.
            {draggedTo ? ` Last drag: ${draggedTo}.` : ""}
          </p>
        </fieldset>

        <fieldset>
          <legend>Theme</legend>
          <label>
            <input
              type="radio"
              name="theme"
              checked={themeMode === "granite"}
              onChange={() => setThemeMode("granite")}
            />
            Granite presets (brand and surface)
          </label>
          <label>
            <input type="radio" name="theme" checked={themeMode === "css"} onChange={() => setThemeMode("css")} />
            CSS reference (public/sample-theme.css)
          </label>
          <label className="sandbox-host__stack">
            Brand
            <select
              value={graniteBrand}
              onChange={(event) => {
                const next = GRANITE_BRANDS.find((brand) => brand === event.target.value);
                if (next) setGraniteBrand(next);
              }}
            >
              {GRANITE_BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label className="sandbox-host__stack">
            Surface
            <select
              value={surfaceMode}
              onChange={(event) => {
                const next = GRANITE_MODES.find((mode) => mode === event.target.value);
                if (next) setSurfaceMode(next);
              }}
            >
              {GRANITE_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <p className="sandbox-host__hint">
            Remount key {graniteBrand}:{surfaceMode}, the same pair the EarthBank client uses.
          </p>
        </fieldset>

        <fieldset>
          <legend>Client registration</legend>
          <p className="sandbox-host__hint">
            Publish the module, then add one registration in the EarthBank client. The client passes the same
            parameters this page is passing now.
          </p>
          <dl className="sandbox-host__facts">
            <dt>Tool id</dt>
            <dd>{toolManifest.id}</dd>
            <dt>Map</dt>
            <dd>{toolManifest.requiresMap ? "Required" : "Optional"}</dd>
            <dt>API origin in use</dt>
            <dd>{apiOrigin || `${EARTHBANK_ORIGIN} (default)`}</dd>
          </dl>
        </fieldset>

        {!open ? (
          <button type="button" onClick={() => setOpen(true)}>
            Open the tool
          </button>
        ) : null}

        <section className="sandbox-host__caller" aria-label="Caller code">
          <h2>Caller code</h2>
          <p className="sandbox-host__hint">
            Install the package from GitHub, then mount it. The theme is the EarthBank pair client001 already passes:
            earthbank and light.
          </p>
          <pre>
            <code>{CALLER_CODE}</code>
          </pre>
        </section>
      </aside>

      {open ? (
        <ToolErrorBoundary key={`${graniteBrand}:${surfaceMode}:${themeMode}`}>
          <MapProvider map={passMap ? map : null}>
          <FormattedFileDownload
            key={`${graniteBrand}:${surfaceMode}:${themeMode}`}
            map={passMap ? map ?? undefined : undefined}
            getToken={passToken ? getToken : undefined}
            onClose={passClose ? () => setOpen(false) : undefined}
            controlPanelPosition={controlPanelPosition}
            onControlPanelPositionChange={(position) => {
              const leftEdge = position.left ?? position.right;
              const topEdge = position.top ?? position.bottom;
              setDraggedTo(`${String(leftEdge)}, ${String(topEdge)}`);
            }}
            licenses={licenses}
            apiBaseUrl={apiOrigin || undefined}
            theme={theme}
            searchSpec={search.spec}
            ids={ids}
            boundingBox={boundingBox}
          />
          </MapProvider>
        </ToolErrorBoundary>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `host-${label.toLowerCase()}`;
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" />
    </label>
  );
}

function readPosition(left: string, top: string): ControlPanelPosition | undefined {
  const position: ControlPanelPosition = {};
  const leftValue = readNumber(left);
  const topValue = readNumber(top);
  if (leftValue != null) position.left = leftValue;
  if (topValue != null) position.top = topValue;
  return leftValue == null && topValue == null ? undefined : position;
}

function readNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

const SAMPLE_IDS = [
  1216651, 1216652, 1216653, 1216654, 1216655, 1216656, 1216657, 1216658, 1216659, 1216660, 1216661, 1216662,
  1216663, 1216664, 1216665, 1216666, 1216667, 1216668, 1216669, 1216670, 1216671, 1216672, 1216673, 1216674,
].join("\n");

function parseIds(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSearch(send: boolean, text: string): { spec: SearchSpec | undefined; error: string | null } {
  if (!send) return { spec: undefined, error: null };
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { spec: undefined, error: "Search spec must be a JSON object." };
    }
    return { spec: parsed as SearchSpec, error: null };
  } catch {
    return { spec: undefined, error: "Search JSON could not be parsed, so it is not being passed." };
  }
}

function readMap(map: DemoMap | null): {
  center: { lng: number; lat: number } | null;
  zoom: number | null;
  bounds: BoundingBox | null;
} {
  if (!map) return { center: null, zoom: null, bounds: null };
  const center = map.getCenter?.() ?? null;
  const zoom = map.getZoom?.() ?? null;
  return { center, zoom, bounds: map.getViewBounds() };
}
