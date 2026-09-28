/**
 * Publication sample table, laid out like the EarthBank workbook
 * `4532801_Samples.xlsx` (Kohn et al. 2024, table 4).
 *
 * Coordinates are truncated to 5 decimal places, the way that workbook stored
 * -28.659435 as -28.65943. Elevation is rounded to the nearest metre.
 * Depth is the absolute relative elevation, shallower to deeper, one decimal.
 */

export interface LiteratureNote {
  id: string;
  author: string;
  year: string;
  journal: string;
  volume: string;
  pages: string;
  doi: string;
}

export interface SampleRecord {
  id: string;
  name: string;
  igsn: string;
  latitude: number | null;
  longitude: number | null;
  elevationMetres: number | null;
  relativeElevationMin: number | null;
  relativeElevationMax: number | null;
  location: string;
  lithology: string;
  mineral: string;
  sampleKind: string;
  sampleMethod: string;
  locationKind: string;
  country: string;
  collectors: readonly string[];
  archive: string;
  coordinatePrecisionMetres: number | null;
  elevationKind: string;
  verticalDatum: string;
  literature: readonly LiteratureNote[];
  analysisCodes: readonly string[];
  packageId: string;
  packageName: string;
  packageDistribution: string;
  packageWorkflow: string;
}

export interface SampleTableRow {
  sample: string;
  igsn: string;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  depth: string;
  location: string;
}

export interface SampleTable {
  title: string;
  filename: string;
  rows: readonly SampleTableRow[];
  footnotes: readonly string[];
}

/** Placeholder the example panel shows until a tool replaces it. */
export const DEFAULT_TABLE_NAME = "Table one";

const SUBTITLE =
  "Geosample metadata for every sample in the data package, reported to the minimum and recommended requirements of Kohn et al. (2024), table 4.";

export function tableHeading(name?: string): string {
  const trimmed = name?.trim() || DEFAULT_TABLE_NAME;
  return `${trimmed} | Sample information`;
}

export function buildSampleTable(
  records: readonly SampleRecord[],
  options: { retrievedOn: Date; origin: string; tableName?: string },
): SampleTable {
  const ordered = [...records].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  return {
    title: tableHeading(options.tableName),
    filename: filenameFor(ordered),
    rows: ordered.map(toRow),
    footnotes: footnotesFor(ordered, options),
  };
}

export function truncateDecimal(value: number, places: number): number {
  const factor = 10 ** places;
  const shifted = value * factor;
  const cut = shifted < 0 ? Math.ceil(shifted - 1e-8) : Math.floor(shifted + 1e-8);
  return cut / factor;
}

/** Half away from zero. Elevation and depth are positive quantities. */
export function roundHalfAway(value: number, places: number): number {
  const factor = 10 ** places;
  const scaled = Math.abs(value) * factor;
  const rounded = Math.floor(scaled + 0.5 + 1e-8);
  const sign = value < 0 ? -1 : 1;
  return (sign * rounded) / factor;
}

export function formatDepth(relativeMin: number | null, relativeMax: number | null): string {
  const bounds = [relativeMin, relativeMax].filter((value): value is number => value != null && Number.isFinite(value));
  if (bounds.length === 0) return "";
  const depths = bounds.map((value) => roundHalfAway(Math.abs(value), 1));
  const lo = Math.min(...depths);
  const hi = Math.max(...depths);
  if (lo === hi) return lo.toFixed(1);
  return `${lo.toFixed(1)}\u2013${hi.toFixed(1)}`;
}

export function formatCitation(note: LiteratureNote): string {
  const parts = note.author
    .split(/\s+(?:and|&)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0] ?? "";
  const surname = (first.includes(",") ? first.split(",")[0] : first.split(/\s+/)[0] ?? "").trim();
  const who = surname ? (parts.length > 1 ? `${surname} et al.` : surname) : "Unknown";
  const year = note.year.trim();
  let text = year ? `${who} (${year})` : who;
  if (note.journal.trim()) text += ` ${note.journal.trim()}`;
  if (note.volume.trim()) text += ` ${note.volume.trim()}`;
  if (note.pages.trim()) text += `, ${note.pages.trim()}`;
  if (note.doi.trim()) text += `, doi:${note.doi.trim()}`;
  return text;
}

export const TABLE_TITLE = tableHeading(DEFAULT_TABLE_NAME);
export const TABLE_SUBTITLE = SUBTITLE;

