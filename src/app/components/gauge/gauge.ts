import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-gauge',
  imports: [],
  templateUrl: './gauge.html',
  styleUrl: './gauge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gauge {
  totalStores = input(0);
  okStores = input(0);

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
    if (this.totalStoresSafe() === 0) {
      return '#8a95a6';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return '#1f9d55';
    }

    if (percent >= 80) {
      return '#d4a017';
    }

    return '#d64545';
  });

  readonly gaugePercentColor = computed(() => {
    if (this.totalStoresSafe() === 0) {
      return '#616b79';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return '#197946';
    }

    if (percent >= 80) {
      return '#8a6500';
    }

    return '#a22a2a';
  });

  readonly gaugeCardClass = computed(() => {
    if (this.totalStoresSafe() === 0) {
      return 'card gauge-card gauge-card--nodata h-100';
    }

    const percent = this.okStoresPercent();

    if (percent >= 90) {
      return 'card gauge-card gauge-card--success h-100';
    }

    if (percent >= 80) {
      return 'card gauge-card gauge-card--warning h-100';
    }

    return 'card gauge-card gauge-card--danger h-100';
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
