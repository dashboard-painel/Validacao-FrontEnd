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
  coletor_bi_ultima_data: string | null;
  coletor_bi_ultima_hora: string | null;
  tipo_divergencia: string | null;
  camadas_atrasadas: string[] | null;
  camadas_sem_dados: string[] | null;
  atualizado_em: string | null;
  sit_contrato: string | null;
  possivel_causa: string | null;
};
