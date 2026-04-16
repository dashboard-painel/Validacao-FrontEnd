import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'nodata';

@Component({
  selector: 'app-kpi',
  imports: [],
  templateUrl: './kpi.html',
  styleUrl: './kpi.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kpi {
  title = input.required<string>();
  value = input.required<number | string>();
  tone = input<KpiTone>('neutral');
  badge = input<string>('');
  previousValue = input<number | null>(null);
  /** Quando true, subida é ruim (vermelho) e descida é boa (verde) */
  invertTrend = input<boolean>(false);

  readonly badgeLabel = computed(() => this.badge().trim());

  readonly trend = computed<'up' | 'down' | null>(() => {
    const prev = this.previousValue();
    const curr = this.value();
    if (prev === null || typeof curr !== 'number') return null;
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return null;
  });

  readonly trendColor = computed<'green' | 'red' | null>(() => {
    const t = this.trend();
    if (!t) return null;
    const invert = this.invertTrend();
    if (t === 'up') return invert ? 'red' : 'green';
    return invert ? 'green' : 'red';
  });
}
