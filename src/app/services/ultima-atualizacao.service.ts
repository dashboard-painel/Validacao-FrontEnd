import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, map, of, startWith, switchMap, timer } from 'rxjs';

import { HistoricoService } from './historico.service';
import { VendasParceirosService } from './vendas-parceiros.service';

const POLL_INTERVAL_MS = 30_000;

/**
 * Centralizes polling of the "última atualização" timestamp.
 * Both the sidebar and views consume this single signal instead of
 * running independent timers that hit the same endpoints.
 */
@Injectable({ providedIn: 'root' })
export class UltimaAtualizacaoService {
  private readonly router = inject(Router);
  private readonly historicoService = inject(HistoricoService);
  private readonly vendasService = inject(VendasParceirosService);

  readonly ultimaAtualizacao = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).url),
      startWith(this.router.url),
      switchMap((url) => {
        const isVendas = url.startsWith('/vendas');
        return timer(0, POLL_INTERVAL_MS).pipe(
          switchMap(() => {
            const call$ = isVendas
              ? this.vendasService.getUltimaAtualizacao().pipe(map((r) => r.atualizado_em))
              : this.historicoService.getUltimaAtualizacao().pipe(map((r) => r.atualizado_em));
            return call$.pipe(catchError(() => of(null)));
          }),
        );
      }),
    ),
  );
}
