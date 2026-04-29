import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ThemeService } from '../../services/theme.service';
import { UltimaAtualizacaoService } from '../../services/ultima-atualizacao.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly atualizacaoService = inject(UltimaAtualizacaoService);
  readonly themeService = inject(ThemeService);

  readonly mobileOpen = signal(false);
  readonly collapsed = signal(false);

  readonly ultimaAtualizacao = this.atualizacaoService.ultimaAtualizacao;

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
