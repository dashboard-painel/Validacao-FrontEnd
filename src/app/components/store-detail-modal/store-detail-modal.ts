import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CnpjPipe } from '../../pipes/cnpj.pipe';
import { type DelayedStoreRow } from '../../models/shared/dashboard.model';
import { getColetorSchedule } from '../../data/coletor-schedule.data';
import { ClassificacaoBadge } from '../classificacao-badge/classificacao-badge';
import { SitContratoBadge } from '../sit-contrato-badge/sit-contrato-badge';

@Component({
  selector: 'app-store-detail-modal',
  standalone: true,
  imports: [CnpjPipe, SitContratoBadge, ClassificacaoBadge],
  templateUrl: './store-detail-modal.html',
  styleUrl: './store-detail-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreDetailModal {
  store = input<DelayedStoreRow | null>(null);

  readonly closed = output<void>();

  readonly isOpen = computed(() => this.store() !== null);

  close(): void {
    this.closed.emit();
  }

  // --- Display helpers ---

  layerLastSale(store: DelayedStoreRow, layer: string): string {
    return (store.lastSalesByLayer as Record<string, string> | undefined)?.[layer] ?? 'Sem dados';
  }

  readonly urgencyClass = (hours: number): string => {
    if (hours >= 48) return 'critical';
    if (hours >= 24) return 'high';
    return 'moderate';
  };

  readonly formatDelay = (hours: number): string => {
    if (hours > 48) return `${Math.round(hours / 24)} dias`;
    return `${hours} horas`;
  };

  readonly coletorSchedule = (numVersao: string | null): string | null =>
    getColetorSchedule(numVersao);
}
