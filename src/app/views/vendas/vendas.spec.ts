import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type VendaParceiro, type VendasParceirosResponse } from '../../models/shared/venda-parceiro.model';
import { TableExportService } from '../../services/table-export.service';
import { UltimaAtualizacaoService } from '../../services/ultima-atualizacao.service';
import { VendasParceirosService } from '../../services/vendas-parceiros.service';
import { Vendas } from './vendas';

function criarVenda(overrides: Partial<VendaParceiro>): VendaParceiro {
  return {
    cod_farmacia: '000',
    nome_farmacia: 'Farmacia Base',
    sit_contrato: 'ATIVO',
    associacao: '00',
    farmacia: 'FAR000',
    associacao_parceiro: 'PARCEIRO_BASE',
    ultima_venda_parceiros: null,
    ...overrides,
  };
}

const RESPOSTA_INICIAL: VendasParceirosResponse = {
  total: 4,
  resultados: [
    criarVenda({
      cod_farmacia: '001',
      nome_farmacia: 'Farmacia Alpha',
      sit_contrato: 'ATIVO',
      associacao: '80',
      ultima_venda_parceiros: '2024-01-04T11:00:00',
    }),
    criarVenda({
      cod_farmacia: '002',
      nome_farmacia: 'Farmacia Beta',
      sit_contrato: 'ATIVO',
      associacao: '90',
      ultima_venda_parceiros: '2024-01-02T12:00:00',
    }),
    criarVenda({
      cod_farmacia: '003',
      nome_farmacia: 'Farmacia Gama',
      sit_contrato: 'INATIVO',
      associacao: '80',
      ultima_venda_parceiros: '2024-01-04T09:00:00',
    }),
    criarVenda({
      cod_farmacia: '004',
      nome_farmacia: 'Farmacia Delta',
      sit_contrato: 'INATIVO',
      associacao: '95',
      ultima_venda_parceiros: null,
    }),
  ],
};

const RESPOSTA_ATUALIZADA: VendasParceirosResponse = {
  total: 1,
  resultados: [
    criarVenda({
      cod_farmacia: '005',
      nome_farmacia: 'Farmacia Nova',
      sit_contrato: 'ATIVO',
      associacao: '70',
      ultima_venda_parceiros: '2024-01-04T11:30:00',
    }),
  ],
};

describe('Vendas', () => {
  let fixture: ComponentFixture<Vendas>;
  let component: Vendas;
  let vendasServiceMock: {
    getHistorico: ReturnType<typeof vi.fn>;
    atualizar: ReturnType<typeof vi.fn>;
  };
  let exportServiceMock: {
    exportToExcel: ReturnType<typeof vi.fn>;
    exportToPdf: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-04T12:00:00'));

    vendasServiceMock = {
      getHistorico: vi.fn(() => of(RESPOSTA_INICIAL)),
      atualizar: vi.fn(() => of(RESPOSTA_ATUALIZADA)),
    };
    exportServiceMock = {
      exportToExcel: vi.fn(() => Promise.resolve()),
      exportToPdf: vi.fn(() => Promise.resolve()),
    };

    const atualizacaoServiceMock = {
      ultimaAtualizacao: signal<string | null>('2024-01-04T12:00:00'),
    };

    await TestBed.configureTestingModule({
      imports: [Vendas],
      providers: [
        { provide: VendasParceirosService, useValue: vendasServiceMock },
        { provide: TableExportService, useValue: exportServiceMock },
        { provide: UltimaAtualizacaoService, useValue: atualizacaoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Vendas);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('deve carregar o historico no polling inicial e repetir no intervalo configurado', async () => {
    expect(vendasServiceMock.getHistorico).toHaveBeenCalledTimes(1);
    expect(component.stores().map((store) => store.cod_farmacia)).toEqual(['001', '002', '003', '004']);
    expect(component.isLoading()).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(vendasServiceMock.getHistorico).toHaveBeenCalledTimes(2);
  });

  it('deve aplicar o preset venda24h apenas para vendas recentes', () => {
    component.applyPreset('venda24h');

    expect(component.filteredStores().map((store) => store.cod_farmacia)).toEqual(['001', '003']);
    expect(component.activePreset()).toBe('venda24h');
  });

  it('deve aplicar o preset ativas usando o filtro de situacao contratual', () => {
    component.applyPreset('ativas');

    expect(component.filteredStores().map((store) => store.cod_farmacia)).toEqual(['001', '002']);
    expect(component.activePreset()).toBe('ativas');
  });

  it('sortBy deve alternar a direcao quando a mesma coluna for selecionada novamente', () => {
    component.sortBy('nome_farmacia');
    expect(component.sortColumn()).toBe('nome_farmacia');
    expect(component.sortDir()).toBe('asc');
    expect(component.sortedStores().map((store) => store.nome_farmacia)).toEqual([
      'Farmacia Alpha',
      'Farmacia Beta',
      'Farmacia Delta',
      'Farmacia Gama',
    ]);

    component.sortBy('nome_farmacia');

    expect(component.sortDir()).toBe('desc');
    expect(component.sortedStores().map((store) => store.nome_farmacia)).toEqual([
      'Farmacia Gama',
      'Farmacia Delta',
      'Farmacia Beta',
      'Farmacia Alpha',
    ]);
  });

  it('deve substituir os dados e encerrar o refresh em caso de sucesso', () => {
    component.onAtualizar();

    expect(vendasServiceMock.atualizar).toHaveBeenCalledTimes(1);
    expect(component.stores().map((store) => store.cod_farmacia)).toEqual(['005']);
    expect(component.refreshError()).toBeNull();
    expect(component.isRefreshing()).toBe(false);
  });

  it('deve exibir erro e encerrar o refresh quando a atualizacao falhar', () => {
    vendasServiceMock.atualizar.mockImplementationOnce(() =>
      throwError(() => new Error('falha na atualizacao')),
    );

    component.onAtualizar();

    expect(component.refreshError()).toBe('Erro ao atualizar dados do Redshift.');
    expect(component.isRefreshing()).toBe(false);
    expect(component.stores().map((store) => store.cod_farmacia)).toEqual(['001', '002', '003', '004']);
  });

  it('deve exportar para PDF usando as farmacias filtradas da view de vendas', async () => {
    component.applyPreset('ativas');

    await component.onExport('pdf');

    expect(exportServiceMock.exportToPdf).toHaveBeenCalledTimes(1);
    const [config] = exportServiceMock.exportToPdf.mock.calls[0] as [
      { title: string; rows: Array<{ cod_farmacia: string }> },
    ];
    expect(config.title).toBe('Vendas Parceiros — Farmácias');
    expect(config.rows.map((store) => store.cod_farmacia)).toEqual(['001', '002']);
  });

  it('deve expor a mensagem de erro da exportacao em vendas', async () => {
    exportServiceMock.exportToExcel.mockRejectedValueOnce(new Error('Falha ao gerar Excel.'));

    await component.onExport('excel');

    expect(component.exportError()).toBe('Falha ao gerar Excel.');
    expect(component.exportingFormat()).toBeNull();
  });
});
