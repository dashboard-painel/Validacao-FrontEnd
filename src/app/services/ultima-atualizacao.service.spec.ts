import { TestBed } from '@angular/core/testing';
import { type Event, NavigationEnd, Router } from '@angular/router';
import { type Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoricoService } from './historico.service';
import { UltimaAtualizacaoService } from './ultima-atualizacao.service';
import { VendasParceirosService } from './vendas-parceiros.service';

type AtualizacaoResponse = { atualizado_em: string | null };

describe('UltimaAtualizacaoService', () => {
  let routerEvents: Subject<Event>;
  let routerMock: { events: Observable<Event>; url: string };
  let historicoServiceMock: { getUltimaAtualizacao: ReturnType<typeof vi.fn> };
  let vendasServiceMock: { getUltimaAtualizacao: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function criarServico(
    urlInicial = '/dashboard',
    historicoResponse: Observable<AtualizacaoResponse> = of({
      atualizado_em: '2024-01-04T10:00:00',
    }),
    vendasResponse: Observable<AtualizacaoResponse> = of({
      atualizado_em: '2024-01-04T11:00:00',
    }),
  ): UltimaAtualizacaoService {
    routerEvents = new Subject<Event>();
    routerMock = {
      events: routerEvents.asObservable(),
      url: urlInicial,
    };

    historicoServiceMock = {
      getUltimaAtualizacao: vi.fn(() => historicoResponse),
    };

    vendasServiceMock = {
      getUltimaAtualizacao: vi.fn(() => vendasResponse),
    };

    TestBed.configureTestingModule({
      providers: [
        UltimaAtualizacaoService,
        { provide: Router, useValue: routerMock },
        { provide: HistoricoService, useValue: historicoServiceMock },
        { provide: VendasParceirosService, useValue: vendasServiceMock },
      ],
    });

    return TestBed.inject(UltimaAtualizacaoService);
  }

  it('deve consultar o historico fora da rota /vendas e repetir no intervalo de polling', async () => {
    const service = criarServico('/dashboard');

    await vi.advanceTimersByTimeAsync(0);

    expect(historicoServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);
    expect(vendasServiceMock.getUltimaAtualizacao).not.toHaveBeenCalled();
    expect(service.ultimaAtualizacao()).toBe('2024-01-04T10:00:00');
    expect(service.ultimaAtualizacaoPollSequence()).toBe(1);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(historicoServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(2);
    expect(service.ultimaAtualizacaoPollSequence()).toBe(2);
  });

  it('deve consultar vendas quando a url inicial comeca com /vendas', async () => {
    const service = criarServico('/vendas');

    await vi.advanceTimersByTimeAsync(0);

    expect(vendasServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);
    expect(historicoServiceMock.getUltimaAtualizacao).not.toHaveBeenCalled();
    expect(service.ultimaAtualizacao()).toBe('2024-01-04T11:00:00');
    expect(service.ultimaAtualizacaoPollSequence()).toBe(1);
  });

  it('deve trocar a origem do polling ao navegar entre rotas', async () => {
    const service = criarServico('/dashboard');

    await vi.advanceTimersByTimeAsync(0);
    expect(historicoServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);

    routerMock.url = '/vendas';
    routerEvents.next(new NavigationEnd(1, '/vendas', '/vendas'));

    await vi.advanceTimersByTimeAsync(0);

    expect(vendasServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);
    expect(service.ultimaAtualizacao()).toBe('2024-01-04T11:00:00');
    expect(service.ultimaAtualizacaoPollSequence()).toBe(2);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(historicoServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);
    expect(vendasServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(2);
    expect(service.ultimaAtualizacaoPollSequence()).toBe(3);
  });

  it('deve retornar null quando a consulta falha e ainda avancar o sequenciador', async () => {
    const service = criarServico(
      '/dashboard',
      throwError(() => new Error('falha no polling')),
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(service.ultimaAtualizacao()).toBeNull();
    expect(historicoServiceMock.getUltimaAtualizacao).toHaveBeenCalledTimes(1);
    expect(service.ultimaAtualizacaoPollSequence()).toBe(1);
  });
});
