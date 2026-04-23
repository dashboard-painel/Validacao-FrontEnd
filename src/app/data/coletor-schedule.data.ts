/**
 * Horário de operação do coletor por versão completa (num_versao da API).
 *
 * Para adicionar novas versões, inclua uma nova entrada no objeto abaixo.
 * A chave é o valor exato recebido no campo `num_versao`.
 */
export const COLETOR_SCHEDULE: Record<string, string> = {
  '1.0.89': 'horário comercial',
  '1.0.88': 'fora horário comercial',
  '1.0.87': 'fora horário comercial',
  '1.0.86': 'fora horário comercial',
  '1.0.85': 'fora horário comercial',
  '1.0.80': 'horário comercial',
  '1.0.78': 'fora horário comercial',
  '1.0.77': 'horário comercial',
  '1.0.76': 'fora horário comercial',
  '1.0.75': 'fora horário comercial',
  '1.0.72': 'horário comercial',
  '1.0.70': 'fora horário comercial',
};

/** Retorna o horário de operação para uma versão do coletor, ou null se não mapeado. */
export function getColetorSchedule(numVersao: string | null | undefined): string | null {
  if (!numVersao) return null;
  return COLETOR_SCHEDULE[numVersao] ?? null;
}
