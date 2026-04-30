import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';

import { Kpi } from '../../components/kpi/kpi';
import { SitContratoBadge } from '../../components/sit-contrato-badge/sit-contrato-badge';
import { VendasParceirosService } from '../../services/vendas-parceiros.service';
import { UltimaAtualizacaoService } from '../../services/ultima-atualizacao.service';
import { type VendaParceiro } from '../../models/shared/venda-parceiro.model';
import { toggleInArray } from '../../utils/array-toggle';
import { filterSummary } from '../../utils/filter-summary';
import {
  TableExportService,
  type ExportTableConfig,
} from '../../services/table-export.service';

type SortColumn = 'associacao' | 'cod_farmacia' | 'nome_farmacia' | 'ultima_venda_parceiros';
type FilterKey = 'associacao' | 'sitContrato';

@Component({
  selector: 'app-vendas',
  imports: [Kpi, SitContratoBadge],
  templateUrl: './vendas.html',
  styleUrl: './vendas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vendas {
  private readonly pageSize = 60;
  private readonly HOURS_24_MS = 24 * 60 * 60 * 1000;
  private readonly POLL_INTERVAL_MS = 60_000;

  private readonly service = inject(VendasParceirosService);
  private readonly atualizacaoService = inject(UltimaAtualizacaoService);
  private readonly exportService = inject(TableExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly stores = signal<VendaParceiro[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly isRefreshing = signal(false);
  readonly refreshError = signal<string | null>(null);
  readonly exportError = signal<string | null>(null);
  readonly exportingFormat = signal<'excel' | 'pdf' | null>(null);

  readonly ultimaAtualizacao = this.atualizacaoService.ultimaAtualizacao;

  readonly sortColumn = signal<SortColumn>('associacao');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly nameFilter = signal('');
  readonly codFarmaciaFilter = signal('');

  readonly selectedFilters = signal<Record<FilterKey, string[]>>({
    associacao: [],
    sitContrato: [],
  });
  readonly filterSearch = signal<Record<FilterKey, string>>({
    associacao: '',
    sitContrato: '',
  });
  readonly openFilter = signal<string | null>(null);
  readonly renderedRowsCount = signal(60);
  readonly filtersOpen = signal(false);
  readonly onlyVendaRecente = signal(false);

  // ── Derived data ──────────────────────────────────────────
  readonly associacaoOptions = computed(() => {
    const values = this.stores().map((s) => s.associacao).filter(Boolean);
    return [...new Set(values)].sort();
  });

  readonly sitContratoOptions = computed(() => {
    const values = this.stores()
      .map((s) => s.sit_contrato)
      .filter((v): v is string => v !== null && v !== '');
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  });

  readonly filteredAssociacaoOptions = computed(() => {
    const search = this.filterSearch().associacao.toLowerCase();
    return this.associacaoOptions().filter((v) => v.toLowerCase().includes(search));
  });

  readonly filteredSitContratoOptions = computed(() => {
    const search = this.filterSearch().sitContrato.toLowerCase();
    return this.sitContratoOptions().filter((v) => v.toLowerCase().includes(search));
  });

  readonly filteredStores = computed(() => {
    const all = this.stores();
    const filters = this.selectedFilters();
    const nameQ = this.nameFilter().toLowerCase();
    const codQ = this.codFarmaciaFilter().toLowerCase();
    const onlyRecente = this.onlyVendaRecente();
    const now = Date.now();
    const threshold24h = this.HOURS_24_MS;

    return all.filter((s) => {
      if (filters.associacao.length > 0 && !filters.associacao.includes(s.associacao))
        return false;
      if (
        filters.sitContrato.length > 0 &&
        !filters.sitContrato.includes(s.sit_contrato ?? '')
      )
        return false;
      if (nameQ && !(s.nome_farmacia ?? '').toLowerCase().includes(nameQ)) return false;
      if (codQ && !s.cod_farmacia.toLowerCase().includes(codQ)) return false;
      if (onlyRecente) {
        if (!s.ultima_venda_parceiros) return false;
        if (now - new Date(s.ultima_venda_parceiros).getTime() >= threshold24h) return false;
      }
      return true;
    });
  });

  readonly sortedStores = computed(() => {
    const list = [...this.filteredStores()];
    const col = this.sortColumn();
    const dir = this.sortDir();
    const mult = dir === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      const va = a[col] ?? '';
      const vb = b[col] ?? '';
      return va.localeCompare(vb) * mult;
    });
  });

  readonly visibleRows = computed(() =>
    this.sortedStores().slice(0, this.renderedRowsCount()),
  );

  readonly hasMoreRows = computed(
    () => this.renderedRowsCount() < this.sortedStores().length,
  );

  // ── KPIs ──────────────────────────────────────────────────
  readonly totalFarmacias = computed(() => this.filteredStores().length);

  readonly farmaciasAtivas = computed(
    () =>
      this.filteredStores().filter(
        (s) => s.sit_contrato?.toUpperCase().trim() === 'ATIVO',
      ).length,
  );

  readonly farmaciasInativas = computed(
    () =>
      this.filteredStores().filter(
        (s) => s.sit_contrato?.toUpperCase().trim() === 'INATIVO',
      ).length,
  );

  readonly comVendaRecente = computed(() => {
    const now = Date.now();
    const threshold = this.HOURS_24_MS;
    return this.filteredStores().filter((s) => {
      if (!s.ultima_venda_parceiros) return false;
      return now - new Date(s.ultima_venda_parceiros).getTime() < threshold;
    }).length;
  });

  // ── Filter helpers ────────────────────────────────────────
  readonly hasActiveFilters = computed(() => {
    const f = this.selectedFilters();
    return (
      f.associacao.length > 0 ||
      f.sitContrato.length > 0 ||
      this.nameFilter() !== '' ||
      this.codFarmaciaFilter() !== '' ||
      this.onlyVendaRecente()
    );
  });

  readonly activePreset = computed((): 'all' | 'ativas' | 'inativas' | 'venda24h' | null => {
    if (!this.hasActiveFilters()) return 'all';
    const f = this.selectedFilters();
    const hasOtherFilters =
      f.associacao.length > 0 ||
      this.nameFilter() !== '' ||
      this.codFarmaciaFilter() !== '';
    if (hasOtherFilters) return null;
    if (this.onlyVendaRecente() && f.sitContrato.length === 0) return 'venda24h';
    if (f.sitContrato.length === 1 && f.sitContrato[0] === 'ATIVO' && !this.onlyVendaRecente())
      return 'ativas';
    if (f.sitContrato.length === 1 && f.sitContrato[0] === 'INATIVO' && !this.onlyVendaRecente())
      return 'inativas';
    return null;
  });

  constructor() {
    timer(0, this.POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.service.getHistorico().pipe(
            catchError(() => {
              this.isLoading.set(false);
              this.loadError.set('Falha ao carregar dados. Tentando novamente...');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resp) => {
        this.stores.set(resp.resultados);
        this.isLoading.set(false);
        this.loadError.set(null);
      });
  }

  onAtualizar(): void {
    this.isRefreshing.set(true);
    this.refreshError.set(null);
    this.service.atualizar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.stores.set(resp.resultados);
          this.isRefreshing.set(false);
        },
        error: () => {
          this.refreshError.set('Erro ao atualizar dados do Redshift.');
          this.isRefreshing.set(false);
        },
      });
  }

  async onExport(format: 'excel' | 'pdf'): Promise<void> {
    const rows = this.filteredStores();
    if (rows.length === 0) {
      this.exportError.set('Nenhuma farmácia disponível para exportar com os filtros atuais.');
      return;
    }

    this.exportError.set(null);
    this.exportingFormat.set(format);

    try {
      const config = this.createExportConfig(rows);
      if (format === 'excel') {
        await this.exportService.exportToExcel(config);
      } else {
        await this.exportService.exportToPdf(config);
      }
    } catch (error) {
      this.exportError.set(this.resolveExportError(error, format));
    } finally {
      this.exportingFormat.set(null);
    }
  }

  // ── Actions ───────────────────────────────────────────────
  sortBy(col: SortColumn): void {
    if (this.sortColumn() === col) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  onCheckboxFilter(key: FilterKey, value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedFilters.update((current) => ({
      ...current,
      [key]: toggleInArray(current[key], value, checked),
    }));
  }

  isSelected(key: FilterKey, value: string): boolean {
    return this.selectedFilters()[key].includes(value);
  }

  isFilterOpen(key: string): boolean {
    return this.openFilter() === key;
  }

  onFilterToggle(key: string, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    this.openFilter.set(open ? key : null);
  }

  onFilterSearch(key: FilterKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterSearch.update((c) => ({ ...c, [key]: value }));
  }

  filterSummary(key: FilterKey): string {
    return filterSummary(this.selectedFilters()[key]);
  }

  onNameFilter(event: Event): void {
    this.nameFilter.set((event.target as HTMLInputElement).value);
  }

  onCodFarmaciaFilter(event: Event): void {
    this.codFarmaciaFilter.set((event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.selectedFilters.set({ associacao: [], sitContrato: [] });
    this.filterSearch.set({ associacao: '', sitContrato: '' });
    this.nameFilter.set('');
    this.codFarmaciaFilter.set('');
    this.onlyVendaRecente.set(false);
  }

  applyPreset(preset: 'all' | 'ativas' | 'inativas' | 'venda24h'): void {
    this.clearFilters();
    if (preset === 'ativas') {
      this.selectedFilters.update((f) => ({ ...f, sitContrato: ['ATIVO'] }));
    } else if (preset === 'inativas') {
      this.selectedFilters.update((f) => ({ ...f, sitContrato: ['INATIVO'] }));
    } else if (preset === 'venda24h') {
      this.onlyVendaRecente.set(true);
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  onTableScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      this.renderedRowsCount.update((c) =>
        Math.min(c + this.pageSize, this.sortedStores().length),
      );
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  vendaRecenciaBadge(dateStr: string | null): string {
    if (!dateStr) return 'vendas__recencia-badge vendas__recencia-badge--sem-dados';
    const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    if (hours <= 24) return 'vendas__recencia-badge vendas__recencia-badge--ok';
    if (hours <= 72) return 'vendas__recencia-badge vendas__recencia-badge--warning';
    return 'vendas__recencia-badge vendas__recencia-badge--critical';
  }

  vendaRecenciaLabel(dateStr: string | null): string {
    if (!dateStr) return 'Sem dados';
    const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  }

  private createExportConfig(rows: readonly VendaParceiro[]): ExportTableConfig<VendaParceiro> {
    return {
      title: 'Vendas Parceiros — Farmácias',
      subtitle: `${rows.length} farmácias conforme os filtros aplicados`,
      fileNameBase: 'vendas-parceiros',
      sheetName: 'Vendas parceiros',
      rows,
      summary: [
        { label: 'Total exportado', value: rows.length },
        {
          label: 'Ativas',
          value: rows.filter((store) => store.sit_contrato?.toUpperCase().trim() === 'ATIVO').length,
        },
        {
          label: 'Inativas',
          value: rows.filter((store) => store.sit_contrato?.toUpperCase().trim() === 'INATIVO').length,
        },
        {
          label: 'Venda 24h',
          value: rows.filter((store) => {
            if (!store.ultima_venda_parceiros) return false;
            return Date.now() - new Date(store.ultima_venda_parceiros).getTime() < this.HOURS_24_MS;
          }).length,
        },
      ],
      columns: [
        { header: 'Associacao', value: (store) => store.associacao, align: 'center', width: 14 },
        {
          header: 'Assoc. parceiro',
          value: (store) => store.associacao_parceiro ?? '—',
          align: 'center',
          width: 16,
        },
        { header: 'Cod. farmacia', value: (store) => store.cod_farmacia, align: 'center', width: 14 },
        { header: 'Farmacia', value: (store) => store.farmacia ?? '—', align: 'center', width: 14 },
        { header: 'Nome', value: (store) => store.nome_farmacia ?? '—', width: 26 },
        { header: 'Sit. contrato', value: (store) => store.sit_contrato ?? '—', align: 'center', width: 16 },
        {
          header: 'Ultima venda',
          value: (store) => this.formatDate(store.ultima_venda_parceiros),
          align: 'center',
          width: 18,
        },
        {
          header: 'Recencia',
          value: (store) => this.vendaRecenciaLabel(store.ultima_venda_parceiros),
          align: 'center',
          width: 14,
        },
      ],
    };
  }

  private resolveExportError(error: unknown, format: 'excel' | 'pdf'): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return `Não foi possível exportar o arquivo em ${format.toUpperCase()}.`;
  }
}
