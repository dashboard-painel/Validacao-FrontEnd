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

export function getColetorSchedule(numVersao: string | null | undefined): string | null {
  if (!numVersao) return null;
  return COLETOR_SCHEDULE[numVersao] ?? null;
}
