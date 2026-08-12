/**
 * Return the localised value for `field` from `row`.
 * When locale is "ar", tries `field_ar` first; falls back to `field` when
 * the Arabic column is absent or empty (null | undefined | "").
 */
export function pickLocalised(
  row: Record<string, unknown>,
  field: string,
  locale: string,
): string {
  if (locale === "ar") {
    const ar = row[`${field}_ar`];
    if (ar && typeof ar === "string" && ar.trim() !== "") return ar;
  }
  return (row[field] as string | null | undefined) ?? "";
}
