import { Injectable } from '@angular/core';

import { type FarmaciaHistorico } from '../models/shared/farmacia.model';
import { type LayerBadge, type ProblemLayer, type StoreStatus } from '../models/shared/dashboard.model';

export type DashboardData = {
  kpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  previousKpis: {
    totalStores: number;
    okStores: number;
    divergentStores: number;
    storesWithoutData: number;
  };
  statuses: {
    ok: number;
    goldDelayed: number;
    silverDelayed: number;
    apiDelayed: number;
    noData: number;
  };
  gauge: {
    totalStores: number;
    okStores: number;
  };
  delayedStores: {
    id: string;
    associationCode: string;
    farmaCode: string;
    cnpj: string;
    pharmacyName: string;
    delayHours: number;
    problemLayers: ProblemLayer[];
    lastSalesByLayer?: Partial<Record<ProblemLayer, string>>;
    sitContrato: string | null;
    codigoRede: string | null;
    numVersao: string | null;
    classificacao: string | null;
    possivelCausa: string | null;
  }[];
};

export type DelayedStoreItem = DashboardData['delayedStores'][number];

@Injectable({ providedIn: 'root' })
export class DashboardMapperService {
  sitContratoGroupOf(sit: string | null): 'Ativo' | 'Inativo' {
    if (!sit) return 'Inativo';
    const upper = sit.toUpperCase().trim();
    if (
      upper.startsWith('ATIVO') ||
      upper === 'ISENTO' ||
      upper === 'IMPLANTACAO' ||
      upper === 'PARCEIROS'
    ) {
      return 'Ativo';
    }
    return 'Inativo';
  }

  classificacaoGroupOf(classif: string | null): 'Padrão' | 'Cloud' {
    if (!classif) return 'Padrão';
    const upper = classif.toUpperCase().trim();
    if (upper === 'CLOUD' || upper === 'NEONATAL CLOUD') return 'Cloud';
    return 'Padrão';
  }

