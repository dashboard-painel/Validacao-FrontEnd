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
import { toggleInArray } from '../../utils/array-toggle';
import { urgencyClass, formatDelay, layerLastSale } from '../../utils/display-helpers';
import { filterSummary } from '../../utils/filter-summary';

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

const MIN_DELAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: '0h' },
  { value: 24, label: '24h+' },
  { value: 48, label: '48h+' },
  { value: 72, label: '72h+' },
];

@Component({
  selector: 'app-delayed-stores-table',
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
  exportingFormat  = input<'excel' | 'pdf' | null>(null);

  // ── Filter-state inputs ──────────────────────────────────────
  filtersOpen               = input<boolean>(false);
  minDelayHours             = input<number>(0);
  selectedMultiFilters      = input<Record<MultiFilterKey, string[]>>(EMPTY_MULTI);
  multiFilterSearch         = input<Record<MultiFilterKey, string>>(EMPTY_SEARCH);
  /** Covers both MultiFilterKey and table-specific filter keys (problemLayer, storeStatus, sitContratoLocal) */
  openMultiFilter           = input<string | null>(null);
  pharmacyNameFilter        = input<string>('');
  selectedProblemLayers     = input<ProblemLayer[]>([]);
  selectedStoreStatuses     = input<StoreStatus[]>([]);
  selectedSitContratosLocal = input<string[]>([]);
  possivelCausaFilter       = input<string>('');
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
    const raw = this.multiFilterSearch().cnpj.trim();
    if (!raw) return this.cnpjOptions();

    const normalizedDigits = raw.replace(/\D/g, '');
    const normalizedText = raw.toLowerCase();

    return this.cnpjOptions().filter(
      (o) =>
        (normalizedDigits.length > 0 && o.cnpj.replace(/\D/g, '').includes(normalizedDigits)) ||
        o.pharmacyName.toLowerCase().includes(normalizedText),
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
  readonly multiFilterToggle        = output<{ key: string; open: boolean }>();
  readonly storeSelect              = output<DelayedStoreRow>();
  readonly tableScroll              = output<void>();
  readonly clearFilters             = output<void>();
  readonly sortChange               = output<{ column: string; dir: 'asc' | 'desc' }>();
  readonly minDelayChange           = output<number>();
  readonly filtersToggle            = output<void>();
  readonly exportRequest            = output<'excel' | 'pdf'>();

  // ── Display helpers ──────────────────────────────────────────
  /** Layers shown in the last-sale date columns (excludes 'Sem dados' — no timestamp available) */
  readonly LAYER_KEYS: ProblemLayer[] = ['Gold', 'Silver', 'Coletor'];
  readonly MIN_DELAY_OPTIONS = MIN_DELAY_OPTIONS;
  readonly urgencyClass = urgencyClass;
  readonly formatDelay = formatDelay;
  readonly layerLastSale = layerLastSale;

  rowUrgencyClass(row: DelayedStoreRow): string {
    if (row.problemLayers.includes('Sem dados')) return 'nodata';
    if (row.delayHours === 0) return 'ok';
    return urgencyClass(row.delayHours);
  }

  multiFilterSummary(key: MultiFilterKey): string {
    return filterSummary(this.selectedMultiFilters()[key]);
  }

  problemLayerSummary(): string {
    return filterSummary(this.selectedProblemLayers(), 'Todas');
  }

  storeStatusSummary(): string {
    return filterSummary(this.selectedStoreStatuses());
  }

  sitContratoLocalSummary(): string {
    return filterSummary(this.selectedSitContratosLocal());
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
    const next = toggleInArray(this.selectedMultiFilters()[key], value, checked);
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
    this.problemLayerChange.emit(toggleInArray(this.selectedProblemLayers(), layer, checked));
  }

  onStoreStatusCheckbox(status: StoreStatus, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.storeStatusChange.emit(toggleInArray(this.selectedStoreStatuses(), status, checked));
  }

  onSitContratoLocalCheckbox(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.sitContratoLocalChange.emit(toggleInArray(this.selectedSitContratosLocal(), value, checked));
  }

  onPossivelCausaFilter(event: Event): void {
    this.possivelCausaChange.emit((event.target as HTMLInputElement).value);
  }

  onMultiFilterToggle(key: string, event: Event): void {
    const details = event.currentTarget instanceof HTMLDetailsElement ? event.currentTarget : null;
    if (!details) return;
    this.multiFilterToggle.emit({ key, open: details.open });
  }

  openStoreModal(row: DelayedStoreRow): void {
    this.storeSelect.emit(row);
  }

  onTableScroll(event: Event): void {
    if (!this.hasMoreRows() || this.filteredCount() === 0) return;

    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      this.tableScroll.emit();
    }
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onMinDelaySelect(value: number): void {
    this.minDelayChange.emit(value);
  }

  onExport(format: 'excel' | 'pdf'): void {
    this.exportRequest.emit(format);
  }

  sortBy(column: string): void {
    const currentDir = this.sortDir();
    const currentCol = this.sortColumn();
    const newDir: 'asc' | 'desc' =
      column === currentCol ? (currentDir === 'asc' ? 'desc' : 'asc') : 'desc';
    this.sortChange.emit({ column, dir: newDir });
  }

  toggleFilters(): void {
    this.filtersToggle.emit();
  }
}
