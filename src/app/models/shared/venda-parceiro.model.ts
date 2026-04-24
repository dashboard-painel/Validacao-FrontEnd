export type VendaParceiro = {
  cod_farmacia: string;
  nome_farmacia: string | null;
  sit_contrato: string | null;
  associacao: string;
  farmacia: string | null;
  associacao_parceiro: string | null;
  ultima_venda_parceiros: string | null;
};

export type VendasParceirosResponse = {
  total: number;
  resultados: VendaParceiro[];
};
