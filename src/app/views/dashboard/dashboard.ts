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
import { CnpjPipe } from '../../pipes/cnpj.pipe';
import { type FarmaciaHistorico } from '../../models/shared/farmacia.model';
import { HistoricoService } from '../../services/historico.service';

type DashboardData = {
  kpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  previousKpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  statuses: {
    ok: number;
    goldDelayed: number;
    silverDelayed: number;
    apiDelayed: number;
    noData: number;
  };
  gauge: {
    totalStores: number;
    okStores: number;
  };
  delayedStores: {
    id: string;
    associationCode: string;
    farmaCode: string;
    cnpj: string;
    pharmacyName: string;
    delayHours: number;
    problemLayers: ProblemLayer[];
    lastSalesByLayer?: Partial<Record<ProblemLayer, string>>;
    sitContrato: string | null;
    codigoRede: string | null;
    possivelCausa: string | null;
  }[];
};

type StatusBarItem = {
  label: string;
  value: number;
  percent: number;
  barClass: string;
  itemClass: string;
};

type DelayedStoreItem = DashboardData['delayedStores'][number];
type ProblemLayer = 'Gold' | 'Silver' | 'API' | 'Sem dados';
type MultiFilterKey = 'associationCode' | 'farmaCode' | 'cnpj';
type GlobalFilterKey = 'associationCode' | 'sitContrato' | 'storeStatus';
type LayerBadge = ProblemLayer | 'Sem atraso';
type StoreStatus = 'Com atraso' | 'Sem atraso' | 'Sem dados';
type CnpjOption = {
  cnpj: string;
  pharmacyName: string;
};

type DelayedStoreRow = DelayedStoreItem & {
  status: StoreStatus;
  layerTooltip: string;
  layerItems: {
    label: LayerBadge;
    className: string;
  }[];
};

