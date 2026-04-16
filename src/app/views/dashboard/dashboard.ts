import { ChangeDetectionStrategy, Component, HostListener, computed, effect, signal } from '@angular/core';

import { Gauge as GaugeComponent } from '../../components/gauge/gauge';
import { Kpi } from '../../components/kpi/kpi';
import { DASHBOARD_MOCK_DATA, type DashboardMockData } from '../../mocks/dashboard.mock';

type StatusBarItem = {
  label: string;
  value: number;
  percent: number;
  barClass: string;
  itemClass: string;
};

type DelayedStoreItem = DashboardMockData['delayedStores'][number];
type ProblemLayer = DelayedStoreItem['problemLayers'][number];
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
  imports: [Kpi, GaugeComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly pageSize = 60;

  readonly dashboardMockData = DASHBOARD_MOCK_DATA;
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

  readonly statusBarItems: StatusBarItem[] = [
    {
      label: 'OK',
      value: this.dashboardMockData.statuses.ok,
      percent: this.toPercent(this.dashboardMockData.statuses.ok),
      barClass: 'progress-bar bg-success',
      itemClass: 'status-chart__item status-chart__item--ok',
    },
    {
      label: 'CAMADA GOLD ATRASADA',
      value: this.dashboardMockData.statuses.goldDelayed,
      percent: this.toPercent(this.dashboardMockData.statuses.goldDelayed),
      barClass: 'progress-bar bg-warning text-dark',
      itemClass: 'status-chart__item status-chart__item--warning',
    },
    {
      label: 'CAMADA SILVER ATRASADA',
      value: this.dashboardMockData.statuses.silverDelayed,
      percent: this.toPercent(this.dashboardMockData.statuses.silverDelayed),
      barClass: 'progress-bar bg-info text-dark',
      itemClass: 'status-chart__item status-chart__item--warning-alt',
    },
    {
      label: 'API ATRASADA',
      value: this.dashboardMockData.statuses.apiDelayed,
      percent: this.toPercent(this.dashboardMockData.statuses.apiDelayed),
      barClass: 'progress-bar bg-danger',
      itemClass: 'status-chart__item status-chart__item--danger',
    },
    {
      label: 'SEM DADOS',
      value: this.dashboardMockData.statuses.noData,
      percent: this.toPercent(this.dashboardMockData.statuses.noData),
      barClass: 'progress-bar bg-secondary',
      itemClass: 'status-chart__item status-chart__item--nodata',
    },
  ];

  readonly delayedLayerOptions: ProblemLayer[] = ['Gold', 'Silver', 'API', 'Sem dados'];
  readonly storeStatusOptions: StoreStatus[] = ['Com atraso', 'Sem atraso', 'Sem dados'];
  readonly associationCodeOptions = this.uniqueSortedOptions('associationCode');
  readonly farmaCodeOptions = this.uniqueSortedOptions('farmaCode');
  readonly cnpjOptions = this.uniqueCnpjOptions();
  readonly filteredAssociationCodeOptions = computed(() =>
    this.filterOptionsBySearch('associationCode', this.associationCodeOptions),
  );
  readonly filteredFarmaCodeOptions = computed(() =>
    this.filterOptionsBySearch('farmaCode', this.farmaCodeOptions),
  );
  readonly filteredCnpjOptions = computed(() => this.filterCnpjOptionsBySearch(this.cnpjOptions));

  readonly delayedStoreRows: DelayedStoreRow[] = [...this.dashboardMockData.delayedStores]
    .sort((a, b) => b.delayHours - a.delayHours)
    .map((store) => ({
      ...store,
      layerTooltip: this.toLayerTooltip(store),
      status: this.toStoreStatus(store),
      layerItems:
        store.problemLayers.length === 0
          ? [{ label: 'Sem atraso', className: this.toLayerClass('Sem atraso') }]
          : store.problemLayers.map((layer) => ({
              label: layer,
              className: this.toLayerClass(layer),
            })),
    }));

  readonly filteredDelayedStoreRows = computed(() => {
    const selectedFilters = this.selectedMultiFilters();
    const pharmacyNameQuery = this.pharmacyNameFilter().trim().toLowerCase();
    const layerQuery = this.problemLayerFilter();
    const statusQuery = this.storeStatusFilter();

    return this.delayedStoreRows.filter((store) => {
      if (
        selectedFilters.associationCode.length > 0 &&
        !selectedFilters.associationCode.includes(store.associationCode)
      ) {
        return false;
      }

      if (selectedFilters.farmaCode.length > 0 && !selectedFilters.farmaCode.includes(store.farmaCode)) {
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

  constructor() {
    effect(() => {
      this.selectedMultiFilters();
      this.multiFilterSearch();
      this.pharmacyNameFilter();
      this.problemLayerFilter();
      this.storeStatusFilter();

      this.renderedRowsCount.set(this.pageSize);
    });
  }

  private toPercent(value: number): number {
    if (this.dashboardMockData.kpis.totalStores === 0) {
      return 0;
    }

    return Math.round((value / this.dashboardMockData.kpis.totalStores) * 100);
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
    if (store.problemLayers.length === 0) {
      return 'Sem atraso de venda nas camadas monitoradas.';
    }

    return store.problemLayers
      .map((layer) => {
        const latestSale = store.lastSalesByLayer?.[layer] ?? store.lastUpdatedAt;
        return `Último dado de venda (${layer}): ${latestSale}`;
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
    return [...new Set(this.dashboardMockData.delayedStores.map((store) => store[key]))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  private uniqueCnpjOptions(): CnpjOption[] {
    const map = new Map<string, string>();

    for (const store of this.dashboardMockData.delayedStores) {
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
}
