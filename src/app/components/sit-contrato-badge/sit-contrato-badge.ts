import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const SIT_CONTRATO_CLASS_MAP: Record<string, string> = {
  'ATIVO':                   'sit-contrato-badge sit-contrato-badge--ativo',
  'ATIVO-RETIDO':            'sit-contrato-badge sit-contrato-badge--ativo-pendente',
  'ATIVO-ACORDO FINANCEIRO': 'sit-contrato-badge sit-contrato-badge--ativo-pendente',
  'ISENTO':                  'sit-contrato-badge sit-contrato-badge--em-processo',
  'IMPLANTACAO':             'sit-contrato-badge sit-contrato-badge--em-processo',
  'PARCEIROS':               'sit-contrato-badge sit-contrato-badge--em-processo',
  'INATIVO':                 'sit-contrato-badge sit-contrato-badge--inativo',
  'INADIMPLENTE':            'sit-contrato-badge sit-contrato-badge--inadimplente',
  'DESISTENTE':              'sit-contrato-badge sit-contrato-badge--inadimplente',
  'BAIXA TEMPORARIA':        'sit-contrato-badge sit-contrato-badge--suspenso',
  'CONGELADO':               'sit-contrato-badge sit-contrato-badge--suspenso',
  'SUBSTITUIÇÃO':            'sit-contrato-badge sit-contrato-badge--inativo',
  'DES MANIPULAÇÃO':         'sit-contrato-badge sit-contrato-badge--inativo',
};

@Component({
  selector: 'app-sit-contrato-badge',
  standalone: true,
  imports: [],
  templateUrl: './sit-contrato-badge.html',
  styleUrl: './sit-contrato-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitContratoBadge {
  value = input<string | null>(null);

  readonly badgeClass = computed(() => {
    const sit = this.value();
    if (!sit) return 'sit-contrato-badge sit-contrato-badge--inativo';
    return (
      SIT_CONTRATO_CLASS_MAP[sit.toUpperCase().trim()] ??
      'sit-contrato-badge sit-contrato-badge--inativo'
    );
  });

  readonly label = computed(() => this.value() ?? '—');
}