@Component({
  selector: 'app-dashboard',
  imports: [Kpi, GaugeComponent, CnpjPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly pageSize = 60;
  private readonly historicoService = inject(HistoricoService);
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
    storeStatus: [],
  });
  readonly globalFilterSearch = signal('');
  readonly openGlobalFilter = signal<GlobalFilterKey | null>(null);
  readonly possivelCausaFilter = signal('');
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
        !gf.sitContrato.includes(this.sitContratoGroupOf(f.sit_contrato))
      )
        return false;
      if (gf.storeStatus.length > 0 && !gf.storeStatus.includes(this.storeStatusOf(f)))
        return false;
      return true;
    });
  });

  readonly dashboardData = computed(() => this.mapToDashboardData(this.globalFilteredStores()));

  readonly statusBarItems = computed((): StatusBarItem[] => {
    const data = this.dashboardData();
    const total = data.kpis.totalStores;
    return [
      {
        label: 'OK',
        value: data.statuses.ok,
        percent: this.toPercent(data.statuses.ok, total),
        barClass: 'progress-bar bg-success',
        itemClass: 'status-chart__item status-chart__item--ok',
      },
      {
        label: 'CAMADA GOLD ATRASADA',
        value: data.statuses.goldDelayed,
        percent: this.toPercent(data.statuses.goldDelayed, total),
        barClass: 'progress-bar bg-warning text-dark',
        itemClass: 'status-chart__item status-chart__item--warning',
      },
      {
        label: 'CAMADA SILVER ATRASADA',
        value: data.statuses.silverDelayed,
        percent: this.toPercent(data.statuses.silverDelayed, total),
        barClass: 'progress-bar bg-info text-dark',
        itemClass: 'status-chart__item status-chart__item--warning-alt',
      },
      {
        label: 'API ATRASADA',
        value: data.statuses.apiDelayed,
        percent: this.toPercent(data.statuses.apiDelayed, total),
        barClass: 'progress-bar bg-danger',
        itemClass: 'status-chart__item status-chart__item--danger',
      },
      {
        label: 'SEM DADOS',
        value: data.statuses.noData,
        percent: this.toPercent(data.statuses.noData, total),
        barClass: 'progress-bar bg-secondary',
        itemClass: 'status-chart__item status-chart__item--nodata',
      },
    ];
  });

  readonly delayedLayerOptions: ProblemLayer[] = ['Gold', 'Silver', 'API'];
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
  readonly associationCodeOptions = computed(() => this.uniqueSortedOptions('associationCode'));

  readonly globalAssociationOptions = computed(() => {
    const values = this.apiStores().map((f) => f.associacao).filter(Boolean);
    return [...new Set(values)].sort();
  });
  readonly globalStoreStatusOptions = (): StoreStatus[] => ['Com atraso', 'Sem atraso', 'Sem dados'];
  readonly globalSitContratoOptions = (): string[] => ['Ativo', 'Inativo'];
  readonly filteredGlobalAssociationOptions = computed(() => {
    const search = this.globalFilterSearch().toLowerCase();
    return this.globalAssociationOptions().filter((v) => v.toLowerCase().includes(search));
  });
  readonly hasActiveGlobalFilters = computed(() =>
    Object.values(this.selectedGlobalFilters()).some((v) => v.length > 0),
  );

  readonly activeGlobalFilterChips = computed(() => {
    const gf = this.selectedGlobalFilters();
    const labelMap: Record<GlobalFilterKey, string> = {
      associationCode: 'Assoc.',
      sitContrato: 'Sit.',
      storeStatus: 'Status',
    };
    return (Object.keys(gf) as GlobalFilterKey[]).flatMap((key) =>
      gf[key].map((value) => ({ key, value, label: labelMap[key] })),
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
        layerTooltip: this.toLayerTooltip(store),
        status: this.toStoreStatus(store),
        layerItems:
          store.problemLayers.length === 0
            ? [{ label: 'Sem atraso' as LayerBadge, className: this.toLayerClass('Sem atraso') }]
            : store.problemLayers.map((layer) => ({
                label: layer,
                className: this.toLayerClass(layer),
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
  readonly hasActiveFilters = computed(() => {
    const selected = this.selectedMultiFilters();

    return (
      selected.associationCode.length > 0 ||
      selected.farmaCode.length > 0 ||
      selected.cnpj.length > 0 ||
      this.pharmacyNameFilter().trim().length > 0 ||
      this.selectedProblemLayers().length > 0 ||
      this.selectedStoreStatuses().length > 0 ||
      this.selectedSitContratosLocal().length > 0 ||
      this.possivelCausaFilter().trim().length > 0
    );
  });

  readonly urgencyClass = (hours: number): string => {
    if (hours >= 48) return 'critical';
    if (hours >= 24) return 'high';
    return 'moderate';
  };

  private readonly storeStatusOf = (f: FarmaciaHistorico): StoreStatus => {
    const semDados = f.camadas_sem_dados?.length ?? 0;
    if (semDados >= 2) return 'Sem dados';
    const atrasadas = (f.camadas_atrasadas?.length ?? 0) + (semDados === 1 ? 1 : 0);
    if (atrasadas > 0) return 'Com atraso';
    return 'Sem atraso';
  };

  private readonly sitContratoClassMap: Record<string, string> = {
    ATIVO: 'sit-contrato-badge sit-contrato-badge--ativo',
    'ATIVO-RETIDO': 'sit-contrato-badge sit-contrato-badge--ativo-pendente',
    'ATIVO-ACORDO FINANCEIRO': 'sit-contrato-badge sit-contrato-badge--ativo-pendente',
    ISENTO: 'sit-contrato-badge sit-contrato-badge--em-processo',
    IMPLANTACAO: 'sit-contrato-badge sit-contrato-badge--em-processo',
    PARCEIROS: 'sit-contrato-badge sit-contrato-badge--em-processo',
    INATIVO: 'sit-contrato-badge sit-contrato-badge--inativo',
    INADIMPLENTE: 'sit-contrato-badge sit-contrato-badge--inadimplente',
    DESISTENTE: 'sit-contrato-badge sit-contrato-badge--inadimplente',
    'BAIXA TEMPORARIA': 'sit-contrato-badge sit-contrato-badge--suspenso',
    CONGELADO: 'sit-contrato-badge sit-contrato-badge--suspenso',
    'SUBSTITUIÇÃO': 'sit-contrato-badge sit-contrato-badge--inativo',
    'DES MANIPULAÇÃO': 'sit-contrato-badge sit-contrato-badge--inativo',
  };

  readonly sitContratoClass = (sit: string | null): string => {
    if (!sit) return 'sit-contrato-badge sit-contrato-badge--inativo';
    return (
      this.sitContratoClassMap[sit.toUpperCase().trim()] ??
      'sit-contrato-badge sit-contrato-badge--inativo'
    );
  };

  private readonly sitContratoGroupOf = (sit: string | null): 'Ativo' | 'Inativo' => {
    if (!sit) return 'Inativo';
    const upper = sit.toUpperCase().trim();
    if (
      upper.startsWith('ATIVO') ||
      upper === 'ISENTO' ||
      upper === 'IMPLANTACAO' ||
      upper === 'PARCEIROS'
    ) {
      return 'Ativo';
    }
    return 'Inativo';
  };

  readonly formatDelay= (hours: number): string => {
    if (hours > 48) return `${Math.round(hours / 24)} dias`;
    return `${hours} horas`;
  };

  constructor() {
    const stored = localStorage.getItem(this.kpisStorageKey);
    if (stored) {
      try {
        this.previousKpisStore.set(JSON.parse(stored) as DashboardData['kpis']);
      } catch {
        /* ignore */
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
      this.globalFilterSearch();
      this.selectedMultiFilters();
      this.multiFilterSearch();
      this.pharmacyNameFilter();
      this.selectedProblemLayers();
      this.selectedStoreStatuses();
      this.selectedSitContratosLocal();
      this.possivelCausaFilter();

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

  private toPercent(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
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

  tableMultiSummary(key: 'problemLayer' | 'storeStatus' | 'sitContratoLocal'): string {
    let selected: string[];
    if (key === 'problemLayer') selected = this.selectedProblemLayers();
    else if (key === 'storeStatus') selected = this.selectedStoreStatuses();
    else selected = this.selectedSitContratosLocal();

    if (selected.length === 0) return 'Todos';
    if (selected.length === 1) return selected[0] ?? 'Todos';
    return `${selected.length} selecionados`;
  }

  isGlobalSelected(key: GlobalFilterKey, value: string): boolean {
    return this.selectedGlobalFilters()[key].includes(value);
  }

  onGlobalRadioFilter(key: GlobalFilterKey, value: string): void {
    this.selectedGlobalFilters.update((current) => ({ ...current, [key]: [value] }));
  }

  onGlobalCheckboxFilter(key: GlobalFilterKey, value: string, event: Event): void {
    const checked = this.readCheckboxChecked(event);
    this.selectedGlobalFilters.update((current) => {
      const currentValues = current[key];
      const nextValues = checked
        ? [...new Set([...currentValues, value])]
        : currentValues.filter((item) => item !== value);
      return { ...current, [key]: nextValues };
    });
  }

  onGlobalFilterSearch(event: Event): void {
    this.globalFilterSearch.set(this.readInputValue(event));
  }

  isGlobalFilterOpen(key: GlobalFilterKey): boolean {
    return this.openGlobalFilter() === key;
  }

  onGlobalFilterToggle(key: GlobalFilterKey, event: Event): void {
    const details = this.readDetailsElement(event);
    if (!details) return;
    this.openGlobalFilter.set(details.open ? key : null);
  }

  globalFilterSummary(key: GlobalFilterKey): string {
    const selected = this.selectedGlobalFilters()[key];
    if (selected.length === 0) return 'Todos';
    if (selected.length === 1) return selected[0] ?? 'Todos';
    return `${selected.length} selecionados`;
  }

  clearGlobalFilters(): void {
    this.selectedGlobalFilters.set({ associationCode: [], sitContrato: [], storeStatus: [] });
    this.globalFilterSearch.set('');
    this.openGlobalFilter.set(null);
  }

  onPossivelCausaFilter(event: Event): void {
    this.possivelCausaFilter.set(this.readInputValue(event));
  }

  onMultiFilterToggle(key: string, event: Event): void {
    const details = this.readDetailsElement(event);

    if (!details) {
      return;
    }

    this.openMultiFilter.set(details.open ? key : null);
  }

  onTableScroll(event: Event): void {
    const host = event.target as HTMLElement | null;

    if (!host) {
      return;
    }

    const nearBottom = host.scrollTop + host.clientHeight >= host.scrollHeight - 120;

    if (nearBottom && this.hasMoreRows()) {
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

  layerLastSale(store: DelayedStoreRow, layer: string): string {
    return (store.lastSalesByLayer as Record<string, string> | undefined)?.[layer] ?? 'Sem dados';
  }

  positionTooltip(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const scrollContainer = btn.closest('.delayed-stores__table-wrap');
    if (!scrollContainer) return;

    const btnRect = btn.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const spaceBelow = containerRect.bottom - btnRect.bottom;

    if (spaceBelow < 140) {
      btn.classList.add('delayed-stores__layer-info-btn--above');
    } else {
      btn.classList.remove('delayed-stores__layer-info-btn--above');
    }
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
    this.openMultiFilter.set(null);
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

  multiFilterSummary(key: MultiFilterKey): string {
    const selected = this.selectedMultiFilters()[key];

    if (selected.length === 0) {
      return 'Todos';
    }

    if (selected.length === 1) {
      return selected[0] ?? 'Todos';
    }

    return `${selected.length} selecionados`;
  }

  private toLayerClass(layer: LayerBadge): string {
    switch (layer) {
      case 'Gold':
        return 'delayed-stores__layer delayed-stores__layer--gold';
      case 'Silver':
        return 'delayed-stores__layer delayed-stores__layer--silver';
      case 'API':
        return 'delayed-stores__layer delayed-stores__layer--api';
      case 'Sem atraso':
        return 'delayed-stores__layer delayed-stores__layer--ok';
      default:
        return 'delayed-stores__layer delayed-stores__layer--nodata';
    }
  }

  private toStoreStatus(store: DelayedStoreItem): StoreStatus {
    if (store.problemLayers.length === 0) {
      return 'Sem atraso';
    }

    if (store.problemLayers.includes('Sem dados')) {
      return 'Sem dados';
    }

    return 'Com atraso';
  }

  private toLayerTooltip(store: DelayedStoreItem): string {
    return (['Gold', 'Silver', 'API'] as const)
      .map((layer) => {
        const date = store.lastSalesByLayer?.[layer] ?? 'Sem dados';
        return `Último dado de venda (${layer}): ${date}`;
      })
      .join('\n');
  }

  private readInputValue(event: Event): string {
    return (event.target as HTMLInputElement | null)?.value ?? '';
  }

  private readSelectValue(event: Event): string {
    return (event.target as HTMLSelectElement | null)?.value ?? 'all';
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

  private readDetailsElement(event: Event): HTMLDetailsElement | null {
    return event.target as HTMLDetailsElement | null;
  }

  private mapToDashboardData(farmacias: FarmaciaHistorico[]): DashboardData {
    const stores = farmacias.map((f) => this.mapFarmaciaToDashboard(f));
    const totalStores = stores.length;
    const okStores = stores.filter((s) => s.problemLayers.length === 0).length;
    const storesWithoutData = stores.filter((s) => s.problemLayers.includes('Sem dados')).length;
    const divergentStores = stores.filter(
      (s) => s.problemLayers.length > 0 && !s.problemLayers.every((l) => l === 'Sem dados'),
    ).length;

    const kpis = { totalStores, okStores, divergentStores, storesWithoutData };
    const previousKpis = this.previousKpisStore() ?? kpis;

    return {
      kpis,
      previousKpis,
      statuses: {
        ok: okStores,
        goldDelayed: stores.filter((s) => s.problemLayers.includes('Gold')).length,
        silverDelayed: stores.filter((s) => s.problemLayers.includes('Silver')).length,
        apiDelayed: stores.filter((s) => s.problemLayers.includes('API')).length,
        noData: storesWithoutData,
      },
      gauge: { totalStores, okStores },
      delayedStores: stores,
    };
  }

  private mapFarmaciaToDashboard(f: FarmaciaHistorico): DashboardData['delayedStores'][number] {
    const problemLayers: ProblemLayer[] = [];

    const semDados = f.camadas_sem_dados ?? [];
    const atrasadas = f.camadas_atrasadas ?? [];

    if (semDados.length >= 2) {
      // Multiple layers with no data → "Sem dados"
      problemLayers.push('Sem dados');
    } else {
      // Exactly 1 layer with no data → treat as delayed in that layer
      if (semDados.length === 1) {
        const camada = semDados[0];
        if (camada === 'GoldVendas') problemLayers.push('Gold');
        else if (camada === 'SilverSTGN_Dedup') problemLayers.push('Silver');
      }
      for (const camada of atrasadas) {
        if (camada === 'GoldVendas' && !problemLayers.includes('Gold')) problemLayers.push('Gold');
        else if (camada === 'SilverSTGN_Dedup' && !problemLayers.includes('Silver'))
          problemLayers.push('Silver');
        else if (camada === 'API' && !problemLayers.includes('API')) problemLayers.push('API');
      }
    }

    const goldDatetime = this.formatDatetime(f.ultima_hora_venda_GoldVendas);
    const silverDatetime = this.formatDatetime(
      f.ultima_venda_SilverSTGN_Dedup && f.ultima_hora_venda_SilverSTGN_Dedup
        ? `${f.ultima_venda_SilverSTGN_Dedup} ${f.ultima_hora_venda_SilverSTGN_Dedup}`
        : null,
    );
    const apiDatetime = this.formatDatetime(f.coletor_novo);

    const lastSalesByLayer: Partial<Record<ProblemLayer, string>> = {};
    if (goldDatetime) lastSalesByLayer['Gold'] = goldDatetime;
    if (silverDatetime) lastSalesByLayer['Silver'] = silverDatetime;
    if (apiDatetime) lastSalesByLayer['API'] = apiDatetime;
    if (problemLayers.includes('Sem dados'))
      lastSalesByLayer['Sem dados'] = 'Sem recebimento de vendas';

    return {
      id: `${f.associacao}-${f.cod_farmacia}`,
      associationCode: f.associacao,
      farmaCode: f.cod_farmacia,
      cnpj: f.cnpj ?? '',
      pharmacyName: f.nome_farmacia ?? '-',
      delayHours: this.computeDelayHours(f, problemLayers),
      problemLayers,
      lastSalesByLayer,
      sitContrato: f.sit_contrato ?? null,
      codigoRede: f.codigo_rede ?? null,
      possivelCausa: f.possivel_causa ?? null,
    };
  }

  private parseRawDatetime(raw: string | null): Date | null {
    if (!raw) return null;
    // remove fractional seconds, normalize T separator to space
    const cleaned = raw.replace(/\.\d+/, '').replace('T', ' ').trim();
    const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (!match) return null;
    const [, year, month, day, time] = match;
    return new Date(`${year}-${month}-${day}T${time}`);
  }

  private computeDelayHours(f: FarmaciaHistorico, problemLayers: ProblemLayer[]): number {
    const relevantLayers = problemLayers.filter((l) => l !== 'Sem dados');
    if (relevantLayers.length === 0) return 0;

    const now = Date.now();
    let maxMs = 0;

    for (const layer of relevantLayers) {
      let raw: string | null = null;
      if (layer === 'Gold') {
        raw = f.ultima_hora_venda_GoldVendas;
      } else if (layer === 'Silver') {
        raw =
          f.ultima_venda_SilverSTGN_Dedup && f.ultima_hora_venda_SilverSTGN_Dedup
            ? `${f.ultima_venda_SilverSTGN_Dedup} ${f.ultima_hora_venda_SilverSTGN_Dedup}`
            : null;
      } else if (layer === 'API') {
        raw =
          f.coletor_bi_ultima_data && f.coletor_bi_ultima_hora
            ? `${f.coletor_bi_ultima_data} ${f.coletor_bi_ultima_hora}`
            : null;
      }
      const date = this.parseRawDatetime(raw);
      if (date) {
        const diff = now - date.getTime();
        if (diff > maxMs) maxMs = diff;
      }
    }

    return Math.round(maxMs / (1000 * 60 * 60));
  }

  private formatDatetime(datetime: string | null): string | null {
    if (!datetime) return null;
    const cleaned = datetime.replace(/\.\d+/, '').trim();
    const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
    if (match) {
      const [, year, month, day, time] = match;
      return `${day}/${month}/${year} ${time}`;
    }
    return cleaned;
  }
}
