import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { type GlobalFilterKey } from '../../models/shared/dashboard.model';
import { SitContratoBadge } from '../sit-contrato-badge/sit-contrato-badge';
import { toggleInArray } from '../../utils/array-toggle';
import { filterSummary } from '../../utils/filter-summary';

@Component({
  selector: 'app-global-filter-bar',
  imports: [SitContratoBadge],
  templateUrl: './global-filter-bar.html',
  styleUrl: './global-filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalFilterBar {
  // --- Inputs ---
  selectedGlobalFilters = input.required<Record<GlobalFilterKey, string[]>>();
  globalFilterSearch    = input<string>('');
  openGlobalFilter      = input<GlobalFilterKey | null>(null);
  associationOptions    = input<string[]>([]);

  // --- Outputs ---
  readonly filterChange   = output<{ key: GlobalFilterKey; values: string[] }>();
  readonly searchChange   = output<string>();
  readonly toggleDropdown = output<{ key: GlobalFilterKey; open: boolean }>();
  readonly chipRemove     = output<{ key: GlobalFilterKey; value: string }>();
  readonly clearAll       = output<void>();

  // Unique ID per instance so radio groups don't bleed across multiple usages on the same page
  private readonly uid = Math.random().toString(36).slice(2, 7);
  readonly sitContratoName      = `sitContrato_${this.uid}`;
  readonly classificacaoName    = `classificacao_${this.uid}`;

  // --- Computed ---
  readonly filteredAssociationOptions = computed(() => {
    const search = this.globalFilterSearch().toLowerCase();
    if (!search) return this.associationOptions();
    return this.associationOptions().filter((v) => v.toLowerCase().includes(search));
  });

  readonly hasActiveFilters = computed(() =>
    Object.values(this.selectedGlobalFilters()).some((v) => v.length > 0),
  );

  readonly activeChips = computed(() => {
    const gf = this.selectedGlobalFilters();
    const labelMap: Record<GlobalFilterKey, string> = {
      associationCode: 'Assoc.',
      sitContrato: 'Sit.',
      classificacao: 'Classif.',
    };
    return (Object.keys(gf) as GlobalFilterKey[]).flatMap((key) =>
      gf[key].map((value) => ({ key, value, label: labelMap[key] })),
    );
  });

  // --- Static option lists ---
  readonly sitContratoOptions: string[] = ['Ativo', 'Inativo'];
  readonly classificacaoGroupOptions: string[] = ['Padrão', 'Cloud'];

  // --- Display helpers ---
  isSelected(key: GlobalFilterKey, value: string): boolean {
    return this.selectedGlobalFilters()[key].includes(value);
  }

  isOpen(key: GlobalFilterKey): boolean {
    return this.openGlobalFilter() === key;
  }

  summary(key: GlobalFilterKey): string {
    return filterSummary(this.selectedGlobalFilters()[key]);
  }

  // --- Event handlers ---
  onAssociationSearch(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  onAssociationCheckbox(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = toggleInArray(this.selectedGlobalFilters()['associationCode'], value, checked);
    this.filterChange.emit({ key: 'associationCode', values: next });
  }

  onSitContratoChange(value: string, isAll: boolean): void {
    this.filterChange.emit({ key: 'sitContrato', values: isAll ? [] : [value] });
  }

  onClassificacaoChange(value: string, isAll: boolean): void {
    this.filterChange.emit({ key: 'classificacao', values: isAll ? [] : [value] });
  }

  onToggle(key: GlobalFilterKey, event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;
    if (!details.open && key === 'associationCode') {
      // Clear stale search text so the list resets on next open
      this.searchChange.emit('');
    }
    this.toggleDropdown.emit({ key, open: details.open });
  }

  onChipRemove(key: GlobalFilterKey, value: string): void {
    this.chipRemove.emit({ key, value });
  }

  onClearAll(): void {
    this.clearAll.emit();
  }
}
