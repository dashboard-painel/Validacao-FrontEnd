import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, map, of, switchMap, timer } from 'rxjs';

import { Kpi } from '../../components/kpi/kpi';
import { VendasParceirosService } from '../../services/vendas-parceiros.service';
import { type VendaParceiro } from '../../models/shared/venda-parceiro.model';

type SortColumn = 'associacao' | 'cod_farmacia' | 'nome_farmacia' | 'ultima_venda_parceiros';
type FilterKey = 'associacao' | 'sitContrato';

@Component({
  selector: 'app-vendas',
  imports: [Kpi],
  templateUrl: './vendas.html',
  styleUrl: './vendas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vendas {
  private readonly pageSize = 60;
  private readonly service = inject(VendasParceirosService);

  readonly stores = signal<VendaParceiro[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly refreshError = signal<string | null>(null);

  readonly ultimaAtualizacao = toSignal(
    timer(0, 30_000).pipe(
      switchMap(() =>
        this.service.getUltimaAtualizacao().pipe(
          map((r) => r.atualizado_em),
          catchError(() => of(null)),
        ),
      ),
    ),
  );

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
    const threshold = 24 * 60 * 60 * 1000;
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
      this.codFarmaciaFilter() !== ''
    );
  });

  readonly sitContratoClassMap: Record<string, string> = {
    ATIVO: 'vendas__sit-badge vendas__sit-badge--ativo',
    INATIVO: 'vendas__sit-badge vendas__sit-badge--inativo',
    IMPLANTACAO: 'vendas__sit-badge vendas__sit-badge--implantacao',
    DESISTENTE: 'vendas__sit-badge vendas__sit-badge--desistente',
    ISENTO: 'vendas__sit-badge vendas__sit-badge--isento',
    PARCEIROS: 'vendas__sit-badge vendas__sit-badge--parceiros',
  };

  constructor() {
    timer(0, 60_000)
      .pipe(
        switchMap(() =>
          this.service.getHistorico().pipe(
            catchError(() => {
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resp) => {
        this.stores.set(resp.resultados);
        this.isLoading.set(false);
      });
  }

  onAtualizar(): void {
    this.isRefreshing.set(true);
    this.refreshError.set(null);
    this.service.atualizar().subscribe({
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
    this.selectedFilters.update((current) => {
      const values = current[key];
      const next = checked
        ? [...new Set([...values, value])]
        : values.filter((v) => v !== value);
      return { ...current, [key]: next };
    });
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
    const selected = this.selectedFilters()[key];
    if (selected.length === 0) return 'Todos';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selecionados`;
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
  }

  onTableScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      this.renderedRowsCount.update((c) => c + this.pageSize);
    }
  }

  sitContratoClass(sit: string | null): string {
    if (!sit) return 'vendas__sit-badge vendas__sit-badge--inativo';
    return (
      this.sitContratoClassMap[sit.toUpperCase().trim()] ??
      'vendas__sit-badge vendas__sit-badge--inativo'
    );
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
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours <= 24) return 'vendas__recencia-badge vendas__recencia-badge--ok';
    if (hours <= 72) return 'vendas__recencia-badge vendas__recencia-badge--warning';
    return 'vendas__recencia-badge vendas__recencia-badge--critical';
  }

  vendaRecenciaLabel(dateStr: string | null): string {
    if (!dateStr) return 'Sem dados';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  }
}