  toPercent(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  toLayerClass(layer: LayerBadge): string {
    switch (layer) {
      case 'Gold':
        return 'delayed-stores__layer delayed-stores__layer--gold';
      case 'Silver':
        return 'delayed-stores__layer delayed-stores__layer--silver';
      case 'Coletor':
        return 'delayed-stores__layer delayed-stores__layer--coletor';
      case 'Sem atraso':
        return 'delayed-stores__layer delayed-stores__layer--ok';
      default:
        return 'delayed-stores__layer delayed-stores__layer--nodata';
    }
  }

  toLayerDisplayLabel(layer: ProblemLayer): string {
    switch (layer) {
      case 'Gold':    return 'Gold em atraso';
      case 'Silver':  return 'Silver em atraso';
      case 'Coletor': return 'Migração Pendente';
      default:        return layer;
    }
  }

  toStoreStatus(store: DelayedStoreItem): StoreStatus {
    if (store.problemLayers.length === 0) return 'Sem atraso';
    if (store.problemLayers.includes('Sem dados')) return 'Sem dados';
    return 'Com atraso';
  }

  parseRawDatetime(raw: string | null): Date | null {
    if (!raw) return null;
    const cleaned = raw.replace(/\.\d+/, '').replace('T', ' ').trim();
    const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (!match) return null;
    const [, year, month, day, time] = match;
    return new Date(`${year}-${month}-${day}T${time}`);
  }

  computeDelayHours(f: FarmaciaHistorico, problemLayers: ProblemLayer[]): number {
    const relevantLayers = problemLayers.filter((l) => l !== 'Sem dados');
    if (relevantLayers.length === 0) return 0;

    const now = Date.now();
    let maxMs = 0;

    for (const layer of relevantLayers) {
      let raw: string | null = null;
      if (layer === 'Gold') {
        raw = f.ultima_hora_venda_GoldVendas;
      } else if (layer === 'Silver') {
        raw =
          f.ultima_venda_SilverSTGN_Dedup && f.ultima_hora_venda_SilverSTGN_Dedup
            ? `${f.ultima_venda_SilverSTGN_Dedup} ${f.ultima_hora_venda_SilverSTGN_Dedup}`
            : null;
      } else if (layer === 'Coletor') {
        raw =
          f.coletor_bi_ultima_data && f.coletor_bi_ultima_hora
            ? `${f.coletor_bi_ultima_data} ${f.coletor_bi_ultima_hora}`
            : null;
      }
      const date = this.parseRawDatetime(raw);
      if (date) {
        const diff = now - date.getTime();
        if (diff > maxMs) maxMs = diff;
      }
    }

    return Math.round(maxMs / (1000 * 60 * 60));
  }

  formatPossivelCausa(causa: string | null): string | null {
    if (!causa) return null;
    return causa.replace(
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?/g,
      (_, year, month, day, time) => `${day}/${month}/${year} ${time}`,
    );
  }

  formatDatetime(datetime: string | null): string | null {
    if (!datetime) return null;
    const cleaned = datetime.replace(/\.\d+/, '').replace('T', ' ').trim();
    const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
    if (match) {
      const [, year, month, day, time] = match;
      return `${day}/${month}/${year} ${time}`;
    }
    return cleaned;
  }

  mapFarmaciaToDashboard(f: FarmaciaHistorico): DelayedStoreItem {
    const problemLayers: ProblemLayer[] = [];

    const semDados = f.camadas_sem_dados ?? [];
    const atrasadas = f.camadas_atrasadas ?? [];

    if (semDados.length >= 2) {
      problemLayers.push('Sem dados');
    } else {
      if (semDados.length === 1) {
        const camada = semDados[0];
        if (camada === 'GoldVendas') problemLayers.push('Gold');
        else if (camada === 'SilverSTGN_Dedup') problemLayers.push('Silver');
      }
      for (const camada of atrasadas) {
        if (camada === 'GoldVendas' && !problemLayers.includes('Gold')) problemLayers.push('Gold');
        else if (camada === 'SilverSTGN_Dedup' && !problemLayers.includes('Silver'))
          problemLayers.push('Silver');
        else if (camada === 'API' && !problemLayers.includes('Coletor')) problemLayers.push('Coletor');
      }
    }

    const goldDatetime = this.formatDatetime(f.ultima_hora_venda_GoldVendas);
    const silverDatetime = this.formatDatetime(
      f.ultima_venda_SilverSTGN_Dedup && f.ultima_hora_venda_SilverSTGN_Dedup
        ? `${f.ultima_venda_SilverSTGN_Dedup} ${f.ultima_hora_venda_SilverSTGN_Dedup}`
        : null,
    );
    const apiDatetime = this.formatDatetime(f.coletor_novo);

    const lastSalesByLayer: Partial<Record<ProblemLayer, string>> = {};
    if (goldDatetime) lastSalesByLayer['Gold'] = goldDatetime;
    if (silverDatetime) lastSalesByLayer['Silver'] = silverDatetime;
    if (apiDatetime) lastSalesByLayer['Coletor'] = apiDatetime;
    if (problemLayers.includes('Sem dados'))
      lastSalesByLayer['Sem dados'] = 'Sem recebimento de vendas';

    return {
      id: `${f.associacao}-${f.cod_farmacia}`,
      associationCode: f.associacao,
      farmaCode: f.cod_farmacia,
      cnpj: f.cnpj ?? '',
      pharmacyName: f.nome_farmacia ?? '-',
      delayHours: this.computeDelayHours(f, problemLayers),
      problemLayers,
      lastSalesByLayer,
      sitContrato: f.sit_contrato ?? null,
      codigoRede: f.codigo_rede ?? null,
      numVersao: f.num_versao ?? null,
      classificacao: f.classificacao ?? null,
      possivelCausa: this.formatPossivelCausa(f.possivel_causa),
    };
  }

  mapToDashboardData(
    farmacias: FarmaciaHistorico[],
    previousKpis: DashboardData['kpis'] | null,
  ): DashboardData {
    const stores = farmacias.map((f) => this.mapFarmaciaToDashboard(f));

    const counts = stores.reduce(
      (acc, s) => {
        const noData = s.problemLayers.includes('Sem dados');
        if (s.problemLayers.length === 0) acc.ok++;
        if (noData) acc.noData++;
        if (s.problemLayers.length > 0 && !s.problemLayers.every((l) => l === 'Sem dados'))
          acc.divergent++;
        if (s.problemLayers.includes('Gold')) acc.gold++;
        if (s.problemLayers.includes('Silver')) acc.silver++;
        if (s.problemLayers.includes('Coletor')) acc.coletor++;
        return acc;
      },
      { ok: 0, noData: 0, divergent: 0, gold: 0, silver: 0, coletor: 0 },
    );

    const kpis = {
      totalStores: stores.length,
      okStores: counts.ok,
      divergentStores: counts.divergent,
      storesWithoutData: counts.noData,
    };

    return {
      kpis,
      previousKpis: previousKpis ?? kpis,
      statuses: {
        ok: counts.ok,
        goldDelayed: counts.gold,
        silverDelayed: counts.silver,
        apiDelayed: counts.coletor,
        noData: counts.noData,
      },
      gauge: { totalStores: stores.length, okStores: counts.ok + counts.noData },
      delayedStores: stores,
    };
  }
}
