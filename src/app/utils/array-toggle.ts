/**
 * Toggle an item in an immutable array.
 * Adds it (with dedup) when `add` is true, removes it otherwise.
 */
export function toggleInArray<T>(array: readonly T[], item: T, add: boolean): T[] {
  return add ? [...new Set([...array, item])] : array.filter((v) => v !== item);
}
