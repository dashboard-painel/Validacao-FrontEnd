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
  camadas_atrasadas: string[] | null;
};
