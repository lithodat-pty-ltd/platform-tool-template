import type { BoundingBox } from "../contract";

export function MapPane({
  connected,
  center,
  zoom,
  view,
  box,
  boxActive,
}: {
  connected: boolean;
  center: { lng: number; lat: number } | null;
  zoom: number | null;
  view: BoundingBox | null;
  box: BoundingBox | null;
  boxActive: boolean;
}) {
  const rect = box && view ? projectBox(box, view) : null;
  return (
    <div className="sandbox-map" aria-label="Sandbox map">
      <div className="sandbox-map__grid" />
      {rect ? (
        <div
          className={boxActive ? "sandbox-map__box" : "sandbox-map__box sandbox-map__box--unused"}
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      ) : null}
      <div className="sandbox-map__crosshair" aria-hidden="true" />
      <div className="sandbox-map__readout">
        <p>Sandbox map</p>
        <p>Stand-in for the host MapLibre map. The module receives it as `map`.</p>
        {center && zoom != null ? (
          <p>
            {center.lng.toFixed(4)}, {center.lat.toFixed(4)} · zoom {zoom.toFixed(1)}
          </p>
        ) : null}
        <p>{connected ? "Passed to the module as map." : "Not passed. The module is mounted without a map."}</p>
        {box ? (
          <p>{boxActive ? "Bounding box is the data scope." : "Bounding box was sent, but it is not the scope in use."}</p>
        ) : null}
      </div>
    </div>
  );
}

function projectBox(box: BoundingBox, view: BoundingBox) {
  const width = view.east - view.west;
  const height = view.north - view.south;
  if (width === 0 || height === 0) return null;
  const left = ((box.west - view.west) / width) * 100;
  const right = ((box.east - view.west) / width) * 100;
  const top = ((view.north - box.north) / height) * 100;
  const bottom = ((view.north - box.south) / height) * 100;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${right - left}%`,
    height: `${bottom - top}%`,
  };
}
