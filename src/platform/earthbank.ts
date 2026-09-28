import type { BoundingBox } from "../contract";
import { type PlatformApi, type Query } from "./api";

/** Ids per `*.in` or `sampleIds` request, so the query string stays bounded. */
export const EARTHBANK_ID_CHUNK = 50;

/**
 * Fields a tool needs from a hydrated sample. EarthBank sends more; they remain on the object at runtime.
 */
export interface EarthBankSample {
  id?: number;
  name?: string | null;
  igsn?: string | null;
  referenceElevation?: number | null;
  relativeElevationMin?: number | null;
  relativeElevationMax?: number | null;
  materialName?: string | null;
  sampleKindName?: string | null;
  sampleMethodName?: string | null;
  locationKindName?: string | null;
  locationName?: string | null;
  archiveName?: string | null;
  elevationGeodicDatumName?: string | null;
  referenceElevationKindName?: string | null;
  dataPackageId?: number | null;
  dataPackageName?: string | null;
}

export interface EarthBankLocation {
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
  latLonPrecision?: number | null;
  countryName?: string | null;
}

export interface EarthBankPerson {
  calcName?: string | null;
  name?: string | null;
  firstName?: string | null;
}

export interface EarthBankLiterature {
  id?: number;
  author?: string | null;
  pubYear?: string | null;
  journal?: string | null;
  volume?: string | null;
  pages?: string | null;
  doi?: string | null;
}

export interface HydratedSample {
  id?: number;
  sampleDTO?: EarthBankSample | null;
  locationDTO?: EarthBankLocation | null;
  personDTOs?: EarthBankPerson[] | null;
  literatureDTOs?: EarthBankLiterature[] | null;
  archiveDTO?: { name?: string | null } | null;
}

export interface SampleWithLocation {
  id?: number;
  sampleDTO?: EarthBankSample | null;
  locationDTO?: EarthBankLocation | null;
}

/** Core datapoint. `dataStructure` names the technique; the matching `*DataPointId` points at that record. */
export interface EarthBankDataPoint {
  id?: number;
  sampleId?: number | null;
  dataStructure?: string | null;
  ftdataPointId?: number | null;
  upbDataPointId?: number | null;
  gcdataPointId?: number | null;
  heDataPointId?: number | null;
  arArDataPointId?: number | null;
  shrimpdataPointId?: number | null;
  isoDataPointId?: number | null;
  luHfDataPointId?: number | null;
  pbIsotopeDataPointId?: number | null;
  srIsotopeDataPointId?: number | null;
  ageDataPointId?: number | null;
  vitriniteDataPointId?: number | null;
  thdataPointId?: number | null;
}

export interface EarthBankDataPackage {
  id?: number;
  name?: string | null;
  distribution?: string | null;
  workflowState?: string | null;
}

export interface DataPackageResponse {
  dataPackageDTO?: EarthBankDataPackage | null;
}

export interface EarthBankClient {
  /**
   * `GET /api/core/hydrate-samples-by-id`.
   * One missing id makes EarthBank fail the whole batch. This method throws that error.
   */
  hydrateSamplesById(ids: readonly (string | number)[]): Promise<HydratedSample[]>;
  /** `GET /api/core/sample-with-locations` with the caller's JHipster query, followed across pages. */
  listSamples(query?: Query): Promise<SampleWithLocation[]>;
  /**
   * Samples inside a box, via location lat/lon criteria on the sample list.
   * West may be greater than east. The values are sent as given and are not split at the antimeridian.
   */
  findSamplesInBounds(box: BoundingBox): Promise<SampleWithLocation[]>;
  /** `GET /api/core/data-points?sampleId.in=`, followed across pages. */
  listDataPointsBySampleIds(ids: readonly (string | number)[]): Promise<EarthBankDataPoint[]>;
  /** `GET /api/management/data-packages/{id}`. */
  getDataPackage(id: string | number): Promise<DataPackageResponse>;
}

const HYDRATE_PATH = "/api/core/hydrate-samples-by-id";
const SAMPLES_PATH = "/api/core/sample-with-locations";
const DATA_POINTS_PATH = "/api/core/data-points";

export function createEarthBank(api: PlatformApi): EarthBankClient {
  return {
    async hydrateSamplesById(ids) {
      const found: HydratedSample[] = [];
      for (const batch of chunks(idStrings(ids), EARTHBANK_ID_CHUNK)) {
        const rows = await api.getJson<HydratedSample[]>(HYDRATE_PATH, { sampleIds: batch.join(",") });
        if (Array.isArray(rows)) found.push(...rows);
      }
      return found;
    },
    listSamples(query) {
      return api.listAll<SampleWithLocation>(SAMPLES_PATH, query);
    },
    findSamplesInBounds(box) {
      return api.listAll<SampleWithLocation>(SAMPLES_PATH, boundsQuery(box));
    },
    async listDataPointsBySampleIds(ids) {
      const points: EarthBankDataPoint[] = [];
      for (const batch of chunks(idStrings(ids), EARTHBANK_ID_CHUNK)) {
        const rows = await api.listAll<EarthBankDataPoint>(DATA_POINTS_PATH, { "sampleId.in": batch });
        points.push(...rows);
      }
      return points;
    },
    getDataPackage(id) {
      return api.getJson<DataPackageResponse>(`/api/management/data-packages/${encodeURIComponent(String(id))}`);
    },
  };
}

/**
 * `findGeoSquare` returns the extent of a result, not the samples inside a box.
 * The sample list filters on location latitude and longitude.
 */
function boundsQuery(box: BoundingBox): Query {
  return {
    "locationCriteria.lat.greaterOrEqualThan": box.south,
    "locationCriteria.lat.lessOrEqualThan": box.north,
    "locationCriteria.lon.greaterOrEqualThan": box.west,
    "locationCriteria.lon.lessOrEqualThan": box.east,
  };
}

function idStrings(ids: readonly (string | number)[]): string[] {
  return ids.map((id) => String(id).trim()).filter((id) => id !== "");
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}
