import type { ReactNode } from "react";
import type { LicenseEntry } from "../contract";
import { hasLicense } from "./licenses";

/** Renders nothing when the user does not hold `license`. */
export function LicenseGate({
  licenses,
  license,
  children,
}: {
  licenses: readonly LicenseEntry[] | undefined;
  license: string;
  children: ReactNode;
}) {
  if (!hasLicense(licenses, license)) return null;
  return <>{children}</>;
}
