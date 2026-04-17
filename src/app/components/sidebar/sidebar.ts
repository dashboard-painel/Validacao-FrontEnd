import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, timer } from 'rxjs';

import { HistoricoService } from '../../services/historico.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly service = inject(HistoricoService);

  readonly mobileOpen = signal(false);
  readonly collapsed = signal(false);

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

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }
}
