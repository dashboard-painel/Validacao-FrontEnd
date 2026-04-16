export type TipoDivergencia =
  | 'data_diferente'
  | 'apenas_gold_vendas'
  | 'apenas_silver_stgn_dedup'
  | null;

export type FarmaciaHistorico = {
  associacao: string;
  cod_farmacia: string;
  nome_farmacia: string | null;
  cnpj: string | null;
  ultima_venda_GoldVendas: string | null;
  ultima_hora_venda_GoldVendas: string | null;
  ultima_venda_SilverSTGN_Dedup: string | null;
  ultima_hora_venda_SilverSTGN_Dedup: string | null;
  coletor_novo: string | null;
  tipo_divergencia: TipoDivergencia;
};