function toRow(record: SampleRecord): SampleTableRow {
  return {
    sample: record.name,
    igsn: record.igsn,
    latitude: record.latitude == null ? null : truncateDecimal(record.latitude, 5),
    longitude: record.longitude == null ? null : truncateDecimal(record.longitude, 5),
    elevation: record.elevationMetres == null ? null : roundHalfAway(record.elevationMetres, 0),
    depth: formatDepth(record.relativeElevationMin, record.relativeElevationMax),
    location: record.location,
  };
}

function filenameFor(records: readonly SampleRecord[]): string {
  const ids = unique(records.map((record) => record.packageId).filter(Boolean));
  if (ids.length === 1) return `${ids[0]}_Samples.xlsx`;
  return "samples.xlsx";
}

function footnotesFor(records: readonly SampleRecord[], options: { retrievedOn: Date; origin: string }): string[] {
  const notes: string[] = [];
  notes.push(coordinateNote(records));
  const identical = identicalNote(records);
  if (identical) notes.push(identical);
  const analyses = analysisNote(records);
  if (analyses) notes.push(analyses);
  const references = referenceNote(records);
  if (references) notes.push(references);
  notes.push(provenanceNote(records, options));
  return notes;
}

function coordinateNote(records: readonly SampleRecord[]): string {
  const sentences = [
    "Coordinates are decimal degrees on the WGS84 datum as stored by EarthBank; negative latitudes are south of the equator and negative longitudes west of Greenwich.",
  ];
  const precision = sharedNumber(records, (record) => record.coordinatePrecisionMetres);
  if (precision != null) {
    sentences.push(`Reported coordinate precision is ${formatMetres(precision)} m for every sample.`);
  }
  const elevation = elevationSentence(records);
  if (elevation) sentences.push(elevation);
  return sentences.join(" ");
}

function elevationSentence(records: readonly SampleRecord[]): string | null {
  const kind = sharedText(records, (record) => record.elevationKind);
  const datum = sharedText(records, (record) => record.verticalDatum);
  const parts: string[] = [];
  if (kind) {
    const label = kind.toLowerCase() === "ground level" ? "ground level" : kind;
    parts.push(`Elevations are ${label} elevations`);
  }
  if (datum === "") parts.push("EarthBank holds no vertical datum for these samples.");
  else if (datum) parts.push(`Vertical datum: ${datum}.`);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].endsWith(".") ? parts[0] : `${parts[0]}.`;
  return `${parts[0]}; ${parts[1]}`;
}

function identicalNote(records: readonly SampleRecord[]): string | null {
  const clauses: string[] = [];
  const lithology = sharedText(records, (record) => record.lithology);
  const mineral = sharedText(records, (record) => record.mineral);
  const sampleKind = sharedText(records, (record) => record.sampleKind);
  const sampleMethod = sharedText(records, (record) => record.sampleMethod);
  const locationKind = sharedText(records, (record) => record.locationKind);
  const country = sharedText(records, (record) => record.country);
  const collectors = sharedText(records, (record) => [...record.collectors].sort((a, b) => a.localeCompare(b)).join("; "));
  const archive = sharedText(records, (record) => record.archive);
  if (lithology) clauses.push(`Lithology: ${lithology}`);
  if (mineral) clauses.push(`Mineral analysed: ${mineral}`);
  if (sampleKind) clauses.push(`Sample kind: ${sampleKind}`);
  if (sampleMethod) clauses.push(`Sampling method: ${sampleMethod}`);
  if (locationKind) clauses.push(`Location kind: ${locationKind}`);
  if (country) clauses.push(`Country: ${country}`);
  if (collectors) clauses.push(`Collector: ${collectors}`);
  if (archive) clauses.push(`Archive: ${archive}`);
  if (clauses.length === 0) return null;
  return `Identical for every sample in this table and therefore not repeated above: ${clauses.join("; ")}.`;
}

const ANALYSIS_ORDER = ["FT", "UPB", "GC", "HE", "ARAR", "SHRIMP", "LUHF", "PB", "SR", "ISO", "AGE", "VITRINITE", "TH"];

