import { Injectable, computed, signal } from '@angular/core';

import {
  type GlobalFilterKey,
  type MultiFilterKey,
  type ProblemLayer,
  type StoreStatus,
} from '../../models/shared/dashboard.model';
import { toggleInArray } from '../../utils/array-toggle';

/**
 * Encapsulates all local filter state for the Dashboard view.
 * Provided at the component level so each Dashboard instance gets its own state.
 */
@Injectable()
export class DashboardFilterState {
  private readonly pageSize = 60;

  // ── Writable signals ──────────────────────────────────────
  readonly selectedMultiFilters = signal<Record<MultiFilterKey, string[]>>({
    associationCode: [],
    farmaCode: [],
    cnpj: [],
  });
  readonly multiFilterSearch = signal<Record<MultiFilterKey, string>>({
    associationCode: '',
    farmaCode: '',
    cnpj: '',
  });
  readonly openMultiFilter = signal<string | null>(null);
  readonly pharmacyNameFilter = signal('');
  readonly selectedProblemLayers = signal<ProblemLayer[]>([]);
  readonly selectedStoreStatuses = signal<StoreStatus[]>([]);
  readonly selectedSitContratosLocal = signal<string[]>([]);
  readonly selectedGlobalFilters = signal<Record<GlobalFilterKey, string[]>>({
    associationCode: [],
    sitContrato: ['Ativo'],
    classificacao: ['Padrão'],
  });
  readonly globalFilterSearch = signal('');
  readonly openGlobalFilter = signal<GlobalFilterKey | null>(null);
  readonly possivelCausaFilter = signal('');
  readonly minDelayHoursFilter = signal(0);
  readonly filtersOpen = signal(false);

  readonly sortColumn = signal<'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'>(
    'delayHours',
  );
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly renderedRowsCount = signal(this.pageSize);

  // ── Derived state ─────────────────────────────────────────
  /** Filters that live in the advanced panel instead of the quick triage row. */
  readonly hasAdvancedFilters = computed(() => {
    const selected = this.selectedMultiFilters();
    return (
      selected.associationCode.length > 0 ||
      selected.farmaCode.length > 0 ||
      selected.cnpj.length > 0 ||
      this.pharmacyNameFilter().trim().length > 0 ||
      this.selectedProblemLayers().length > 0 ||
      this.selectedSitContratosLocal().length > 0 ||
      this.possivelCausaFilter().trim().length > 0
    );
  });

  readonly hasActiveFilters = computed(
    () =>
      this.hasAdvancedFilters() ||
      this.selectedStoreStatuses().length > 0 ||
      this.minDelayHoursFilter() > 0,
  );

  readonly hasActiveGlobalFilters = computed(() =>
    Object.values(this.selectedGlobalFilters()).some((v) => v.length > 0),
  );

  readonly activeGlobalFilterChips = computed(() => {
    const gf = this.selectedGlobalFilters();
    const labelMap: Record<GlobalFilterKey, string> = {
      associationCode: 'Assoc.',
      sitContrato: 'Sit.',
      classificacao: 'Classif.',
    };
    return (Object.keys(gf) as GlobalFilterKey[]).flatMap((key) =>
      gf[key].map((value) => ({
        key,
        value,
        label: labelMap[key],
      })),
    );
  });

  // ── Mutations ─────────────────────────────────────────────
  resetPagination(): void {
    this.renderedRowsCount.set(this.pageSize);
  }

  sortBy(col: 'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'): void {
    if (this.sortColumn() === col) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set(col === 'delayHours' ? 'desc' : 'asc');
    }
  }

  toggleMultiCheckbox(key: MultiFilterKey, value: string, checked: boolean): void {
    this.selectedMultiFilters.update((current) => ({
      ...current,
      [key]: toggleInArray(current[key], value, checked),
    }));
    this.resetPagination();
  }

  setPharmacyNameFilter(value: string): void {
    this.pharmacyNameFilter.set(value);
    this.resetPagination();
  }

  setMultiFilterSearch(key: MultiFilterKey, value: string): void {
    this.multiFilterSearch.update((current) => ({ ...current, [key]: value }));
  }

  toggleProblemLayer(layer: ProblemLayer, checked: boolean): void {
    this.selectedProblemLayers.update((current) => toggleInArray(current, layer, checked));
    this.resetPagination();
  }

  toggleStoreStatus(status: StoreStatus, checked: boolean): void {
    this.selectedStoreStatuses.update((current) => toggleInArray(current, status, checked));
    this.resetPagination();
  }

  toggleSitContratoLocal(value: string, checked: boolean): void {
    this.selectedSitContratosLocal.update((current) => toggleInArray(current, value, checked));
    this.resetPagination();
  }

  setPossivelCausaFilter(value: string): void {
    this.possivelCausaFilter.set(value);
    this.resetPagination();
  }

  setMinDelayHoursFilter(value: number): void {
    this.minDelayHoursFilter.set(value);
    this.resetPagination();
  }

  updateGlobalFilter(key: GlobalFilterKey, values: string[]): void {
    this.selectedGlobalFilters.update((f) => ({ ...f, [key]: values }));
    this.resetPagination();
  }

  removeGlobalFilterChip(key: GlobalFilterKey, value: string): void {
    this.selectedGlobalFilters.update((current) => ({
      ...current,
      [key]: current[key].filter((v) => v !== value),
    }));
    this.resetPagination();
  }

  clearGlobalFilters(): void {
    this.selectedGlobalFilters.set({ associationCode: [], sitContrato: [], classificacao: [] });
    this.globalFilterSearch.set('');
    this.openGlobalFilter.set(null);
    this.resetPagination();
  }

  clearFilters(): void {
    this.selectedMultiFilters.set({
      associationCode: [],
      farmaCode: [],
      cnpj: [],
    });
    this.multiFilterSearch.set({
      associationCode: '',
      farmaCode: '',
      cnpj: '',
    });
    this.pharmacyNameFilter.set('');
    this.selectedProblemLayers.set([]);
    this.selectedStoreStatuses.set([]);
    this.selectedSitContratosLocal.set([]);
    this.possivelCausaFilter.set('');
    this.minDelayHoursFilter.set(0);
    this.openMultiFilter.set(null);
    this.resetPagination();
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }
}
