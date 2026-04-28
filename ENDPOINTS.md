# Endpoints — Validacao-BackEnd

Base URL: `http://<host>:<port>`

---

## Geral

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Info da API (name, version, status) |
| `GET` | `/health` | Health check da API e do banco de dados |

### `GET /health` — Resposta
```json
{
  "status": "ok",
  "api": "running",
  "database": { "connected": true }
}
```

---

## Comparação (GoldVendas vs SilverSTGN_Dedup)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/comparar?associacao={codigo}` | Executa comparação para a associação *(backend only — frontend usa POST)* |
| `POST` | `/comparar` | Idem via body JSON |
| `GET` | `/historico` | Todas as farmácias (última rodada de cada associação) |
| `GET` | `/historico/{associacao}` | Histórico de comparações por associação |
| `GET` | `/ultima-atualizacao` | Data/hora da comparação mais recente |

### `GET /comparar?associacao=80` — Resposta
```json
{
  "associacao": "80",
  "total_gold_vendas": 150,
  "total_silver_stgn_dedup": 148,
  "total_divergencias": 5,
  "comparacao_id": 42,
  "divergencias": [
    {
      "cod_farmacia": "1",
      "nome_farmacia": "Farmacia Central",
      "cnpj": "12.345.678/0001-99",
      "sit_contrato": "ATIVO",
      "codigo_rede": "10",
      "ultima_venda_GoldVendas": "2024-03-15",
      "ultima_hora_venda_GoldVendas": "14:30:00",
      "ultima_venda_SilverSTGN_Dedup": "2024-03-14",
      "ultima_hora_venda_SilverSTGN_Dedup": "09:00:00",
      "tipo_divergencia": "data_diferente",
      "camadas_atrasadas": ["SilverSTGN_Dedup"],
      "camadas_sem_dados": null
    }
  ],
  "status_farmacias": [
    {
      "cod_farmacia": "1",
      "coletor_novo": "OK, sem registro",
      "coletor_bi_ultima_data": "2024-03-15",
      "coletor_bi_ultima_hora": "14:30:00"
    }
  ]
}
```

> **`tipo_divergencia`** pode ser:
> - `data_diferente` — presente em ambas, mas com datas diferentes
> - `apenas_gold_vendas` — presente somente em GoldVendas
> - `apenas_silver_stgn_dedup` — presente somente em SilverSTGN_Dedup

### `POST /comparar` — Body
```json
{ "associacao": "80" }
```

### `GET /historico` — Resposta (array)
```json
[
  {
    "associacao": "80",
    "cod_farmacia": "1",
    "nome_farmacia": "Farmacia Central",
    "cnpj": "12345678000199",
    "sit_contrato": "ATIVO",
    "codigo_rede": "10",
    "ultima_venda_GoldVendas": "2024-03-15",
    "ultima_hora_venda_GoldVendas": "14:30:00",
    "ultima_venda_SilverSTGN_Dedup": "2024-03-14",
    "ultima_hora_venda_SilverSTGN_Dedup": "09:00:00",
    "coletor_novo": "OK, sem registro",
    "coletor_bi_ultima_data": "2024-03-15",
    "coletor_bi_ultima_hora": "14:30:00",
    "tipo_divergencia": "data_diferente",
    "camadas_atrasadas": ["SilverSTGN_Dedup"],
    "camadas_sem_dados": null,
    "atualizado_em": "2024-03-15T15:00:00"
  }
]
```

### `GET /ultima-atualizacao` — Resposta
```json
{ "atualizado_em": "2024-03-15T15:00:00" }
```

---

## Coletor BI

> ⚠️ **Sem integração frontend** — endpoint disponível no backend, sem serviço Angular mapeado.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/coletor/{codigo}` | Última venda no Coletor BI para o código informado |

### `GET /coletor/001` — Resposta
```json
{ "data_hora_ultima_venda": "2024-03-15T14:30:00" }
```

---

## Vendas Parceiros

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/vendas-parceiros` | Consulta o Redshift e persiste no banco local |
| `GET` | `/vendas-parceiros/historico` | Retorna do banco local (sem consultar Redshift) |
| `GET` | `/vendas-parceiros/ultima-atualizacao` | Data/hora da última sync de vendas parceiros |

### `GET /vendas-parceiros` e `GET /vendas-parceiros/historico` — Resposta
```json
{
  "total": 2,
  "resultados": [
    {
      "cod_farmacia": "001",
      "nome_farmacia": "Farmacia Central",
      "sit_contrato": "ATIVO",
      "associacao": "80",
      "farmacia": "FAR001",
      "associacao_parceiro": "PARCEIRO_X",
      "ultima_venda_parceiros": "2024-03-15T14:30:00"
    }
  ]
}
```

### `GET /vendas-parceiros/ultima-atualizacao` — Resposta
```json
{ "atualizado_em": "2024-03-15T15:00:00" }
```

---

## Códigos de Status HTTP

| Código | Situação |
|--------|----------|
| `200` | Sucesso |
| `404` | Associação não encontrada (histórico) |
| `503` | Erro de conexão com banco de dados ou serviço externo |
