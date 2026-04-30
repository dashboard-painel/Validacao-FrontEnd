import { type DelayedStoreRow, type ProblemLayer } from '../models/shared/dashboard.model';

export function urgencyClass(hours: number): 'critical' | 'high' | 'moderate' {
  if (hours >= 48) return 'critical';
  if (hours >= 24) return 'high';
  return 'moderate';
}

export function formatDelay(hours: number): string {
  if (hours >= 48) return `${Math.round(hours / 24)} dias`;
  return `${hours} horas`;
}

export function layerLastSale(store: DelayedStoreRow, layer: ProblemLayer): string {
  return store.lastSalesByLayer?.[layer] ?? 'Sem dados';
}
