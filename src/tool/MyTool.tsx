import { useEffect, useState } from "react";
import type { PlatformMap, PlatformToolProps } from "../contract";
import { ControlPanel } from "../platform/ControlPanel";
import { resolveDataScope, type ResolvedDataScope } from "../platform/dataScope";
import { LicenseGate } from "../platform/LicenseGate";
import { useOverridablePosition } from "../platform/useOverridablePosition";
import { usePlatformToken } from "../platform/usePlatformToken";
import { toolManifest } from "./manifest";
import "./MyTool.css";

/**
 * START HERE.
 *
 * This component is the module. Replace the sample body with your interface.
 * Keep the props: the platform passes the same set to every tool
 * (Swath Profile, Lithoplates, gridding, Lithochem, Bookmarks, AOI).
 *
 * Do not throw when a prop is missing. Licenses decide what to show.
 * Data to open is a search spec, a list of ids, or a bounding box.
 * Theme is Granite tokens or a CSS reference on `theme`.
 *
 * See docs/DEVELOPMENT_PATTERN.md.
 */
export function MyTool(props: PlatformToolProps) {
  const scope = resolveDataScope(props, toolManifest.accepts);
  const access = usePlatformToken(props);
  const position = useOverridablePosition(
    toolManifest.defaultControlPanelPosition,
    props.controlPanelPosition,
    props.onControlPanelPositionChange,
  );
  const map = props.map ?? null;
  const view = useMapView(map);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const west = scope.kind === "boundingBox" ? scope.boundingBox?.west : undefined;
  const south = scope.kind === "boundingBox" ? scope.boundingBox?.south : undefined;
  const east = scope.kind === "boundingBox" ? scope.boundingBox?.east : undefined;
  const north = scope.kind === "boundingBox" ? scope.boundingBox?.north : undefined;

  useEffect(() => {
    if (
      west == null ||
      south == null ||
      east == null ||
      north == null ||
      west > east ||
      !map?.fitBounds
    ) {
      return;
    }
    map.fitBounds([
      [west, south],
      [east, north],
    ]);
  }, [west, south, east, north, map]);

  async function run(action: string) {
    setActionMessage(null);
    try {
      await access.getAccessToken();
      if (scope.kind === "empty") {
        throw new Error("Pass a search spec, a list of ids, or a bounding box before loading data.");
      }
      // Replace this with authorizedFetch. The JWT is attached there and is not logged.
      // await authorizedFetch("/api/example", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     action,
      //     ids: scope.ids,
      //     searchSpec: scope.searchSpec,
      //     boundingBox: scope.boundingBox,
      //   }),
      // }, access.getAccessToken);
      setActionMessage(`${action} ready for ${describeScope(scope)}.`);
    } catch (reason) {
      setActionMessage(reason instanceof Error ? reason.message : "The action failed.");
    }
  }

  return (
    <ControlPanel
      title={toolManifest.displayName}
      toolId={toolManifest.id}
      position={position.value}
      onPositionChange={position.setDraggedPosition}
      onPositionCommit={position.commit}
      onClose={props.onClose}
      theme={props.theme}
    >
      <section className="my-tool__section">
        <h3 className="my-tool__label">Data</h3>
        <ScopeDetails scope={scope} />
      </section>

      <section className="my-tool__section">
        <h3 className="my-tool__label">Access</h3>
        <TokenStatus
          status={access.status}
          expiresAt={access.expiresAt}
          error={access.error}
          onRetry={access.refresh}
        />
      </section>

      <section className="my-tool__section">
        <h3 className="my-tool__label">Map</h3>
        <MapStatus map={map} view={view} requiresMap={toolManifest.requiresMap} scope={scope} />
      </section>

      <LicenseGate licenses={props.licenses} license="example.analysis">
        <section className="my-tool__section">
          <h3 className="my-tool__label">Analysis</h3>
          <p className="my-tool__p">Shown because this session holds example.analysis.</p>
          <div className="my-tool__actions">
            <button type="button" className="platform-tool__primary" onClick={() => void run("Analysis")}>
              Run analysis
            </button>
          </div>
        </section>
      </LicenseGate>

      <LicenseGate licenses={props.licenses} license="example.export">
        <section className="my-tool__section">
          <h3 className="my-tool__label">Export</h3>
          <p className="my-tool__p">Shown because this session holds example.export.</p>
          <div className="my-tool__actions">
            <button type="button" onClick={() => void run("Export")}>
              Export
            </button>
          </div>
        </section>
      </LicenseGate>

      {actionMessage ? <p className="my-tool__status">{actionMessage}</p> : null}

      <p className="my-tool__note">
        Position {formatPosition(position.value)}. Drag the title bar to move the panel. Edit src/tool/MyTool.tsx
        to replace this sample.
      </p>
    </ControlPanel>
  );
}

function ScopeDetails({ scope }: { scope: ResolvedDataScope }) {
  if (scope.idsError || scope.searchSpecError || scope.boundingBoxError) {
    return (
      <>
        {scope.idsError ? <p className="my-tool__error">{scope.idsError}</p> : null}
        {scope.searchSpecError ? <p className="my-tool__error">{scope.searchSpecError}</p> : null}
        {scope.boundingBoxError ? <p className="my-tool__error">{scope.boundingBoxError}</p> : null}
        {scope.kind !== "empty" ? <ScopeBody scope={scope} /> : null}
      </>
    );
  }
  return <ScopeBody scope={scope} />;
}

