import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, map, of, startWith, switchMap, timer } from 'rxjs';

import { HistoricoService } from '../../services/historico.service';
import { VendasParceirosService } from '../../services/vendas-parceiros.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly historicoService = inject(HistoricoService);
  private readonly vendasService = inject(VendasParceirosService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);

  readonly mobileOpen = signal(false);
  readonly collapsed = signal(false);

  readonly ultimaAtualizacao = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).url),
      startWith(this.router.url),
      switchMap((url) => {
        const isVendas = url.startsWith('/vendas');
        return timer(0, 30_000).pipe(
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

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
