import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { DelayedStoresTable } from './delayed-stores-table';
import { type DelayedStoreRow, type ProblemLayer } from '../../models/shared/dashboard.model';

const MOCK_ROW: DelayedStoreRow = {
  id: '1',
  associationCode: 'ASS001',
  farmaCode: 'F001',
  cnpj: '12345678000195',
  pharmacyName: 'Farma Teste',
  delayHours: 50,
  problemLayers: ['Gold'],
  layerItems: [{ label: 'Gold', className: 'delayed-stores__layer delayed-stores__layer--gold' }],
  sitContrato: 'Ativo',
  classificacao: 'Crítico',
  possivelCausa: 'Pipeline falhou',
  codigoRede: null,
  numVersao: null,
  lastSalesByLayer: { Gold: '2024-01-01 10:00' },
  status: 'Com atraso',
};

describe('DelayedStoresTable', () => {
  let fixture: ComponentFixture<DelayedStoresTable>;
  let component: DelayedStoresTable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayedStoresTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DelayedStoresTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('visibleRows', []);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('urgencyClass retorna "critical" para >=48h, "high" para >=24h e "moderate" nos demais casos', () => {
    expect(component.urgencyClass(48)).toBe('critical');
    expect(component.urgencyClass(72)).toBe('critical');
    expect(component.urgencyClass(24)).toBe('high');
    expect(component.urgencyClass(30)).toBe('high');
    expect(component.urgencyClass(10)).toBe('moderate');
  });

  it('rowUrgencyClass retorna "nodata" para linhas Sem dados', () => {
    const nodataRow = { ...MOCK_ROW, problemLayers: ['Sem dados'] as ProblemLayer[], delayHours: 0 };
    expect(component.rowUrgencyClass(nodataRow as DelayedStoreRow)).toBe('nodata');
  });

  it('rowUrgencyClass retorna "ok" para atraso zero sem Sem dados', () => {
    const okRow = { ...MOCK_ROW, problemLayers: [] as ProblemLayer[], delayHours: 0 };
    expect(component.rowUrgencyClass(okRow as DelayedStoreRow)).toBe('ok');
  });

  it('formatDelay retorna dias acima de 48h e horas nos demais casos', () => {
    expect(component.formatDelay(72)).toBe('3 dias');
    expect(component.formatDelay(24)).toBe('24 horas');
  });

  it('multiFilterSummary retorna "Todos" quando nada foi selecionado', () => {
    expect(component.multiFilterSummary('associationCode')).toBe('Todos');
  });

  it('isMultiFilterOpen retorna true apenas para a chave aberta', () => {
    fixture.componentRef.setInput('openMultiFilter', 'farmaCode');
    expect(component.isMultiFilterOpen('farmaCode')).toBe(true);
    expect(component.isMultiFilterOpen('cnpj')).toBe(false);
  });

  it('expõe botoes de ordenacao com aria-sort e emite sortChange ao clicar', () => {
    const emissoes: Array<{ column: string; dir: 'asc' | 'desc' }> = [];
    component.sortChange.subscribe((value) => emissoes.push(value));
    fixture.componentRef.setInput('sortColumn', 'associationCode');
    fixture.componentRef.setInput('sortDir', 'asc');
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const cabecalhoAssociacao = elemento.querySelector<HTMLElement>('th[aria-sort="ascending"]');
    const botaoAtraso = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('.delayed-stores__sort-button'),
    ).find((botao) => botao.textContent?.includes('Atraso'));

    expect(cabecalhoAssociacao?.textContent).toContain('Cód Assoc.');

    botaoAtraso?.click();

    expect(emissoes).toEqual([{ column: 'delayHours', dir: 'desc' }]);
  });

  it('associa labels programaticamente aos filtros avancados', () => {
    fixture.componentRef.setInput('filtersOpen', true);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const campoNome = elemento.querySelector<HTMLInputElement>('#pharmacy-name-filter');
    const labelNome = elemento.querySelector<HTMLLabelElement>('label[for="pharmacy-name-filter"]');
    const resumoAssociacao = elemento.querySelector<HTMLElement>(
      'summary[aria-labelledby="association-code-filter-label association-code-filter-value"]',
    );
    const buscaAssociacao = elemento.querySelector<HTMLInputElement>(
      'input[aria-label="Buscar por código de associação"]',
    );

    expect(labelNome?.textContent?.trim()).toBe('Nome');
    expect(campoNome).toBeTruthy();
    expect(resumoAssociacao?.textContent).toContain('Todos');
    expect(buscaAssociacao).toBeTruthy();
  });

  it('filteredAssociationCodeOptions filtra pelos termos buscados', () => {
    fixture.componentRef.setInput('associationCodeOptions', ['ASS001', 'ASS002', 'XYZ']);
    fixture.componentRef.setInput('multiFilterSearch', {
      associationCode: 'ass',
      farmaCode: '',
      cnpj: '',
    });
    fixture.detectChanges();
    const result = component.filteredAssociationCodeOptions();
    expect(result).toEqual(['ASS001', 'ASS002']);
  });

  it('renderiza apenas os atalhos rapidos de atraso minimo', () => {
    const elemento = fixture.nativeElement as HTMLElement;
    const botoes = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('.delayed-stores__preset-btn--delay'),
    );

    expect(botoes.map((botao) => botao.textContent?.trim())).toEqual(['0h', '24h+', '48h+', '72h+']);
  });

  it('marca como ativo o preset selecionado de atraso minimo', () => {
    fixture.componentRef.setInput('minDelayHours', 48);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const botoes = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('.delayed-stores__preset-btn--delay'),
    );
    const botaoAtivo = botoes.find((botao) => botao.textContent?.trim() === '48h+');
    const botaoInativo = botoes.find((botao) => botao.textContent?.trim() === '0h');

    expect(botaoAtivo?.classList.contains('delayed-stores__preset-btn--active')).toBe(true);
    expect(botaoAtivo?.getAttribute('aria-pressed')).toBe('true');
    expect(botaoInativo?.getAttribute('aria-pressed')).toBe('false');
  });

  it('emite minDelayChange ao clicar em um preset rapido', () => {
    const emissoes: number[] = [];
    component.minDelayChange.subscribe((value) => emissoes.push(value));

    const elemento = fixture.nativeElement as HTMLElement;
    const botaoAlvo = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('.delayed-stores__preset-btn--delay'),
    ).find((botao) => botao.textContent?.trim() === '48h+');

    botaoAlvo?.click();

    expect(emissoes).toEqual([48]);
  });

  it('emite exportRequest ao clicar no botao de exportacao Excel', () => {
    const emissoes: Array<'excel' | 'pdf'> = [];
    component.exportRequest.subscribe((value) => emissoes.push(value));
    fixture.componentRef.setInput('filteredCount', 3);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const botaoExcel = elemento.querySelector<HTMLButtonElement>('.painel-export-btn--excel');

    botaoExcel?.click();

    expect(emissoes).toEqual(['excel']);
  });

  it('renderiza uma acao de detalhes acessivel por linha', () => {
    const emissoes: DelayedStoreRow[] = [];
    component.storeSelect.subscribe((value) => emissoes.push(value));
    fixture.componentRef.setInput('visibleRows', [MOCK_ROW]);
    fixture.componentRef.setInput('filteredCount', 1);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const botaoDetalhes = elemento.querySelector<HTMLButtonElement>('.delayed-stores__row-action');

    expect(botaoDetalhes?.textContent?.trim()).toBe('Ver detalhes');
    expect(botaoDetalhes?.getAttribute('aria-label')).toBe('Ver detalhes de Farma Teste');

    botaoDetalhes?.click();

    expect(emissoes).toEqual([MOCK_ROW]);
  });

  it('nao emite tableScroll quando nao ha mais linhas para carregar', () => {
    const emissoes: number[] = [];
    component.tableScroll.subscribe(() => emissoes.push(1));

    component.onTableScroll({
      target: {
        scrollTop: 400,
        clientHeight: 200,
        scrollHeight: 550,
      },
    } as unknown as Event);

    expect(emissoes).toEqual([]);
  });

  it('emite tableScroll ao atingir o fim quando ainda ha mais linhas', () => {
    const emissoes: number[] = [];
    component.tableScroll.subscribe(() => emissoes.push(1));
    fixture.componentRef.setInput('hasMoreRows', true);
    fixture.componentRef.setInput('filteredCount', 10);

    component.onTableScroll({
      target: {
        scrollTop: 400,
        clientHeight: 200,
        scrollHeight: 650,
      },
    } as unknown as Event);

    expect(emissoes).toEqual([1]);
  });
});
