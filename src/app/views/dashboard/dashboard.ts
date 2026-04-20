import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';

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
  private readonly kpisStorageKey = 'dashboard-kpis';

  readonly apiStores = signal<FarmaciaHistorico[]>([]);
  readonly isLoading = signal(true);
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
  readonly openMultiFilter = signal<MultiFilterKey | null>(null);
  readonly pharmacyNameFilter = signal('');
  readonly problemLayerFilter = signal<'all' | ProblemLayer>('all');
  readonly storeStatusFilter = signal<'all' | StoreStatus>('all');
  readonly sortColumn = signal<'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'>('associationCode');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  sortBy(col: 'associationCode' | 'farmaCode' | 'cnpj' | 'delayHours'): void {
    if (this.sortColumn() === col) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  readonly dashboardData = computed(() => this.mapToDashboardData(this.apiStores()));

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

  readonly delayedLayerOptions: ProblemLayer[] = ['Gold', 'Silver', 'API', 'Sem dados'];
  readonly storeStatusOptions: StoreStatus[] = ['Com atraso', 'Sem atraso', 'Sem dados'];
  readonly associationCodeOptions = computed(() => this.uniqueSortedOptions('associationCode'));
  readonly farmaCodeOptions = computed(() => this.uniqueSortedOptions('farmaCode'));
  readonly cnpjOptions = computed(() => this.uniqueCnpjOptions());
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
      }))
  });

  readonly filteredDelayedStoreRows = computed(() => {
    const selectedFilters = this.selectedMultiFilters();
    const pharmacyNameQuery = this.pharmacyNameFilter().trim().toLowerCase();
    const layerQuery = this.problemLayerFilter();
    const statusQuery = this.storeStatusFilter();

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

      if (layerQuery !== 'all' && !store.problemLayers.includes(layerQuery)) {
        return false;
      }

      if (statusQuery !== 'all' && store.status !== statusQuery) {
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
      this.problemLayerFilter() !== 'all' ||
      this.storeStatusFilter() !== 'all'
    );
  });

  readonly urgencyClass = (hours: number): string => {
    if (hours >= 48) return 'critical';
    if (hours >= 24) return 'high';
    return 'moderate';
  };

  readonly formatDelay = (hours: number): string => {
    if (hours > 48) return `${Math.round(hours / 24)} dias`;
    return `${hours} horas`;
  };

  constructor() {
    const stored = localStorage.getItem(this.kpisStorageKey);
    if (stored) {
      try {
        this.previousKpisStore.set(JSON.parse(stored) as DashboardData['kpis']);
      } catch { /* ignore */ }
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
      this.selectedMultiFilters();
      this.multiFilterSearch();
      this.pharmacyNameFilter();
      this.problemLayerFilter();
      this.storeStatusFilter();

      this.renderedRowsCount.set(this.pageSize);
    });

    timer(0, 30_000)
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

  onProblemLayerFilter(event: Event): void {
    const value = this.readSelectValue(event);

    if (value === 'all' || this.delayedLayerOptions.includes(value as ProblemLayer)) {
      this.problemLayerFilter.set(value as 'all' | ProblemLayer);
    }
  }

  onStoreStatusFilter(event: Event): void {
    const value = this.readSelectValue(event);

    if (value === 'all' || this.storeStatusOptions.includes(value as StoreStatus)) {
      this.storeStatusFilter.set(value as 'all' | StoreStatus);
    }
  }

  onMultiFilterToggle(key: MultiFilterKey, event: Event): void {
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

    if (target.closest('.delayed-stores__dropdown')) {
      return;
    }

    this.openMultiFilter.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.openMultiFilter.set(null);
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
    this.problemLayerFilter.set('all');
    this.storeStatusFilter.set('all');
    this.openMultiFilter.set(null);
  }

  isMultiSelected(key: MultiFilterKey, value: string): boolean {
    return this.selectedMultiFilters()[key].includes(value);
  }

  isMultiFilterOpen(key: MultiFilterKey): boolean {
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

  private uniqueCnpjOptions(): CnpjOption[] {
    const map = new Map<string, string>();

    for (const store of this.dashboardData().delayedStores) {
      if (!map.has(store.cnpj)) {
        map.set(store.cnpj, store.pharmacyName);
      }
    }

    return Array.from(map, ([cnpj, pharmacyName]) => ({ cnpj, pharmacyName })).sort((a, b) =>
      a.cnpj.localeCompare(b.cnpj),
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

    if (!f.ultima_venda_GoldVendas && !f.ultima_venda_SilverSTGN_Dedup) {
      problemLayers.push('Sem dados');
    } else if (f.camadas_atrasadas) {
      for (const camada of f.camadas_atrasadas) {
        if (camada === 'GoldVendas') problemLayers.push('Gold');
        else if (camada === 'SilverSTGN_Dedup') problemLayers.push('Silver');
        else if (camada === 'API') problemLayers.push('API');
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
        raw = f.coletor_novo;
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
