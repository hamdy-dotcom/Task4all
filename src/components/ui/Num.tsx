/**
 * Bidi-safe number wrapper. Wraps a numeric value (and optional unit) in
 * <bdi dir="ltr"> so the Unicode bidi algorithm never reorders digits or
 * pushes a unit like "%" to the wrong side in an RTL document.
 *
 * Use everywhere a number, percentage, count, date or duration appears in UI:
 *   <Num>{count}</Num>
 *   <Num>{pct}%</Num>
 *   <Num>{days} days</Num>
 *   <Num value={42} unit="%" />
 */
interface NumProps {
  /** Explicit numeric value. Rendered before `unit`. */
  value?: string | number;
  /** Unit string appended directly after the value (e.g. "%" or " days"). */
  unit?: string;
  /** Alternative to value+unit — pass pre-formatted content as children. */
  children?: React.ReactNode;
}

export function Num({ value, unit, children }: NumProps) {
  return (
    <bdi dir="ltr">
      {value !== undefined ? `${value}${unit ?? ""}` : children}
    </bdi>
  );
}
