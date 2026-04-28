export type ProblemLayer = 'Gold' | 'Silver' | 'Coletor' | 'Sem dados';

export type MultiFilterKey = 'associationCode' | 'farmaCode' | 'cnpj';

export type GlobalFilterKey = 'associationCode' | 'sitContrato' | 'classificacao';

export type LayerBadge = ProblemLayer | 'Sem atraso';

export type StoreStatus = 'Com atraso' | 'Sem atraso' | 'Sem dados';

export type CnpjOption = {
  cnpj: string;
  pharmacyName: string;
};

export type StatusBarItem = {
  label: string;
  value: number;
  percent: number;
  barClass: string;
  itemClass: string;
};

export type DelayedStoreRow = {
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
  status: StoreStatus;
  layerTooltip: string;
  layerItems: { label: string; className: string }[];
};
