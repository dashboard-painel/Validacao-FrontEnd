import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const CLASSIFICACAO_CLASS_MAP: Record<string, string> = {
  'GOLD':           'classificacao-badge classificacao-badge--gold',
  'SELECT1':        'classificacao-badge classificacao-badge--select',
  'SELECT2':        'classificacao-badge classificacao-badge--select',
  'PRIME':          'classificacao-badge classificacao-badge--prime',
  'NEONATAL':       'classificacao-badge classificacao-badge--neonatal',
  'NEONATAL CLOUD': 'classificacao-badge classificacao-badge--neonatal',
  'IMPLANTACAO':    'classificacao-badge classificacao-badge--implantacao',
  '100% BRASIL':    'classificacao-badge classificacao-badge--brasil',
  'CLOUD':          'classificacao-badge classificacao-badge--cloud',
  'SNGPC':          'classificacao-badge classificacao-badge--sngpc',
  'INATIVO':        'classificacao-badge classificacao-badge--inativo',
};

@Component({
  selector: 'app-classificacao-badge',
  standalone: true,
  imports: [],
  templateUrl: './classificacao-badge.html',
  styleUrl: './classificacao-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassificacaoBadge {
  value = input<string | null>(null);

  readonly badgeClass = computed(() => {
    const v = this.value();
    if (!v) return 'classificacao-badge classificacao-badge--null';
    return (
      CLASSIFICACAO_CLASS_MAP[v.toUpperCase().trim()] ??
      'classificacao-badge classificacao-badge--null'
    );
  });

  readonly label = computed(() => this.value() ?? '—');
}
