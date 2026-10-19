export { FormattedFileDownload, FormattedFileDownload as default } from "./tool/MyTool";
export { toolManifest } from "./tool/manifest";

export { ControlPanel } from "./platform/ControlPanel";
export { LicenseGate } from "./platform/LicenseGate";
export { hasLicense, licenseIds } from "./platform/licenses";
export { resolvePosition, positionToStyle } from "./platform/position";
export { useOverridablePosition } from "./platform/useOverridablePosition";
export {
  resolveDataScope,
  normalizeBoundingBox,
  normalizeIds,
  INVALID_BOUNDING_BOX,
  INVALID_IDS,
  INVALID_SEARCH_SPEC,
} from "./platform/dataScope";
export { readJwtExpiry } from "./platform/jwt";
export {
  usePlatformToken,
  resolveToken,
  tokenSourceOf,
  authorizedFetch,
} from "./platform/usePlatformToken";
export { EARTHBANK_ORIGIN, PlatformApiError, createPlatformApi, platformFetch } from "./platform/api";
export { EARTHBANK_ID_CHUNK, createEarthBank } from "./platform/earthbank";
export { useStylesheet } from "./platform/useStylesheet";
export { MapContext, MapProvider, useMapContext } from "./platform/MapProvider";
export {
  tokensForBrand,
  cssVariablesFrom,
  resolveGraniteTheme,
  GRANITE_BRANDS,
  GRANITE_MODES,
  DEFAULT_GRANITE_BRAND,
  DEFAULT_GRANITE_MODE,
  PLATFORM_TOOL_CSS_VARIABLES,
} from "./platform/granite";

export type {
  AcceptedScopes,
  BoundingBox,
  BoundingBoxInput,
  ControlPanelPosition,
  LicenseEntry,
  MapBoundsLike,
  PlatformMap,
  PlatformTheme,
  PlatformToolProps,
  SearchCriteriaValue,
  SearchSpec,
  TokenGetter,
  ToolLicense,
  ToolManifest,
} from "./contract";

export type { GraniteBrand, GraniteMode, ResolvedGraniteTheme } from "./platform/granite";
export type { ResolvedDataScope, ScopeName, DataScopeInput } from "./platform/dataScope";
export type { TokenSource, TokenStatus } from "./platform/usePlatformToken";
export type { ListAllOptions, PlatformApi, Query, QueryValue } from "./platform/api";
export type {
  DataPackageResponse,
  EarthBankClient,
  EarthBankDataPackage,
  EarthBankDataPoint,
  EarthBankLiterature,
  EarthBankLocation,
  EarthBankPerson,
  EarthBankSample,
  HydratedSample,
  SampleWithLocation,
} from "./platform/earthbank";
