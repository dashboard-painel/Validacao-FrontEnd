import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type VendasParceirosResponse } from '../models/shared/venda-parceiro.model';
import { VendasParceirosService } from './vendas-parceiros.service';

const MOCK_RESPOSTA: VendasParceirosResponse = {
  total: 1,
  resultados: [
    {
      cod_farmacia: '001',
      nome_farmacia: 'Farmacia Alpha',
      sit_contrato: 'ATIVO',
      associacao: '80',
      farmacia: 'FAR001',
      associacao_parceiro: 'PARCEIRO_A',
      ultima_venda_parceiros: '2024-01-04T11:00:00',
    },
  ],
};

describe('VendasParceirosService', () => {
  let service: VendasParceirosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VendasParceirosService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(VendasParceirosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve buscar o historico em /vendas-parceiros/historico', () => {
    let resposta: VendasParceirosResponse | undefined;

    service.getHistorico().subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne('http://localhost:8000/vendas-parceiros/historico');
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush(MOCK_RESPOSTA);

    expect(resposta).toEqual(MOCK_RESPOSTA);
  });

  it('deve atualizar os dados em /vendas-parceiros', () => {
    let resposta: VendasParceirosResponse | undefined;

    service.atualizar().subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne('http://localhost:8000/vendas-parceiros');
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush(MOCK_RESPOSTA);

    expect(resposta).toEqual(MOCK_RESPOSTA);
  });

  it('deve buscar a ultima atualizacao em /vendas-parceiros/ultima-atualizacao', () => {
    let resposta: { atualizado_em: string | null } | undefined;

    service.getUltimaAtualizacao().subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne('http://localhost:8000/vendas-parceiros/ultima-atualizacao');
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush({ atualizado_em: '2024-01-04T12:00:00' });

    expect(resposta).toEqual({ atualizado_em: '2024-01-04T12:00:00' });
  });
});
