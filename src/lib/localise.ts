/**
 * Return the localised value for `field` from `row`.
 * When locale is "ar", tries `field_ar` first; falls back to `field` when
 * the Arabic column is absent or empty (null | undefined | "").
 */
export function pickLocalised(
  row: object,
  field: string,
  locale: string,
): string {
  const r = row as Record<string, unknown>;
  if (locale === "ar") {
    const ar = r[`${field}_ar`];
    if (ar && typeof ar === "string" && ar.trim() !== "") return ar;
  }
  const val = r[field];
  return (typeof val === "string" ? val : null) ?? "";
}
