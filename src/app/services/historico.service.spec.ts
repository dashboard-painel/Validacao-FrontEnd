import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type FarmaciaHistorico } from '../models/shared/farmacia.model';
import { HistoricoService } from './historico.service';

const MOCK_HISTORICO: FarmaciaHistorico = {
  associacao: 'ASS001',
  cod_farmacia: 'F001',
  nome_farmacia: 'Farmacia Centro',
  cnpj: '12345678000195',
  sit_contrato: 'Ativo',
  codigo_rede: '10',
  num_versao: '4.2.1',
  ultima_venda_GoldVendas: '2024-01-01',
  ultima_hora_venda_GoldVendas: '10:00',
  ultima_venda_SilverSTGN_Dedup: '2024-01-01',
  ultima_hora_venda_SilverSTGN_Dedup: '09:30',
  coletor_novo: '2024-01-01 09:00',
  coletor_bi_ultima_data: '2024-01-01',
  coletor_bi_ultima_hora: '09:00',
  classificacao: 'Padrao',
  tipo_divergencia: null,
  camadas_atrasadas: ['Gold'],
  camadas_sem_dados: [],
  atualizado_em: '2024-01-01T10:00:00',
  possivel_causa: 'Pipeline falhou',
};

describe('HistoricoService', () => {
  let service: HistoricoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HistoricoService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(HistoricoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve buscar o historico completo em /historico', () => {
    let resposta: FarmaciaHistorico[] | undefined;

    service.getHistorico().subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne('http://localhost:8000/historico');
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush([MOCK_HISTORICO]);

    expect(resposta).toEqual([MOCK_HISTORICO]);
  });

  it('deve codificar a associacao ao buscar o historico filtrado', () => {
    let resposta: FarmaciaHistorico[] | undefined;
    const associacao = 'Rede Sul/01';

    service.getHistoricoByAssociacao(associacao).subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne(
      `http://localhost:8000/historico/${encodeURIComponent(associacao)}`,
    );
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush([MOCK_HISTORICO]);

    expect(resposta).toEqual([MOCK_HISTORICO]);
  });

  it('deve buscar a ultima atualizacao em /ultima-atualizacao', () => {
    let resposta: { atualizado_em: string } | undefined;

    service.getUltimaAtualizacao().subscribe((dados) => {
      resposta = dados;
    });

    const requisicao = httpMock.expectOne('http://localhost:8000/ultima-atualizacao');
    expect(requisicao.request.method).toBe('GET');

    requisicao.flush({ atualizado_em: '2024-01-01T10:00:00' });

    expect(resposta).toEqual({ atualizado_em: '2024-01-01T10:00:00' });
  });
});
