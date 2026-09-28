export { MyTool, MyTool as default } from "./tool/MyTool";
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
export { useStylesheet } from "./platform/useStylesheet";
export {
  tokensForBrand,
  cssVariablesFrom,
  GRANITE_BRANDS,
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
  SearchFilterValue,
  SearchSort,
  SearchSpec,
  TokenGetter,
  ToolLicense,
  ToolManifest,
} from "./contract";

export type { ResolvedDataScope, ScopeName, DataScopeInput } from "./platform/dataScope";
export type { TokenSource, TokenStatus } from "./platform/usePlatformToken";
