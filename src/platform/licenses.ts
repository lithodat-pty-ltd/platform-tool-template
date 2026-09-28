import type { LicenseEntry } from "../contract";

/**
 * Exact license match.
 * A missing or empty list is "no licenses", not "all licenses".
 * `example` does not grant `example.analysis`.
 */
export function hasLicense(
  licenses: readonly LicenseEntry[] | undefined,
  license: string,
): boolean {
  if (!license) return false;
  return licenseIds(licenses).includes(license);
}

export function licenseIds(licenses: readonly LicenseEntry[] | undefined): string[] {
  if (!licenses) return [];
  const ids: string[] = [];
  for (const entry of licenses) {
    if (typeof entry === "string") {
      if (entry) ids.push(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const id = entry.id ?? entry.name;
    if (typeof id === "string" && id) ids.push(id);
  }
  return ids;
}
