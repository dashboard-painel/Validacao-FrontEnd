import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ComparacaoResultado, type FarmaciaHistorico } from '../../models/shared/farmacia.model';
import { HistoricoService } from '../../services/historico.service';
import { TableExportService } from '../../services/table-export.service';
import { ThemeService, type Theme } from '../../services/theme.service';
import { UltimaAtualizacaoService } from '../../services/ultima-atualizacao.service';
import { Dashboard } from './dashboard';

function criarFarmacia(overrides: Partial<FarmaciaHistorico>): FarmaciaHistorico {
  return {
    associacao: 'ASS000',
    cod_farmacia: 'F000',
    nome_farmacia: 'Farmacia Base',
    cnpj: '00000000000000',
    sit_contrato: 'Ativo',
    codigo_rede: null,
    num_versao: null,
    ultima_venda_GoldVendas: null,
    ultima_hora_venda_GoldVendas: null,
    ultima_venda_SilverSTGN_Dedup: null,
    ultima_hora_venda_SilverSTGN_Dedup: null,
    coletor_novo: null,
    coletor_bi_ultima_data: null,
    coletor_bi_ultima_hora: null,
    classificacao: 'PADRAO',
    tipo_divergencia: null,
    camadas_atrasadas: [],
    camadas_sem_dados: [],
    atualizado_em: '2024-01-04T12:00:00.000',
    possivel_causa: null,
    ...overrides,
  };
}

const MOCK_API_STORES: FarmaciaHistorico[] = [
  criarFarmacia({
    associacao: 'ASS001',
    cod_farmacia: 'F001',
    nome_farmacia: 'Farmacia Silver',
    cnpj: '11111111111111',
    camadas_atrasadas: ['SilverSTGN_Dedup'],
    ultima_venda_SilverSTGN_Dedup: '2024-01-02',
    ultima_hora_venda_SilverSTGN_Dedup: '12:00:00',
    possivel_causa: 'Silver atrasado',
  }),
  criarFarmacia({
    associacao: 'ASS002',
    cod_farmacia: 'F002',
    nome_farmacia: 'Farmacia Gold',
    cnpj: '22222222222222',
    camadas_atrasadas: ['GoldVendas'],
    ultima_hora_venda_GoldVendas: '2024-01-01 12:00:00',
    possivel_causa: 'Pipeline falhou',
  }),
  criarFarmacia({
    associacao: 'ASS003',
    cod_farmacia: 'F003',
    nome_farmacia: 'Farmacia Sem Dados',
    cnpj: '33333333333333',
    camadas_sem_dados: ['GoldVendas', 'SilverSTGN_Dedup'],
  }),
  criarFarmacia({
    associacao: 'ASS004',
    cod_farmacia: 'F004',
    nome_farmacia: 'Farmacia OK',
    cnpj: '44444444444444',
  }),
  criarFarmacia({
    associacao: 'ASS005',
    cod_farmacia: 'F005',
    nome_farmacia: 'Farmacia Cloud',
    cnpj: '55555555555555',
    classificacao: 'CLOUD',
    camadas_atrasadas: ['API'],
    coletor_novo: '2024-01-03 12:00:00',
    coletor_bi_ultima_data: '2024-01-03',
    coletor_bi_ultima_hora: '12:00:00',
    possivel_causa: 'Migracao pendente',
  }),
];

