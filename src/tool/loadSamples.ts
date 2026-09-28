import type { PlatformApi } from "../platform/api";
import {
  EARTHBANK_ID_CHUNK,
  createEarthBank,
  type EarthBankClient,
  type EarthBankDataPoint,
  type HydratedSample,
} from "../platform/earthbank";
import {
  buildSampleTable,
  type LiteratureNote,
  type SampleRecord,
  type SampleTable,
} from "./sampleTable";
import { sampleTableToXlsx } from "./workbook";

export interface SampleTableFile extends SampleTable {
  bytes: Uint8Array;
  missingIds: readonly string[];
}

/**
 * Loads the sample ids from EarthBank and builds the formatted workbook.
 * One unknown id does not drop the rest: hydrate fails the whole batch when any
 * id is missing, so a failed batch is split until the missing ids are named.
 */
export async function loadSampleTable(
  ids: readonly string[],
  api: PlatformApi,
  retrievedOn: Date = new Date(),
  tableName?: string,
): Promise<SampleTableFile> {
  const invalid = ids.filter((id) => !/^\d+$/.test(id));
  const numeric = ids.filter((id) => /^\d+$/.test(id));
  if (numeric.length === 0) {
    throw new Error("Pass EarthBank sample ids. They are numbers, for example 1216651.");
  }

  const earthbank = createEarthBank(api);
  const { found, missing } = await hydrateSamples(earthbank, numeric);
  if (found.length === 0) {
    throw new Error("None of the sample ids were found.");
  }

  const sampleIds = found.map((sample) => String(sample.sampleDTO?.id ?? sample.id ?? "")).filter(Boolean);
  const points = await earthbank.listDataPointsBySampleIds(sampleIds);
  const minerals = await mineralsBySample(api, points);
  const packages = await loadPackages(earthbank, found);

  const records = found.map((sample) => toRecord(sample, points, minerals, packages)).filter((record): record is SampleRecord => record != null);
  const table = buildSampleTable(records, { retrievedOn, origin: api.origin, tableName });
  return {
    ...table,
    bytes: sampleTableToXlsx(table),
    missingIds: [...invalid, ...missing],
  };
}

async function hydrateSamples(
  earthbank: EarthBankClient,
  ids: readonly string[],
): Promise<{ found: HydratedSample[]; missing: string[] }> {
  try {
    const rows = await earthbank.hydrateSamplesById(ids);
    return { found: rows, missing: [] };
  } catch (error) {
    if (!isMissingSample(error)) throw error;
    if (ids.length === 1) return { found: [], missing: [ids[0] ?? ""] };
    const mid = Math.ceil(ids.length / 2);
    const left = await hydrateSamples(earthbank, ids.slice(0, mid));
    const right = await hydrateSamples(earthbank, ids.slice(mid));
    return { found: [...left.found, ...right.found], missing: [...left.missing, ...right.missing] };
  }
}

function isMissingSample(error: unknown): boolean {
  return error instanceof Error && /unable to find/i.test(error.message);
}

async function mineralsBySample(api: PlatformApi, points: readonly EarthBankDataPoint[]): Promise<Map<string, string>> {
  const ftIds = [...new Set(points.map((point) => point.ftdataPointId).filter((id): id is number => id != null).map(String))];
  const mineralByFt = new Map<string, string>();
  for (const batch of chunks(ftIds, EARTHBANK_ID_CHUNK)) {
    const rows = await api.listAll<FtRow>("/api/fissiontrack/FTDataPoint", { "id.in": batch });
    for (const row of rows) {
      const id = row.ftdataPointDTO?.id ?? row.id;
      const name = row.ftdataPointDTO?.mineralName?.trim();
      if (id != null && name) mineralByFt.set(String(id), name);
    }
  }
  const sets = new Map<string, Set<string>>();
  for (const point of points) {
    if (point.dataStructure !== "FT" || point.sampleId == null || point.ftdataPointId == null) continue;
    const mineral = mineralByFt.get(String(point.ftdataPointId));
    if (!mineral) continue;
    const key = String(point.sampleId);
    const set = sets.get(key) ?? new Set<string>();
    set.add(mineral);
    sets.set(key, set);
  }
  const bySample = new Map<string, string>();
  for (const [sampleId, names] of sets) {
    if (names.size === 1) bySample.set(sampleId, [...names][0] ?? "");
  }
  return bySample;
}

