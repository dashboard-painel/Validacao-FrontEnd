import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  type CnpjOption,
  type DelayedStoreRow,
  type MultiFilterKey,
  type ProblemLayer,
  type StoreStatus,
} from '../../models/shared/dashboard.model';
import { CnpjPipe } from '../../pipes/cnpj.pipe';
import { ClassificacaoBadge } from '../classificacao-badge/classificacao-badge';
import { SitContratoBadge } from '../sit-contrato-badge/sit-contrato-badge';

const EMPTY_MULTI: Record<MultiFilterKey, string[]> = {
  associationCode: [],
  farmaCode: [],
  cnpj: [],
};

const EMPTY_SEARCH: Record<MultiFilterKey, string> = {
  associationCode: '',
  farmaCode: '',
  cnpj: '',
};

@Component({
  selector: 'app-delayed-stores-table',
  standalone: true,
  imports: [CnpjPipe, SitContratoBadge, ClassificacaoBadge],
  templateUrl: './delayed-stores-table.html',
  styleUrl: './delayed-stores-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DelayedStoresTable {
  // ── Data inputs ─────────────────────────────────────────────
  rows             = input.required<DelayedStoreRow[]>();
  visibleRows      = input.required<DelayedStoreRow[]>();
  totalCount       = input<number>(0);
  filteredCount    = input<number>(0);
  hasMoreRows      = input<boolean>(false);
  hasActiveFilters = input<boolean>(false);

  // ── Filter-state inputs ──────────────────────────────────────
  filtersOpen               = input<boolean>(false);
  activePreset              = input<string | null>(null);
  selectedMultiFilters      = input<Record<MultiFilterKey, string[]>>(EMPTY_MULTI);
  multiFilterSearch         = input<Record<MultiFilterKey, string>>(EMPTY_SEARCH);
  /** Covers both MultiFilterKey and table-specific filter keys (problemLayer, storeStatus, sitContratoLocal) */
  openMultiFilter           = input<string | null>(null);
  pharmacyNameFilter        = input<string>('');
  selectedProblemLayers     = input<ProblemLayer[]>([]);
  selectedStoreStatuses     = input<StoreStatus[]>([]);
  selectedSitContratosLocal = input<string[]>([]);
  possivelCausaFilter       = input<string>('');
  minDelayHoursFilter       = input<number>(0);
  sortColumn                = input<string>('delayHours');
  sortDir                   = input<'asc' | 'desc'>('desc');

  // ── Option-list inputs ───────────────────────────────────────
  associationCodeOptions = input<string[]>([]);
  farmaCodeOptions       = input<string[]>([]);
  cnpjOptions            = input<CnpjOption[]>([]);
  sitContratoOptions     = input<string[]>([]);
  delayedLayerOptions    = input<ProblemLayer[]>([]);
  storeStatusOptions     = input<StoreStatus[]>([]);

  // ── Filtered option lists (search applied) ───────────────────
  readonly filteredAssociationCodeOptions = computed(() => {
    const search = this.multiFilterSearch().associationCode.toLowerCase();
    if (!search) return this.associationCodeOptions();
    return this.associationCodeOptions().filter((v) => v.toLowerCase().includes(search));
  });

  readonly filteredFarmaCodeOptions = computed(() => {
    const search = this.multiFilterSearch().farmaCode.toLowerCase();
    if (!search) return this.farmaCodeOptions();
    return this.farmaCodeOptions().filter((v) => v.toLowerCase().includes(search));
  });

  readonly filteredCnpjOptions = computed(() => {
    const search = this.multiFilterSearch().cnpj.toLowerCase();
    if (!search) return this.cnpjOptions();
    return this.cnpjOptions().filter(
      (o) =>
        o.cnpj.toLowerCase().includes(search) ||
        o.pharmacyName.toLowerCase().includes(search),
    );
  });

  // ── Outputs ──────────────────────────────────────────────────
  readonly multiCheckboxChange      = output<{ key: MultiFilterKey; values: string[] }>();
  readonly pharmacyNameChange       = output<string>();
  readonly multiFilterSearchChange  = output<{ key: MultiFilterKey; search: string }>();
  readonly problemLayerChange       = output<ProblemLayer[]>();
  readonly storeStatusChange        = output<StoreStatus[]>();
  readonly sitContratoLocalChange   = output<string[]>();
  readonly possivelCausaChange      = output<string>();
  readonly minDelayChange           = output<number>();
  readonly multiFilterToggle        = output<{ key: string; open: boolean }>();
  readonly storeSelect              = output<DelayedStoreRow>();
  readonly tableScroll              = output<void>();
  readonly clearFilters             = output<void>();
  readonly sortChange               = output<{ column: string; dir: 'asc' | 'desc' }>();
  readonly presetChange             = output<string | null>();
  readonly filtersToggle            = output<void>();

  // ── Display helpers ──────────────────────────────────────────
  urgencyClass(hours: number): string {
    if (hours >= 48) return 'critical';
    if (hours >= 24) return 'high';
    return 'moderate';
  }

  rowUrgencyClass(row: DelayedStoreRow): string {
    if (row.problemLayers.includes('Sem dados')) return 'nodata';
    if (row.delayHours === 0) return 'ok';
    return this.urgencyClass(row.delayHours);
  }

  formatDelay(hours: number): string {
    if (hours > 48) return `${Math.round(hours / 24)} dias`;
    return `${hours} horas`;
  }

  layerLastSale(store: DelayedStoreRow, layer: string): string {
    return (store.lastSalesByLayer as Record<string, string> | undefined)?.[layer] ?? 'Sem dados';
  }

  multiFilterSummary(key: MultiFilterKey): string {
    const selected = this.selectedMultiFilters()[key];
    if (selected.length === 0) return 'Todos';
    if (selected.length === 1) return selected[0] ?? 'Todos';
    return `${selected.length} selecionados`;
  }

  problemLayerSummary(): string {
    const n = this.selectedProblemLayers().length;
    if (n === 0) return 'Todas';
    if (n === 1) return this.selectedProblemLayers()[0] ?? 'Todas';
    return `${n} selecionadas`;
  }

  storeStatusSummary(): string {
    const n = this.selectedStoreStatuses().length;
    if (n === 0) return 'Todos';
    if (n === 1) return this.selectedStoreStatuses()[0] ?? 'Todos';
    return `${n} selecionados`;
  }

  sitContratoLocalSummary(): string {
    const n = this.selectedSitContratosLocal().length;
    if (n === 0) return 'Todos';
    if (n === 1) return this.selectedSitContratosLocal()[0] ?? 'Todos';
    return `${n} selecionados`;
  }

  isMultiFilterOpen(key: string): boolean {
    return this.openMultiFilter() === key;
  }

  isMultiSelected(key: MultiFilterKey, value: string): boolean {
    return this.selectedMultiFilters()[key].includes(value);
  }

  // ── Event handlers ───────────────────────────────────────────
  onMultiCheckboxFilter(key: MultiFilterKey, value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedMultiFilters()[key];
    const next = checked
      ? [...new Set([...current, value])]
      : current.filter((v) => v !== value);
    this.multiCheckboxChange.emit({ key, values: next });
  }

  onPharmacyNameFilter(event: Event): void {
    this.pharmacyNameChange.emit((event.target as HTMLInputElement).value);
  }

  onMultiFilterSearch(key: MultiFilterKey, event: Event): void {
    this.multiFilterSearchChange.emit({ key, search: (event.target as HTMLInputElement).value });
  }

  onProblemLayerCheckbox(layer: ProblemLayer, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedProblemLayers();
    const next = checked ? [...current, layer] : current.filter((l) => l !== layer);
    this.problemLayerChange.emit(next);
  }

  onStoreStatusCheckbox(status: StoreStatus, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedStoreStatuses();
    const next = checked ? [...current, status] : current.filter((s) => s !== status);
    this.storeStatusChange.emit(next);
  }

  onSitContratoLocalCheckbox(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedSitContratosLocal();
    const next = checked ? [...current, value] : current.filter((v) => v !== value);
    this.sitContratoLocalChange.emit(next);
  }

  onPossivelCausaFilter(event: Event): void {
    this.possivelCausaChange.emit((event.target as HTMLInputElement).value);
  }

  onMinDelayInput(event: Event): void {
    this.minDelayChange.emit(Number((event.target as HTMLInputElement).value));
  }

  onMultiFilterToggle(key: string, event: Event): void {
    const details = event.target as HTMLDetailsElement;
    this.multiFilterToggle.emit({ key, open: details.open });
  }

  openStoreModal(row: DelayedStoreRow): void {
    this.storeSelect.emit(row);
  }

  onTableScroll(): void {
    this.tableScroll.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  sortBy(column: string): void {
    const currentDir = this.sortDir();
    const currentCol = this.sortColumn();
    const newDir: 'asc' | 'desc' =
      column === currentCol ? (currentDir === 'asc' ? 'desc' : 'asc') : 'desc';
    this.sortChange.emit({ column, dir: newDir });
  }

  applyPreset(preset: string | null): void {
    this.presetChange.emit(preset);
  }

  toggleFilters(): void {
    this.filtersToggle.emit();
  }
}