function ScopeBody({ scope }: { scope: ResolvedDataScope }) {
  return (
    <>
      {scope.kind === "empty" ? (
        <p className="my-tool__p">No search, id list, or bounding box was passed.</p>
      ) : null}
      {scope.kind === "ids" && scope.ids ? <IdList ids={scope.ids} /> : null}
      {scope.kind === "search" && scope.searchSpec ? (
        <pre className="my-tool__pre">{JSON.stringify(scope.searchSpec, null, 2)}</pre>
      ) : null}
      {scope.kind === "boundingBox" && scope.boundingBox ? <BoxList box={scope.boundingBox} /> : null}
      {scope.unused.length > 0 ? (
        <p className="my-tool__note">
          Also received {scope.unused.join(", ")}. Not used. Ids win over a search spec, which wins over a bounding
          box.
        </p>
      ) : null}
    </>
  );
}

function IdList({ ids }: { ids: readonly string[] }) {
  const shown = ids.slice(0, 12);
  const extra = ids.length - shown.length;
  return (
    <>
      <p className="my-tool__p">
        {ids.length} id{ids.length === 1 ? "" : "s"}
      </p>
      <ul className="my-tool__ids">
        {shown.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
      {extra > 0 ? <p className="my-tool__note">+ {extra} more</p> : null}
    </>
  );
}

function BoxList({
  box,
}: {
  box: { west: number; south: number; east: number; north: number };
}) {
  return (
    <dl className="my-tool__box">
      <dt>West</dt>
      <dd>{formatCoord(box.west)}</dd>
      <dt>South</dt>
      <dd>{formatCoord(box.south)}</dd>
      <dt>East</dt>
      <dd>{formatCoord(box.east)}</dd>
      <dt>North</dt>
      <dd>{formatCoord(box.north)}</dd>
    </dl>
  );
}

function TokenStatus({
  status,
  expiresAt,
  error,
  onRetry,
}: {
  status: "missing" | "loading" | "ready" | "error";
  expiresAt: number | null;
  error: Error | null;
  onRetry: () => void;
}) {
  if (status === "missing") return <p className="my-tool__p">No access token was provided.</p>;
  if (status === "loading") return <p className="my-tool__p">Requesting access token…</p>;
  if (status === "error") {
    return (
      <>
        <p className="my-tool__error">{error?.message ?? "Could not read the access token."}</p>
        <div className="my-tool__actions">
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      </>
    );
  }
  const expired = expiresAt != null && expiresAt <= Date.now();
  if (expired) {
    return (
      <p className="my-tool__p">
        Access token is expired. The next data call asks the host for a new one.
      </p>
    );
  }
  if (expiresAt == null) return <p className="my-tool__p">Access token ready.</p>;
  return <p className="my-tool__p">Access token ready. Expires {new Date(expiresAt).toLocaleString()}.</p>;
}

function MapStatus({
  map,
  view,
  requiresMap,
  scope,
}: {
  map: PlatformMap | null;
  view: MapView | null;
  requiresMap: boolean;
  scope: ResolvedDataScope;
}) {
  if (!map) {
    return (
      <p className="my-tool__p">
        {requiresMap
          ? "This module expects a map. The host did not pass one, so map actions are unavailable."
          : "No map was passed. This module can still run."}
      </p>
    );
  }
  return (
    <>
      <p className="my-tool__p">
        {view
          ? `Map connected. ${formatCoord(view.lng)}, ${formatCoord(view.lat)}${
              Number.isFinite(view.zoom) ? ` · zoom ${view.zoom.toFixed(1)}` : ""
            }`
          : "Map connected."}
      </p>
      {scope.kind === "boundingBox" ? (
        <p className="my-tool__note">
          {map.fitBounds
            ? "A bounding box calls map.fitBounds when it does not cross the antimeridian."
            : "A bounding box was passed. This map has no fitBounds method."}
        </p>
      ) : null}
    </>
  );
}

interface MapView {
  lng: number;
  lat: number;
  zoom: number;
}

function useMapView(map: PlatformMap | null): MapView | null {
  const [view, setView] = useState<MapView | null>(() => readView(map));
  useEffect(() => {
    setView(readView(map));
    if (!map?.on || !map.off) return undefined;
    const onMove = () => setView(readView(map));
    map.on("moveend", onMove);
    return () => {
      map.off?.("moveend", onMove);
    };
  }, [map]);
  return view;
}

function readView(map: PlatformMap | null): MapView | null {
  if (!map?.getCenter) return null;
  const center = map.getCenter();
  if (!center || typeof center.lng !== "number" || typeof center.lat !== "number") return null;
  const zoom = map.getZoom?.();
  return { lng: center.lng, lat: center.lat, zoom: typeof zoom === "number" ? zoom : Number.NaN };
}

function describeScope(scope: ResolvedDataScope): string {
  switch (scope.kind) {
    case "ids":
      return `${scope.ids?.length ?? 0} ids`;
    case "search":
      return scope.searchSpec?.text ? `search "${scope.searchSpec.text}"` : "the search spec";
    case "boundingBox":
      return "the bounding box";
    default:
      return "no data scope";
  }
}

function formatPosition(position: { left?: number | string; top?: number | string; right?: number | string; bottom?: number | string }): string {
  const parts: string[] = [];
  if (position.left != null) parts.push(`left ${position.left}`);
  if (position.right != null) parts.push(`right ${position.right}`);
  if (position.top != null) parts.push(`top ${position.top}`);
  if (position.bottom != null) parts.push(`bottom ${position.bottom}`);
  return parts.join(", ") || "unset";
}

function formatCoord(value: number): string {
  return value.toFixed(4);
}
