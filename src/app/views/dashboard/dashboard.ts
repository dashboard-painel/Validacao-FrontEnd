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
import { type Observable } from 'rxjs';

import { Gauge as GaugeComponent } from '../../components/gauge/gauge';
import { Kpi } from '../../components/kpi/kpi';
import { DelayedStoresTable } from '../../components/delayed-stores-table/delayed-stores-table';
import { GlobalFilterBar } from '../../components/global-filter-bar/global-filter-bar';
import { StatusBar } from '../../components/status-bar/status-bar';
import { StoreDetailModal } from '../../components/store-detail-modal/store-detail-modal';
import { type FarmaciaHistorico } from '../../models/shared/farmacia.model';
import { HistoricoService } from '../../services/historico.service';
import { UltimaAtualizacaoService } from '../../services/ultima-atualizacao.service';
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
import { DashboardFilterState } from './dashboard-filter.state';

@Component({
  selector: 'app-dashboard',
  imports: [Kpi, GaugeComponent, GlobalFilterBar, StatusBar, DelayedStoresTable, StoreDetailModal],
  providers: [DashboardFilterState],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly historicoService = inject(HistoricoService);
  private readonly atualizacaoService = inject(UltimaAtualizacaoService);
  private readonly mapper = inject(DashboardMapperService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kpisStorageKey = 'dashboard-kpis';
  private readonly historicoRequestInFlight = signal(false);
  private readonly hasLoadedHistoricoOnce = signal(false);
  private readonly appliedHistoricoTimestamp = signal<string | null>(null);

  readonly fs = inject(DashboardFilterState);

  readonly apiStores = signal<FarmaciaHistorico[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly isComparing = signal(false);
  readonly compareError = signal<string | null>(null);
  private readonly previousKpisStore = signal<DashboardData['kpis'] | null>(null);

  readonly selectedStore = signal<DelayedStoreRow | null>(null);

  // ── Data pipeline ─────────────────────────────────────────
  readonly globalFilteredStores = computed(() => {
    const stores = this.apiStores();
    const gf = this.fs.selectedGlobalFilters();
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
    const globalSel = this.fs.selectedGlobalFilters().associationCode;
    if (globalSel.length === 1) return globalSel[0] ?? null;
    const localSel = this.fs.selectedMultiFilters().associationCode;
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

  private readonly storesScopedForFarmaCode = computed(() => {
    const selected = this.fs.selectedMultiFilters().associationCode;
    const stores = this.dashboardData().delayedStores;
    if (selected.length === 0) return stores;
    return stores.filter((s) => selected.includes(s.associationCode));
  });

  private readonly storesScopedForCnpj = computed(() => {
    const { associationCode, farmaCode } = this.fs.selectedMultiFilters();
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
    const col = this.fs.sortColumn();
    const dir = this.fs.sortDir();
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
    const selectedFilters = this.fs.selectedMultiFilters();
    const pharmacyNameQuery = this.fs.pharmacyNameFilter().trim().toLowerCase();
    const problemLayerFilters = this.fs.selectedProblemLayers();
    const statusFilters = this.fs.selectedStoreStatuses();
    const sitContratoFilters = this.fs.selectedSitContratosLocal();
    const possivelCausaQuery = this.fs.possivelCausaFilter().trim().toLowerCase();
    const minDelayHours = this.fs.minDelayHoursFilter();

    return this.delayedStoreRows().filter((store) => {
      if (
        selectedFilters.associationCode.length > 0 &&
        !selectedFilters.associationCode.includes(store.associationCode)
      )
        return false;
      if (
        selectedFilters.farmaCode.length > 0 &&
        !selectedFilters.farmaCode.includes(store.farmaCode)
      )
        return false;
      if (selectedFilters.cnpj.length > 0 && !selectedFilters.cnpj.includes(store.cnpj))
        return false;
      if (pharmacyNameQuery && !store.pharmacyName.toLowerCase().includes(pharmacyNameQuery))
        return false;
      if (
        problemLayerFilters.length > 0 &&
        !store.problemLayers.some((l) => problemLayerFilters.includes(l))
      )
        return false;
      if (statusFilters.length > 0 && !statusFilters.includes(store.status))
        return false;
      if (
        sitContratoFilters.length > 0 &&
        !sitContratoFilters.includes(store.sitContrato ?? '')
      )
        return false;
      if (
        possivelCausaQuery &&
        !(store.possivelCausa ?? '').toLowerCase().includes(possivelCausaQuery)
      )
        return false;
      if (minDelayHours > 0 && store.delayHours < minDelayHours)
        return false;
      return true;
    });
  });

  readonly filteredDelayedStoreCount = computed(() => this.filteredDelayedStoreRows().length);
  readonly visibleDelayedStoreRows = computed(() =>
    this.filteredDelayedStoreRows().slice(0, this.fs.renderedRowsCount()),
  );
  readonly hasMoreRows = computed(
    () => this.visibleDelayedStoreRows().length < this.filteredDelayedStoreRows().length,
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
      this.atualizacaoService.ultimaAtualizacaoPollSequence();

      const latestTimestamp = this.atualizacaoService.ultimaAtualizacao();
      const appliedTimestamp = this.appliedHistoricoTimestamp();
      const hasLoadedHistorico = this.hasLoadedHistoricoOnce();
      const requestInFlight = this.historicoRequestInFlight();
      const hasVisibleData = this.apiStores().length > 0;

      if (!hasLoadedHistorico || requestInFlight) return;

      if (!latestTimestamp) {
        if (!hasVisibleData) {
          untracked(() => this.loadHistorico());
        }
        return;
      }

      if (latestTimestamp === appliedTimestamp) return;

      untracked(() => this.loadHistorico(latestTimestamp));
    });

    // Cascade: prune farmaCode/cnpj selections when upstream association changes.
    effect(() => {
      const availableFarmaSet = new Set(this.farmaCodeOptions());
      const availableCnpjSet = new Set(this.cnpjOptions().map((o) => o.cnpj));

      const current = untracked(() => this.fs.selectedMultiFilters());
      const newFarmaCode = current.farmaCode.filter((c) => availableFarmaSet.has(c));
      const newCnpj = current.cnpj.filter((c) => availableCnpjSet.has(c));

      if (newFarmaCode.length < current.farmaCode.length || newCnpj.length < current.cnpj.length) {
        untracked(() => {
          this.fs.selectedMultiFilters.set({ ...current, farmaCode: newFarmaCode, cnpj: newCnpj });
        });
      }
    });

    this.loadHistorico();
  }

  // ── Actions ───────────────────────────────────────────────
  onTableScroll(): void {
    if (this.hasMoreRows()) {
      this.fs.renderedRowsCount.update((current) =>
        Math.min(current + 60, this.filteredDelayedStoreRows().length),
      );
    }
  }

  // Close open dropdowns when clicking outside them.
  // Relies on CSS class names from child components (DelayedStoresTable and GlobalFilterBar).
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target) return;
    if (!target.closest('.delayed-stores__dropdown')) this.fs.openMultiFilter.set(null);
    if (!target.closest('.global-filter__dropdown')) this.fs.openGlobalFilter.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedStore()) {
      this.closeStoreModal();
      return;
    }
    this.fs.openMultiFilter.set(null);
    this.fs.openGlobalFilter.set(null);
  }

  openStoreModal(store: DelayedStoreRow): void {
    this.selectedStore.set(store);
  }

  closeStoreModal(): void {
    this.selectedStore.set(null);
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
          this.loadHistorico();
          this.isComparing.set(false);
        },
        error: () => {
          this.compareError.set('Falha ao comparar. Verifique a conexão e tente novamente.');
          this.isComparing.set(false);
        },
      });
  }

  // ── GlobalFilterBar output handlers ─────────────────────────
  onGlobalFilterChange(e: { key: GlobalFilterKey; values: string[] }): void {
    this.fs.updateGlobalFilter(e.key, e.values);
  }

  onGlobalSearchChange(search: string): void {
    this.fs.globalFilterSearch.set(search);
  }

  onGlobalDropdownToggle(e: { key: GlobalFilterKey; open: boolean }): void {
    if (e.open) {
      this.fs.openGlobalFilter.set(e.key);
    } else if (this.fs.openGlobalFilter() === e.key) {
      this.fs.openGlobalFilter.set(null);
    }
  }

  onGlobalChipRemove(e: { key: GlobalFilterKey; value: string }): void {
    this.fs.removeGlobalFilterChip(e.key, e.value);
  }

  // ── DelayedStoresTable output handlers ───────────────────────
  onMultiCheckboxChange(e: { key: MultiFilterKey; values: string[] }): void {
    this.fs.selectedMultiFilters.update((f) => ({ ...f, [e.key]: e.values }));
    this.fs.resetPagination();
  }

  onPharmacyNameChange(value: string): void {
    this.fs.setPharmacyNameFilter(value);
  }

  onMultiSearchChange(e: { key: MultiFilterKey; search: string }): void {
    this.fs.setMultiFilterSearch(e.key, e.search);
  }

  onProblemLayerChange(layers: ProblemLayer[]): void {
    this.fs.selectedProblemLayers.set(layers);
    this.fs.resetPagination();
  }

  onStoreStatusChange(statuses: StoreStatus[]): void {
    this.fs.selectedStoreStatuses.set(statuses);
    this.fs.resetPagination();
  }

  onSitContratoLocalChange(values: string[]): void {
    this.fs.selectedSitContratosLocal.set(values);
    this.fs.resetPagination();
  }

  onPossivelCausaChange(value: string): void {
    this.fs.setPossivelCausaFilter(value);
  }

  onMinDelayChange(value: number): void {
    this.fs.setMinDelayHoursFilter(value);
  }

  onMultiFilterToggleChange(e: { key: string; open: boolean }): void {
    if (e.open) {
      this.fs.openMultiFilter.set(e.key);
    } else if (this.fs.openMultiFilter() === e.key) {
      this.fs.openMultiFilter.set(null);
    }
  }

  onSortChange(e: { column: string; dir: 'asc' | 'desc' }): void {
    const validColumns = ['associationCode', 'farmaCode', 'cnpj', 'delayHours'] as const;
    if (!(validColumns as readonly string[]).includes(e.column)) return;
    this.fs.sortColumn.set(e.column as (typeof validColumns)[number]);
    this.fs.sortDir.set(e.dir);
  }

  onPresetChange(preset: string | null): void {
    if (preset === null) {
      this.fs.clearFilters();
      return;
    }
    if (preset === 'all' || preset === 'critical' || preset === 'nodata' || preset === 'ok') {
      this.fs.applyPreset(preset);
    }
  }

  onFiltersToggle(): void {
    this.fs.toggleFilters();
  }

  // ── Private helpers ──────────────────────────────────────
  private loadHistorico(referenceTimestamp?: string | null): void {
    if (this.historicoRequestInFlight()) return;

    const isInitialLoad = !this.hasLoadedHistoricoOnce();
    const appliedReferenceTimestamp = referenceTimestamp ?? this.atualizacaoService.ultimaAtualizacao() ?? null;
    this.historicoRequestInFlight.set(true);
    if (isInitialLoad) {
      this.isLoading.set(true);
    }

    this.subscribeToHistorico(this.historicoService.getHistorico(), appliedReferenceTimestamp);
  }

  private subscribeToHistorico(
    request$: Observable<FarmaciaHistorico[]>,
    referenceTimestamp: string | null,
  ): void {
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.apiStores.set(data);
        this.isLoading.set(false);
        this.loadError.set(null);
        this.historicoRequestInFlight.set(false);
        this.hasLoadedHistoricoOnce.set(true);
        this.appliedHistoricoTimestamp.set(
          this.extractLatestHistoricoTimestamp(data) ??
            referenceTimestamp ??
            this.atualizacaoService.ultimaAtualizacao() ??
            null,
        );
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Falha ao carregar dados. Tentando novamente...');
        this.historicoRequestInFlight.set(false);
        this.hasLoadedHistoricoOnce.set(true);
      },
    });
  }

  private uniqueSortedOptions(key: MultiFilterKey): string[] {
    return [...new Set(this.dashboardData().delayedStores.map((store) => store[key]))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  private filterOptionsBySearch(key: MultiFilterKey, options: string[]): string[] {
    const query = this.normalizeByFilterKey(key, this.fs.multiFilterSearch()[key].trim());
    if (!query) return options;
    return options.filter((option) => this.normalizeByFilterKey(key, option).includes(query));
  }

  private filterCnpjOptionsBySearch(options: CnpjOption[]): CnpjOption[] {
    const query = this.fs.multiFilterSearch().cnpj.trim();
    if (!query) return options;

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
    if (key === 'cnpj') return value.replace(/\D/g, '');
    return value.toLowerCase();
  }

  private extractLatestHistoricoTimestamp(data: FarmaciaHistorico[]): string | null {
    let latestTimestamp: string | null = null;
    let latestMillis = Number.NEGATIVE_INFINITY;

    for (const store of data) {
      if (!store.atualizado_em) continue;
      const timestamp = new Date(store.atualizado_em).getTime();
      if (Number.isNaN(timestamp) || timestamp <= latestMillis) continue;
      latestMillis = timestamp;
      latestTimestamp = store.atualizado_em;
    }

    return latestTimestamp;
  }
}