const MOCK_COMPARE_RESULT: ComparacaoResultado = {
  associacao: 'ASS001',
  total_gold_vendas: 0,
  total_silver_stgn_dedup: 0,
  total_divergencias: 0,
  comparacao_id: 1,
  divergencias: [],
  status_farmacias: [],
};

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let historicoServiceMock: {
    getHistorico: ReturnType<typeof vi.fn>;
    comparar: ReturnType<typeof vi.fn>;
  };
  let exportServiceMock: {
    exportToExcel: ReturnType<typeof vi.fn>;
    exportToPdf: ReturnType<typeof vi.fn>;
  };
  let atualizacaoServiceMock: {
    ultimaAtualizacao: WritableSignal<string | null>;
    ultimaAtualizacaoPollSequence: WritableSignal<number>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-04T12:00:00'));
    localStorage.clear();
    sessionStorage.clear();

    historicoServiceMock = {
      getHistorico: vi.fn(() => of(MOCK_API_STORES)),
      comparar: vi.fn(() => of(MOCK_COMPARE_RESULT)),
    };
    exportServiceMock = {
      exportToExcel: vi.fn(() => Promise.resolve()),
      exportToPdf: vi.fn(() => Promise.resolve()),
    };

    atualizacaoServiceMock = {
      ultimaAtualizacao: signal<string | null>(null),
      ultimaAtualizacaoPollSequence: signal(0),
    };

    const themeServiceMock = {
      theme: signal<Theme>('light'),
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: HistoricoService, useValue: historicoServiceMock },
        { provide: TableExportService, useValue: exportServiceMock },
        { provide: UltimaAtualizacaoService, useValue: atualizacaoServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('deve manter o escopo inicial com Ativo e Padrao e expandir ao limpar filtros globais', () => {
    expect(component.delayedStoreRows().map((store) => store.associationCode)).not.toContain('ASS005');

    component.fs.clearGlobalFilters();
    fixture.detectChanges();

    expect(component.delayedStoreRows().map((store) => store.associationCode)).toContain('ASS005');
  });

  it('deve ordenar por atraso decrescente com Sem dados no topo por padrao', () => {
    expect(component.delayedStoreRows().map((store) => store.associationCode)).toEqual([
      'ASS003',
      'ASS002',
      'ASS001',
      'ASS004',
    ]);
  });

  it('deve ordenar por associationCode em ordem crescente quando solicitado', () => {
    component.onSortChange({ column: 'associationCode', dir: 'asc' });

    expect(component.delayedStoreRows().map((store) => store.associationCode)).toEqual([
      'ASS001',
      'ASS002',
      'ASS003',
      'ASS004',
    ]);
  });

  it('deve aplicar atraso minimo sem incluir farmacias sem dados', () => {
    component.onMinDelayChange(48);

    expect(component.filteredDelayedStoreRows().map((store) => store.associationCode)).toEqual([
      'ASS002',
      'ASS001',
    ]);
    expect(component.filteredDelayedStoreRows().every((store) => store.status === 'Com atraso')).toBe(true);
  });

  it('deve filtrar por status Sem dados no painel avancado', () => {
    component.onStoreStatusChange(['Sem dados']);

    expect(component.filteredDelayedStoreRows().map((store) => store.associationCode)).toEqual(['ASS003']);
  });

  it('nao deve recarregar o historico quando o polling trouxer o mesmo instante com outro formato', () => {
    expect(historicoServiceMock.getHistorico).toHaveBeenCalledTimes(1);

    atualizacaoServiceMock.ultimaAtualizacao.set('2024-01-04T12:00:00');
    atualizacaoServiceMock.ultimaAtualizacaoPollSequence.update((value) => value + 1);
    fixture.detectChanges();

    expect(historicoServiceMock.getHistorico).toHaveBeenCalledTimes(1);
  });

  it('deve ignorar comparar quando nao houver exatamente uma associacao selecionada', () => {
    component.onComparar();

    expect(historicoServiceMock.comparar).not.toHaveBeenCalled();
    expect(historicoServiceMock.getHistorico).toHaveBeenCalledTimes(1);
  });

  it('deve ignorar comparar quando ja houver uma comparacao em andamento', () => {
    component.fs.selectedGlobalFilters.update((filters) => ({
      ...filters,
      associationCode: ['ASS001'],
    }));
    component.isComparing.set(true);

    component.onComparar();

    expect(historicoServiceMock.comparar).not.toHaveBeenCalled();
  });

  it('deve comparar a associacao selecionada e recarregar o historico em caso de sucesso', () => {
    component.fs.selectedGlobalFilters.update((filters) => ({
      ...filters,
      associationCode: ['ASS001'],
    }));

    component.onComparar();

    expect(historicoServiceMock.comparar).toHaveBeenCalledWith('ASS001');
    expect(historicoServiceMock.getHistorico).toHaveBeenCalledTimes(2);
    expect(component.compareError()).toBeNull();
    expect(component.isComparing()).toBe(false);
  });

  it('deve exibir erro e nao recarregar o historico quando a comparacao falhar', () => {
    historicoServiceMock.comparar.mockImplementationOnce(() =>
      throwError(() => new Error('falha na comparacao')),
    );
    component.fs.selectedGlobalFilters.update((filters) => ({
      ...filters,
      associationCode: ['ASS001'],
    }));

    component.onComparar();

    expect(historicoServiceMock.comparar).toHaveBeenCalledWith('ASS001');
    expect(historicoServiceMock.getHistorico).toHaveBeenCalledTimes(1);
    expect(component.compareError()).toBe('Falha ao comparar. Verifique a conexão e tente novamente.');
    expect(component.isComparing()).toBe(false);
  });

  it('deve exportar para Excel usando as farmacias filtradas do dashboard', async () => {
    component.onStoreStatusChange(['Com atraso']);

    await component.onExportDelayedStores('excel');

    expect(exportServiceMock.exportToExcel).toHaveBeenCalledTimes(1);
    const [config] = exportServiceMock.exportToExcel.mock.calls[0] as [
      { title: string; rows: Array<{ associationCode: string }> },
    ];
    expect(config.title).toBe('Dashboard — Farmácias monitoradas');
    expect(config.rows.map((store) => store.associationCode)).toEqual(['ASS002', 'ASS001']);
  });

  it('deve expor a mensagem de erro da exportacao do dashboard', async () => {
    exportServiceMock.exportToPdf.mockRejectedValueOnce(new Error('Falha ao gerar PDF.'));

    await component.onExportDelayedStores('pdf');

    expect(component.exportError()).toBe('Falha ao gerar PDF.');
    expect(component.exportingFormat()).toBeNull();
  });
});
