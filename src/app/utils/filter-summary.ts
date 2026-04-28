/**
 * Returns a human-readable summary for a multi-select filter.
 *  - 0 selected → allLabel (default 'Todos')
 *  - 1 selected → the selected value
 *  - N selected → 'N selecionados'
 */
export function filterSummary(
  selected: readonly string[],
  allLabel = 'Todos',
): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) return selected[0] ?? allLabel;
  return `${selected.length} selecionados`;
}