function analysisNote(records: readonly SampleRecord[]): string | null {
  const counts = new Map<string, Set<string>>();
  for (const record of records) {
    for (const code of new Set(record.analysisCodes.filter(Boolean))) {
      const ids = counts.get(code) ?? new Set<string>();
      ids.add(record.id);
      counts.set(code, ids);
    }
  }
  if (counts.size === 0) return null;
  const mineral = sharedText(records, (record) => record.mineral);
  const codes = [...counts.keys()].sort((a, b) => analysisRank(a) - analysisRank(b) || a.localeCompare(b));
  const clauses = codes.map((code) => {
    const count = counts.get(code)?.size ?? 0;
    return `${analysisLabel(code, mineral)}, ${count} sample${count === 1 ? "" : "s"}`;
  });
  return `Analyses held in this data package: ${clauses.join("; ")}.`;
}

function analysisRank(code: string): number {
  const index = ANALYSIS_ORDER.indexOf(code);
  return index === -1 ? ANALYSIS_ORDER.length : index;
}

function analysisLabel(code: string, mineral: string | null): string {
  if (code === "FT") {
    if (mineral?.toLowerCase() === "apatite") return "apatite fission track (AFT)";
    if (mineral) return `${mineral.toLowerCase()} fission track`;
    return "fission track";
  }
  const known: Readonly<Record<string, string>> = {
    UPB: "U-Pb",
    GC: "geochemistry",
    HE: "(U-Th)/He",
    ARAR: "40Ar/39Ar",
    SHRIMP: "SHRIMP",
    LUHF: "Lu-Hf",
    PB: "Pb isotope",
    SR: "Sr isotope",
    ISO: "isotopes",
    AGE: "age",
    VITRINITE: "vitrinite",
    TH: "thermal history",
  };
  return known[code] ?? code;
}

function referenceNote(records: readonly SampleRecord[]): string | null {
  const byId = new Map<string, LiteratureNote>();
  for (const record of records) {
    for (const note of record.literature) {
      const key = note.id || formatCitation(note);
      if (!byId.has(key)) byId.set(key, note);
    }
  }
  if (byId.size === 0) return null;
  const citations = [...byId.values()]
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map(formatCitation);
  const label = citations.length === 1 ? "reference" : "references";
  return `Associated ${label} linked to these samples in EarthBank: ${citations.join("; ")}.`;
}

function provenanceNote(records: readonly SampleRecord[], options: { retrievedOn: Date; origin: string }): string {
  const retrieved = options.retrievedOn.toISOString().slice(0, 10);
  const origin = options.origin.replace(/\/+$/, "");
  const packages = packageClauses(records);
  const source =
    packages.length === 0
      ? "EarthBank"
      : `EarthBank data package${packages.length === 1 ? "" : "s"} ${joinAnd(packages)}`;
  return `Compiled from ${source}, retrieved ${retrieved} from ${origin}. Every value is as held by EarthBank; nothing has been recalculated.`;
}

function packageClauses(records: readonly SampleRecord[]): string[] {
  const seen = new Map<string, SampleRecord>();
  for (const record of records) {
    if (!record.packageId || seen.has(record.packageId)) continue;
    seen.set(record.packageId, record);
  }
  return [...seen.values()]
    .sort((a, b) => a.packageId.localeCompare(b.packageId, undefined, { numeric: true }))
    .map((record) => {
      const name = record.packageName.trim();
      const quoted = name ? ` “${name}”` : "";
      const meta = [phrase(record.packageDistribution), phrase(record.packageWorkflow)].filter(Boolean);
      const paren = meta.length ? ` (${meta.join(", ")})` : "";
      return `${record.packageId}${quoted}${paren}`;
    });
}

function phrase(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, " ");
}

function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Shared non-blank text, or null when the samples disagree or any value is blank. A shared blank is "". */
function sharedText(records: readonly SampleRecord[], pick: (record: SampleRecord) => string): string | null {
  if (records.length === 0) return null;
  const values = records.map((record) => pick(record).trim());
  const first = values[0] ?? "";
  if (!values.every((value) => value === first)) return null;
  return first;
}

function sharedNumber(records: readonly SampleRecord[], pick: (record: SampleRecord) => number | null): number | null {
  if (records.length === 0) return null;
  const values = records.map(pick);
  const first = values[0];
  if (first == null || !Number.isFinite(first)) return null;
  if (!values.every((value) => value === first)) return null;
  return first;
}

function formatMetres(value: number): string {
  const rounded = roundHalfAway(value, 1);
  if (Math.abs(rounded - Math.trunc(rounded)) < 1e-9) return String(Math.trunc(rounded));
  return rounded.toFixed(1);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
