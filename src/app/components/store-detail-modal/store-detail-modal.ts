import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Renderer2,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { CnpjPipe } from '../../pipes/cnpj.pipe';
import { type DelayedStoreRow, type ProblemLayer } from '../../models/shared/dashboard.model';
import { getColetorSchedule } from '../../data/coletor-schedule.data';
import { ClassificacaoBadge } from '../classificacao-badge/classificacao-badge';
import { SitContratoBadge } from '../sit-contrato-badge/sit-contrato-badge';
import { urgencyClass, formatDelay, layerLastSale } from '../../utils/display-helpers';

@Component({
  selector: 'app-store-detail-modal',
  imports: [CnpjPipe, SitContratoBadge, ClassificacaoBadge],
  templateUrl: './store-detail-modal.html',
  styleUrl: './store-detail-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreDetailModal {
  store = input<DelayedStoreRow | null>(null);

  readonly closed = output<void>();
  readonly isOpen = computed(() => this.store() !== null);

  @ViewChild('dialogRef') private dialogRef?: ElementRef<HTMLElement>;
  private _previouslyFocused: HTMLElement | null = null;
  private readonly renderer = inject(Renderer2);

  constructor() {
    // Move focus into the dialog on open; restore it to the trigger element on close.
    // Also lock body scroll while the modal is visible (WR-02).
    effect(() => {
      if (this.isOpen()) {
        this._previouslyFocused = document.activeElement as HTMLElement;
        this.renderer.addClass(document.body, 'modal-open');
        setTimeout(() => this.dialogRef?.nativeElement.focus(), 0);
      } else {
        this.renderer.removeClass(document.body, 'modal-open');
        if (this._previouslyFocused) {
          this._previouslyFocused.focus();
          this._previouslyFocused = null;
        }
      }
    });
  }

  /** Layers shown in the detail panel (excludes 'Sem dados' which has no sale timestamp) */
  readonly layerEntries: ProblemLayer[] = ['Gold', 'Silver', 'Coletor'];
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  /** CR-02: keep Tab focus inside the dialog while it is open */
  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!this.isOpen() || !this.dialogRef) return;
    const focusable = Array.from(
      this.dialogRef.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), ' +
          'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (ke.shiftKey && document.activeElement === first) {
      ke.preventDefault();
      last.focus();
    } else if (!ke.shiftKey && document.activeElement === last) {
      ke.preventDefault();
      first.focus();
    }
  }

  close(): void {
    this.closed.emit();
  }

  // --- Display helpers ---

  readonly layerLastSale = layerLastSale;
  readonly urgencyClass = urgencyClass;
  readonly formatDelay = formatDelay;

  readonly coletorSchedule = (numVersao: string | null): string | null =>
    getColetorSchedule(numVersao);
}
