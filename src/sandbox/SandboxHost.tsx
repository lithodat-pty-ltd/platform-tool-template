import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoundingBox, ControlPanelPosition, PlatformTheme, SearchSpec } from "../contract";
import { normalizeBoundingBox, resolveDataScope } from "../platform/dataScope";
import { GRANITE_BRANDS } from "../platform/granite";
import { MyTool } from "../tool/MyTool";
import { toolManifest } from "../tool/manifest";
import { makeDemoJwt } from "./demoToken";
import { MapPane } from "./MapPane";
import { createMockMap, type MockMap } from "./mockMap";
import { ToolErrorBoundary } from "./ToolErrorBoundary";

const DEFAULT_SEARCH = `{
  "text": "komatiite",
  "datasetId": "lithochem.samples",
  "filters": { "element": "Ni", "minPpm": 1000 },
  "limit": 200
}`;

/**
 * Stands in for the platform. This file is not the module.
 * The floating panel is `MyTool`. Everything in the side column is the host
 * deciding which of the standard parameters to pass.
 */
export function SandboxHost() {
  const mapRef = useRef<MockMap | null>(null);
  if (!mapRef.current) mapRef.current = createMockMap();
  const map = mapRef.current;

  const [mapView, setMapView] = useState(() => readMap(map));
  const [open, setOpen] = useState(true);
  const [passMap, setPassMap] = useState(true);
  const [passClose, setPassClose] = useState(true);
  const [passToken, setPassToken] = useState(true);
  const [failToken, setFailToken] = useState(false);
  const [analysis, setAnalysis] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [otherLicense, setOtherLicense] = useState(false);
  const [sendSearch, setSendSearch] = useState(true);
  const [sendIds, setSendIds] = useState(false);
  const [sendBox, setSendBox] = useState(false);
  const [searchText, setSearchText] = useState(DEFAULT_SEARCH);
  const [idsText, setIdsText] = useState("SMP-1042\nSMP-1048\nSMP-1101");
  const [west, setWest] = useState("115.5");
  const [south, setSouth] = useState("-32.2");
  const [east, setEast] = useState("121.8");
  const [north, setNorth] = useState("-26.4");
  const [left, setLeft] = useState("50");
  const [top, setTop] = useState("80");
  const [themeMode, setThemeMode] = useState<"granite" | "css">("granite");
  const [graniteBrand, setGraniteBrand] = useState<string>(GRANITE_BRANDS[0]);
  const [surfaceMode, setSurfaceMode] = useState("light");
  const [draggedTo, setDraggedTo] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setMapView(readMap(map));
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
    const list: string[] = [];
    if (analysis) list.push("example.analysis");
    if (canExport) list.push("example.export");
    if (otherLicense) list.push("platform.bookmarks");
    return list;
  }, [analysis, canExport, otherLicense]);

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
        connected={passMap}
        center={mapView.center}
        zoom={mapView.zoom}
        view={mapView.bounds}
        box={drawnBox}
        boxActive={resolved.kind === "boundingBox"}
      />
      <aside className="sandbox-host">
        <header className="sandbox-host__intro">
          <p className="sandbox-host__kicker">Platform host</p>
          <h1>Tool sandbox</h1>
          <p>
            The floating panel is the npm module. This column is the platform. Change the parameters, then edit{" "}
            <code>src/tool/MyTool.tsx</code>.
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
            Search spec
          </label>
          {sendSearch ? (
            <>
              <textarea value={searchText} onChange={(event) => setSearchText(event.target.value)} rows={8} spellCheck={false} />
              {search.error ? <p className="sandbox-host__error">{search.error}</p> : null}
            </>
          ) : null}
          <label>
            <input type="checkbox" checked={sendIds} onChange={(event) => setSendIds(event.target.checked)} />
            List of ids
          </label>
          {sendIds ? (
            <textarea value={idsText} onChange={(event) => setIdsText(event.target.value)} rows={4} spellCheck={false} />
          ) : null}
          <label>
            <input type="checkbox" checked={sendBox} onChange={(event) => setSendBox(event.target.checked)} />
            Bounding box
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
          <legend>Access and licenses</legend>
          <label>
            <input type="checkbox" checked={passToken} onChange={(event) => setPassToken(event.target.checked)} />
            Pass a JWT via getToken
          </label>
          <label>
            <input type="checkbox" checked={failToken} onChange={(event) => setFailToken(event.target.checked)} />
            Next token request fails
          </label>
          <label>
            <input type="checkbox" checked={analysis} onChange={(event) => setAnalysis(event.target.checked)} />
            example.analysis
          </label>
          <label>
            <input type="checkbox" checked={canExport} onChange={(event) => setCanExport(event.target.checked)} />
            example.export
          </label>
          <label>
            <input type="checkbox" checked={otherLicense} onChange={(event) => setOtherLicense(event.target.checked)} />
            platform.bookmarks (unused by this module)
          </label>
        </fieldset>

        <fieldset>
          <legend>Map, close, position</legend>
          <label>
            <input type="checkbox" checked={passMap} onChange={(event) => setPassMap(event.target.checked)} />
            Pass the map
          </label>
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
            <select value={graniteBrand} onChange={(event) => setGraniteBrand(event.target.value)}>
              {GRANITE_BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label className="sandbox-host__stack">
            Surface
            <select value={surfaceMode} onChange={(event) => setSurfaceMode(event.target.value)}>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>
          <p className="sandbox-host__hint">
            Remount key {graniteBrand}:{surfaceMode}, the same pair Swath Profile uses.
          </p>
        </fieldset>

        {!open ? (
          <button type="button" onClick={() => setOpen(true)}>
            Open the tool
          </button>
        ) : null}
      </aside>

      {open ? (
        <ToolErrorBoundary key={`${graniteBrand}:${surfaceMode}:${themeMode}`}>
          <MyTool
            key={`${graniteBrand}:${surfaceMode}:${themeMode}`}
            map={passMap ? map : undefined}
            getToken={passToken ? getToken : undefined}
            onClose={passClose ? () => setOpen(false) : undefined}
            controlPanelPosition={controlPanelPosition}
            onControlPanelPositionChange={(position) => {
              const leftEdge = position.left ?? position.right;
              const topEdge = position.top ?? position.bottom;
              setDraggedTo(`${String(leftEdge)}, ${String(topEdge)}`);
            }}
            licenses={licenses}
            theme={theme}
            searchSpec={search.spec}
            ids={ids}
            boundingBox={boundingBox}
          />
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

function readMap(map: MockMap): {
  center: { lng: number; lat: number } | null;
  zoom: number | null;
  bounds: BoundingBox | null;
} {
  const center = map.getCenter?.() ?? null;
  const zoom = map.getZoom?.() ?? null;
  return { center, zoom, bounds: map.getViewBounds() };
}
