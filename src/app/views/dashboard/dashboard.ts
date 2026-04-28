import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, merge, switchMap, timer } from 'rxjs';

import { Gauge as GaugeComponent } from '../../components/gauge/gauge';
import { Kpi } from '../../components/kpi/kpi';
import { DelayedStoresTable } from '../../components/delayed-stores-table/delayed-stores-table';
import { GlobalFilterBar } from '../../components/global-filter-bar/global-filter-bar';
import { StatusBar } from '../../components/status-bar/status-bar';
import { StoreDetailModal } from '../../components/store-detail-modal/store-detail-modal';
import { type FarmaciaHistorico } from '../../models/shared/farmacia.model';
import { HistoricoService } from '../../services/historico.service';
import {
  DashboardMapperService,
  type DashboardData,
  type DelayedStoreItem,
} from '../../services/dashboard-mapper.service';

import {
  type CnpjOption,
  type DelayedStoreRow,
  type GlobalFilterKey,
  type MultiFilterKey,
  type ProblemLayer,
  type StatusBarItem,
  type StoreStatus,
} from '../../models/shared/dashboard.model';

@Component({
  selector: 'app-dashboard',
  imports: [Kpi, GaugeComponent, GlobalFilterBar, StatusBar, DelayedStoresTable, StoreDetailModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly pageSize = 60;
  private readonly historicoService = inject(HistoricoService);
  private readonly mapper = inject(DashboardMapperService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kpisStorageKey = 'dashboard-kpis';
  private readonly forceRefresh$ = new Subject<void>();

  readonly apiStores = signal<FarmaciaHistorico[]>([]);
  readonly isLoading = signal(true);
  readonly isComparing = signal(false);
  readonly compareError = signal<string | null>(null);
  private readonly previousKpisStore = signal<DashboardData['kpis'] | null>(null);

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

  readonly activePreset = computed((): 'all' | 'critical' | 'nodata' | 'ok' | null => {
    if (!this.hasActiveFilters()) return 'all';
    const statuses = this.selectedStoreStatuses();
    const minDelay = this.minDelayHoursFilter();
    if (this.hasNonPresetFilters()) return null;
    if (statuses.length === 1 && statuses[0] === 'Com atraso' && minDelay === 48) return 'critical';
    if (statuses.length === 1 && statuses[0] === 'Sem dados' && minDelay === 0) return 'nodata';
    if (statuses.length === 1 && statuses[0] === 'Sem atraso' && minDelay === 0) return 'ok';
    return null;
  });

  readonly sortColumn = signal<'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'>(
    'associationCode',
  );
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly selectedStore = signal<DelayedStoreRow | null>(null);

  sortBy(col: 'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'): void {
    if (this.sortColumn() === col) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  readonly globalFilteredStores = computed(() => {
    const stores = this.apiStores();
    const gf = this.selectedGlobalFilters();
    return stores.filter((f) => {
      if (gf.associationCode.length > 0 && !gf.associationCode.includes(f.associacao))
        return false;
      if (
        gf.sitContrato.length > 0 &&
        !gf.sitContrato.includes(this.mapper.sitContratoGroupOf(f.sit_contrato))
      )
        return false;
      if (
        gf.classificacao.length > 0 &&
        !gf.classificacao.includes(this.mapper.classificacaoGroupOf(f.classificacao))
      )
        return false;
      return true;
    });
  });

  readonly dashboardData = computed(() =>
    this.mapper.mapToDashboardData(this.globalFilteredStores(), this.previousKpisStore()),
  );

  readonly statusBarItems = computed((): StatusBarItem[] => {
    const data = this.dashboardData();
    const total = data.kpis.totalStores;
    return [
      {
        label: 'OK',
        value: data.statuses.ok,
        percent: this.mapper.toPercent(data.statuses.ok, total),
        barClass: 'progress-bar bg-success',
        itemClass: 'status-chart__item status-chart__item--ok',
      },
      {
        label: 'CAMADA GOLD ATRASADA',
        value: data.statuses.goldDelayed,
        percent: this.mapper.toPercent(data.statuses.goldDelayed, total),
        barClass: 'progress-bar bg-warning text-dark',
        itemClass: 'status-chart__item status-chart__item--warning',
      },
      {
        label: 'CAMADA SILVER ATRASADA',
        value: data.statuses.silverDelayed,
        percent: this.mapper.toPercent(data.statuses.silverDelayed, total),
        barClass: 'progress-bar bg-info text-dark',
        itemClass: 'status-chart__item status-chart__item--warning-alt',
      },
      {
        label: 'MIGRAÇÃO PENDENTE',
        value: data.statuses.apiDelayed,
        percent: this.mapper.toPercent(data.statuses.apiDelayed, total),
        barClass: 'progress-bar bg-danger',
        itemClass: 'status-chart__item status-chart__item--danger',
      },
      {
        label: 'SEM DADOS',
        value: data.statuses.noData,
        percent: this.mapper.toPercent(data.statuses.noData, total),
        barClass: 'progress-bar bg-secondary',
        itemClass: 'status-chart__item status-chart__item--nodata',
      },
    ];
  });

  // 'Sem dados' is excluded: it is a derived state computed inside mapFarmaciaToDashboard,
  // not a filter users can select — it is displayed in the layer badges but not a filter option.
  readonly delayedLayerOptions: ProblemLayer[] = ['Gold', 'Silver', 'Coletor'];
  readonly storeStatusOptions: StoreStatus[] = ['Com atraso', 'Sem atraso', 'Sem dados'];
  readonly sitContratoOptions = computed(() => {
    const values = this.dashboardData().delayedStores
      .map((s) => s.sitContrato)
      .filter((v): v is string => v !== null && v !== '');
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  });
  readonly comparableAssociation = computed(() => {
    const globalSel = this.selectedGlobalFilters().associationCode;
    if (globalSel.length === 1) return globalSel[0] ?? null;
    const localSel = this.selectedMultiFilters().associationCode;
    return localSel.length === 1 ? (localSel[0] ?? null) : null;
  });

  readonly compareButtonTitle = computed(() => {
    const assoc = this.comparableAssociation();
    return assoc
      ? `Comparar associação ${assoc}`
      : 'Selecione exatamente 1 associação para comparar';
  });
  readonly associationCodeOptions = computed(() => this.uniqueSortedOptions('associationCode'));

  readonly globalAssociationOptions = computed(() => {
    const values = this.apiStores().map((f) => f.associacao).filter(Boolean);
    return [...new Set(values)].sort();
  });
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

  removeGlobalFilterChip(key: GlobalFilterKey, value: string): void {
    this.selectedGlobalFilters.update((current) => ({
      ...current,
      [key]: current[key].filter((v) => v !== value),
    }));
  }

  private readonly storesScopedForFarmaCode = computed(() => {
    const selected = this.selectedMultiFilters().associationCode;
    const stores = this.dashboardData().delayedStores;
    if (selected.length === 0) return stores;
    return stores.filter((s) => selected.includes(s.associationCode));
  });

  private readonly storesScopedForCnpj = computed(() => {
    const { associationCode, farmaCode } = this.selectedMultiFilters();
    const stores = this.dashboardData().delayedStores;
    return stores.filter((s) => {
      if (associationCode.length > 0 && !associationCode.includes(s.associationCode)) return false;
      if (farmaCode.length > 0 && !farmaCode.includes(s.farmaCode)) return false;
      return true;
    });
  });

  readonly farmaCodeOptions = computed(() => {
    const stores = this.storesScopedForFarmaCode();
    return [...new Set(stores.map((s) => s.farmaCode))].sort((a, b) => a.localeCompare(b));
  });

  readonly cnpjOptions = computed(() => {
    const map = new Map<string, string>();
    for (const store of this.storesScopedForCnpj()) {
      if (!map.has(store.cnpj)) map.set(store.cnpj, store.pharmacyName);
    }
    return Array.from(map, ([cnpj, pharmacyName]) => ({ cnpj, pharmacyName })).sort((a, b) =>
      a.cnpj.localeCompare(b.cnpj),
    );
  });
  readonly filteredAssociationCodeOptions = computed(() =>
    this.filterOptionsBySearch('associationCode', this.associationCodeOptions()),
  );
  readonly filteredFarmaCodeOptions = computed(() =>
    this.filterOptionsBySearch('farmaCode', this.farmaCodeOptions()),
  );
  readonly filteredCnpjOptions = computed(() => this.filterCnpjOptionsBySearch(this.cnpjOptions()));

  readonly delayedStoreRows = computed((): DelayedStoreRow[] => {
    const col = this.sortColumn();
    const dir = this.sortDir();
    return [...this.dashboardData().delayedStores]
      .sort((a, b) => {
        let cmp: number;
        if (col === 'delayHours') {
          cmp = a.delayHours - b.delayHours;
        } else {
          cmp = a[col].localeCompare(b[col]);
        }
        return dir === 'asc' ? cmp : -cmp;
      })
      .map((store) => ({
        ...store,
        status: this.mapper.toStoreStatus(store),
        layerItems:
          store.problemLayers.length === 0
            ? [{ label: 'Sem atraso', className: this.mapper.toLayerClass('Sem atraso') }]
            : store.problemLayers.map((layer) => ({
                label: this.mapper.toLayerDisplayLabel(layer),
                className: this.mapper.toLayerClass(layer),
              })),
      }));
  });

  readonly filteredDelayedStoreRows = computed(() => {
    const selectedFilters = this.selectedMultiFilters();
    const pharmacyNameQuery = this.pharmacyNameFilter().trim().toLowerCase();
    const problemLayerFilters = this.selectedProblemLayers();
    const statusFilters = this.selectedStoreStatuses();
    const sitContratoFilters = this.selectedSitContratosLocal();
    const possivelCausaQuery = this.possivelCausaFilter().trim().toLowerCase();
    const minDelayHours = this.minDelayHoursFilter();

    return this.delayedStoreRows().filter((store) => {
      if (
        selectedFilters.associationCode.length > 0 &&
        !selectedFilters.associationCode.includes(store.associationCode)
      ) {
        return false;
      }

      if (
        selectedFilters.farmaCode.length > 0 &&
        !selectedFilters.farmaCode.includes(store.farmaCode)
      ) {
        return false;
      }

      if (selectedFilters.cnpj.length > 0 && !selectedFilters.cnpj.includes(store.cnpj)) {
        return false;
      }

      if (pharmacyNameQuery && !store.pharmacyName.toLowerCase().includes(pharmacyNameQuery)) {
        return false;
      }

      if (
        problemLayerFilters.length > 0 &&
        !store.problemLayers.some((l) => problemLayerFilters.includes(l))
      ) {
        return false;
      }

      if (statusFilters.length > 0 && !statusFilters.includes(store.status)) {
        return false;
      }

      if (
        sitContratoFilters.length > 0 &&
        !sitContratoFilters.includes(store.sitContrato ?? '')
      ) {
        return false;
      }

      if (
        possivelCausaQuery &&
        !(store.possivelCausa ?? '').toLowerCase().includes(possivelCausaQuery)
      ) {
        return false;
      }

      if (minDelayHours > 0 && store.delayHours < minDelayHours) {
        return false;
      }

      return true;
    });
  });

  readonly filteredDelayedStoreCount = computed(() => this.filteredDelayedStoreRows().length);
  readonly renderedRowsCount = signal(this.pageSize);
  readonly visibleDelayedStoreRows = computed(() =>
    this.filteredDelayedStoreRows().slice(0, this.renderedRowsCount()),
  );
  readonly hasMoreRows = computed(
    () => this.visibleDelayedStoreRows().length < this.filteredDelayedStoreRows().length,
  );
  /** Filters that are incompatible with named presets (excludes storeStatuses and minDelayHours). */
  private readonly hasNonPresetFilters = computed(() => {
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
      this.hasNonPresetFilters() ||
      this.selectedStoreStatuses().length > 0 ||
      this.minDelayHoursFilter() > 0,
  );


  constructor() {
    const stored = localStorage.getItem(this.kpisStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        const p = parsed as Record<string, unknown>;
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          typeof p['totalStores'] === 'number' &&
          typeof p['okStores'] === 'number' &&
          typeof p['divergentStores'] === 'number' &&
          typeof p['storesWithoutData'] === 'number'
        ) {
          this.previousKpisStore.set(parsed as DashboardData['kpis']);
        } else {
          localStorage.removeItem(this.kpisStorageKey);
        }
      } catch {
        localStorage.removeItem(this.kpisStorageKey);
      }
    }

    // Only update the KPI baseline when a new browser session starts (new tab / browser restart).
    // F5 reloads keep the same sessionStorage, so arrows stay visible across refreshes.
    const isNewSession = !sessionStorage.getItem('dashboard-session-active');
    sessionStorage.setItem('dashboard-session-active', '1');
    if (isNewSession) {
      effect(() => {
        if (this.isLoading()) return;
        localStorage.setItem(this.kpisStorageKey, JSON.stringify(this.dashboardData().kpis));
      });
    }

    effect(() => {
      this.selectedGlobalFilters();
      this.selectedMultiFilters();
      this.multiFilterSearch();
      this.pharmacyNameFilter();
      this.selectedProblemLayers();
      this.selectedStoreStatuses();
      this.selectedSitContratosLocal();
      this.possivelCausaFilter();
      this.minDelayHoursFilter();

      this.renderedRowsCount.set(this.pageSize);
    });

    effect(() => {
      const availableFarmaSet = new Set(this.farmaCodeOptions());
      const availableCnpjSet = new Set(this.cnpjOptions().map((o) => o.cnpj));

      const current = untracked(() => this.selectedMultiFilters());
      const newFarmaCode = current.farmaCode.filter((c) => availableFarmaSet.has(c));
      const newCnpj = current.cnpj.filter((c) => availableCnpjSet.has(c));

      if (newFarmaCode.length < current.farmaCode.length || newCnpj.length < current.cnpj.length) {
        untracked(() => {
          this.selectedMultiFilters.set({ ...current, farmaCode: newFarmaCode, cnpj: newCnpj });
        });
      }
    });

    merge(timer(0, 30_000), this.forceRefresh$)
      .pipe(
        switchMap(() =>
          this.historicoService.getHistorico().pipe(
            catchError(() => {
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.apiStores.set(data);
        this.isLoading.set(false);
      });
  }

  onMultiCheckboxFilter(key: MultiFilterKey, value: string, event: Event): void {
    const checked = this.readCheckboxChecked(event);

    this.selectedMultiFilters.update((current) => {
      const currentValues = current[key];
      const nextValues = checked
        ? [...new Set([...currentValues, value])]
        : currentValues.filter((item) => item !== value);

      return { ...current, [key]: nextValues };
    });
  }

  onPharmacyNameFilter(event: Event): void {
    this.pharmacyNameFilter.set(this.readInputValue(event));
  }

  onMultiFilterSearch(key: MultiFilterKey, event: Event): void {
    const value = this.readInputValue(event);
    this.multiFilterSearch.update((current) => ({ ...current, [key]: value }));
  }

  onProblemLayerCheckbox(layer: ProblemLayer, event: Event): void {
    const checked = this.readCheckboxChecked(event);
    this.selectedProblemLayers.update((current) =>
      checked ? [...new Set([...current, layer])] : current.filter((l) => l !== layer),
    );
  }

  onStoreStatusCheckbox(status: StoreStatus, event: Event): void {
    const checked = this.readCheckboxChecked(event);
    this.selectedStoreStatuses.update((current) =>
      checked ? [...new Set([...current, status])] : current.filter((s) => s !== status),
    );
  }

  onSitContratoLocalCheckbox(value: string, event: Event): void {
    const checked = this.readCheckboxChecked(event);
    this.selectedSitContratosLocal.update((current) =>
      checked ? [...new Set([...current, value])] : current.filter((s) => s !== value),
    );
  }


  clearGlobalFilters(): void {
    this.selectedGlobalFilters.set({ associationCode: [], sitContrato: [], classificacao: [] });
    this.globalFilterSearch.set('');
    this.openGlobalFilter.set(null);
  }

  onPossivelCausaFilter(event: Event): void {
    this.possivelCausaFilter.set(this.readInputValue(event));
  }

  onTableScroll(): void {
    if (this.hasMoreRows()) {
      this.renderedRowsCount.update((current) =>
        Math.min(current + this.pageSize, this.filteredDelayedStoreRows().length),
      );
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;

    if (!target) {
      return;
    }

    if (!target.closest('.delayed-stores__dropdown')) {
      this.openMultiFilter.set(null);
    }

    if (!target.closest('.global-filter__dropdown')) {
      this.openGlobalFilter.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedStore()) {
      this.closeStoreModal();
      return;
    }
    this.openMultiFilter.set(null);
    this.openGlobalFilter.set(null);
  }

  openStoreModal(store: DelayedStoreRow): void {
    this.selectedStore.set(store);
  }

  closeStoreModal(): void {
    this.selectedStore.set(null);
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
  }

  applyPreset(preset: 'all' | 'critical' | 'nodata' | 'ok'): void {
    this.clearFilters();
    if (preset === 'critical') {
      this.selectedStoreStatuses.set(['Com atraso']);
      this.minDelayHoursFilter.set(48);
    } else if (preset === 'nodata') {
      this.selectedStoreStatuses.set(['Sem dados']);
    } else if (preset === 'ok') {
      this.selectedStoreStatuses.set(['Sem atraso']);
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  onComparar(): void {
    const associacao = this.comparableAssociation();
    if (!associacao || this.isComparing()) return;

    this.isComparing.set(true);
    this.compareError.set(null);

    this.historicoService
      .comparar(associacao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.forceRefresh$.next();
          this.isComparing.set(false);
        },
        error: () => {
          this.compareError.set('Falha ao comparar. Verifique a conexão e tente novamente.');
          this.isComparing.set(false);
        },
      });
  }

  isMultiSelected(key: MultiFilterKey, value: string): boolean {
    return this.selectedMultiFilters()[key].includes(value);
  }

  isMultiFilterOpen(key: string): boolean {
    return this.openMultiFilter() === key;
  }

  private readInputValue(event: Event): string {
    return (event.target as HTMLInputElement | null)?.value ?? '';
  }

  private uniqueSortedOptions(key: MultiFilterKey): string[] {
    return [...new Set(this.dashboardData().delayedStores.map((store) => store[key]))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  private filterOptionsBySearch(key: MultiFilterKey, options: string[]): string[] {
    const query = this.normalizeByFilterKey(key, this.multiFilterSearch()[key].trim());

    if (!query) {
      return options;
    }

    return options.filter((option) => this.normalizeByFilterKey(key, option).includes(query));
  }

  private filterCnpjOptionsBySearch(options: CnpjOption[]): CnpjOption[] {
    const query = this.multiFilterSearch().cnpj.trim();

    if (!query) {
      return options;
    }

    const normalizedDigits = query.replace(/\D/g, '');
    const normalizedText = query.toLowerCase();

    return options.filter((option) => {
      const cnpjMatches =
        normalizedDigits.length > 0 && option.cnpj.replace(/\D/g, '').includes(normalizedDigits);
      const nameMatches = option.pharmacyName.toLowerCase().includes(normalizedText);
      return cnpjMatches || nameMatches;
    });
  }

  private normalizeByFilterKey(key: MultiFilterKey, value: string): string {
    if (key === 'cnpj') {
      return value.replace(/\D/g, '');
    }

    return value.toLowerCase();
  }

  private readCheckboxChecked(event: Event): boolean {
    return (event.target as HTMLInputElement | null)?.checked ?? false;
  }

  // ── GlobalFilterBar output handlers ─────────────────────────
  onGlobalFilterChange(e: { key: GlobalFilterKey; values: string[] }): void {
    this.selectedGlobalFilters.update((f) => ({ ...f, [e.key]: e.values }));
  }

  onGlobalSearchChange(search: string): void {
    this.globalFilterSearch.set(search);
  }

  onGlobalDropdownToggle(e: { key: GlobalFilterKey; open: boolean }): void {
    if (e.open) {
      this.openGlobalFilter.set(e.key);
    } else if (this.openGlobalFilter() === e.key) {
      // Only clear when the key that is currently tracked as open emits a close.
      // Ignores spurious close events triggered by Angular's [open] property binding
      // when a previously-open dropdown is collapsed by change detection.
      this.openGlobalFilter.set(null);
    }
  }

  onGlobalChipRemove(e: { key: GlobalFilterKey; value: string }): void {
    this.selectedGlobalFilters.update((f) => ({
      ...f,
      [e.key]: f[e.key].filter((v) => v !== e.value),
    }));
  }

  // ── DelayedStoresTable output handlers ───────────────────────
  onMultiCheckboxChange(e: { key: MultiFilterKey; values: string[] }): void {
    this.selectedMultiFilters.update((f) => ({ ...f, [e.key]: e.values }));
  }

  onPharmacyNameChange(value: string): void {
    this.pharmacyNameFilter.set(value);
  }

  onMultiSearchChange(e: { key: MultiFilterKey; search: string }): void {
    this.multiFilterSearch.update((m) => ({ ...m, [e.key]: e.search }));
  }

  onProblemLayerChange(layers: ProblemLayer[]): void {
    this.selectedProblemLayers.set(layers);
  }

  onStoreStatusChange(statuses: StoreStatus[]): void {
    this.selectedStoreStatuses.set(statuses);
  }

  onSitContratoLocalChange(values: string[]): void {
    this.selectedSitContratosLocal.set(values);
  }

  onPossivelCausaChange(value: string): void {
    this.possivelCausaFilter.set(value);
  }

  onMinDelayChange(value: number): void {
    this.minDelayHoursFilter.set(value);
  }

  onMultiFilterToggleChange(e: { key: string; open: boolean }): void {
    if (e.open) {
      this.openMultiFilter.set(e.key);
    } else if (this.openMultiFilter() === e.key) {
      // Only clear when the currently-tracked key is the one closing.
      // Prevents spurious close events triggered by Angular's [open] binding
      // from collapsing a dropdown that was just opened.
      this.openMultiFilter.set(null);
    }
  }

  onSortChange(e: { column: string; dir: 'asc' | 'desc' }): void {
    const validColumns = ['associationCode', 'farmaCode', 'cnpj', 'delayHours'] as const;
    if (!(validColumns as readonly string[]).includes(e.column)) return;
    this.sortColumn.set(e.column as (typeof validColumns)[number]);
    this.sortDir.set(e.dir);
  }

  onPresetChange(preset: string | null): void {
    if (preset === null) {
      this.clearFilters();
      return;
    }
    if (preset === 'all' || preset === 'critical' || preset === 'nodata' || preset === 'ok') {
      this.applyPreset(preset);
    }
  }

  onFiltersToggle(): void {
    this.filtersOpen.update((v) => !v);
  }
}

