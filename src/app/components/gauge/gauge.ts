import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-gauge',
  imports: [],
  templateUrl: './gauge.html',
  styleUrl: './gauge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gauge {
  private readonly themeService = inject(ThemeService);

  totalStores = input(0);
  okStores = input(0);

  embedded = input(false);

  readonly totalStoresSafe = computed(() => Math.max(0, this.totalStores()));

  readonly okStoresSafe = computed(() => {
    const ok = Math.max(0, this.okStores());
    return Math.min(ok, this.totalStoresSafe());
  });

  readonly nonOkStores = computed(() => this.totalStoresSafe() - this.okStoresSafe());

  readonly okStoresPercent = computed(() => {
    if (this.totalStoresSafe() === 0) {
      return 0;
    }

    return Math.round((this.okStoresSafe() / this.totalStoresSafe()) * 100);
  });

  readonly gaugeColor = computed(() => {
    const dark = this.themeService.theme() === 'dark';

    if (this.totalStoresSafe() === 0) {
      return dark ? '#94a3b8' : '#8a95a6';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return dark ? '#4ade80' : '#1f9d55';
    }

    if (percent >= 80) {
      return dark ? '#fbbf24' : '#d4a017';
    }

    return dark ? '#ff4d4d' : '#d64545';
  });

  readonly gaugePercentColor = computed(() => {
    const dark = this.themeService.theme() === 'dark';

    if (this.totalStoresSafe() === 0) {
      return dark ? '#cbd5e1' : '#616b79';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return dark ? '#86efac' : '#197946';
    }

    if (percent >= 80) {
      return dark ? '#fcd34d' : '#8a6500';
    }

    return dark ? '#ff7a7a' : '#a22a2a';
  });

  readonly gaugeCardClass = computed(() => {
    const cardBase = this.embedded() ? '' : 'card gauge-card ';
    if (this.totalStoresSafe() === 0) return `${cardBase}gauge-card--nodata h-100`.trim();
    const percent = this.okStoresPercent();
    if (percent >= 90) return `${cardBase}gauge-card--success h-100`.trim();
    if (percent >= 80) return `${cardBase}gauge-card--warning h-100`.trim();
    return `${cardBase}gauge-card--danger h-100`.trim();
  });

  readonly gaugeSignalLabel = computed(() => {
    if (this.totalStoresSafe() === 0) {
      return 'Cinza';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return 'OK';
    }

    return 'Alerta';
  });
}
