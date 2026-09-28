import { useState } from "react";
import type { PlatformToolProps } from "../contract";
import { createPlatformApi } from "../platform/api";
import { ControlPanel } from "../platform/ControlPanel";
import { resolveDataScope } from "../platform/dataScope";
import { useOverridablePosition } from "../platform/useOverridablePosition";
import { tokenSourceOf } from "../platform/usePlatformToken";
import { loadSampleTable } from "./loadSamples";
import { toolManifest } from "./manifest";
import "./MyTool.css";

/**
 * Downloads one formatted sample workbook for the sample ids the host passes.
 * The panel is a file icon. The click builds the workbook and saves it.
 */
export function FormattedFileDownload(props: PlatformToolProps) {
  const scope = resolveDataScope(props, toolManifest.accepts);
  const position = useOverridablePosition(
    toolManifest.defaultControlPanelPosition,
    props.controlPanelPosition,
    props.onControlPanelPositionChange,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function download() {
    if (scope.kind !== "ids" || !scope.ids?.length) {
      setFailed(true);
      setMessage(scope.idsError ?? "Pass sample ids to download a table.");
      return;
    }
    setBusy(true);
    setFailed(false);
    setMessage(null);
    try {
      const api = createPlatformApi(tokenSourceOf(props), props.apiBaseUrl);
      const file = await loadSampleTable(scope.ids, api);
      saveFile(file.bytes, file.filename);
      setFailed(file.missingIds.length > 0);
      setMessage(
        file.missingIds.length > 0
          ? `Downloaded ${file.filename}. Not found: ${file.missingIds.join(", ")}.`
          : `Downloaded ${file.filename}.`,
      );
    } catch (reason) {
      setFailed(true);
      setMessage(reason instanceof Error && reason.message ? reason.message : "The download failed.");
    } finally {
      setBusy(false);
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
      <div className="formatted-download">
        <button
          type="button"
          className="formatted-download__file"
          onClick={() => void download()}
          disabled={busy}
          aria-label={busy ? "Downloading sample table" : "Download sample table"}
          aria-busy={busy}
        >
          <FileIcon />
        </button>
        {message ? <p className={failed ? "formatted-download__error" : "formatted-download__note"}>{message}</p> : null}
      </div>
    </ControlPanel>
  );
}

function saveFile(bytes: Uint8Array, filename: string): void {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FileIcon() {
  return (
    <svg viewBox="0 0 64 80" aria-hidden="true">
      <path d="M10 4h30l14 14v58H10V4z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M40 4v14h14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 38h24M20 48h24M20 58h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
