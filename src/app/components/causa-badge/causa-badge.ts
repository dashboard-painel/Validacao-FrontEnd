import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-causa-badge',
  standalone: true,
  imports: [],
  templateUrl: './causa-badge.html',
  styleUrl: './causa-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CausaBadge {
  value = input<string | null>(null);

  readonly label    = computed(() => this.value()?.trim() || '—');
  readonly hasValue = computed(() => !!this.value()?.trim());
}