interface FtRow {
  id?: number;
  ftdataPointDTO?: { id?: number; mineralName?: string | null } | null;
}

async function loadPackages(
  earthbank: EarthBankClient,
  samples: readonly HydratedSample[],
): Promise<Map<string, { distribution?: string | null; workflowState?: string | null } | null>> {
  const ids = [...new Set(samples.map((sample) => sample.sampleDTO?.dataPackageId).filter((id): id is number => id != null).map(String))];
  const packages = new Map<string, { distribution?: string | null; workflowState?: string | null } | null>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const body = await earthbank.getDataPackage(id);
        packages.set(id, body?.dataPackageDTO ?? null);
      } catch {
        packages.set(id, null);
      }
    }),
  );
  return packages;
}

function toRecord(
  sample: HydratedSample,
  points: readonly EarthBankDataPoint[],
  minerals: ReadonlyMap<string, string>,
  packages: ReadonlyMap<string, { distribution?: string | null; workflowState?: string | null } | null>,
): SampleRecord | null {
  const dto = sample.sampleDTO;
  const id = dto?.id ?? sample.id;
  if (id == null) return null;
  const sampleId = String(id);
  const location = sample.locationDTO;
  const packageId = dto?.dataPackageId == null ? "" : String(dto.dataPackageId);
  const pkg = packageId ? packages.get(packageId) : undefined;
  const literature: LiteratureNote[] = (sample.literatureDTOs ?? []).map((note) => ({
    id: note.id == null ? "" : String(note.id),
    author: note.author ?? "",
    year: note.pubYear ?? "",
    journal: note.journal ?? "",
    volume: note.volume ?? "",
    pages: note.pages ?? "",
    doi: note.doi ?? "",
  }));
  const collectors = (sample.personDTOs ?? [])
    .map((person) => person.calcName?.trim() || [person.firstName, person.name].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return {
    id: sampleId,
    name: dto?.name?.trim() || sampleId,
    igsn: dto?.igsn?.trim() ?? "",
    latitude: finite(location?.lat),
    longitude: finite(location?.lon),
    elevationMetres: finite(dto?.referenceElevation),
    relativeElevationMin: finite(dto?.relativeElevationMin),
    relativeElevationMax: finite(dto?.relativeElevationMax),
    location: location?.name?.trim() || dto?.locationName?.trim() || "",
    lithology: dto?.materialName?.trim() ?? "",
    mineral: minerals.get(sampleId) ?? "",
    sampleKind: dto?.sampleKindName?.trim() ?? "",
    sampleMethod: dto?.sampleMethodName?.trim() ?? "",
    locationKind: dto?.locationKindName?.trim() ?? "",
    country: location?.countryName?.trim() ?? "",
    collectors,
    archive: sample.archiveDTO?.name?.trim() || dto?.archiveName?.trim() || "",
    coordinatePrecisionMetres: finite(location?.latLonPrecision),
    elevationKind: dto?.referenceElevationKindName?.trim() ?? "",
    verticalDatum: dto?.elevationGeodicDatumName?.trim() ?? "",
    literature,
    analysisCodes: points
      .filter((point) => point.sampleId != null && String(point.sampleId) === sampleId)
      .map((point) => point.dataStructure?.trim() || "")
      .filter(Boolean),
    packageId,
    packageName: dto?.dataPackageName?.trim() ?? "",
    packageDistribution: pkg?.distribution?.trim() ?? "",
    packageWorkflow: pkg?.workflowState?.trim() ?? "",
  };
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}
